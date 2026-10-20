import test from 'node:test';
import assert from 'node:assert/strict';
import { renderUnits } from '../scripts/units.mjs';
test('timer is persistent at minute 00/30 with five-minute timeout and absolute paths', () => {
  const { service, timer } = renderUnits({
    node: '/opt/node/bin/node',
    root: '/srv/weather scraper',
    envFile: '/home/user/.config/scrape-weather/env',
  });
  assert.match(service, /TimeoutStartSec=300/);
  assert.match(service, /WorkingDirectory=\//);
  assert.match(
    service,
    /ExecStart="\/opt\/node\/bin\/node" "\/srv\/weather scraper\/src\/cli.mjs"/,
  );
  assert.match(
    service,
    /EnvironmentFile=\/home\/user\/\.config\/scrape-weather\/env/,
  );
  assert.match(
    service,
    /Environment="PATH=\/opt\/node\/bin:\/usr\/local\/bin:\/usr\/bin:\/bin"/,
  );
  assert.match(timer, /OnCalendar=\*-\*-\* \*:00,30:00/);
  assert.match(timer, /Persistent=true/);
});
test('systemd path quotes protect literal percent dollars backslashes and reject newlines', () => {
  const { service } = renderUnits({
    node: '/bin/node',
    root: '/srv/100% $weather',
    envFile: '/config/a"b',
  });
  assert.ok(service.includes('100%% $$weather'));
  assert.ok(service.includes('a"b'));
  assert.throws(() =>
    renderUnits({ node: 'node', root: '/app', envFile: '/config/env' }),
  );
  assert.throws(() =>
    renderUnits({
      node: '/bin/node',
      root: '/app\nBAD=1',
      envFile: '/config/env',
    }),
  );
});
