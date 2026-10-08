import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const GAME=fileURLToPath(new URL('../game/',import.meta.url));
const MIME={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml','.mp3':'audio/mpeg','.mp4':'video/mp4','.wav':'audio/wav','.txt':'text/plain; charset=utf-8','.md':'text/plain; charset=utf-8'};
export function createGameServer(root=GAME){
 const absolute=path.resolve(root);
 return http.createServer(async(req,res)=>{
  const error=(status,msg)=>{res.writeHead(status,{'Content-Type':'text/plain','Cache-Control':'no-store'}).end(msg)};
  if(!['GET','HEAD'].includes(req.method))return error(405,'Use GET or HEAD.');
  try{
   const decoded=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
   if(decoded.split('/').some(p=>p.startsWith('.')&&p!=='.'&&p!=='..')||decoded.includes('\\')||decoded.includes('\0'))return error(403,'Forbidden.');
   let target=path.resolve(absolute,'.'+decoded);
   if(target!==absolute&&!target.startsWith(absolute+path.sep))return error(403,'Forbidden.');
   if((await fs.stat(target)).isDirectory())target=path.join(target,'index.html');
   const real=await fs.realpath(target);if(!real.startsWith(absolute+path.sep))return error(403,'Forbidden.');
   const data=await fs.readFile(real),headers={'Content-Type':MIME[path.extname(real)]||'application/octet-stream','Cache-Control':'no-cache','X-Content-Type-Options':'nosniff','Accept-Ranges':'bytes'};
   let start=0,end=data.length-1,status=200;
   if(req.headers.range){
    const m=/^bytes=(\d*)-(\d*)$/.exec(req.headers.range);
    if(!m||(!m[1]&&!m[2]))return error(416,'Unsupported byte range.');
    if(m[1]){start=Number(m[1]);end=m[2]?Math.min(Number(m[2]),end):end;}else{start=Math.max(0,data.length-Number(m[2]));}
    if(!Number.isSafeInteger(start)||!Number.isSafeInteger(end)||start<0||start>end||start>=data.length){res.writeHead(416,{'Content-Range':`bytes */${data.length}`}).end();return;}
    status=206;headers['Content-Range']=`bytes ${start}-${end}/${data.length}`;
   }
   headers['Content-Length']=data.length?end-start+1:0;
   res.writeHead(status,headers);res.end(req.method==='HEAD'?undefined:data.subarray(start,end+1));
  }catch(e){error(e instanceof URIError?400:404,e instanceof URIError?'Invalid URL.':'Game file not found.');}
 });
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const port=Number(process.env.PORT||8080);if(!Number.isInteger(port)||port<1||port>65535)throw new Error('PORT must be between 1 and 65535.');
 const server=createGameServer();server.on('error',e=>{console.error(e.code==='EADDRINUSE'?'Port is already in use. Choose another PORT.':e.message);process.exitCode=1});
 server.listen(port,'127.0.0.1',()=>console.log(`Wildbound: http://localhost:${port}\nLocal only. Press Ctrl+C to stop.`));
}
