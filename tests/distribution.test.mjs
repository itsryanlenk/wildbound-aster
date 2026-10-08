import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {once} from 'node:events';
import {ROOT,read,json,files,safeRelative,checkManifest} from '../scripts/lib.mjs';
import {audit} from '../scripts/privacy-audit.mjs';
import {verify} from '../scripts/verify.mjs';
import {createGameServer} from '../scripts/serve.mjs';

test('all runtime and trailer assets are present',()=>{const r=verify();assert.equal(r.creatureSprites,151);assert.equal(r.creatureCries,151);assert.equal(r.trailerSeconds,50)});
test('manifest matches complete public payload',()=>assert.ok(checkManifest().files.length>400));
test('no private data or forbidden source files detected',()=>assert.deepEqual(audit().findings,[]));
test('no font binaries, credentials, symlinks, or original Git history in payload',()=>{for(const f of files())assert.ok(!/\.(?:ttf|otf|woff2?|pem|key)$/i.test(f));assert.ok(!files().some(f=>f.startsWith('.git/')))});
test('path allowlist rejects traversal and absolute paths',()=>{for(const p of ['../escape','/etc/passwd','x/../escape','x\\..\\escape','x//y'])assert.throws(()=>safeRelative(p));assert.equal(safeRelative('game/index.html'),'game/index.html')});
test('all PNG sprites have valid dimensions',()=>{for(let i=1;i<=151;i++){const b=read(`game/art/monsters/${String(i).padStart(3,'0')}.png`);assert.ok(b.readUInt32BE(16)>0&&b.readUInt32BE(16)<=4096);assert.ok(b.readUInt32BE(20)>0&&b.readUInt32BE(20)<=4096)}});
test('each narrative scene occupies an exact contiguous 50-second timeline',()=>{let t=0;for(const s of json('trailer/storyboard.json').segments){assert.equal(s.start,t);t+=s.duration;}assert.equal(t,50)});
test('recorded footage contains actual capture and evolution events',()=>{const e=json('trailer/clips/events.json');assert.ok(e['04-capture'].some(x=>x.type==='capture'));assert.ok(e['07-evolution'].some(x=>x.type==='evolution'))});
test('public project uses MIT with a separate dependency notice',()=>{assert.equal(json('package.json').license,'MIT');assert.match(read('NOTICE.md').toString(),/Remotion is not MIT-licensed/);assert.ok(fs.existsSync(path.join(ROOT,'licenses/remotion.md')))});
test('HTTP server supports gameplay, media ranges, and safe file boundaries',async(t)=>{
 const server=createGameServer();server.listen(0,'127.0.0.1');await once(server,'listening');t.after(()=>new Promise(r=>server.close(r)));
 const url=`http://127.0.0.1:${server.address().port}`;
 let r=await fetch(url+'/');assert.equal(r.status,200);assert.match(await r.text(),/Wildbound/);
 r=await fetch(url+'/audio/cries/001.wav',{headers:{Range:'bytes=0-11'}});assert.equal(r.status,206);assert.equal((await r.arrayBuffer()).byteLength,12);
 r=await fetch(url+'/art/monsters/001.png',{method:'HEAD'});assert.equal(r.status,200);assert.equal((await r.arrayBuffer()).byteLength,0);
 for(const p of ['/.git/config','/.env','/%5c..%5coutside','/not-a-file']){r=await fetch(url+p);assert.ok([403,404].includes(r.status));}
 r=await fetch(url+'/',{method:'POST'});assert.equal(r.status,405);
 r=await fetch(url+'/audio/cries/001.wav',{headers:{Range:'bytes=999999999-'}});assert.equal(r.status,416);
});
