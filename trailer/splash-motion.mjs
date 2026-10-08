// Continuous, local motion applied to the original opening painting.
// This renderer is shared by the title screen and the launch-film compositor.
const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
const bell = (u, v, x, y, rx, ry) => Math.exp(-2 * (((u-x)/rx)**2 + ((v-y)/ry)**2));
const beacons = [[.064,.368],[.073,.23],[.137,.287],[.195,.347],[.287,.337],[.385,.386],[.606,.36],[.645,.153],[.773,.34],[.878,.402],[.94,.31]];
export function splashVertex(u, v, time = 0) {
  let dx = 0, dy = 0;
  // Distant clouds travel slowly; the horizon and architecture stay registered.
  const sky = clamp((.31-v)/.16,0,1) * Math.sin(Math.PI*u);
  dx += sky * Math.sin(time*.22 + u*4) * .004;
  for (const [x,y,rx,ry,phase] of [[.9,.13,.21,.25,0],[.07,.71,.12,.25,2],[.69,.94,.45,.13,4]]) {
    const leaf = bell(u,v,x,y,rx,ry);
    dx += leaf*Math.sin(time*1.15+v*10+phase)*.0032;
    dy += leaf*Math.sin(time*.9+u*9+phase)*.0012;
  }
  // Separate breathing rhythms in the four painted companions. Their feet are pinned.
  for (const [x,head,feet,rx,phase] of [[.609,.70,.83,.051,0],[.694,.58,.84,.038,1.2],[.792,.70,.84,.052,2.3],[.873,.71,.86,.044,3.1]]) {
    const body=bell(u,v,x,(head+feet)/2,rx,(feet-head)*.75);
    const pinned=clamp((feet-v)/(feet-head),0,1);
    dy-=body*pinned*Math.sin(time*1.8+phase)*.003;
    dx+=body*pinned*Math.sin(time*.9+phase)*.0012;
  }
  return {x:u+dx,y:v+dy};
}
function triangle(ctx,image,s,d) {
  const [a,b,c]=s,[p,q,r]=d;
  const det=a.x*(b.y-c.y)+b.x*(c.y-a.y)+c.x*(a.y-b.y);
  const A=(p.x*(b.y-c.y)+q.x*(c.y-a.y)+r.x*(a.y-b.y))/det;
  const B=(p.y*(b.y-c.y)+q.y*(c.y-a.y)+r.y*(a.y-b.y))/det;
  const C=(p.x*(c.x-b.x)+q.x*(a.x-c.x)+r.x*(b.x-a.x))/det;
  const D=(p.y*(c.x-b.x)+q.y*(a.x-c.x)+r.y*(b.x-a.x))/det;
  const E=p.x-A*a.x-C*a.y,F=p.y-B*a.x-D*a.y;
  const mx=(p.x+q.x+r.x)/3,my=(p.y+q.y+r.y)/3;
  // A subpixel seam allowance prevents hairline cracks between adjacent triangles.
  ctx.save();ctx.beginPath();
  for(let i=0;i<3;i++){const z=d[i],vx=z.x-mx,vy=z.y-my,l=Math.hypot(vx,vy)||1;const x=z.x+vx/l*.5,y=z.y+vy/l*.5;if(i)ctx.lineTo(x,y);else ctx.moveTo(x,y)}
  ctx.closePath();ctx.clip();ctx.transform(A,B,C,D,E,F);ctx.drawImage(image,0,0);ctx.restore();
}
export function drawSplashFrame(ctx, image, time, width, height, reduced = false) {
  const iw=image.naturalWidth||image.width,ih=image.naturalHeight||image.height;
  if(!iw||!ih||!width||!height)return;
  const scale=Math.max(width/iw,height/ih),w=iw*scale,h=ih*scale;
  const left=(width-w)*(width<height?.62:.5),top=(height-h)*.5;
  ctx.save();ctx.clearRect(0,0,width,height);ctx.translate(left,top);
  ctx.imageSmoothingEnabled=true;
  ctx.drawImage(image,0,0,w,h);
  if(reduced){ctx.restore();return}
  const cols=24,rows=16,points=[];
  for(let y=0;y<=rows;y++)for(let x=0;x<=cols;x++){
    const u=x/cols,v=y/rows,p=splashVertex(u,v,time);
    points.push({s:{x:u*iw,y:v*ih},d:{x:p.x*w,y:p.y*h}});
  }
  for(let y=0;y<rows;y++)for(let x=0;x<cols;x++){
    const a=points[y*(cols+1)+x],b=points[y*(cols+1)+x+1],c=points[(y+1)*(cols+1)+x],d=points[(y+1)*(cols+1)+x+1];
    triangle(ctx,image,[a.s,b.s,c.s],[a.d,b.d,c.d]);triangle(ctx,image,[b.s,d.s,c.s],[b.d,d.d,c.d]);
  }
  ctx.globalCompositeOperation='screen';
  for(let i=0;i<beacons.length;i++){
    const [u,v]=beacons[i],x=u*w,y=v*h,r=w*(.009+.002*Math.sin(time*1.6+i));
    const g=ctx.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,'rgba(255,238,157,'+(.35+.16*Math.sin(time*1.6+i))+')');g.addColorStop(1,'rgba(255,220,112,0)');ctx.fillStyle=g;ctx.fillRect(x-r,y-r,r*2,r*2);
  }
  // Light travels down the painted waterfalls and glints across the river.
  for(let i=0;i<30;i++){
    const u=.18+(i*.197%1)*.62,v=.45+(i*.317%1)*.28;
    const phase=(time*.28+i*.371)%1,opacity=Math.sin(phase*Math.PI)*.3;
    ctx.globalAlpha=opacity;ctx.fillStyle='#fff0c9';ctx.fillRect(u*w,(v+phase*.011)*h,w*(.002+i%3*.001),Math.max(1,h*.0008));
  }
  ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over';
  for(let i=0;i<14;i++){
    const cycle=(time*.032+i*.173)%1,x=(.49+(i*.137%1)*.48+Math.sin(time*.65+i)*.007)*w,y=(.96-cycle*.56)*h;
    ctx.globalAlpha=Math.sin(cycle*Math.PI)*(.18+(i%3)*.1);ctx.fillStyle='#fff5bc';ctx.beginPath();ctx.arc(x,y,Math.max(1,w*.0013),0,Math.PI*2);ctx.fill();
  }
  ctx.restore();
}
