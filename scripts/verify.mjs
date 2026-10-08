import fs from 'node:fs';
import path from 'node:path';
import {ROOT,read,json,safeRelative,checkManifest} from './lib.mjs';
import {audit} from './privacy-audit.mjs';
const fail=(ok,message)=>{if(!ok)throw new Error(message)};
export function verify({manifest=true}={}){
 const sw=read('game/sw.js').toString();
 const match=sw.match(/const FILES=(\[[^\n]*\]);/);fail(match,'Offline inventory not found');
 const offline=JSON.parse(match[1]);fail(new Set(offline).size===offline.length,'Duplicate offline paths');
 for(const file of offline){safeRelative(file);fail(fs.existsSync(path.join(ROOT,'game',file)),`Missing offline asset: ${file}`)}
 const revision=sw.match(/const REVISION="([a-f0-9]+)"/)[1];fail(json('game/offline-release.json').revision===revision,'Offline revision mismatch');
 for(let n=1;n<=151;n++){
  const id=String(n).padStart(3,'0');
  const png=read(`game/art/monsters/${id}.png`);fail(png.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])),`Invalid creature PNG ${id}`);
  const wav=read(`game/audio/cries/${id}.wav`);fail(wav.toString('ascii',0,4)==='RIFF'&&wav.toString('ascii',8,12)==='WAVE',`Invalid cry ${id}`);
 }
 const html=read('game/index.html').toString();
 for(const m of html.matchAll(/(?:src|href)="(\.\/[^"#]+)"/g))fail(fs.existsSync(path.join(ROOT,'game',m[1])),`Missing HTML dependency: ${m[1]}`);
 for(const file of fs.readdirSync(path.join(ROOT,'game/assets')).filter(f=>f.endsWith('.js'))){
  const text=read('game/assets/'+file).toString();
  for(const m of text.matchAll(/["'](\.\/[^"'\n]+\.(?:js|css))["']/g))fail(fs.existsSync(path.join(ROOT,'game/assets',m[1])),`Missing JS chunk: ${m[1]}`);
 }
 const story=json('trailer/storyboard.json');fail(story.segments.reduce((s,x)=>s+x.duration,0)===50,'Trailer duration mismatch');
 for(const seg of story.segments){
  fail(fs.existsSync(path.join(ROOT,'trailer',seg.asset)),`Missing scene asset ${seg.id}`);
  for(const shot of seg.shots||[])fail(fs.existsSync(path.join(ROOT,'trailer',shot.asset)),`Missing shot ${seg.id}`);
 }
 fail(read('LICENSE').toString().startsWith('MIT License'),'MIT LICENSE missing');
 const privacy=audit();fail(!privacy.findings.length,'Privacy preflight failed; run npm run audit:privacy');
 const manifestResult=manifest?checkManifest():null;
 return {offlineAssets:offline.length,creatureSprites:151,creatureCries:151,trailerSeconds:50,textFilesScanned:privacy.inspectedTextFiles,manifestFiles:manifestResult?.files.length??null};
}
if(process.argv[1]?.endsWith('verify.mjs')){try{console.log(JSON.stringify(verify({manifest:!process.argv.includes('--without-manifest')}),null,2));}catch(e){console.error(e.message);process.exitCode=1}}
