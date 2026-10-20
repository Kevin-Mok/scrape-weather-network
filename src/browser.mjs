import { execFile } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { parseRows, SOURCE_URL } from './feed.mjs';
import { EXTRACT } from './dom.mjs';
export function browserCommand({
  session = `scarborough-${process.pid}`,
  executablePath = process.env.AGENT_BROWSER_EXECUTABLE_PATH,
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
export async function scrape({
  command = browserCommand(),
  now,
  log = () => {},
} = {}) {
  let failure;
  try {
    log('Opening Scarborough hourly forecast');
    try {
      await command(['open', SOURCE_URL]);
    } catch (error) {
      if (error.code !== 'BROWSER_TIMEOUT') throw error;
      if (
        (await command(['eval', 'location.origin + location.pathname'])) !==
        SOURCE_URL
      )
        throw new Error('Navigation did not reach the exact forecast source');
      log('Page load timed out; checking rendered forecast readiness');
    }
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
    const raw = await command(['eval', '--stdin'], EXTRACT);
    return parseRows(raw, now ?? new Date());
  } catch (error) {
    failure = error;
    throw error;
  } finally {
    try {
      await command(['close']);
    } catch (error) {
      if (!failure) throw error;
      log('Browser cleanup also failed; see details');
    }
  }
}
