import {drawSplashFrame} from './splash-motion.mjs';

/** Shared frame-accurate typography and splash animation for native/Remotion. */
export function createEditorialRenderer(ctx,story,opening){
 const W=story.width,H=story.height,C=story.palette;
const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
const ease=x=>1-Math.pow(1-clamp(x),3);
const smooth=x=>{x=clamp(x);return x*x*(3-2*x);};
function setFont(size,family='Wildbound Sans') {ctx.font=`${family.includes("Bold")?"bold ":""}${size}px "${family}", ${family.includes("Mono")?"monospace":"sans-serif"}`;}
function text(text,x,y,size,color=C.cream,{bold=false,align='left',alpha=1,shadow=true}={}){
 ctx.save();ctx.globalAlpha*=alpha;setFont(size,bold?'Wildbound Bold':'Wildbound Sans');ctx.textAlign=align;
 if(shadow){ctx.shadowColor='rgba(2,11,16,0.70)';ctx.shadowBlur=9;ctx.shadowOffsetY=3;}
 ctx.fillStyle=color;ctx.fillText(text,x,y);ctx.restore();
}
function tracked(textValue,x,y,size,spacing,color=C.gold,align='left'){
 ctx.save();setFont(size,'Wildbound Mono');
 const widths=[...textValue].map(c=>ctx.measureText(c).width);
 const total=widths.reduce((a,b)=>a+b,0)+Math.max(0,widths.length-1)*spacing;
 if(align==='center')x-=total/2;else if(align==='right')x-=total;
 ctx.fillStyle=color;ctx.shadowColor='rgba(0,0,0,.35)';ctx.shadowBlur=5;
 [...textValue].forEach((char,i)=>{ctx.fillText(char,x,y);x+=widths[i]+spacing;});ctx.restore();
}
function roundRect(x,y,w,h,r){ctx.beginPath();ctx.moveTo(x+r,y);ctx.arcTo(x+w,y,x+w,y+h,r);ctx.arcTo(x+w,y+h,x,y+h,r);ctx.arcTo(x,y+h,x,y,r);ctx.arcTo(x,y,x+w,y,r);ctx.closePath();}
function drawOpeningBackground(t,closing=false){
 // The same animated illustration renderer powers the live game's splash.
 // Its local meshes move clouds, foliage and companions with pinned feet.
 drawSplashFrame(ctx,opening,t+(closing?43:0),W,H,false);
 const g=ctx.createLinearGradient(0,0,W,0);
 g.addColorStop(0,closing?'rgba(3,17,23,.75)':'rgba(3,17,23,.77)');
 g.addColorStop(.54,closing?'rgba(3,17,23,.57)':'rgba(3,17,23,.43)');g.addColorStop(1,'rgba(3,17,23,.13)');
 ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
 const edge=ctx.createLinearGradient(0,0,0,H);edge.addColorStop(0,'rgba(3,13,20,.13)');edge.addColorStop(.65,'rgba(3,13,20,0)');edge.addColorStop(1,'rgba(3,13,20,.45)');ctx.fillStyle=edge;ctx.fillRect(0,0,W,H);
 for(let i=0;i<15;i++){
  const xx=(i*89.3+40+Math.sin(t*.3+i)*14)%W;
  const yy=(i*47.1+620-t*(6+i%3))%H;
  ctx.globalAlpha=.10+.14*(.5+.5*Math.sin(t*.8+i));ctx.fillStyle=C.gold;ctx.fillRect(xx,yy,1+(i%2),1+(i%2));
 }
 ctx.globalAlpha=1;
}
function brandMark(x,y){
 ctx.save();ctx.strokeStyle=C.gold;ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(x,y-10);ctx.lineTo(x+9,y);ctx.lineTo(x,y+10);ctx.lineTo(x-9,y);ctx.closePath();ctx.stroke();
 ctx.fillStyle=C.gold;ctx.fillRect(x-1,y-18,2,36);ctx.fillRect(x-18,y-1,36,2);ctx.restore();
}
function drawBrand(s,t){
 drawOpeningBackground(t,false);
 const enter=ease((t-.25)/.75);ctx.save();ctx.globalAlpha=enter;const dy=(1-enter)*22;
 brandMark(92,171+dy);tracked(s.kicker,124,177+dy,15,2.4);
 text(s.headline,64,312+dy,98,C.cream,{bold:true});
 tracked(s.subtitle,72,363+dy,23,5.5,C.gold);
 ctx.fillStyle='rgba(246,206,114,.70)';ctx.fillRect(72,395+dy,278,2);
 text(s.line,72,439+dy,24,'#f1f5e9');
 ctx.restore();
 const fade=clamp(t/.35);if(fade<1){ctx.fillStyle=`rgba(3,15,20,${1-fade})`;ctx.fillRect(0,0,W,H);}
}
function drawClosing(s,t){
 drawOpeningBackground(t,true);ctx.fillStyle='rgba(3,15,20,.12)';ctx.fillRect(0,0,W,H);
 const enter=ease(t/.65);ctx.save();ctx.globalAlpha=enter;const dy=(1-enter)*16;
 tracked(s.kicker,W/2,151+dy,15,2.5,C.gold,'center');
 text(s.headline,W/2,283+dy,98,C.cream,{bold:true,align:'center'});
 tracked(s.subtitle,W/2,335+dy,22,6,C.gold,'center');
 ctx.fillStyle='rgba(246,206,114,.62)';ctx.fillRect(W/2-158,375+dy,316,2);
 ctx.fillStyle=C.gold;roundRect(W/2-112,414+dy,224,54,8);ctx.fill();
 text('PLAY NOW',W/2,450+dy,23,C.ink,{bold:true,align:'center',shadow:false});
 text(s.line,W/2,515+dy,22,C.cream,{align:'center'});
 ctx.save();setFont(27,'Wildbound Mono');ctx.textAlign='center';ctx.fillStyle=C.cream;ctx.shadowColor='rgba(0,0,0,.75)';ctx.shadowBlur=8;ctx.fillText(story.url,W/2,565+dy);ctx.restore();
 ctx.restore();
 // Keep the URL readable for more than five seconds, then close on black.
 const exit=clamp((t-(s.duration-.55))/.55);if(exit>0){ctx.fillStyle=`rgba(3,15,20,${exit})`;ctx.fillRect(0,0,W,H);}
}
function lowerThird(s,t){
 const enter=ease((t-.18)/.42);const exit=clamp((s.duration-t)/.40);const alpha=Math.min(enter,exit);
 ctx.save();ctx.globalAlpha=alpha;
 const dy=(1-enter)*18;
 const g=ctx.createLinearGradient(0,430,0,H);g.addColorStop(0,'rgba(3,18,23,0)');g.addColorStop(.55,'rgba(3,18,23,.69)');g.addColorStop(1,'rgba(3,18,23,.89)');ctx.fillStyle=g;ctx.fillRect(0,430,W,H-430);
 const left=66;ctx.fillStyle=C.gold;ctx.fillRect(left,535+dy,3,105);
 tracked(s.kicker,left+24,550+dy,15,2.0,C.gold);
 const headlineSize=s.id==='save'?40:s.headline.length>22?43:47;
 text(s.headline,left+22,607+dy,headlineSize,C.cream,{bold:true});
 text(s.line,left+24,648+dy,22,'#eaf3e7');
 ctx.restore();
 ctx.save();ctx.globalAlpha=.70;tracked('WILDBOUND',W-40,38,13,1.7,C.cream,'right');ctx.restore();
}

 return (segment,time)=>{
  if(segment.kind==='brand')drawBrand(segment,time);
  else if(segment.kind==='closing')drawClosing(segment,time);
  else lowerThird(segment,time);
 };
}
