import fs from 'node:fs';
import path from 'node:path';
import {ROOT,files,read,sha} from './lib.mjs';
const entries=files().filter(p=>p!=='PACKAGE-MANIFEST.json').map(p=>{const b=read(p);return {path:p,bytes:b.length,sha256:sha(b)}});
fs.writeFileSync(path.join(ROOT,'PACKAGE-MANIFEST.json'),JSON.stringify({format:1,edition:'04',files:entries},null,2)+'\n');
console.log(`Manifested ${entries.length} repository files.`);
