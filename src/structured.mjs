import { LOCATION, SOURCE_URL, validateFeed } from './feed.mjs';

const formatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: LOCATION.timezone, year: 'numeric', month: '2-digit', day: '2-digit',
  hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZoneName: 'longOffset',
});
function toronto(date) {
  const p = Object.fromEntries(formatter.formatToParts(date).map(part => [part.type, part.value]));
  return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}:00${p.timeZoneName.replace('GMT', '')}`;
}
function utc(value, hourly = false) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value) || (hourly && !value.endsWith(':00')))
    throw new Error('Malformed source UTC timestamp');
  const date = new Date(`${value}:00Z`);
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 16) !== value)
    throw new Error('Malformed source UTC timestamp');
  return date;
}

// Decode only JSON payloads from Next's transport; never execute page scripts or resolve React IDs.
export function extractStructured(scripts, now = new Date(), diagnostics) {
  if (!Array.isArray(scripts)) throw new Error('Missing structured scripts');
  const current = Math.floor(now.getTime() / 3600000) * 3600000;
  const coverage = diagnostics ? (diagnostics.sourceCoverage = {checkedAt: now.toISOString(), allowedFirstUtc: [current, current + 3600000].map(t => new Date(t).toISOString())}) : null;
  const datasets = [], records = [];
  let flight = '';
  for (const script of scripts) {
    if (script.type === 'application/ld+json') {
      const data = JSON.parse(script.text);
      if (data?.['@type'] === 'Dataset') datasets.push(data);
    }
    const match = script.text?.match(/^self\.__next_f\.push\((\[.*\])\)\s*;?\s*$/s);
    if (match) {
      const chunk = JSON.parse(match[1]);
      if (chunk[0] === 1 && typeof chunk[1] === 'string') flight += chunk[1];
    }
  }
  for (const line of flight.split('\n')) {
    const match = line.match(/^[0-9a-f]+:([\[{].*)$/s);
    if (!match) continue;
    try { records.push(JSON.parse(match[1])); }
    catch { if (match[1].includes('"hourlyData"')) throw new Error('Malformed hourly hydration data'); }
  }
  const hourlyData = [], locations = [];
  function visit(value) {
    if (!value || typeof value !== 'object') return;
    if (value.hourlyData && typeof value.hourlyData === 'object') hourlyData.push(value.hourlyData);
    if (value.locationData?.placeName) locations.push(value.locationData);
    for (const [key, child] of Object.entries(value)) if (key !== 'hourlyData') visit(child);
  }
  records.forEach(visit);
  const dataset = datasets[0], data = hourlyData[0];
  if (datasets.length !== 1 || dataset.name !== 'Hourly Weather Forecast - Scarborough, Ontario' ||
      locations.length !== 1 || locations[0].placeName !== 'Scarborough' || locations[0].provCode !== 'ON' || locations[0].countryCode !== 'CA')
    throw new Error('Invalid structured forecast location');
  if (hourlyData.length !== 1 || !Array.isArray(data?.hourly)) throw new Error('Missing or ambiguous hourly hydration data');
  const unit = data.display?.unit;
  if (unit?.temperature !== 'C' || unit.wind !== 'km/h' || unit.relativeHumidity !== '%' || unit.pop !== '%')
    throw new Error('Invalid structured forecast units');
  const columns = dataset.mainEntity?.['csvw:tableSchema']?.['csvw:columns'];
  const count = Number(dataset.description?.match(/^A (\d+)-hour weather forecast in 1-hour periods for Scarborough, Ontario$/)?.[1]);
  if (coverage) Object.assign(coverage, {advertisedCount: Number.isSafeInteger(count) ? count : null, hydrationCount: data.hourly.length});
  if (!count || !Array.isArray(columns) || data.hourly.length !== count ||
      new Set(columns.map(c => c['csvw:name'])).size !== columns.length ||
      columns.some(c => !Array.isArray(c['csvw:cells']) || c['csvw:cells'].length !== count || c['csvw:cells'].some(cell => !Object.hasOwn(cell, 'csvw:value'))))
    throw new Error('Structured hourly coverage mismatch');
  const named = Object.fromEntries(columns.map(c => [c['csvw:name'], c['csvw:cells'].map(cell => cell['csvw:value'])]));
  for (const name of ['time', 'condition', 'temperature', 'feelsLike', 'windSpeed', 'windDirection', 'windGust', 'humidity', 'pop'])
    if (!Object.hasOwn(named, name)) throw new Error(`Missing structured column ${name}`);
  const generated = utc(data.generatedTimestamp?.utc);
  if (coverage) coverage.generatedAt = generated.toISOString();
  if (toronto(generated).slice(0, 16) !== data.generatedTimestamp.local ||
      generated > now || now - generated > 90 * 60 * 1000)
    throw new Error('Stale, future or inconsistent source generation timestamp');
  const hourly = data.hourly.map((row, i) => {
    const date = utc(row.time?.utc, true), time = toronto(date);
    if (coverage && i === 0) coverage.firstUtc = date.toISOString();
    if (coverage && i === data.hourly.length - 1) coverage.lastUtc = date.toISOString();
    if (time.slice(0, 16) !== row.time.local || named.time[i] !== row.time.local)
      throw new Error('Structured UTC/local timestamp disagreement');
    return {
      time, temp: row.temperature === null ? null : row.temperature?.value,
      feelsLike: row.feelsLike, condition: row.weatherCode === null ? null : row.weatherCode?.text,
      windSpeed: row.wind === null ? null : row.wind?.speed,
      windDirection: row.wind === null ? null : row.wind?.direction,
      windGust: row.wind === null ? null : row.wind?.gust,
      humidity: row.relativeHumidity, precipProb: row.pop,
    };
  });
  const first = Date.parse(hourly[0].time);
  if (first !== current && first !== current + 3600000) throw new Error('Invalid near-term structured coverage');
  const feed = validateFeed({
    schemaVersion: 1, source: 'the-weather-network', sourceUrl: SOURCE_URL,
    fetchedAt: now.toISOString(), location: { ...LOCATION }, hourly,
  });
  return { feed, generatedAt: generated.toISOString() };
}
