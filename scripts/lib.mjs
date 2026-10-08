import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
export const ROOT=fileURLToPath(new URL('../',import.meta.url));
export const IGNORED=new Set(['.git','node_modules','.publish-work','_release','dist','.venv','venv','__pycache__','work']);
export function files(root=ROOT,prefix='') {
 const out=[];
 for(const ent of fs.readdirSync(path.join(root,prefix),{withFileTypes:true})){
  const relative=path.posix.join(prefix,ent.name);
  if(IGNORED.has(ent.name)||ent.name==='.publish-state.json'||relative.startsWith('trailer/public/clips/'))continue;
  if(ent.isSymbolicLink())throw new Error(`Symbolic links are not allowed: ${relative}`);
  if(ent.isDirectory())out.push(...files(root,relative));else if(ent.isFile())out.push(relative);
 }
 return out.sort();
}
export const sha=(buffer)=>crypto.createHash('sha256').update(buffer).digest('hex');
export const read=(file)=>fs.readFileSync(path.join(ROOT,file));
export const json=(file)=>JSON.parse(read(file).toString('utf8'));
export function safeRelative(file){
 if(typeof file!=='string'||!file||path.isAbsolute(file)||file.includes('\\')||file.split('/').some(p=>p==='..'||p==='.'||p===''))throw new Error('Unsafe package path');
 return file;
}
export function checkManifest(){
 const m=json('PACKAGE-MANIFEST.json');
 const listed=m.files.map(x=>safeRelative(x.path)).sort();
 const actual=files().filter(p=>p!=='PACKAGE-MANIFEST.json');
 if(JSON.stringify(listed)!==JSON.stringify(actual))throw new Error('Package file list changed. Review intentional changes and run npm run manifest.');
 for(const f of m.files){const b=read(f.path);if(b.length!==f.bytes||sha(b)!==f.sha256)throw new Error(`File changed: ${f.path}. Review and regenerate the manifest.`);}
 return m;
}
