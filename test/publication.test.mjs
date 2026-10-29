import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, readFile, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { parseRows, SOURCE_URL } from '../src/feed.mjs';
import { publishAndSave } from '../src/publication.mjs';
import { scrape } from '../src/browser.mjs';
const raw = JSON.parse(
  await readFile(
    new URL('./fixtures/scarborough-2026-10-20.json', import.meta.url),
  ),
);
const feed = () => parseRows(raw, new Date('2026-10-20T20:18Z'));
test('all 72 live rows survive parsing including midnight', () => {
  const f = feed();
  assert.equal(f.hourly.length, 72);
  assert.equal(f.hourly[7].time, '2026-10-21T00:00:00-04:00');
  assert.equal(f.hourly[71].windGust, 14);
});
test('failed publication preserves prior local JSON and removes candidate', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'weather-test-'));
  const path = join(dir, 'hourly.json');
  try {
    await writeFile(path, 'old');
    await assert.rejects(
      publishAndSave(feed(), path, {
        token: 'test',
        put: async () => {
          throw new Error('offline');
        },
      }),
      /offline/,
    );
    assert.equal(await readFile(path, 'utf8'), 'old');
    assert.deepEqual(await readdir(dir), ['hourly.json']);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
test('publication overwrites fixed public Blob with 60s cache before atomic save', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'weather-test-'));
  const path = join(dir, 'hourly.json');
  let options;
  try {
    const result = await publishAndSave(feed(), path, {
      token: 'test',
      put: async (name, body, opts) => {
        assert.equal(name, 'weather/scarborough-hourly.json');
        assert.equal(JSON.parse(body).hourly.length, 72);
        options = opts;
        return {
          url: 'https://test.public.blob.vercel-storage.com/weather/scarborough-hourly.json',
        };
      },
    });
    assert.equal(options.cacheControlMaxAge, 60);
    assert.equal(options.allowOverwrite, true);
    assert.equal(options.addRandomSuffix, false);
    assert.equal(options.access, 'public');
    assert.equal(JSON.parse(await readFile(path, 'utf8')).hourly.length, 72);
    assert.match(result.url, /https:/);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
test('invalid feed never reaches publication or output', async () => {
  let called = false;
  await assert.rejects(
    publishAndSave({}, '/unused', {
      token: 'test',
      put: async () => {
        called = true;
      },
    }),
  );
  assert.equal(called, false);
});
test('browser closes after extraction failure and after success', async () => {
  for (const fail of [false, true]) {
    const calls = [];
    const command = async (args) => {
      calls.push(args);
      if (args[0] === 'eval' && args[1] === 'location.href') return SOURCE_URL;
      if (args[0] === 'eval' && args[1] === '--stdin') {
        if (fail) throw new Error('broken DOM');
        return raw;
      }
      return null;
    };
    if (fail)
      await assert.rejects(
        scrape({ command, now: new Date('2026-10-20T20:18Z') }),
        /broken DOM/,
      );
    else
      assert.equal(
        (await scrape({ command, now: new Date('2026-10-20T20:18Z') })).hourly
          .length,
        72,
      );
    assert.deepEqual(calls.at(-1), ['close']);
  }
});
test('navigation timeout may continue only on the exact source after row readiness', async () => {
  for (const correct of [true, false]) {
    const calls = [];
    const command = async (args) => {
      calls.push(args);
      if (args[0] === 'open') {
        const e = new Error('navigation timed out');
        e.code = 'BROWSER_TIMEOUT';
        throw e;
      }
      if (
        args[0] === 'eval' &&
        args[1] === 'location.href'
      )
        return correct
          ? 'https://www.theweathernetwork.com/en/city/ca/ontario/scarborough/hourly'
          : 'https://other.example/';
      if (args[0] === 'eval' && args[1] === '--stdin') return raw;
      return null;
    };
    if (correct)
      assert.equal(
        (await scrape({ command, now: new Date('2026-10-20T20:18Z') })).hourly
          .length,
        72,
      );
    else await assert.rejects(scrape({ command }), /source/i);
    assert.deepEqual(calls.at(-1), ['close']);
  }
});

test('condition catalog accumulates exact names across updates without duplicates or nulls', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'weather-conditions-'));
  const path = join(dir, 'hourly.json');
  const catalog = join(dir, 'weather-conditions.json');
  try {
    const first = feed();
    first.hourly.forEach((row, i) => { row.condition = i % 2 ? 'Sunny' : 'Partly cloudy'; });
    await publishAndSave(first, path, { local: true });
    assert.deepEqual(JSON.parse(await readFile(catalog, 'utf8')), ['Partly cloudy', 'Sunny']);
    const next = feed();
    next.hourly.forEach((row, i) => { row.condition = i % 2 ? 'Light rain' : null; });
    await publishAndSave(next, path, { token: 'test', put: async () => ({ url: 'https://example.com/feed' }) });
    await publishAndSave(next, path, { local: true });
    assert.deepEqual(JSON.parse(await readFile(catalog, 'utf8')), ['Light rain', 'Partly cloudy', 'Sunny']);
    assert.deepEqual((await readdir(dir)).sort(), ['hourly.json', 'weather-conditions.json']);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('malformed condition history fails safely instead of erasing accumulated names', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'weather-conditions-'));
  const path = join(dir, 'hourly.json');
  const catalog = join(dir, 'weather-conditions.json');
  try {
    for (const body of ['{', '{}', '[null]', '[" "]']) {
      await writeFile(catalog, body);
      await writeFile(path, 'previous feed');
      let published = false;
      await assert.rejects(publishAndSave(feed(), path, {
        token: 'test', put: async () => { published = true; },
      }), /condition catalog/i);
      assert.equal(published, false);
      assert.equal(await readFile(catalog, 'utf8'), body);
      assert.equal(await readFile(path, 'utf8'), 'previous feed');
    }
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('forecast output cannot overwrite the condition catalog', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'weather-conditions-'));
  try {
    await assert.rejects(publishAndSave(feed(), join(dir, 'weather-conditions.json'), { local: true }), /reserved/i);
    assert.deepEqual(await readdir(dir), []);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('structured verification rejects absent metadata before returning a publishable feed', async () => {
  const calls=[];
  const command=async args=>{
    calls.push(args);
    if(args[0]==='eval' && args[1]==='location.href') return SOURCE_URL;
    if(args[0]==='eval' && args[1]==='--stdin') return raw;
    if(args[0]==='eval' && args[1].includes('document.scripts')) return [];
    return null;
  };
  const diagnostics = {targets:[],documents:[],cookies:[]};
  await assert.rejects(scrape({command,diagnostics,verifyStructured:true,now:new Date('2026-10-20T20:18Z')}), /structured|location/i);
  assert.equal(diagnostics.stage,'structured-validation');
  assert.deepEqual(calls.at(-1),['close']);
});

test('normal and timed-out navigation reject foreign URLs, query suffixes and fragments',async()=>{
 for(const timedOut of [false,true]) for(const url of ['https://other.example/','https://www.theweathernetwork.com/en/city/ca/ontario/scarborough/hourly?_guid_iss_=1','https://www.theweathernetwork.com/en/city/ca/ontario/scarborough/hourly#other']) {
  const command=async args=>{
   if(args[0]==='open'&&timedOut){const e=new Error('timed out');e.code='BROWSER_TIMEOUT';throw e;}
   if(args[0]==='eval'&&args[1].startsWith('location.'))return url;
   if(args[0]==='eval'&&args[1]==='--stdin')return raw;
   return null;
  };
  await assert.rejects(scrape({command,now:new Date('2026-10-20T20:18Z')}),/exact forecast source/);
 }
});

function diagnosticScripts(change = () => {}) {
  const hourly = feed().hourly.map(row => ({
    time: {local: row.time.slice(0, 16), utc: new Date(row.time).toISOString().slice(0, 16)},
    temperature: {value: row.temp}, feelsLike: row.feelsLike,
    weatherCode: {text: row.condition},
    wind: {speed: row.windSpeed, direction: row.windDirection, gust: row.windGust},
    relativeHumidity: row.humidity, pop: row.precipProb,
  }));
  change(hourly);
  const dataset = {
    '@type': 'Dataset', name: 'Hourly Weather Forecast - Scarborough, Ontario',
    description: 'A 72-hour weather forecast in 1-hour periods for Scarborough, Ontario',
    mainEntity: {'csvw:tableSchema': {'csvw:columns': [
      'time', 'condition', 'temperature', 'feelsLike', 'windSpeed', 'windDirection', 'windGust', 'humidity', 'pop',
    ].map(name => ({'csvw:name': name, 'csvw:cells': hourly.map(row => ({'csvw:value': name === 'time' ? row.time.local : ''}))}))}},
  };
  const record = {
    locationData: {placeName: 'Scarborough', provCode: 'ON', countryCode: 'CA'},
    hourlyData: {
      hourly, display: {unit: {temperature: 'C', wind: 'km/h', relativeHumidity: '%', pop: '%'}},
      generatedTimestamp: {local: '2026-10-20T16:18', utc: '2026-10-20T20:18'},
    },
    untrusted: {token: 'private-source-value'},
  };
  return [
    {type: 'application/ld+json', text: JSON.stringify(dataset)},
    {text: `self.__next_f.push(${JSON.stringify([1, `a:${JSON.stringify(record)}\n`])})`},
  ];
}

test('source disagreement records only the first row and field with safe coverage counts', async () => {
  const scripts = diagnosticScripts(hourly => { hourly[0].temperature.value += 1; });
  const diagnostics = {targets: [], documents: [], cookies: []};
  const command = async args => {
    if (args[0] === 'eval' && args[1] === 'location.href') return SOURCE_URL;
    if (args[0] === 'eval' && args[1] === '--stdin') return raw;
    if (args[0] === 'eval' && args[1].includes('document.scripts')) return scripts;
    return null;
  };
  await assert.rejects(scrape({command, diagnostics, verifyStructured: true, now: new Date('2026-10-20T20:18Z')}), /forecasts disagree/);
  assert.equal(diagnostics.stage, 'source-agreement');
  assert.deepEqual(diagnostics.disagreement, {rowIndex: 0, field: 'temp'});
  assert.deepEqual(diagnostics.renderedCoverage, {rowCount: 72, timeCount: 72, advertisedCount: 72});
  assert.equal(diagnostics.sourceCoverage.hydrationCount, 72);
  assert.equal(diagnostics.sourceCoverage.firstUtc, '2026-10-20T21:00:00.000Z');
  assert.doesNotMatch(JSON.stringify(diagnostics), /private-source-value|untrusted|token/);
});

test('DOM evaluation and inline-script retrieval failures retain distinct safe stages', async () => {
  for (const stage of ['dom-evaluation', 'script-retrieval']) {
    const diagnostics = {targets: [], documents: [], cookies: []};
    const calls = [];
    const command = async args => {
      calls.push(args);
      if (args[0] === 'eval' && args[1] === 'location.href') return SOURCE_URL;
      if (args[0] === 'eval' && args[1] === '--stdin') {
        if (stage === 'dom-evaluation') throw new Error('private-operation-value');
        return raw;
      }
      if (args[0] === 'eval' && args[1].includes('document.scripts')) throw new Error('private-operation-value');
      return null;
    };
    await assert.rejects(scrape({command, diagnostics, verifyStructured: true, now: new Date('2026-10-20T20:18Z')}), /private-operation-value/);
    assert.equal(diagnostics.stage, stage);
    assert.doesNotMatch(JSON.stringify(diagnostics), /private-operation-value/);
    assert.deepEqual(calls.at(-1), ['close']);
  }
});
