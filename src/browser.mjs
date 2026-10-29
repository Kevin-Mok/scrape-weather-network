import { isDeepStrictEqual } from 'node:util';
import { extractStructured } from './structured.mjs';
import { capturePage, failureReason } from './diagnostics.mjs';
import { chromium } from 'playwright-core';
import { execFile } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { parseRows, SOURCE_URL } from './feed.mjs';
import { EXTRACT } from './dom.mjs';
export function browserCommand({
  session = `scarborough-${process.pid}`,
  executablePath = process.env.AGENT_BROWSER_EXECUTABLE_PATH || '/usr/bin/google-chrome',
} = {}) {
  const bin = fileURLToPath(
    new URL('../node_modules/.bin/agent-browser', import.meta.url),
  );
  return (args, input) =>
    new Promise((resolve, reject) => {
      const flags = ['--session', session, '--headed', 'false', '--json'];
      if (executablePath) flags.push('--executable-path', executablePath);
      const child = execFile(
        bin,
        [...flags, ...args],
        {
          timeout: 45000,
          maxBuffer: 4 * 1024 * 1024,
          env: { ...process.env, AGENT_BROWSER_DEFAULT_TIMEOUT: '30000' },
        },
        (error, stdout, stderr) => {
          if (error) {
            const diagnostic = stderr || stdout || error.message;
            const failure = new Error(`Browser ${args[0]} failed`, {
              cause: new Error(diagnostic),
            });
            if (/timed out/i.test(diagnostic)) failure.code = 'BROWSER_TIMEOUT';
            return reject(failure);
          }
          try {
            const response = JSON.parse(stdout);
            if (!response.success)
              throw new Error(response.error || 'Browser failed');
            resolve(response.data?.result ?? response.data);
          } catch (e) {
            reject(e);
          }
        },
      );
      child.stdin.end(input);
    });
}
export async function prepareBrowser(command, diagnostics) {
  await command(['open', 'chrome://sandbox']);
  const status = await command(['eval', 'document.body.innerText']);
  if (!status.includes('You are adequately sandboxed.'))
    throw new Error('System Chrome sandbox verification failed');
  const { cdpUrl } = await command(['get', 'cdp-url']);
  const browser = await chromium.connectOverCDP(cdpUrl, { timeout: 15000 });
  try {
    const page = browser.contexts()[0].pages().find(p => p.url() === 'chrome://sandbox/');
    if (!page) throw new Error('Cannot locate the active sandbox verification tab');
    if (diagnostics) await capturePage(page.context(), page, diagnostics, true);
    else {
      const session = await page.context().newCDPSession(page);
      await session.send('Network.enable');
      // TWN caches cookie-issuance redirects; reusing them loops despite accepted cookies.
      await session.send('Network.setCacheDisabled', { cacheDisabled: true });
    }
    return () => browser.close();
  } catch (error) {
    await browser.close();
    throw error;
  }
}
export async function scrape({
  command,
  prepare = command ? null : prepareBrowser,
  verifyStructured = !command,
  diagnostics,
  onMetadata = () => {},
  now,
  log = () => {},
} = {}) {
  command ??= browserCommand();
  let failure, cleanup;
  try {
    if (diagnostics) diagnostics.stage = 'preparation';
    if (prepare) cleanup = await prepare(command, diagnostics);
    const navigation = Date.now();
    if (diagnostics) diagnostics.stage = 'navigation';
    log('Opening Scarborough hourly forecast');
    try {
      await command(['open', SOURCE_URL]);
    } catch (error) {
      if (error.code !== 'BROWSER_TIMEOUT') throw error;
      log('Page load timed out; checking rendered forecast readiness');
    }
    if ((await command(['eval', 'location.href'])) !== SOURCE_URL)
      throw new Error('Navigation did not reach the exact forecast source');
    const navigationMs = Date.now() - navigation;
    const extraction = Date.now();
    if (diagnostics) diagnostics.stage = 'readiness';
    await command([
      'wait',
      '--fn',
      `!!document.querySelector('[data-testid="forecast-module-row"]')`,
    ]);
    // The vertical view renders every row expanded, including metrics hidden in the horizontal view.
    await command([
      'eval',
      `(() => {const s=document.querySelector('button[aria-label="layout orientation"]');if(s?.getAttribute('aria-checked')==='false')s.click();return true})()`,
    ]);
    await command([
      'wait',
      '--fn',
      `document.querySelectorAll('[data-testid="expanded-row"]').length===document.querySelectorAll('[data-testid="forecast-module-row"]').length && document.querySelectorAll('[data-testid="expanded-row"]').length>0`,
    ]);
    log('Extracting every expanded hourly row');
    if (diagnostics) diagnostics.stage = 'dom-evaluation';
    const raw = await command(['eval', '--stdin'], EXTRACT);
    if (diagnostics) diagnostics.renderedCoverage = {rowCount: Array.isArray(raw?.rows) ? raw.rows.length : null, timeCount: Array.isArray(raw?.times) ? raw.times.length : null, advertisedCount: Number.isSafeInteger(raw?.expectedCount) ? raw.expectedCount : null};
    const checkedAt = now ?? new Date();
    if (diagnostics) diagnostics.stage = 'rendered-validation';
    const domFeed = parseRows(raw, checkedAt);
    if (!verifyStructured) return domFeed;
    if (diagnostics) diagnostics.stage = 'script-retrieval';
    const scripts = await command(['eval', 'Array.from(document.scripts, s => ({type:s.type,text:s.textContent}))']);
    if (diagnostics) diagnostics.stage = 'structured-validation';
    const {feed, generatedAt} = extractStructured(scripts, checkedAt, diagnostics);
    if (diagnostics) diagnostics.stage = 'source-agreement';
    if (!isDeepStrictEqual(feed.hourly, domFeed.hourly)) {
      if (diagnostics) {
        const index = feed.hourly.findIndex((row, i) => !isDeepStrictEqual(row, domFeed.hourly[i]));
        diagnostics.disagreement = {rowIndex: index, field: Object.keys(feed.hourly[index] || {}).find(key => !isDeepStrictEqual(feed.hourly[index][key], domFeed.hourly[index]?.[key])) || 'rowCount'};
      }
      throw new Error('Structured and rendered hourly forecasts disagree');
    }
    if (diagnostics) diagnostics.stage = 'validated';
    onMetadata({generatedAt, navigationMs, extractionMs: Date.now() - extraction});
    log(`Source generation: ${generatedAt}; structured and rendered forecasts agree`);
    return feed;
  } catch (error) {
    failure = error;
    if (diagnostics) diagnostics.rejection = failureReason(error);
    throw error;
  } finally {
    try {
      await command(['close']);
    } catch (error) {
      if (!failure) throw error;
      log('Browser cleanup also failed; see details');
    } finally {
      await cleanup?.();
    }
  }
}
