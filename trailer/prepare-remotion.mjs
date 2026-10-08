#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.dirname(fileURLToPath(import.meta.url));
const story=JSON.parse(fs.readFileSync(path.join(root,'storyboard.json'),'utf8'));
const assets=new Set();
for(const segment of story.segments){
 if(segment.kind!=='gameplay')continue;
 for(const shot of segment.shots||[{asset:segment.asset}])assets.add(shot.asset);
}
for(const relative of assets){
 const src=path.join(root,relative),dest=path.join(root,'public',relative);
 if(!fs.existsSync(src)||fs.statSync(src).size===0)throw new Error(`Missing/empty gameplay clip: ${src}`);
 fs.mkdirSync(path.dirname(dest),{recursive:true});
 fs.copyFileSync(src,dest+'.partial');fs.renameSync(dest+'.partial',dest);
}
console.log(`Prepared ${assets.size} actual gameplay clips for Remotion.`);
