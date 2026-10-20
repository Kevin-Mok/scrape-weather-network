export const SOURCE_URL =
  'https://www.theweathernetwork.com/en/city/ca/ontario/scarborough/hourly';
export const LOCATION = {
  name: 'Scarborough, Toronto, Ontario, Canada',
  postalCode: 'M1E4V4',
  latitude: 43.7729744,
  longitude: -79.2576479,
  timezone: 'America/Toronto',
};
const formatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: LOCATION.timezone,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});
function localTime(date) {
  const parts = Object.fromEntries(
    formatter.formatToParts(date).map((p) => [p.type, p.value]),
  );
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
}
export function torontoTimestamp(time, previous = null, now = new Date()) {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:00$/.test(time))
    throw new Error(`Invalid source time: ${time}`);
  const candidates = ['-04:00', '-05:00']
    .map((offset) => `${time}:00${offset}`)
    .filter(
      (value) =>
        Number.isFinite(Date.parse(value)) &&
        localTime(new Date(value)) === time,
    );
  const chosen = candidates.find((value) =>
    previous
      ? Date.parse(value) - Date.parse(previous) === 3600000
      : Date.parse(value) >= Math.floor(now.getTime() / 3600000) * 3600000 &&
        Date.parse(value) <= now.getTime() + 7200000,
  );
  if (!chosen)
    throw new Error(
      `Nonexistent, out-of-order or expired Toronto hour: ${time}`,
    );
  return chosen;
}
const unavailable = /^(?:--?|—|N\/A|Unavailable|No data)$/i;
function text(value, field) {
  if (typeof value !== 'string' || !value.trim())
    throw new Error(`Missing ${field}`);
  return value.trim().replace(/−/g, '-').replace(/\s+/g, ' ');
}
function numeric(value, field, pattern) {
  const s = text(value, field);
  if (unavailable.test(field === 'feels-like' ? s.replace(/^Feels\s+/, '') : s))
    return null;
  const match = s.match(pattern);
  if (!match) throw new Error(`Malformed ${field}: ${s}`);
  return Number(match[1]);
}
export function parseRows(raw, now = new Date()) {
  if (
    !Array.isArray(raw?.rows) ||
    !Array.isArray(raw.times) ||
    !raw.rows.length ||
    raw.rows.length !== raw.times.length ||
    raw.expectedCount !== raw.rows.length
  )
    throw new Error(
      'Hourly coverage mismatch: not every source row is expanded',
    );
  let previous = null;
  const hourly = raw.rows.map((row, index) => {
    const time = torontoTimestamp(raw.times[index], previous, now);
    previous = time;
    const hour = Number(raw.times[index].slice(11, 13));
    if (
      text(row.label, 'hour label').toLowerCase() !==
      `${hour % 12 || 12}${hour < 12 ? 'am' : 'pm'}`
    )
      throw new Error('DOM hour label does not match source timestamp');
    const wind = text(row.wind, 'wind');
    const windMatch = wind.match(
      /^(\d+(?:\.\d+)?) km\/h (N|NNE|NE|ENE|E|ESE|SE|SSE|S|SSW|SW|WSW|W|WNW|NW|NNW|VRB)$/,
    );
    if (!windMatch && !unavailable.test(wind) && !/^calm$/i.test(wind))
      throw new Error(`Malformed wind: ${wind}`);
    const condition = text(row.condition, 'condition');
    return {
      time,
      temp: numeric(row.temp, 'temperature', /^(-?\d+(?:\.\d+)?)\s*°(?:C)?$/),
      feelsLike: numeric(
        row.feelsLike,
        'feels-like',
        /^Feels\s+(-?\d+(?:\.\d+)?)(?:\s*°(?:C)?)?$/,
      ),
      condition: unavailable.test(condition) ? null : condition,
      windSpeed: windMatch
        ? Number(windMatch[1])
        : /^calm$/i.test(wind)
          ? 0
          : null,
      windDirection: windMatch ? windMatch[2] : null,
      windGust: numeric(row.windGust, 'wind gust', /^(\d+(?:\.\d+)?) km\/h$/),
      humidity: numeric(row.humidity, 'humidity', /^(\d+(?:\.\d+)?)%$/),
      precipProb: numeric(
        row.precipProb,
        'precipitation probability',
        /^(\d+(?:\.\d+)?)%$/,
      ),
    };
  });
  return validateFeed({
    schemaVersion: 1,
    source: 'the-weather-network',
    sourceUrl: SOURCE_URL,
    fetchedAt: now.toISOString(),
    location: { ...LOCATION },
    hourly,
  });
}
export function validateFeed(feed) {
  if (
    feed?.schemaVersion !== 1 ||
    feed.source !== 'the-weather-network' ||
    feed.sourceUrl !== SOURCE_URL ||
    !/^\d{4}-\d{2}-\d{2}T.*Z$/.test(feed.fetchedAt) ||
    !Number.isFinite(Date.parse(feed.fetchedAt))
  )
    throw new Error('Invalid feed metadata');
  if (
    !Object.entries(LOCATION).every(([k, v]) => feed.location?.[k] === v) ||
    !Array.isArray(feed.hourly) ||
    feed.hourly.length === 0
  )
    throw new Error('Invalid feed location or empty hourly data');
  let previous = null;
  for (const row of feed.hourly) {
    if (
      typeof row.time !== 'string' ||
      !/^\d{4}-\d{2}-\d{2}T\d{2}:00:00-0[45]:00$/.test(row.time) ||
      localTime(new Date(row.time)) !== row.time.slice(0, 16) ||
      (previous !== null && Date.parse(row.time) - previous !== 3600000)
    )
      throw new Error('Invalid Toronto hourly sequence');
    previous = Date.parse(row.time);
    for (const [field, min, max] of [
      ['temp', -100, 70],
      ['feelsLike', -120, 80],
      ['windSpeed', 0, 500],
      ['windGust', 0, 500],
      ['humidity', 0, 100],
      ['precipProb', 0, 100],
    ]) {
      const value = row[field];
      if (
        value !== null &&
        (typeof value !== 'number' ||
          !Number.isFinite(value) ||
          value < min ||
          value > max)
      )
        throw new Error(`Invalid ${field}`);
    }
    if (
      row.condition !== null &&
      (typeof row.condition !== 'string' || !row.condition.trim())
    )
      throw new Error('Invalid condition');
    if (
      row.windDirection !== null &&
      !/^(N|NNE|NE|ENE|E|ESE|SE|SSE|S|SSW|SW|WSW|W|WNW|NW|NNW|VRB)$/.test(
        row.windDirection,
      )
    )
      throw new Error('Invalid wind direction');
  }
  return feed;
}
