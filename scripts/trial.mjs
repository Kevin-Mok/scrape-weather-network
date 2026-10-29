import {writeFailurePostmortems} from '../src/failure-report.mjs';
export {writeFailurePostmortems} from '../src/failure-report.mjs';
import {mkdir,readFile,writeFile,rename,rm} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {scrape} from '../src/browser.mjs';
import {failureReason} from '../src/diagnostics.mjs';
const MAX_RUNS=48;
const date=value=>typeof value==='string'&&/^\d{4}-\d{2}-\d{2}T.*Z$/.test(value)&&Number.isFinite(Date.parse(value));
const finite=value=>typeof value==='number'&&Number.isFinite(value)&&value>=0;
const toronto=value=>typeof value==='string'&&/^\d{4}-\d{2}-\d{2}T\d{2}:00:00-0[45]:00$/.test(value)&&Number.isFinite(Date.parse(value));
export async function readTrial(directory){
  let runs;
  try{runs=JSON.parse(await readFile(join(directory,'runs.json'),'utf8'));}
  catch(error){if(error.code==='ENOENT')return [];throw new Error('Invalid trial state; restore runs.json before continuing',{cause:error});}
  if(!Array.isArray(runs)||runs.length>MAX_RUNS||runs.some(r=>
    !r||!date(r.startedAt)||!['pending','passed','failed'].includes(r.status)||typeof r.success!=='boolean'||
    (r.status==='passed'&&(!r.success||!Number.isInteger(r.rowCount)||r.rowCount<1||!date(r.generatedAt)||!date(r.firstUtc)||!date(r.lastUtc)||!toronto(r.firstToronto)||!toronto(r.lastToronto)||
      Date.parse(r.firstToronto)!==Date.parse(r.firstUtc)||Date.parse(r.lastToronto)!==Date.parse(r.lastUtc)||
      Date.parse(r.lastUtc)-Date.parse(r.firstUtc)!==(r.rowCount-1)*3600000||!finite(r.navigationMs)||!finite(r.extractionMs)))||
    (r.status!=='passed'&&r.success)||
    (r.status!=='pending'&&!finite(r.durationMs))||
    (r.status==='failed'&&(typeof r.reason!=='string'||!r.reason))))
    throw new Error('Invalid trial state; restore runs.json before continuing');
  return runs;
}
async function atomic(path,value){
  const temporary=`${path}.tmp-${process.pid}`;
  try{await writeFile(temporary,JSON.stringify(value,null,2)+'\n',{mode:0o600});await rename(temporary,path);}
  finally{await rm(temporary,{force:true});}
}
export function trialSummary(runs){
  const slots=new Set(runs.map(r=>Math.floor(Date.parse(r.startedAt)/1800000)));
  const missedSlots=slots.size?Math.max(...slots)-Math.min(...slots)+1-slots.size:0;
  const successes=runs.filter(r=>r.status==='passed').length;
  const interrupted=runs.filter(r=>r.reason==='INTERRUPTED').length;
  const pending=runs.filter(r=>r.status==='pending').length;
  return {attempts:runs.length,limit:MAX_RUNS,successes,firstAttemptSuccesses:successes,retryRecoveries:0,failures:runs.filter(r=>r.status==='failed').length,pending,interrupted,missedSlots,
    uniqueSlots:slots.size,complete:runs.length===MAX_RUNS,
    accepted:runs.length===MAX_RUNS&&successes===MAX_RUNS&&slots.size===MAX_RUNS&&missedSlots===0&&runs.every(r=>r.durationMs<300000)};
}
export async function runTrial({directory,scrapeFn=scrape,now=()=>new Date(),log=()=>{}}){
  await mkdir(directory,{recursive:true,mode:0o700});
  const runs=await readTrial(directory);
  for(const r of runs)if(r.status==='pending')Object.assign(r,{status:'failed',success:false,reason:'INTERRUPTED',durationMs:Math.max(0,now().getTime()-Date.parse(r.startedAt))});
  await atomic(join(directory,'runs.json'),runs);
  await writeFailurePostmortems(directory,runs);
  if(runs.length>=MAX_RUNS)return null;
  const startedAt=now().toISOString();
  const record={startedAt,status:'pending',success:false};runs.push(record);
  await atomic(join(directory,'runs.json'),runs);
  const number=String(runs.length).padStart(2,'0');
  const diagnostics={targets:[],documents:[],cookies:[]};
  try{
    const feed=await scrapeFn({diagnostics,log,onMetadata:({generatedAt,navigationMs,extractionMs})=>{
      if(date(generatedAt))record.generatedAt=generatedAt;
      if(finite(navigationMs))record.navigationMs=navigationMs;
      if(finite(extractionMs))record.extractionMs=extractionMs;
    }});
    if(!date(record.generatedAt)||!finite(record.navigationMs)||!finite(record.extractionMs))throw new Error('Missing source generation or timing evidence');
    const first=feed.hourly[0].time,last=feed.hourly.at(-1).time;
    await atomic(join(directory,`feed-${number}.json`),feed);
    Object.assign(record,{status:'passed',success:true,rowCount:feed.hourly.length,firstToronto:first,lastToronto:last,
      firstUtc:new Date(first).toISOString(),lastUtc:new Date(last).toISOString()});
  }catch(error){Object.assign(record,{status:'failed',success:false,reason:failureReason(error)});}
  record.durationMs=Math.max(0,now().getTime()-Date.parse(startedAt));
  await atomic(join(directory,`run-${number}.json`),{...record,diagnostics});
  await atomic(join(directory,'runs.json'),runs);
  await writeFailurePostmortems(directory,runs);
  return record;
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const args=process.argv.slice(2),plain=args.includes('--plain')||process.env.CLI_PLAIN==='1';
  const say=(emoji,text)=>console.error(`${plain?'':emoji+' '}${text}`);
  const directory=fileURLToPath(new URL('../data/trial/',import.meta.url));
  if(args.includes('--help')){
    say('🧪','Bounded non-publishing weather trial');
    console.log('Usage: node scripts/trial.mjs [--status] [--plain] [--help]\nRuns one fresh browser attempt, saves private data/trial reports, and stops browser work after 48 attempts.\n--status reads results and backfills failure postmortems without opening Chrome. Start runs through the trial systemd service to serialize them.');
  }else if(args.some(a=>!['--status','--plain'].includes(a))){say('❌','Invalid arguments; use --help');process.exitCode=2;}
  else{
    const started=Date.now();
    const progress=args.includes('--status')?null:setInterval(()=>say('⏳',`Trial active; ${Math.round((Date.now()-started)/1000)} seconds elapsed`),15000);
    try{
      const record=args.includes('--status')?null:await runTrial({directory,log:message=>say('🌐',message)});
      if(!args.includes('--status'))say(record?.success?'✅':'🧪',record?`Attempt ${record.status}; ${record.durationMs} ms`:'48 attempts recorded; no browser opened');
      const runs=await readTrial(directory);
      await writeFailurePostmortems(directory,runs);
      console.log(JSON.stringify(trialSummary(runs),null,2));
      if(record&&!record.success)process.exitCode=1;
    }catch(error){say('❌',error.message);process.exitCode=1;}
    finally{clearInterval(progress);}
  }
}
