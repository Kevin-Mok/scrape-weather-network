import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {once} from 'node:events';
import * as adapter from '../src/browser.mjs';

test('cacheable cookie issuance redirects reach the normal URL with sandboxed Chrome', {skip: process.env.WEATHER_BROWSER_TESTS !== '1'}, async () => {
  const server=createServer((req,res)=>{
    res.setHeader('Cache-Control','public, max-age=120');
    if(req.url==='/?issued=1') {
      res.writeHead(302,{'Set-Cookie':'issued=yes; Path=/','Location':'/'}).end();
    } else if(!req.headers.cookie?.includes('issued=yes')) {
      res.writeHead(302,{'Location':'/?issued=1'}).end();
    } else res.end('complete fresh forecast');
  });
  server.listen(0,'127.0.0.1');await once(server,'listening');
  const url=`http://127.0.0.1:${server.address().port}/`;
  const command=adapter.browserCommand({session:`weather-cache-test-${process.pid}`,executablePath:'/usr/bin/google-chrome'});
  let cleanup;
  try {
    assert.equal(typeof adapter.prepareBrowser,'function','adapter must configure the active target before navigating');
    await assert.rejects(command(['open',url]), error => /ERR_TOO_MANY_REDIRECTS/.test(error.cause?.message || error.message));
    cleanup=await adapter.prepareBrowser(command);
    await command(['open',url]);
    assert.equal(await command(['eval','document.body.innerText']),'complete fresh forecast');
    assert.equal(await command(['eval','location.href']),url);
  }finally{await command(['close']).catch(()=>{});await cleanup?.();await new Promise(resolve=>server.close(resolve));}
});
