#!/usr/bin/env node
/**
 * Wildbound launch trailer. Native, offline production render.
 * Actual gameplay clips remain unchanged; this draws editorial overlays and
 * opener/closer motion, then pipes lossless RGBA frames into FFmpeg H.264.
 * No browser, remote rendering, purchased media, or paid service is used.
 *
 * Run: node render-trailer.mjs
 * Preview one scene: node render-trailer.mjs --scene opener
 */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
import {spawn, spawnSync} from 'node:child_process';
import {once} from 'node:events';
import crypto from 'node:crypto';
import {createEditorialRenderer} from './trailer-art.mjs';

const root=path.dirname(fileURLToPath(import.meta.url));
const require=createRequire(import.meta.url);
const Canvas=require('@napi-rs/canvas');
const {createCanvas,loadImage,ImageData,GlobalFonts}=Canvas;
const story=JSON.parse(fs.readFileSync(path.join(root,'storyboard.json'),'utf8'));
const W=story.width,H=story.height,FPS=story.fps;
const C=story.palette;
// Optional local font files are never packaged. Omit these variables to use
// installed system sans-serif/monospace fonts (metrics can differ).
for (const [env, family] of [
 ['WILDBOUND_FONT_BOLD', 'Wildbound Bold'],
 ['WILDBOUND_FONT_REGULAR', 'Wildbound Sans'],
 ['WILDBOUND_FONT_MONO', 'Wildbound Mono'],
]) {
 const location=process.env[env];
 if (location && !GlobalFonts.registerFromPath(path.resolve(location),family))
  throw new Error(`Could not register the local font selected by ${env}`);
}
fs.mkdirSync(path.join(root,'work'),{recursive:true});
const sceneFlag=process.argv.indexOf('--scene');
const sceneId=sceneFlag>=0?process.argv[sceneFlag+1]:null;
if(!sceneId){
 const capture=JSON.parse(fs.readFileSync(path.join(root,'clips/manifest.json'),'utf8'));
 if(capture.status!=='final')throw new Error('Full production render requires final gameplay clips. Use --scene for rough previews.');
}
const segments=sceneId?story.segments.filter(s=>s.id===sceneId):story.segments;
if(!segments.length)throw new Error(`Unknown scene ${sceneId}`);
const out=path.join(root,'work',sceneId?`preview-${sceneId}.mp4`:'composition-silent.mp4');
const temp=out.replace(/\.mp4$/,'.partial.mp4');
const canvas=createCanvas(W,H),ctx=canvas.getContext('2d');
const previous=createCanvas(W,H),previousCtx=previous.getContext('2d');
let previousReady=false;
const opening=await loadImage(path.join(root,'public/opening.png'));
const previousFrameFlag=process.argv.indexOf('--previous-frame');
if(sceneId&&previousFrameFlag>=0){
 const previousImage=await loadImage(path.resolve(root,process.argv[previousFrameFlag+1]));
 previousCtx.drawImage(previousImage,0,0,W,H);previousReady=true;
}
const frameBytes=W*H*4;
const totalFrames=segments.reduce((n,s)=>n+Math.round(s.duration*FPS),0);
let encodedFrames=0;

const smooth=x=>{x=Math.max(0,Math.min(1,x));return x*x*(3-2*x);};
const drawEditorial=createEditorialRenderer(ctx,story,opening);
function childExit(child){return new Promise((resolve,reject)=>child.once('close',code=>code===0?resolve():reject(new Error(`FFmpeg process exited ${code}`))));}
async function* decodeFrames(input,count,sourceStart=0){
 const p=spawn('ffmpeg',['-hide_banner','-loglevel','error','-threads','2','-ss',String(sourceStart),'-i',input,'-an','-vf',`fps=${FPS},scale=${W}:${H}:flags=neighbor,setsar=1`,'-frames:v',String(count),'-pix_fmt','rgba','-f','rawvideo','pipe:1'],{stdio:['ignore','pipe','pipe']});
 let err='';p.stderr.on('data',d=>err+=d.toString());const done=childExit(p);let pending=Buffer.alloc(0),n=0;
 for await(const chunk of p.stdout){
  pending=pending.length?Buffer.concat([pending,chunk]):chunk;
  while(pending.length>=frameBytes){const frame=pending.subarray(0,frameBytes);pending=pending.subarray(frameBytes);n++;yield frame;}
 }
 try{await done;}catch(e){throw new Error(`Decode failed for ${input}: ${err}`);}
 if(n!==count)throw new Error(`${input} yielded ${n} frames; expected ${count}.`);
}
async function* decodeShots(shots){
 for(const shot of shots){
  yield* decodeFrames(path.join(root,shot.asset),Math.round(shot.duration*FPS),shot.sourceStart||0);
 }
}

const encoder=spawn('ffmpeg',['-hide_banner','-loglevel','error','-y','-f','rawvideo','-pix_fmt','rgba','-s',`${W}x${H}`,'-r',String(FPS),'-i','pipe:0','-an','-c:v','libx264','-preset','medium','-crf','18','-threads','4','-pix_fmt','yuv420p','-movflags','+faststart','-video_track_timescale','30000',temp],{stdio:['pipe','ignore','pipe']});
let encoderError='';encoder.stderr.on('data',d=>encoderError+=d.toString());const encoded=childExit(encoder);
encoder.stdin.on('error',()=>{});
const sources=[];
try{
 for(const segment of segments){
  const count=Math.round(segment.duration*FPS);
  console.log(`Rendering ${segment.id}: ${count} frames`);
  let stream=null;
  if(segment.kind==='gameplay'){
   const shots=segment.shots||[{asset:segment.asset,duration:segment.duration,sourceStart:0}];
   if(shots.reduce((n,s)=>n+Math.round(s.duration*FPS),0)!==count)throw new Error(`Shot durations do not match ${segment.id}`);
   for(const shot of shots){
    const p=path.join(root,shot.asset);if(!fs.existsSync(p))throw new Error(`Missing gameplay clip ${p}`);
    const bytes=fs.readFileSync(p);sources.push({scene:segment.id,path:shot.asset,sourceStart:shot.sourceStart||0,duration:shot.duration,bytes:bytes.length,sha256:crypto.createHash('sha256').update(bytes).digest('hex')});
   }
   stream=decodeShots(shots)[Symbol.asyncIterator]();
  }
  for(let i=0;i<count;i++){
   const t=i/FPS;ctx.globalAlpha=1;ctx.clearRect(0,0,W,H);
   if(segment.kind==='brand'||segment.kind==='closing')drawEditorial(segment,t);
   else{
    const next=await stream.next();if(next.done)throw new Error('Gameplay stream ended early.');
    const raw=next.value;const data=new Uint8ClampedArray(raw.buffer,raw.byteOffset,raw.byteLength);
    ctx.putImageData(new ImageData(data,W,H),0,0);drawEditorial(segment,t);
   }
   // Six-frame dissolves are short enough to retain the rhythm and readability.
   if(previousReady&&i<6){ctx.save();ctx.globalAlpha=1-smooth(i/6);ctx.drawImage(previous,0,0);ctx.restore();}
   const rgba=Buffer.from(ctx.getImageData(0,0,W,H).data.buffer);
   if(!encoder.stdin.write(rgba))await once(encoder.stdin,'drain');
   encodedFrames++;
  }
  if(stream)await stream.next();
  previousCtx.clearRect(0,0,W,H);previousCtx.drawImage(canvas,0,0);previousReady=true;
  console.log(`Completed ${segment.id}; ${encodedFrames}/${totalFrames}`);
 }
 encoder.stdin.end();await encoded;
 fs.renameSync(temp,out);
 const staticSources=['storyboard.json','trailer-art.mjs','splash-motion.mjs','public/opening.png'].map(p=>({path:p,sha256:crypto.createHash('sha256').update(fs.readFileSync(path.join(root,p))).digest('hex')}));
 const report={width:W,height:H,fps:FPS,frames:encodedFrames,duration:encodedFrames/FPS,output:path.relative(root,out),sources,staticSources,renderer:'@napi-rs/canvas + local FFmpeg',editorialOnly:true};
 fs.writeFileSync(path.join(root,'work',sceneId?`render-${sceneId}.json`:'render-report.json'),JSON.stringify(report,null,2)+'\n');
 console.log(`Rendered ${out}`);
}catch(error){encoder.stdin.destroy();encoder.kill('SIGTERM');console.error(encoderError);throw error;}
