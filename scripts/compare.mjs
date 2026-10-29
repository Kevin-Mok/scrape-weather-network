import { chromium } from 'playwright-core';
import assert from 'node:assert/strict';
import { extractStructured } from '../src/structured.mjs';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { browserCommand } from '../src/browser.mjs';
import { EXTRACT } from '../src/dom.mjs';
import { parseRows, SOURCE_URL } from '../src/feed.mjs';
import { capturePage, failureReason, safeArguments, safeUrl, cookieMetadata } from '../src/diagnostics.mjs';
const args = process.argv.slice(2);
const plain = args.includes('--plain') || process.env.CLI_PLAIN === '1';
const say = (glyph, message) => console.error(`${plain ? '' : glyph + ' '}${message}`);
if (args.includes('--help')) {
  say('🔬', 'Compare sandboxed system Chrome controllers without publication');
  console.log('Usage: npm run compare -- [--cache-disabled] [--output DIR] [--plain]\nFresh separate Chrome profiles; exact TWN URL; sanitized reports only.\n--cache-disabled applies CDP Network.setCacheDisabled before navigation.\nDefault output: data/diagnostics. No credentials or Blob writes.');
  process.exit(0);
}
let output = resolve('data/diagnostics');
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--output' && args[i + 1] && !args[i + 1].startsWith('--')) output = resolve(args[++i]);
  else if (!['--cache-disabled', '--plain'].includes(args[i])) {
    say('❌', 'Invalid arguments; use --help'); process.exit(2);
  }
}
const cacheDisabled = args.includes('--cache-disabled');
await mkdir(output, { recursive: true, mode: 0o700 });
const started = Date.now();
const progress = setInterval(() => say('⏳', `Comparison active; ${Math.round((Date.now() - started) / 1000)} seconds elapsed`), 15000);
const summaries = [];
try {
  for (const controller of ['agent-browser', 'playwright']) {
    const report = { controller, cacheDisabled, startedAt: new Date().toISOString(), targets: [], documents: [], cookies: [] };
    const profile = await mkdtemp(join(tmpdir(), `weather-${controller}-`));
    const command = browserCommand({ session: `compare-${controller}-${process.pid}`, executablePath: '/usr/bin/google-chrome' });
    let browser;
    let context;
    say('🔬', `Comparing ${controller}; cache ${cacheDisabled ? 'disabled' : 'default'}`);
    try {
      if (controller === 'agent-browser') {
        await command(['--profile', profile, 'open', 'about:blank']);
        await command(['network', 'requests']);
        const { cdpUrl } = await command(['get', 'cdp-url']);
        browser = await chromium.connectOverCDP(cdpUrl);
        context = browser.contexts()[0];
      } else {
        context = await chromium.launchPersistentContext(profile, { executablePath: '/usr/bin/google-chrome', headless: true, chromiumSandbox: true });
        browser = context.browser();
      }
      report.version = browser.version();
      const cdp = await browser.newBrowserCDPSession();
      const { processInfo } = await cdp.send('SystemInfo.getProcessInfo');
      const effective = await readFile(`/proc/${processInfo.find((p) => p.type === 'browser').id}/cmdline`, 'utf8');
      report.arguments = safeArguments(effective);
      const sandbox = await context.newPage();
      await sandbox.goto('chrome://sandbox');
      report.sandbox = await sandbox.locator('body').innerText();
      await sandbox.close();
      if (report.arguments.includes('--no-sandbox') || !report.sandbox.includes('adequately sandboxed')) throw new Error('SANDBOX_NOT_VERIFIED');
      const pages = context.pages();
      report.pageCount = pages.length;
      for (const page of pages) await capturePage(context, page, report, cacheDisabled);
      const page = pages.findLast((p) => p.url() === 'about:blank') || pages.at(-1);
      report.extractionTarget = safeUrl(page.url());
      const navigation = Date.now();
      try {
        if (controller === 'agent-browser') await command(['open', SOURCE_URL]);
        else await page.goto(SOURCE_URL, { waitUntil: 'domcontentloaded', timeout: 45000 });
      } catch (error) {
        if (failureReason(error) !== 'TIMEOUT' || page.url() !== SOURCE_URL) throw error;
        report.navigationTimedOut = true;
      }
      report.navigationMs = Date.now() - navigation;
      report.finalUrl = safeUrl(page.url());
      if (page.url() !== SOURCE_URL) throw new Error('FINAL_URL_MISMATCH');
      const extraction = Date.now();
      await page.waitForSelector('[data-testid="forecast-module-row"]', { timeout: 30000 });
      await page.evaluate(() => {
        const button = document.querySelector('button[aria-label="layout orientation"]');
        if (button?.getAttribute('aria-checked') === 'false') button.click();
      });
      await page.waitForFunction(() => {
        const count = document.querySelectorAll('[data-testid="forecast-module-row"]').length;
        return count > 0 && document.querySelectorAll('[data-testid="expanded-row"]').length === count;
      }, undefined, { timeout: 30000 });
      const now = new Date();
      const domFeed = parseRows(await page.evaluate(EXTRACT), now);
      const scripts = await page.locator('script').evaluateAll((nodes) => nodes.map((node) => ({ type: node.type, id: node.id, text: node.textContent })));
      const { feed, generatedAt } = extractStructured(scripts, now);
      assert.deepEqual(feed.hourly, domFeed.hourly, 'Structured and rendered hourly records must agree');
      report.generatedAt = generatedAt;
      report.extractionMs = Date.now() - extraction;
      report.rowCount = feed.hourly.length;
      report.firstToronto = feed.hourly[0].time;
      report.lastToronto = feed.hourly.at(-1).time;
      report.firstUtc = new Date(report.firstToronto).toISOString();
      report.lastUtc = new Date(report.lastToronto).toISOString();
      report.ok = true;
    } catch (error) {
      report.ok = false;
      report.reason = ['SANDBOX_NOT_VERIFIED', 'FINAL_URL_MISMATCH'].includes(error.message) ? error.message : failureReason(error);
    } finally {
      if (context) report.finalCookies = (await context.cookies().catch(() => [])).map(cookieMetadata);
      if (controller === 'agent-browser') {
        await command(['close']).catch(() => {});
        if (browser) await browser.close().catch(() => {});
      } else if (context) await context.close().catch(() => {});
      await rm(profile, { recursive: true, force: true });
      report.durationMs = Date.now() - Date.parse(report.startedAt);
      const path = join(output, `${controller}-${Date.parse(report.startedAt)}.json`);
      await writeFile(path, JSON.stringify(report, null, 2) + '\n', { mode: 0o600 });
      const summary = { controller, ok: report.ok, reason: report.reason, rowCount: report.rowCount, durationMs: report.durationMs, report: path };
      summaries.push(summary);
      say(report.ok ? '✅' : '❌', `${controller}: ${report.ok ? `${report.rowCount} validated hours` : report.reason}; ${report.durationMs} ms`);
    }
  }
  console.log(JSON.stringify({ cacheDisabled, results: summaries }, null, 2));
  if (summaries.some((result) => !result.ok)) process.exitCode = 1;
} finally { clearInterval(progress); }
