import {readFile,writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {SOURCE_URL} from './feed.mjs';
const date=value=>typeof value==='string'&&/^\d{4}-\d{2}-\d{2}T.*Z$/.test(value)&&Number.isFinite(Date.parse(value));
const finite=value=>typeof value==='number'&&Number.isFinite(value)&&value>=0;
export async function writeFailurePostmortems(directory,runs){
  const stages=['configuration','publication','preparation','navigation','readiness','dom-evaluation','script-retrieval','rendered-validation','structured-validation','source-agreement','validated'];
  for(const [index,record] of runs.entries()){
    if(record.status!=='failed')continue;
    const number=String(index+1).padStart(2,'0');
    let diagnostics={};
    try{diagnostics=JSON.parse(await readFile(join(directory,`run-${number}.json`),'utf8'))?.diagnostics||{};}
    catch(error){if(error.code!=='ENOENT'&&!(error instanceof SyntaxError))throw error;}
    const documents=Array.isArray(diagnostics.documents)?diagnostics.documents:[];
    const main=documents.find(d=>d.event==='request'&&typeof d.url==='string'&&d.url.split('?')[0]===SOURCE_URL);
    const chain=main?documents.filter(d=>d.requestId===main.requestId):[];
    const statuses=chain.map(d=>d.redirect?.status??d.status).filter(n=>Number.isInteger(n)&&n>=100&&n<=599);
    const cacheHits=chain.filter(d=>d.redirect?.fromDiskCache===true||d.fromDiskCache===true).length;
    const code=value=>typeof value==='string'&&/^(?:net::ERR_[A-Z_]+|[A-Z][A-Z_]+)$/.test(value)?value:'unavailable';
    const source=diagnostics.sourceCoverage||{}, rendered=diagnostics.renderedCoverage||{};
    const numberText=value=>Number.isSafeInteger(value)&&value>=0?value:'unavailable';
    const timestamp=value=>date(value)?value:'unavailable';
    const fields=['time','temp','feelsLike','condition','windSpeed','windDirection','windGust','humidity','precipProb','rowCount'];
    const mismatch=diagnostics.disagreement;
    const disagreement=Number.isSafeInteger(mismatch?.rowIndex)&&mismatch.rowIndex>=0&&fields.includes(mismatch.field)?`row ${mismatch.rowIndex}, field ${mismatch.field}`:'unavailable';
    const allowed=Array.isArray(source.allowedFirstUtc)?source.allowedFirstUtc.filter(date).slice(0,2):[];
    const publication = record.kind === 'scraper';
    const outcome = publication && record.publicationAttempted ? 'Publication may have been attempted; verify the remote Blob. A remote write and local save are separate operations.' : 'No publication was attempted; the public feed remains unchanged by this attempt.';
    const report=`# Weather ${publication?'scraper':'trial'} attempt ${number} failure

This report preserves the observed failure for a later investigation or GPT Online comparison. It does not establish a root cause or a verified repair.

- Attempt UTC: ${date(record.startedAt)?record.startedAt:'unavailable'}
- Duration ms: ${finite(record.durationMs)?record.durationMs:'unavailable'}
- First attempt; no automatic retry. Retry recoveries: 0.
- Safe rejection reason: ${code(record.reason)}
- Diagnostic stage: ${stages.includes(diagnostics.stage)?diagnostics.stage:'unavailable'}
- Diagnostic rejection: ${code(diagnostics.rejection)}
- Observed main-frame statuses: ${statuses.length?statuses.join(', '):'unavailable'}
- Cache hits: ${cacheHits}
- Source generated UTC: ${timestamp(record.generatedAt||source.generatedAt)}
- Source checked UTC: ${timestamp(source.checkedAt)}
- Source first/last UTC: ${timestamp(source.firstUtc)} / ${timestamp(source.lastUtc)}
- Allowed first UTC: ${allowed.length?allowed.join(', '):'unavailable'}
- Advertised/hydration/rendered counts: ${numberText(source.advertisedCount)} / ${numberText(source.hydrationCount)} / ${numberText(rendered.rowCount)}
- First disagreement: ${disagreement}
- Record count: ${Number.isInteger(record.rowCount)?record.rowCount:'unavailable'}
- First/last UTC: ${date(record.firstUtc)?record.firstUtc:'unavailable'} / ${date(record.lastUtc)?record.lastUtc:'unavailable'}

Evidence: [sanitized attempt report](run-${number}.json), when present; interruption may prevent this file from being written. Cookie values, headers and query values are excluded. ${outcome}
`;
    try{await writeFile(join(directory,`postmortem-${number}.md`),report,{mode:0o600,flag:'wx'});}
    catch(error){if(error.code!=='EEXIST')throw error;}
  }
}
