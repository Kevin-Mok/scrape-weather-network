import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import * as trial from '../scripts/trial.mjs';
import {renderTrialUnits} from '../scripts/trial-units.mjs';
const startedAt='2026-10-29T22:00:00.000Z';
const metadata={generatedAt:startedAt,navigationMs:12,extractionMs:5};
const feed={hourly:[{time:'2026-10-29T19:00:00-04:00'}]};
async function temporary(fn){const dir=await mkdtemp(join(tmpdir(),'weather-trial-test-'));try{await fn(dir);}finally{await rm(dir,{recursive:true,force:true});}}
test('trial persists pending before scraping and records complete output and metadata',()=>temporary(async directory=>{
 const result=await trial.runTrial({directory,now:()=>new Date(startedAt),scrapeFn:async ({onMetadata})=>{
  const pending=JSON.parse(await readFile(join(directory,'runs.json'),'utf8'));
  assert.equal(pending.length,1);assert.equal(pending[0].status,'pending');
  onMetadata(metadata);return feed;
 }});
 assert.equal(result.status,'passed');assert.equal(result.rowCount,1);assert.equal(result.generatedAt,startedAt);
 assert.equal(result.firstUtc,'2026-10-29T23:00:00.000Z');
 assert.deepEqual(JSON.parse(await readFile(join(directory,'feed-01.json'),'utf8')),feed);
 assert.equal((await trial.readTrial(directory))[0].status,'passed');
}));
test('48 recorded attempts do not launch another browser',()=>temporary(async directory=>{
 const runs=Array.from({length:48},(_,i)=>({startedAt:new Date(Date.parse(startedAt)+i*1800000).toISOString(),status:'failed',success:false,reason:'TIMEOUT',durationMs:5}));
 await writeFile(join(directory,'runs.json'),JSON.stringify(runs));
 assert.equal(await trial.runTrial({directory,scrapeFn:async()=>assert.fail('browser must not launch')}),null);
 assert.equal(trial.trialSummary(await trial.readTrial(directory)).attempts,48);
}));
test('failures are sanitized, interrupted runs count and prior reports survive',()=>temporary(async directory=>{
 await writeFile(join(directory,'runs.json'),JSON.stringify([{startedAt,status:'pending',success:false}]));
 await writeFile(join(directory,'run-01.json'),'prior diagnostic');
 const result=await trial.runTrial({directory,now:()=>new Date(Date.parse(startedAt)+3600000),scrapeFn:async()=>{throw new Error('net::ERR_TOO_MANY_REDIRECTS https://secret/?token=value');}});
 assert.equal(result.reason,'net::ERR_TOO_MANY_REDIRECTS');assert.equal(result.success,false);
 const runs=await trial.readTrial(directory);assert.equal(runs[0].reason,'INTERRUPTED');assert.equal(runs[0].status,'failed');
 assert.equal(await readFile(join(directory,'run-01.json'),'utf8'),'prior diagnostic');
 assert.equal(trial.trialSummary(runs).missedSlots,1);
 assert.equal(trial.trialSummary(runs).failures,2);
 assert.doesNotMatch(await readFile(join(directory,'runs.json'),'utf8'),/secret|token|value/);
}));
test('malformed state fails closed rather than resetting trial',()=>temporary(async directory=>{
 for(const text of ['{bad','{}','[{}]',JSON.stringify([{startedAt,status:'passed',success:true,rowCount:'72'}])]){
  await writeFile(join(directory,'runs.json'),text);
  await assert.rejects(trial.runTrial({directory,scrapeFn:async()=>assert.fail('must not scrape')}),/Invalid trial state/);
  assert.equal(await readFile(join(directory,'runs.json'),'utf8'),text);
 }
}));
test('trial units are independent, bounded, private and contain no publication credentials',()=>{
 const {service,timer}=renderTrialUnits({node:'/opt/node/bin/node',root:'/srv/weather trial'});
 assert.match(service,/TimeoutStartSec=300/);assert.match(service,/UMask=0077/);
 assert.match(service,/ExecStart="\/opt\/node\/bin\/node" "\/srv\/weather trial\/scripts\/trial.mjs"/);
 assert.doesNotMatch(service,/EnvironmentFile|BLOB|cli\.mjs/);
 assert.match(timer,/OnCalendar=\*-\*-\* \*:00,30:00/);assert.match(timer,/Persistent=true/);assert.match(timer,/Unit=scrape-weather-trial.service/);
 assert.throws(()=>renderTrialUnits({node:'node',root:'/srv/weather'}),/absolute/);
});

test('a successful browser without source generation metadata is rejected',()=>temporary(async directory=>{
 const result=await trial.runTrial({directory,scrapeFn:async()=>feed});
 assert.equal(result.status,'failed');assert.equal(result.success,false);
 assert.equal((await trial.readTrial(directory))[0].status,'failed');
}));

test('completed state validates endpoint agreement, coverage and stage durations',()=>temporary(async directory=>{
 const valid={startedAt,status:'passed',success:true,rowCount:1,generatedAt:startedAt,durationMs:20,navigationMs:12,extractionMs:5,firstToronto:feed.hourly[0].time,lastToronto:feed.hourly[0].time,firstUtc:'2026-10-29T23:00:00.000Z',lastUtc:'2026-10-29T23:00:00.000Z'};
 await writeFile(join(directory,'runs.json'),JSON.stringify([valid]));assert.equal((await trial.readTrial(directory)).length,1);
 for(const patch of [{firstUtc:'2026-10-30T00:00:00.000Z'},{lastUtc:'2026-10-29T22:00:00.000Z'},{rowCount:2},{navigationMs:undefined},{extractionMs:-1},{firstToronto:undefined}]){
  await writeFile(join(directory,'runs.json'),JSON.stringify([{...valid,...patch}]));
  await assert.rejects(trial.readTrial(directory),/Invalid trial state/);
 }
}));

test('each failed or interrupted attempt has its own private sanitized postmortem',()=>temporary(async directory=>{
 const runs=[{startedAt,status:'failed',success:false,reason:'TIMEOUT',durationMs:90},
  {startedAt:'2026-10-29T22:30:00.000Z',status:'failed',success:false,reason:'INTERRUPTED',durationMs:1800000},
  {startedAt:'2026-10-29T23:00:00.000Z',status:'passed',success:true}];
 await writeFile(join(directory,'run-01.json'),JSON.stringify({diagnostics:{stage:'structured-validation',rejection:'BROWSER_OR_EXTRACTION_FAILURE',cookies:[{value:'cookie-secret'}],documents:[
  {event:'request',requestId:'main',url:'https://www.theweathernetwork.com/en/city/ca/ontario/scarborough/hourly?secret=token-value'},
  {event:'request',requestId:'main',redirect:{status:302,fromDiskCache:true,headers:{Authorization:'header-secret'}}},
  {event:'response',requestId:'iframe',status:403},
  {event:'response',requestId:'main',status:200}
 ]}}));
 assert.equal(typeof trial.writeFailurePostmortems,'function');
 await trial.writeFailurePostmortems(directory,runs);
 const one=await readFile(join(directory,'postmortem-01.md'),'utf8');
 const two=await readFile(join(directory,'postmortem-02.md'),'utf8');
 assert.match(one,/2026-10-29T22:00:00.000Z/);assert.match(one,/structured-validation/);assert.match(one,/302, 200/);assert.match(one,/Cache hits: 1/);assert.match(one,/run-01\.json/);
 assert.doesNotMatch(one,/cookie-secret|token-value|header-secret|403/);
 assert.match(two,/INTERRUPTED/);assert.match(two,/First attempt; no automatic retry/);
 await assert.rejects(readFile(join(directory,'postmortem-03.md')),{code:'ENOENT'});
 await trial.writeFailurePostmortems(directory,runs);assert.equal(await readFile(join(directory,'postmortem-01.md'),'utf8'),one);
}));

test('status distinguishes an active pending run from confirmed failure or interruption',()=>{
 const summary=trial.trialSummary([{startedAt,status:'pending',success:false}]);
 assert.equal(summary.pending,1);assert.equal(summary.failures,0);assert.equal(summary.interrupted,0);
});

test('an interrupted final attempt receives a postmortem without launching attempt49',()=>temporary(async directory=>{
 const runs=Array.from({length:48},(_,i)=>({startedAt:new Date(Date.parse(startedAt)+i*1800000).toISOString(),status:'failed',success:false,reason:'TIMEOUT',durationMs:5}));
 runs[47]={startedAt:runs[47].startedAt,status:'pending',success:false};
 await writeFile(join(directory,'runs.json'),JSON.stringify(runs));
 assert.equal(await trial.runTrial({directory,scrapeFn:async()=>assert.fail('must not launch')}),null);
 assert.equal((await trial.readTrial(directory))[47].reason,'INTERRUPTED');
 assert.match(await readFile(join(directory,'postmortem-48.md'),'utf8'),/INTERRUPTED/);
}));

test('failure postmortems include only allowlisted source-window and disagreement evidence',()=>temporary(async directory=>{
 const record={startedAt,status:'failed',success:false,reason:'SOURCE_COVERAGE_INVALID',durationMs:30};
 await writeFile(join(directory,'run-01.json'),JSON.stringify({diagnostics:{
  stage:'script-retrieval',sourceCoverage:{checkedAt:startedAt,generatedAt:startedAt,firstUtc:'2026-10-30T00:00:00.000Z',lastUtc:'2026-11-01T23:00:00.000Z',allowedFirstUtc:[startedAt,'2026-10-29T23:00:00.000Z','private-value'],advertisedCount:72,hydrationCount:72,token:'source-secret'},
  renderedCoverage:{rowCount:72,timeCount:72,advertisedCount:72,token:'dom-secret'},
  disagreement:{rowIndex:4,field:'temp',value:'reading-secret'},
 }}));
 await trial.writeFailurePostmortems(directory,[record]);
 const report=await readFile(join(directory,'postmortem-01.md'),'utf8');
 assert.match(report,/script-retrieval/);assert.match(report,/Source checked UTC: 2026-10-29T22:00:00.000Z/);
 assert.match(report,/Source first\/last UTC: 2026-10-30T00:00:00.000Z \/ 2026-11-01T23:00:00.000Z/);
 assert.match(report,/Allowed first UTC: 2026-10-29T22:00:00.000Z, 2026-10-29T23:00:00.000Z/);
 assert.match(report,/Advertised\/hydration\/rendered counts: 72 \/ 72 \/ 72/);
 assert.match(report,/First disagreement: row 4, field temp/);
 assert.doesNotMatch(report,/private-value|source-secret|dom-secret|reading-secret/);
}));
