import { readFileSync } from 'node:fs';
import { dirname, isAbsolute, join } from 'node:path';
function quote(value, expandDollar = false) {
  if (!isAbsolute(value) || /[\r\n\0]/.test(value))
    throw new Error('systemd paths must be absolute and contain no newlines');
  return (
    '"' +
    value
      .replace(/\\/g, '\\\\')
      .replace(/"/g, '\\"')
      .replace(/%/g, '%%')
      .replace(/\$/g, expandDollar ? '$$$$' : '$') +
    '"'
  );
}
export function renderUnits({ node, root, envFile }) {
  const template = readFileSync(
    new URL('../systemd/scrape-weather.service', import.meta.url),
    'utf8',
  );
  const path = `${dirname(node)}:/usr/local/bin:/usr/bin:/bin`;
  return {
    service: template
      .replace('@ENV_FILE@', () => {
        quote(envFile);
        return envFile.replace(/%/g, '%%');
      })
      .replace(
        '@PATH@',
        () => `"PATH=${path.replace(/%/g, '%%').replace(/"/g, '\\"')}"`,
      )
      .replace('@NODE@', () => quote(node, true))
      .replace('@CLI@', () => quote(join(root, 'src/cli.mjs'), true)),
    timer: readFileSync(
      new URL('../systemd/scrape-weather.timer', import.meta.url),
      'utf8',
    ),
  };
}
