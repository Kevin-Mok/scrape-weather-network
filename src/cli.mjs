import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { scrape } from './browser.mjs';
import { publishAndSave } from './publication.mjs';
const args = process.argv.slice(2);
const plain = args.includes('--plain') || process.env.CLI_PLAIN === '1';
const details = args.includes('--details');
const say = (glyph, message) =>
  console.error(`${plain ? '' : glyph + ' '}${message}`);
if (args.includes('--help')) {
  say('🌦️', 'Scarborough hourly scraper');
  console.log(
    'Usage: npm run scrape -- [--local] [--output PATH] [--plain] [--details]\n--local: save without publishing; --output: local JSON path (default data/scarborough-hourly.json)\nEach successful update accumulates names in weather-conditions.json beside the output.\n--plain: ASCII messages; --details: show diagnostic causes on failure\nPublication requires BLOB_READ_WRITE_TOKEN. AGENT_BROWSER_EXECUTABLE_PATH selects Chrome.',
  );
  process.exit(0);
}
const outputIndex = args.indexOf('--output');
const known = new Set(['--local', '--plain', '--details', '--output']);
if (
  args.some(
    (arg, i) => !(outputIndex >= 0 && i === outputIndex + 1) && !known.has(arg),
  ) ||
  (outputIndex >= 0 &&
    (!args[outputIndex + 1] || args[outputIndex + 1].startsWith('--')))
) {
  say('❌', 'Invalid arguments; use --help');
  process.exit(2);
}
const output = resolve(
  outputIndex >= 0
    ? args[outputIndex + 1]
    : fileURLToPath(
        new URL('../data/scarborough-hourly.json', import.meta.url),
      ),
);
const started = Date.now();
const progress = setInterval(
  () =>
    say(
      '⏳',
      `Scraper active; ${Math.round((Date.now() - started) / 1000)} seconds elapsed`,
    ),
  15000,
);
try {
  if (!args.includes('--local') && !process.env.BLOB_READ_WRITE_TOKEN)
    throw new Error(
      'Set BLOB_READ_WRITE_TOKEN in private configuration, or use --local',
    );
  const feed = await scrape({ log: (message) => say('🌐', message) });
  say(
    '📦',
    `Validated ${feed.hourly.length} hours; ${args.includes('--local') ? 'saving locally' : 'publishing to Vercel Blob'}`,
  );
  const blob = await publishAndSave(feed, output, {
    token: process.env.BLOB_READ_WRITE_TOKEN,
    local: args.includes('--local'),
  });
  say('✅', `Saved ${feed.hourly.length} hours to ${output}`);
  say(
    '🎨',
    `Updated condition catalog: ${join(dirname(output), 'weather-conditions.json')}`,
  );
  if (blob)
    say('☁️', `Published ${blob.url} (cache propagation up to 60 seconds)`);
} catch (error) {
  say(
    '❌',
    `${error.message}. Previous local output was preserved unless publication already succeeded.`,
  );
  if (details) console.error(error);
  process.exitCode = 1;
} finally {
  clearInterval(progress);
}
