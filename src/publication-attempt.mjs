import {mkdir,readFile,writeFile,rename,rm} from 'node:fs/promises';
import {join} from 'node:path';
import {failureReason} from './diagnostics.mjs';
import {writeFailurePostmortems} from './failure-report.mjs';
export async function startPublicationAttempt(directory,started=Date.now()) {
 const root=join(directory,'failures'),pending=join(directory,'publication-pending.json');
 await mkdir(directory,{recursive:true,mode:0o700});
 async function save(record,diagnostics) {
  const folder=join(root,`${Date.parse(record.startedAt)}-${record.pid}`);
  await mkdir(folder,{recursive:true,mode:0o700});
  try {await writeFile(join(folder,'run-01.json'),JSON.stringify({...record,diagnostics},null,2)+'\n',{mode:0o600,flag:'wx'});}
  catch(error) {
    if(error.code!=='EEXIST')throw error;
    const saved=JSON.parse(await readFile(join(folder,'run-01.json'),'utf8'));
    if(saved.startedAt!==record.startedAt||saved.pid!==record.pid||saved.status!=='failed')throw new Error('Conflicting failure evidence; preserve the pending marker');
    record=saved;
  }
  await writeFailurePostmortems(folder,[record]);
  return join(folder,'postmortem-01.md');
 }
 try {
  const old=JSON.parse(await readFile(pending,'utf8'));
  if(old.kind!=='scraper'||old.status!=='pending'||!Number.isSafeInteger(old.pid)||old.pid<1||typeof old.startedAt!=='string'||!Number.isFinite(Date.parse(old.startedAt)))throw new Error('Invalid publication pending state; preserve and inspect publication-pending.json');
  await save({kind:'scraper',pid:old.pid,startedAt:old.startedAt,status:'failed',reason:'INTERRUPTED',durationMs:Math.max(0,started-Date.parse(old.startedAt)),publicationAttempted:true},{});
  await rm(pending);
 } catch(error) {if(error.code!=='ENOENT')throw error;}
 const record={kind:'scraper',pid:process.pid,startedAt:new Date(started).toISOString(),status:'pending',publicationAttempted:false};
 const temporary=`${pending}.${process.pid}.tmp`;
 await writeFile(temporary,JSON.stringify(record)+'\n',{mode:0o600});await rename(temporary,pending);
 const diagnostics={stage:'configuration',targets:[],documents:[],cookies:[]};
 return {record,diagnostics,
  async complete(){await rm(pending);},
  async fail(error){const report=await save({...record,status:'failed',reason:failureReason(error),durationMs:Date.now()-started},diagnostics);await rm(pending);return report;},
 };
}
