import {mkdir,writeFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {homedir} from 'node:os';
import {join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {renderTrialUnits} from './trial-units.mjs';
const args=process.argv.slice(2);
const plain=args.includes('--plain') || process.env.CLI_PLAIN==='1';
const say=(glyph,message)=>console.log(`${plain?'':glyph+' '}${message}`);
try {
 if(args.includes('--help')) {
  say('🔬','Install the separate nonpublishing 48-attempt trial timer');
  console.log('Usage: npm run setup:trial -- [--render-only DIR] [--plain]\nNo credentials loaded; production service unchanged. Runs at minutes 00/30.\nAfter 48 attempts the service performs no more browser access. No sudo normally needed.');
 } else {
  let target=join(process.env.XDG_CONFIG_HOME||join(homedir(),'.config'),'systemd/user');
  let renderOnly=false;
  for(let i=0;i<args.length;i++) {
   if(args[i]==='--render-only' && args[i+1] && !args[i+1].startsWith('--')) {target=resolve(args[++i]);renderOnly=true;}
   else if(args[i]!=='--plain') throw new Error('Invalid arguments; use --help');
  }
  const units=renderTrialUnits({node:process.execPath,root:fileURLToPath(new URL('..',import.meta.url))});
  await mkdir(target,{recursive:true});
  await writeFile(join(target,'scrape-weather-trial.service'),units.service);
  await writeFile(join(target,'scrape-weather-trial.timer'),units.timer);
  say('✅',`Wrote trial units to ${target}`);
  if(!renderOnly) {
   execFileSync('/usr/bin/systemctl',['--user','daemon-reload'],{stdio:'inherit'});
   execFileSync('/usr/bin/systemctl',['--user','enable','--now','scrape-weather-trial.timer'],{stdio:'inherit'});
   say('✅','Trial timer active at minutes 00 and 30; production service unchanged');
  }
 }
} catch(error) {say('❌',`${error.message}. See README.md for recovery.`);process.exitCode=1;}
