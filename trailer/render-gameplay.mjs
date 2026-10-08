import {fileURLToPath} from 'node:url';
/** Offline video capture of the actual Wildbound Game.update/render implementation.
 * No game source edits, browser automation, network access, or mechanic overrides.
 * Scenarios are deterministic saved-game fixtures and real engine API inputs.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {createHash} from 'node:crypto';
import {createCanvas,Image as NativeImage,GlobalFonts} from '@napi-rs/canvas';
const ROOT=process.env.WILDBOUND_GAME_SOURCE;
if (!ROOT) throw new Error('Recapture requires the original unbundled game checkout. Set WILDBOUND_GAME_SOURCE; see README.md. Editing existing clips does not require it.');
const OUT=fileURLToPath(new URL('.',import.meta.url)),FPS=30,WIDTH=1280,HEIGHT=720;
const noop=()=>{};let rngState=1,clock=0,uuid=0,currentEvents=[],currentActions=[];
Math.random=()=>((rngState=(1664525*rngState+1013904223)>>>0)/4294967296);
Date.now=()=>1791417600000+Math.round(clock*1000);
Object.defineProperty(globalThis,'crypto',{value:{randomUUID:()=>`capture-${++uuid}`}});
const images=[];
globalThis.Image=class extends NativeImage{
 set src(value){super.src=String(value).startsWith('data:')?value:path.join(ROOT,'public',String(value).replace(/^\.\//,'').replace(/^\//,''));if(!images.includes(this))images.push(this)}
 get src(){return super.src}
};
function canvas(width=300,height=150){const c=createCanvas(width,height);c.addEventListener=noop;c.removeEventListener=noop;c.getBoundingClientRect=()=>({left:0,top:0,width:c.width,height:c.height});c.parentElement=null;return c}
globalThis.window={addEventListener:noop,removeEventListener:noop,matchMedia:()=>({matches:false,addEventListener:noop,removeEventListener:noop})};
globalThis.document={hidden:false,addEventListener:noop,removeEventListener:noop,createElement:tag=>tag==='canvas'?canvas():{click:noop}};
globalThis.requestAnimationFrame=()=>1;globalThis.cancelAnimationFrame=noop;
const storage=new Map();globalThis.localStorage={getItem:key=>storage.get(key)??null,setItem:(key,value)=>storage.set(key,String(value)),removeItem:key=>storage.delete(key)};
globalThis.fetch=async()=>{throw new Error('The offline gameplay renderer makes no network requests')};
const {Game,makeMonster,maxHP,speciesById}=await import(ROOT+'/app/game/engine.ts');
const {layoutFor,isWalkable}=await import(ROOT+'/app/game/navigation.mjs');
const game=new Game(canvas(WIDTH,HEIGHT),noop,event=>currentEvents.push({time:+clock.toFixed(3),...event}));
game.viewport={width:WIDTH,height:HEIGHT};game.presentationHidden=false;
for(let id=1;id<=151;id++)game.sprite(id);
for(let retries=0;images.some(im=>!im.complete)&&retries<500;retries++)await new Promise(resolve=>setTimeout(resolve,10));
const failed=images.filter(im=>!im.complete||!im.naturalWidth);if(failed.length)throw new Error('Unloaded assets: '+failed.map(im=>im.src).join(','));
if(process.env.WILDBOUND_FONT_MONO) GlobalFonts.registerFromPath(process.env.WILDBOUND_FONT_MONO,'monospace');
function action(name,details={}){currentActions.push({time:+clock.toFixed(3),name,...details})}
function fixture({region=0,species=1,level=5,seed=121,postgame=false}={}){
 rngState=seed;clock=0;game.clearCombat();game.state.started=true;game.state.name='Aster Ranger';game.state.region=region;game.state.badges=Array.from({length:region},(_,i)=>i);game.state.story=Array.from({length:9},(_,i)=>i);game.state.finalWon=postgame;game.state.party=[makeMonster(species,level)];game.state.active=0;game.state.caught=[species];game.state.seen=[species];game.state.box=[];game.state.lessonComplete=false;game.state.researchMilestones=[];game.state.playTime=20;game.time=20;game.state.items={prism:18,super:3,ultra:0,potion:8,revive:2,candy:2};game.state.stats={battles:0,captures:0,steps:0};game.state.log=[];game.dialogue=null;game.paused=false;game.manualPause=false;game.player={...layoutFor(region).spawn,vx:0,vy:0,facing:1,direction:'down'};game.state.position={...layoutFor(region).spawn};game.trail=[{x:game.player.x,y:game.player.y}];game.path=[];game.target=null;game.interaction=null;game.immune=0;game.projectiles=[];game.particles=[];game.texts=[];game.generateWilds();game.camera={x:0,y:0,scale:1};
 currentEvents=[];currentActions=[];for(let i=0;i<55;i++)game.updateCamera();
 return {region,speciesId:species,species:speciesById[species].name,level,seed,postgame};
}
function tick(dt=1/FPS){game.time+=dt;let remaining=dt;while(remaining>1e-8&&!game.paused&&!game.manualPause&&!game.dialogue&&game.state.started){const step=Math.min(1/60,remaining);game.update(step);remaining-=step}game.render()}
function maybeCloseDialogue(t,after=0){if(game.dialogue&&t>after){action('close-dialogue',{speaker:game.dialogue.name});game.closeDialogue()}}
const scenes=[
 {id:'01-explore',duration:7,title:'Meadowreach trail',setup(){const f=fixture();game.goToNPC('heal');action('go-to-healing-cottage');return f},step(t){if(game.dialogue&&!currentActions.some(a=>a.name==='go-to-beacon-warden')){maybeCloseDialogue(t);game.goToNPC('warden');action('go-to-beacon-warden')}}},
 {id:'02-discover',duration:6,title:'Tideglass Coast',setup(){const f=fixture({region:2,species:8,level:15,seed:445});game.goToNPC('rival');action('go-to-mira');return f},step(t){if(game.dialogue&&!currentActions.some(a=>a.name==='go-to-beacon-warden')){maybeCloseDialogue(t);game.goToNPC('warden');action('go-to-beacon-warden')}}},
 {id:'03-battle',duration:7,title:'Alder’s field lesson — attacks and dodge',setup(){const f=fixture({species:7,level:5,seed:987});game.beginLesson();action('begin-field-lesson');for(let i=0;i<55;i++)game.updateCamera();return {...f,lesson:true,enemy:'Burrowbop',enemyLevel:3}},step(t){
   const b=game.battle;if(!b)return;const e=b.enemy,dist=Math.hypot(e.x-game.player.x,e.y-game.player.y);
   if(b.telegraph&&b.telegraph.timer<.73&&game.dodgeCD<=0){game.target=null;game.touch('s',true);if(b.telegraph.timer<.63){game.dodge();game.touch('s',false);action('dodge-warning',{move:b.telegraph.move.name});}}
   else if(!b.telegraph&&dist>118&&t<4.8){game.target={x:e.x,y:e.y};}
   else game.target=null;
   if(t>.8&&e.hp>maxHP(e)*.48&&!b.telegraph){const before=e.hp;const cd=game.cooldowns[1];game.attack(1);if(game.cooldowns[1]>cd)action('player-attack',{move:'Bubble Shot',enemyHPBefore:before});}
 }},
 {id:'04-capture',duration:7,title:'A new companion',setup(){if(!game.battle?.lesson||!game.battle.lesson.hit||!game.battle.lesson.dodge||game.battle.enemy.hp>maxHP(game.battle.enemy)*.5)throw new Error('Lesson capture prerequisites were not earned');clock=0;currentEvents=[];currentActions=[];game.keys.clear();game.target=null;return {continues:'03-battle',captureChance:game.captureChance('prism'),enemy:'Burrowbop'}},step(t){if(t>=.8&&game.battle&&!game.battle.capture){game.capture('prism');action('throw-prism',{chance:game.battle?.capture?.chance})}if(t>4&&game.state.party.length>1&&game.state.active===0){game.switchActive(1);action('new-companion-follows',{speciesId:16});game.goToNPC('professor')}}},
 {id:'05-beacon',duration:6,title:'The First Beacon',setup(){const f=fixture({region:8,species:151,level:42,seed:712,postgame:true});game.goToNPC('warden');action('go-to-first-beacon');return f},step(t){if(game.dialogue&&t>4.8)maybeCloseDialogue(t)}},
 {id:'06-save',duration:5,title:'Home on the trail',setup(){const f=fixture({region:0,species:1,level:5,seed:546});game.goToNPC('heal');action('go-to-healing-cottage');return f},step(t){if(game.dialogue&&t>2.3){game.doDialogue('heal');action('heal-team')}if(t>=3.5&&!currentActions.some(a=>a.name==='save-local-adventure')){game.save();game.sound('save');action('save-local-adventure',{saved:storage.has('wildbound-save-v1')})}}},
 {id:'07-evolution',duration:6,title:'Growth Candy — Spriglit evolves into Fernix',setup(){const f=fixture({region:0,species:1,level:7,seed:534});const position={x:620,y:228.9},previous={x:577,y:228.9};if(!isWalkable(0,position.x,position.y)||!isWalkable(0,previous.x,previous.y))throw new Error('Evolution shot requires valid trail positions');Object.assign(game.player,position);game.state.position={...position};game.trail=[previous,position];for(let i=0;i<55;i++)game.updateCamera();action('rest-on-upper-meadow-trail');return {...f,position}},step(t){if(t>=2.4&&!currentActions.some(a=>a.name==='use-growth-candy')){game.useItem('candy');action('use-growth-candy',{from:1,to:game.state.party[0].speciesId,level:game.state.party[0].level})}}}
];
const only=process.argv.find(a=>a.startsWith('--only='))?.split('=')[1];const preview=process.argv.includes('--preview');const rough=process.argv.includes('--rough');
const sourceHashes=Object.fromEntries(await Promise.all(['app/game/engine.ts','app/game/animation.mjs','app/game/ranger-motion.mjs','app/game/sprite-renderer.ts','app/game/ranger-atlas.json','public/art/ranger-walk.png'].map(async file=>[file,createHash('sha256').update(await fs.readFile(path.join(ROOT,file))).digest('hex')])));
const events={},manifest={sourceHashes,status:rough?'rough':'final',renderer:'Actual Game.update/render; native Canvas software fallback',width:WIDTH,height:HEIGHT,fps:FPS,source:'app/game/engine.ts',sourceSha256:createHash('sha256').update(await fs.readFile(ROOT+'/app/game/engine.ts')).digest('hex'),clips:[]};
for(const scene of scenes){
 const state=scene.setup();const produce=!only||only===scene.id||only==='all';const frameCount=Math.round(scene.duration*FPS);let encoder,encodedPromise;const clipPath=path.join(OUT,'clips',scene.id+'.mp4'),temporaryPath=path.join(OUT,'clips',scene.id+'.'+process.pid+'.encoding.mp4');
 if(produce&&!preview){encoder=spawn('ffmpeg',['-hide_banner','-loglevel','error','-y','-f','rawvideo','-pixel_format','rgba','-video_size',WIDTH+'x'+HEIGHT,'-framerate',String(FPS),'-i','pipe:0','-an','-c:v','libx264','-preset','fast','-threads','2','-crf','17','-pix_fmt','yuv420p','-movflags','+faststart',temporaryPath],{stdio:['pipe','inherit','inherit']});encodedPromise=once(encoder,'close');}
 let shot=false;for(let frame=0;frame<frameCount;frame++){
  clock=frame/FPS;scene.step(clock);tick();
  if(produce&&(frame===Math.round(FPS*2)||frame===frameCount-1)){const name=scene.id+(frame===frameCount-1?'-end':'-preview')+'.png';await fs.writeFile(path.join(OUT,'frames',name),game.canvas.toBuffer('image/png'));shot=true;}
  if(encoder&&!encoder.stdin.write(game.canvas.data()))await once(encoder.stdin,'drain');
 }
 if(encoder){encoder.stdin.end();const[exitCode,signal]=await encodedPromise;if(exitCode!==0)throw new Error('FFmpeg failed: '+scene.id+' exit='+exitCode+' signal='+signal);await fs.rename(temporaryPath,clipPath)}
 const description={id:scene.id,title:scene.title,duration:scene.duration,frames:frameCount,fixture:state,output:produce&&!preview?'clips/'+scene.id+'.mp4':null,preview:produce?'frames/'+scene.id+'-preview.png':null,actions:currentActions,end:{party:game.state.party.map(m=>({speciesId:m.speciesId,level:m.level,hp:m.hp,xp:m.xp})),battle:!!game.battle,captures:game.state.stats.captures,lesson:game.battle?.lesson||null,lessonComplete:game.state.lessonComplete,player:{x:game.player.x,y:game.player.y}}};manifest.clips.push(description);events[scene.id]=currentEvents;
 console.log(JSON.stringify({id:scene.id,output:description.output,actions:description.actions,end:description.end}));
 await fs.writeFile(path.join(OUT,'clips',preview?'preview-events.json':'events.json'),JSON.stringify(events,null,2));await fs.writeFile(path.join(OUT,'clips',preview?'preview-manifest.json':'manifest.json'),JSON.stringify(manifest,null,2));
}
game.destroy();
