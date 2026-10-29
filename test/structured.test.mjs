import test from 'node:test';
import assert from 'node:assert/strict';
import { extractStructured } from '../src/structured.mjs';

const now = new Date('2026-11-01T04:45:00Z');
function source() {
  const hourly = [
    ['2026-11-01T01:00', '2026-11-01T05:00'],
    ['2026-11-01T01:00', '2026-11-01T06:00'],
    ['2026-11-01T02:00', '2026-11-01T07:00'],
  ].map(([local, utc], i) => ({
    time: { local, utc }, temperature: { value: -i }, feelsLike: i ? -4 : 0,
    weatherCode: { text: 'Clear' }, wind: { speed: 0, direction: null, gust: null },
    relativeHumidity: 70, pop: i * 10,
  }));
  const data = {
    hourly,
    display: { unit: { temperature: 'C', wind: 'km/h', relativeHumidity: '%', pop: '%' } },
    generatedTimestamp: { local: '2026-11-01T00:40', utc: '2026-11-01T04:40' },
  };
  const dataset = {
    '@type': 'Dataset', name: 'Hourly Weather Forecast - Scarborough, Ontario',
    description: 'A 3-hour weather forecast in 1-hour periods for Scarborough, Ontario',
    mainEntity: { 'csvw:tableSchema': { 'csvw:columns': [
      'time', 'condition', 'temperature', 'feelsLike', 'humidity', 'windSpeed', 'windDirection', 'windGust', 'pop',
    ].map(name => ({ 'csvw:name': name, 'csvw:cells': hourly.map(row => ({ 'csvw:value': name === 'time' ? row.time.local : '' })) })) } },
  };
  return { data, dataset };
}
function scripts({ data, dataset } = source(), suffix = '') {
  const flight = [
    `a:${JSON.stringify({ locationData: { placeName: 'Scarborough', provCode: 'ON', countryCode: 'CA' } })}`,
    `b:${JSON.stringify(['$', '$L1', null, { locale: 'en-CA', hourlyData: data }])}`,
  ].join('\n');
  return [
    { type: 'application/ld+json', text: JSON.stringify(dataset) },
    { text: `self.__next_f.push(${JSON.stringify([1, flight])})${suffix}` },
  ];
}

test('structured data retains UTC-distinct repeated hours, negatives, zero and explicit null', () => {
  const { feed, generatedAt } = extractStructured(scripts(), now);
  assert.equal(generatedAt, '2026-11-01T04:40:00.000Z');
  assert.deepEqual(feed.hourly.map(row => row.time), [
    '2026-11-01T01:00:00-04:00', '2026-11-01T01:00:00-05:00', '2026-11-01T02:00:00-05:00',
  ]);
  assert.equal(feed.hourly[0].temp, 0);
  assert.equal(feed.hourly[0].feelsLike, 0);
  assert.equal(feed.hourly[1].temp, -1);
  assert.equal(feed.hourly[0].windGust, null);
  assert.equal(feed.hourly[0].precipProb, 0);
});

test('missing or malformed values, units and wrong location fail closed', () => {
  for (const change of [
    ({ data }) => { delete data.hourly[0].feelsLike; },
    ({ data }) => { data.hourly[0].temperature.value = '0'; },
    ({ data }) => { data.hourly[0].pop = 101; },
    ({ data }) => { data.display.unit.temperature = 'F'; },
    ({ dataset }) => { dataset.name = 'Hourly Weather Forecast - Toronto, Ontario'; },
  ]) {
    const value = source(); change(value);
    assert.throws(() => extractStructured(scripts(value), now));
  }
});

test('missing columns, truncated arrays and duplicate named columns fail coverage', () => {
  for (const change of [
    ({ data }) => { data.hourly.pop(); },
    ({ dataset }) => { dataset.mainEntity['csvw:tableSchema']['csvw:columns'].pop(); },
    ({ dataset }) => { dataset.mainEntity['csvw:tableSchema']['csvw:columns'][0]['csvw:cells'].pop(); },
    ({ dataset }) => { dataset.mainEntity['csvw:tableSchema']['csvw:columns'].push(dataset.mainEntity['csvw:tableSchema']['csvw:columns'][0]); },
  ]) {
    const value = source(); change(value);
    assert.throws(() => extractStructured(scripts(value), now), /coverage|column/i);
  }
});

test('malformed UTC, local disagreement, duplicate UTC and gaps fail', () => {
  for (const change of [
    ({ data }) => { data.hourly[0].time.utc = '2026-13-01T05:00'; },
    ({ data }) => { data.hourly[0].time.utc = '2026-11-01 05:00'; },
    ({ data }) => { data.hourly[0].time.local = '2026-11-01T02:00'; },
    ({ data }) => { data.hourly[1].time.utc = data.hourly[0].time.utc; },
    ({ data }) => { data.hourly[2].time.utc = '2026-11-01T08:00'; data.hourly[2].time.local = '2026-11-01T03:00'; },
  ]) {
    const value = source(); change(value);
    assert.throws(() => extractStructured(scripts(value), now));
  }
});

test('stale/future generation and expired or late-starting coverage cannot be freshly published', () => {
  for (const utc of ['2026-11-01T03:14', '2026-11-01T04:46']) {
    const value = source(); value.data.generatedTimestamp.utc = utc;
    assert.throws(() => extractStructured(scripts(value), now), /generation|timestamp/i);
  }
  assert.throws(() => extractStructured(scripts(), new Date('2026-11-01T07:45Z')), /generation|coverage/i);
  assert.throws(() => extractStructured(scripts(), new Date('2026-11-01T02:45Z')), /generation|coverage/i);
});

test('scripts are parsed as JSON and never executed, including wrapper suffixes', () => {
  globalThis.structuredScriptExecuted = false;
  assert.throws(() => extractStructured(scripts(source(), ';globalThis.structuredScriptExecuted=true'), now));
  assert.equal(globalThis.structuredScriptExecuted, false);
  delete globalThis.structuredScriptExecuted;
});

test('a prematurely rolled forecast reports safe coverage evidence before the hour changes',()=>{
 const value=source();
 value.data.generatedTimestamp={local:'2026-11-01T00:58',utc:'2026-11-01T04:58'};
 value.data.hourly[0].time={local:'2026-11-01T01:00',utc:'2026-11-01T06:00'};
 value.data.hourly[1].time={local:'2026-11-01T02:00',utc:'2026-11-01T07:00'};
 value.data.hourly[2].time={local:'2026-11-01T03:00',utc:'2026-11-01T08:00'};
 value.dataset.mainEntity['csvw:tableSchema']['csvw:columns'][0]['csvw:cells']=value.data.hourly.map(row=>({'csvw:value':row.time.local}));
 value.data.untrusted={token:'private'};
 const diagnostic={};
 assert.throws(()=>extractStructured(scripts(value),new Date('2026-11-01T04:59:30Z'),diagnostic),/near-term/);
 assert.deepEqual(diagnostic.sourceCoverage,{
  checkedAt:'2026-11-01T04:59:30.000Z',generatedAt:'2026-11-01T04:58:00.000Z',
  firstUtc:'2026-11-01T06:00:00.000Z',lastUtc:'2026-11-01T08:00:00.000Z',
  advertisedCount:3,hydrationCount:3,
  allowedFirstUtc:['2026-11-01T04:00:00.000Z','2026-11-01T05:00:00.000Z'],
 });
 assert.doesNotMatch(JSON.stringify(diagnostic),/private|token|untrusted/);
 assert.equal(extractStructured(scripts(value),new Date('2026-11-01T05:00Z')).feed.hourly.length,3);
});
