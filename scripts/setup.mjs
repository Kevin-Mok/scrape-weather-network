import { mkdir, writeFile, stat, lstat, access } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { homedir, userInfo } from 'node:os';
import { renderUnits } from './units.mjs';
const args = process.argv.slice(2);
const plain = args.includes('--plain');
const say = (emoji, message) =>
  console.log(`${plain ? '' : emoji + ' '}${message}`);
function option(name, fallback) {
  const i = args.indexOf(name);
  if (i < 0) return fallback;
  if (!args[i + 1] || args[i + 1].startsWith('--'))
    throw new Error(`${name} needs a path`);
  return resolve(args[i + 1]);
}
function run(bin, argv) {
  execFileSync(bin, argv, { stdio: 'inherit' });
}
try {
  if (args.includes('--help')) {
    say('⚙️', 'Install the persistent half-hourly user timer');
    console.log(
      'Usage: npm run setup -- [--env-file PATH] [--render-only DIR] [--plain]\nDefault private environment: ~/.config/scrape-weather/env\nDefault installation: ~/.config/systemd/user; enables lingering when needed.\n--render-only writes units for inspection without activation. No sudo is normally needed.',
    );
    process.exit(0);
  }
  for (let i = 0; i < args.length; i++) {
    if (['--env-file', '--render-only'].includes(args[i])) {
      i++;
      continue;
    }
    if (args[i] !== '--plain') throw new Error(`Unknown option ${args[i]}`);
  }
  const root = fileURLToPath(new URL('..', import.meta.url));
  const configRoot = process.env.XDG_CONFIG_HOME || join(homedir(), '.config');
  const envFile = option('--env-file', join(configRoot, 'scrape-weather/env'));
  const renderOnly = option('--render-only', null);
  const target = renderOnly || join(configRoot, 'systemd/user');
  const units = renderUnits({ node: process.execPath, root, envFile });
  if (!renderOnly) {
    try {
      await access(envFile);
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
      if (!process.env.BLOB_READ_WRITE_TOKEN)
        throw new Error(
          `Create ${envFile} with BLOB_READ_WRITE_TOKEN before activation; see README.md`,
        );
      await mkdir(dirname(envFile), { recursive: true, mode: 0o700 });
      await writeFile(
        envFile,
        `BLOB_READ_WRITE_TOKEN=${JSON.stringify(process.env.BLOB_READ_WRITE_TOKEN)}\nAGENT_BROWSER_EXECUTABLE_PATH=/usr/bin/google-chrome\n`,
        { mode: 0o600, flag: 'wx' },
      );
    }
    const info = await lstat(envFile);
    if (!info.isFile() || info.mode & 0o077)
      throw new Error(
        `Private environment must be a regular file with mode 600: ${envFile}`,
      );
    process.loadEnvFile(envFile);
    if (!process.env.BLOB_READ_WRITE_TOKEN)
      throw new Error(`BLOB_READ_WRITE_TOKEN is missing in ${envFile}`);
    if (process.env.AGENT_BROWSER_EXECUTABLE_PATH)
      await access(process.env.AGENT_BROWSER_EXECUTABLE_PATH);
  }
  await mkdir(target, { recursive: true });
  await writeFile(join(target, 'scrape-weather.service'), units.service);
  await writeFile(join(target, 'scrape-weather.timer'), units.timer);
  say('✅', `Wrote service and timer to ${target}`);
  if (!renderOnly) {
    run('/usr/bin/systemctl', ['--user', 'daemon-reload']);
    run('/usr/bin/systemctl', [
      '--user',
      'enable',
      '--now',
      'scrape-weather.timer',
    ]);
    const linger = execFileSync(
      '/usr/bin/loginctl',
      ['show-user', userInfo().username, '-p', 'Linger', '--value'],
      { encoding: 'utf8' },
    ).trim();
    if (linger !== 'yes') {
      say('⚙️', 'Enabling lingering for runs after logout');
      run('/usr/bin/loginctl', ['enable-linger', userInfo().username]);
    }
    say(
      '✅',
      'Timer active at minutes 00 and 30. Run the service once to verify publication.',
    );
  }
} catch (error) {
  say('❌', `${error.message}. See README.md for recovery.`);
  process.exitCode = 1;
}
