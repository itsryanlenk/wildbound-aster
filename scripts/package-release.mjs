/** Deterministic, dependency-free ZIP packaging. ZIP STORE avoids zlib-version drift. */
import fs from 'node:fs';
import path from 'node:path';
import {ROOT,files,read,sha} from './lib.mjs';
const OUT=path.join(ROOT,'_release');fs.mkdirSync(OUT,{recursive:true});
const ensure=process.argv.includes('--ensure');
const table=Uint32Array.from({length:256},(_,n)=>{for(let j=0;j<8;j++)n=(n&1)?0xedb88320^(n>>>1):n>>>1;return n>>>0});
function crc32(data){let c=0xffffffff;for(const b of data)c=table[(c^b)&255]^(c>>>8);return(c^0xffffffff)>>>0}
function zip(name,entries){
 const target=path.join(OUT,name);if(ensure&&fs.existsSync(target))return;
 const locals=[],central=[];let offset=0;
 for(const [file,zipPath]of entries){
  const bytes=read(file),filename=Buffer.from(zipPath,'utf8'),crc=crc32(bytes),date=((2026-1980)<<9)|(10<<5)|8;
  const local=Buffer.alloc(30);local.writeUInt32LE(0x04034b50,0);local.writeUInt16LE(20,4);local.writeUInt16LE(0x800,6);local.writeUInt16LE(date,12);local.writeUInt32LE(crc,14);local.writeUInt32LE(bytes.length,18);local.writeUInt32LE(bytes.length,22);local.writeUInt16LE(filename.length,26);
  const dir=Buffer.alloc(46);dir.writeUInt32LE(0x02014b50,0);dir.writeUInt16LE(0x314,4);dir.writeUInt16LE(20,6);dir.writeUInt16LE(0x800,8);dir.writeUInt16LE(date,14);dir.writeUInt32LE(crc,16);dir.writeUInt32LE(bytes.length,20);dir.writeUInt32LE(bytes.length,24);dir.writeUInt16LE(filename.length,28);dir.writeUInt32LE((0o100644*65536)>>>0,38);dir.writeUInt32LE(offset,42);
  locals.push(local,filename,bytes);central.push(dir,filename);offset+=local.length+filename.length+bytes.length;
 }
 const centralBytes=Buffer.concat(central),end=Buffer.alloc(22);end.writeUInt32LE(0x06054b50,0);end.writeUInt16LE(entries.length,8);end.writeUInt16LE(entries.length,10);end.writeUInt32LE(centralBytes.length,12);end.writeUInt32LE(offset,16);
 const tmp=target+'.partial';fs.writeFileSync(tmp,Buffer.concat([...locals,centralBytes,end]));fs.renameSync(tmp,target);console.log(`Packaged ${name}: ${entries.length} files.`);
}
const paths=files();
zip('wildbound-game-v0.4.0.zip',paths.filter(p=>p.startsWith('game/')).map(p=>[p,p.slice(5)]));
zip('wildbound-trailer-source.zip',paths.filter(p=>p.startsWith('trailer/')||p.startsWith('licenses/')||['LICENSE','NOTICE.md'].includes(p)).map(p=>[p,'wildbound-trailer-source/'+p]));
const names=['wildbound-game-v0.4.0.zip','wildbound-launch-trailer.mp4','wildbound-orchestral-score.mp3','wildbound-launch-poster.png','wildbound-trailer-source.zip'];
const entries=names.map(name=>{const data=fs.readFileSync(path.join(OUT,name));return{name,bytes:data.length,sha256:sha(data)}});
const sums=entries.map(f=>`${f.sha256}  ${f.name}`).join('\n')+'\n';
fs.writeFileSync(path.join(OUT,'SHA256SUMS.txt'),sums);
entries.push({name:'SHA256SUMS.txt',bytes:Buffer.byteLength(sums),sha256:sha(Buffer.from(sums))});
if(ensure){
 const original=JSON.parse(fs.readFileSync(path.join(ROOT,'release-manifest.json'),'utf8'));
 if(JSON.stringify(original.files)!==JSON.stringify(entries))throw new Error('Release bytes differ from the approved manifest. Review before publishing.');
}else{
 fs.writeFileSync(path.join(ROOT,'release-manifest.json'),JSON.stringify({tag:'v0.4.0',files:entries},null,2)+'\n');
 console.log('Updated release-manifest.json. Run npm run manifest after intentional changes.');
}
