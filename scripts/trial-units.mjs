import {dirname,isAbsolute,join} from 'node:path';
function quote(value){
  if(!isAbsolute(value)||/[\r\n\0]/.test(value))throw new Error('systemd paths must be absolute and contain no newlines');
  return '"'+value.replace(/\\/g,'\\\\').replace(/"/g,'\\"').replace(/%/g,'%%').replace(/\$/g,'$$$$')+'"';
}
export function renderTrialUnits({node,root}){
  const executable=quote(node),script=quote(join(root,'scripts/trial.mjs'));
  const path=`${dirname(node)}:/usr/local/bin:/usr/bin:/bin`;
  return {service:`[Unit]
Description=Run a non-publishing Scarborough weather trial
Wants=network-online.target
After=network-online.target

[Service]
Type=oneshot
WorkingDirectory=/
Environment="PATH=${path.replace(/%/g,'%%').replace(/"/g,'\\"')}"
ExecStart=${executable} ${script}
TimeoutStartSec=300
KillMode=control-group
UMask=0077
`,timer:`[Unit]
Description=Run 48 non-publishing Scarborough weather attempts

[Timer]
OnCalendar=*-*-* *:00,30:00
Persistent=true
AccuracySec=1s
Unit=scrape-weather-trial.service

[Install]
WantedBy=timers.target
`};
}
