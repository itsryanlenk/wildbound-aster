import fs from 'node:fs';
import path from 'node:path';
import {ROOT} from './lib.mjs';
import {verify} from './verify.mjs';
verify();
const dest=path.join(ROOT,'dist');
if(fs.existsSync(dest)&&fs.lstatSync(dest).isSymbolicLink())throw new Error('Refusing to replace a symbolic link at dist.');
fs.rmSync(dest,{recursive:true,force:true});fs.cpSync(path.join(ROOT,'game'),dest,{recursive:true,dereference:false});
console.log('Packaged the existing prebuilt game into dist/. No original game source was recompiled.');
