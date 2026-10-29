import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {mkdtemp,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
test('trial setup renders isolated units without credentials or activation',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'weather-trial-units-'));
 try{
  execFileSync(process.execPath,['scripts/setup-trial.mjs','--render-only',dir,'--plain']);
  const unit=await readFile(join(dir,'scrape-weather-trial.service'),'utf8');
  assert.match(unit,/scripts\/trial.mjs/);
  assert.doesNotMatch(unit,/EnvironmentFile|BLOB|src\/cli.mjs/);
  const timer=await readFile(join(dir,'scrape-weather-trial.timer'),'utf8');
  assert.match(timer,/scrape-weather-trial.service/);
 }finally{await rm(dir,{recursive:true,force:true});}
});
