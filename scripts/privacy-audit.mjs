import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {ROOT,files} from './lib.mjs';
const textExtensions=new Set(['.js','.mjs','.ts','.tsx','.json','.md','.txt','.html','.css','.py','.yml','.yaml','.svg']);
const forbiddenExtensions=new Set(['.pem','.key','.p12','.pfx','.ttf','.otf','.woff','.woff2','.map']);
const tests=[
 ['access-token',/(?:gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{35,}|art_v2_[A-Za-z0-9_]{25,}|sk-[A-Za-z0-9]{35,})/],
 ['private-key',/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/],
 ['private-working-path',/(?:\/workspace\/(?:scratch|sites)\/[A-Za-z0-9_/-]+|\/home\/oai\/|\/mnt\/data\/|[A-Za-z]:\\Users\\[^\\\s]+)/],
 ['internal-identifier',/(?:appgprj_|appgdep_|appgrepo_|file_)[a-f0-9]{20,}/],
 ['url-with-credentials',/https?:\/\/[^\s/]+:[^\s/]+@/],
];
const allowedEmails=new Set(['hi@remotion.dev']);
export function audit(){
 const findings=[];let inspected=0;
 for(const relative of files()){
  const ext=path.extname(relative).toLowerCase(),base=path.basename(relative);
  if(forbiddenExtensions.has(ext)||/^\.env(?:\.|$)/.test(base)||/(?:^|\/)(?:saves|browser-profile)(?:\/|$)/.test(relative)||/^(?:wildbound-save|save-backup)/i.test(base))findings.push({file:relative,reason:'excluded-file-type'});
  if(!textExtensions.has(ext)&&!['LICENSE','.gitignore','.gitattributes'].includes(base))continue;
  const text=fs.readFileSync(path.join(ROOT,relative),'utf8');inspected++;
  for(const [reason,pattern]of tests)if(pattern.test(text))findings.push({file:relative,reason});
  const emails=text.match(/[A-Za-z0-9_.+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}/g)||[];
  for(const email of emails)if(!allowedEmails.has(email)&&!email.endsWith('@users.noreply.github.com'))findings.push({file:relative,reason:'unreviewed-email'});
 }
 return {inspectedTextFiles:inspected,findings};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const result=audit();console.log(JSON.stringify(result,null,2));if(result.findings.length)process.exitCode=1;
}
