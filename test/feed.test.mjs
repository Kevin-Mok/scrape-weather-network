import test from 'node:test';
import assert from 'node:assert/strict';
import { parseRows, torontoTimestamp, validateFeed } from '../src/feed.mjs';
const now = new Date('2026-10-20T20:18:00Z');
const row = {
  time: '2026-10-20T17:00',
  label: '5pm',
  temp: '14°',
  feelsLike: 'Feels 13',
  condition: 'Sunny',
  wind: '9 km/h SE',
  windGust: '15 km/h',
  humidity: '55%',
  precipProb: '0%',
};
const raw = { times: [row.time], rows: [row], expectedCount: 1 };
test('live screenshot values retain zero precipitation and every field', () => {
  const feed = parseRows(raw, now);
  assert.deepEqual(feed.hourly[0], {
    time: '2026-10-20T17:00:00-04:00',
    temp: 14,
    feelsLike: 13,
    condition: 'Sunny',
    windSpeed: 9,
    windDirection: 'SE',
    windGust: 15,
    humidity: 55,
    precipProb: 0,
  });
  assert.equal(feed.schemaVersion, 1);
  assert.equal(validateFeed(feed), feed);
});
test('negative temperatures and explicit unavailable values are preserved', () => {
  const feed = parseRows(
    {
      ...raw,
      rows: [
        {
          ...row,
          temp: '−4°',
          feelsLike: 'Feels -9',
          windGust: '--',
          humidity: 'N/A',
        },
      ],
    },
    now,
  );
  assert.equal(feed.hourly[0].temp, -4);
  assert.equal(feed.hourly[0].feelsLike, -9);
  assert.equal(feed.hourly[0].windGust, null);
  assert.equal(feed.hourly[0].humidity, null);
});
test('missing or malformed values fail rather than becoming unavailable', () => {
  for (const patch of [
    { humidity: undefined },
    { humidity: 'abc' },
    { precipProb: '101%' },
    { wind: '9 mph SE' },
    { temp: '' },
    { condition: '' },
    { label: '6pm' },
  ])
    assert.throws(() =>
      parseRows({ ...raw, rows: [{ ...row, ...patch }] }, now),
    );
});
test('every expanded row must match advertised timestamps and coverage', () => {
  assert.throws(() => parseRows({ ...raw, expectedCount: 72 }, now));
  assert.throws(() =>
    parseRows({ ...raw, times: [row.time, '2026-10-20T18:00'] }, now),
  );
  assert.throws(() => parseRows({ ...raw, rows: [row, row] }, now));
});
test('midnight, year rollover, DST repeated hour and missing hour', () => {
  assert.equal(
    torontoTimestamp('2027-01-01T00:00', null, new Date('2027-01-01T04:50Z')),
    '2027-01-01T00:00:00-05:00',
  );
  const first = torontoTimestamp(
    '2026-11-01T01:00',
    null,
    new Date('2026-11-01T04:50Z'),
  );
  assert.equal(first, '2026-11-01T01:00:00-04:00');
  assert.equal(
    torontoTimestamp('2026-11-01T01:00', first),
    '2026-11-01T01:00:00-05:00',
  );
  assert.equal(
    torontoTimestamp('2026-03-08T03:00', '2026-03-08T01:00:00-05:00'),
    '2026-03-08T03:00:00-04:00',
  );
  assert.throws(() =>
    torontoTimestamp('2026-03-08T02:00', null, new Date('2026-03-08T06:50Z')),
  );
});
test('invalid contract values, duplicate hours and incorrect timezone offsets fail validation', () => {
  const feed = parseRows(raw, now);
  for (const patch of [
    { schemaVersion: 2 },
    { hourly: [] },
    { fetchedAt: 'bad' },
    { location: {} },
    { source: 'other' },
  ])
    assert.throws(() => validateFeed({ ...feed, ...patch }));
  for (const patch of [
    { humidity: NaN },
    { temp: undefined },
    { time: '2026-10-20T17:00:00-05:00' },
    { condition: '' },
  ])
    assert.throws(() =>
      validateFeed({ ...feed, hourly: [{ ...feed.hourly[0], ...patch }] }),
    );
  assert.throws(() =>
    validateFeed({ ...feed, hourly: [feed.hourly[0], feed.hourly[0]] }),
  );
});
test('feels-like unavailable marker remains null even with rendered Feels prefix', () => {
  const result = parseRows(
    { ...raw, rows: [{ ...row, feelsLike: 'Feels --' }] },
    now,
  );
  assert.equal(result.hourly[0].feelsLike, null);
});
