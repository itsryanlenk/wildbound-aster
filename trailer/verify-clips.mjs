import {fileURLToPath} from 'node:url';
import path from 'node:path';
import fs from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import assert from 'node:assert/strict';
const root=fileURLToPath(new URL('./clips',import.meta.url));
const manifest=JSON.parse(await fs.readFile(root+'/manifest.json'));
const events=JSON.parse(await fs.readFile(root+'/events.json'));
const clips=[];
for(const c of manifest.clips){assert(c.output,'Encoded clip output missing: '+c.id);const p=JSON.parse(execFileSync('ffprobe',['-v','error','-show_entries','stream=width,height,r_frame_rate,pix_fmt,nb_frames','-show_entries','format=duration,size','-of','json',path.resolve(root,'..',c.output)],{encoding:'utf8'}));const v=p.streams[0];assert.equal(v.width,1280);assert.equal(v.height,720);assert.equal(v.r_frame_rate,'30/1');assert.equal(v.pix_fmt,'yuv420p');assert.equal(Number(v.nb_frames),c.duration*30);assert(Math.abs(Number(p.format.duration)-c.duration)<.01);clips.push({id:c.id,duration:Number(p.format.duration),frames:Number(v.nb_frames),bytes:Number(p.format.size)})}
assert(events['04-capture'].some(e=>e.kind==='moment'&&e.type==='capture'&&e.speciesId===16));assert(events['07-evolution'].some(e=>e.kind==='moment'&&e.type==='evolution'&&e.from===1&&e.speciesId===2));assert(manifest.clips.find(c=>c.id==='03-battle').end.lesson.dodge);assert(manifest.clips.find(c=>c.id==='03-battle').end.lesson.hit);assert.equal(manifest.clips.find(c=>c.id==='04-capture').end.captures,1);assert(manifest.clips.find(c=>c.id==='06-save').actions.some(a=>a.name==='save-local-adventure'&&a.saved));
const report={status:manifest.status,verified:clips.length,totalSeconds:clips.reduce((sum,c)=>sum+c.duration,0),clips,actualCaptureAt:events['04-capture'].find(e=>e.kind==='moment'&&e.type==='capture').time,actualEvolutionAt:events['07-evolution'].find(e=>e.kind==='moment'&&e.type==='evolution').time};await fs.writeFile(root+'/qa.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
