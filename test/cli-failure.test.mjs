import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {mkdtemp,writeFile,readFile,readdir,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
test('failed publishing invocation preserves old output and creates a sanitized postmortem',async()=>{
 const directory=await mkdtemp(join(tmpdir(),'weather-publish-failure-'));
 try{
  const output=join(directory,'hourly.json');await writeFile(output,'last-good-forecast');
  const result=spawnSync(process.execPath,['src/cli.mjs','--output',output,'--plain'],{encoding:'utf8',env:{...process.env,BLOB_READ_WRITE_TOKEN:''}});
  assert.equal(result.status,1);
  assert.equal(await readFile(output,'utf8'),'last-good-forecast');
  const failures=await readdir(join(directory,'failures'));assert.equal(failures.length,1);
  const report=await readFile(join(directory,'failures',failures[0],'postmortem-01.md'),'utf8');
  assert.match(report,/CREDENTIALS_MISSING/);assert.match(report,/Diagnostic stage: configuration/);
  assert.match(report,/No publication was attempted/);
  assert.match(result.stderr,/Failure postmortem:/);
 }finally{await rm(directory,{recursive:true,force:true});}
});

test('the next publishing invocation preserves an interrupted predecessor and does not claim publication was absent',async()=>{
 const directory=await mkdtemp(join(tmpdir(),'weather-publish-interrupted-'));
 try{
  await writeFile(join(directory,'publication-pending.json'),JSON.stringify({kind:'scraper',status:'pending',pid:123,startedAt:'2026-10-29T20:00:00.000Z',token:'must-not-be-copied'}));
  const result=spawnSync(process.execPath,['src/cli.mjs','--output',join(directory,'hourly.json'),'--plain'],{encoding:'utf8',env:{...process.env,BLOB_READ_WRITE_TOKEN:''}});
  assert.equal(result.status,1);
  const folders=await readdir(join(directory,'failures'));assert.equal(folders.length,2);
  const interrupted=await readFile(join(directory,'failures','1793304000000-123','postmortem-01.md'),'utf8');
  assert.match(interrupted,/INTERRUPTED/);assert.match(interrupted,/Publication may have been attempted/);assert.doesNotMatch(interrupted,/No publication was attempted/);
  assert.doesNotMatch(await readFile(join(directory,'failures','1793304000000-123','run-01.json'),'utf8'),/must-not-be-copied/);
 }finally{await rm(directory,{recursive:true,force:true});}
});
