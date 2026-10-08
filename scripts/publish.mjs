/**
 * Public, clean-history publication through the user's own authenticated GitHub CLI.
 * No token is requested, printed, stored, or copied. No existing history is pushed.
 */
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {ROOT,read,json,sha,safeRelative,checkManifest} from './lib.mjs';
import {verify} from './verify.mjs';

const OWNER='itsryanlenk', REPO='wildbound-aster', FULL=`${OWNER}/${REPO}`, TAG='v0.4.0';
const RELEASE=path.join(ROOT,'_release');
const statePath=path.join(ROOT,'.publish-state.json');
const live='https://wildbound-aster.itsryanlenk.chatgpt.site';
const description='An original browser creature adventure: 151 companions, real-time battles, eight beacons, local saves, and an editable launch trailer.';
const publish=process.argv.includes('--publish'), resume=process.argv.includes('--resume');
const allowed=new Set(['--publish','--resume']);
if(process.argv.slice(2).some(arg=>!allowed.has(arg)))throw new Error('Use --publish and optional --resume only.');

function run(exe,args,{cwd=ROOT,input,allowFailure=false,env={}}={}){
 const result=spawnSync(exe,args,{cwd,encoding:'utf8',input,env:{...process.env,GH_HOST:'github.com',GH_PROMPT_DISABLED:'1',...env},maxBuffer:8*1024*1024});
 if(result.error)throw new Error(`${exe} is unavailable. Install the official tool and sign in locally; do not paste credentials into chat.`);
 if(result.status!==0&&!allowFailure)throw new Error(`${exe} ${args.slice(0,3).join(' ')} failed: ${(result.stderr||result.stdout).trim().slice(0,1600)}`);
 return result;
}
const gh=(args,options)=>run('gh',args,options);
function stateSave(s){fs.writeFileSync(statePath,JSON.stringify(s,null,2)+'\n',{mode:0o600})}
function api(endpoint,method='GET',body){return gh(['api','--hostname','github.com','--method',method,endpoint,...(body?['--input','-']:[])],body?{input:JSON.stringify(body)}:{});}
function releaseData(){return JSON.parse(api(`repos/${FULL}/releases/tags/${TAG}`).stdout);}
function inspectAssets(assets,manifest){
 for(const expected of manifest.files){
  const actual=assets.find(x=>x.name===expected.name);
  if(!actual||actual.size!==expected.bytes)throw new Error(`Release asset missing or incorrect size: ${expected.name}`);
  if(actual.digest&&actual.digest!==`sha256:${expected.sha256}`)throw new Error(`Release asset digest mismatch: ${expected.name}`);
 }
}

try{
 run(process.execPath,[path.join(ROOT,'scripts/package-release.mjs'),'--ensure']);
 const validation=verify();
 const manifest=checkManifest(), manifestDigest=sha(read('PACKAGE-MANIFEST.json'));
 const releaseManifest=json('release-manifest.json');
 for(const asset of releaseManifest.files){
  safeRelative(asset.name);if(asset.name.includes('/'))throw new Error('Release files must be flat basenames.');
  const file=path.join(RELEASE,asset.name);if(!fs.existsSync(file))throw new Error(`Missing release asset: ${asset.name}. Use the complete starter package.`);
  if(fs.lstatSync(file).isSymbolicLink())throw new Error('Release assets must not be symlinks.');
  const bytes=fs.readFileSync(file);if(bytes.length!==asset.bytes||sha(bytes)!==asset.sha256)throw new Error(`Release asset changed: ${asset.name}`);
 }
 console.log(`Preflight passed: ${validation.offlineAssets} game runtime assets, ${manifest.files.length} repository files, ${releaseManifest.files.length} release attachments.`);
 if(!publish){
  console.log(`No external action performed. --publish will create public ${FULL}, a clean no-reply-email commit, ${TAG}, release downloads, and attempt Pages setup.`);
  process.exit(0);
 }
 const auth=gh(['auth','status','--hostname','github.com'],{allowFailure:true});
 if(auth.status!==0)throw new Error('Sign in on this computer first: gh auth login --hostname github.com --web --scopes workflow');
 run('git',['--version']);
 const user=JSON.parse(gh(['api','--hostname','github.com','user','--jq','{login,id}']).stdout);
 if(user.login.toLowerCase()!==OWNER.toLowerCase())throw new Error(`Wrong authenticated owner. Sign in as ${OWNER} before publishing.`);
 if(!Number.isSafeInteger(Number(user.id))||Number(user.id)<=0)throw new Error('GitHub did not return a valid public account ID.');
 const authorEmail=`${user.id}+${user.login}@users.noreply.github.com`;
 const gitEnv={GIT_AUTHOR_NAME:OWNER,GIT_COMMITTER_NAME:OWNER,GIT_AUTHOR_EMAIL:authorEmail,GIT_COMMITTER_EMAIL:authorEmail};
 let state;
 if(resume){
  if(!fs.existsSync(statePath))throw new Error('No local publication state to resume. Run without --resume for a new repository.');
  state=JSON.parse(fs.readFileSync(statePath,'utf8'));
  if(state.repo!==FULL||state.manifestDigest!==manifestDigest)throw new Error('Resume target or payload differs from the recorded operation. Nothing was pushed.');
  const workBase=path.join(ROOT,'.publish-work')+path.sep;
  if(!path.resolve(state.worktree).startsWith(workBase)||!fs.existsSync(path.join(state.worktree,'.git')))throw new Error('Recorded clean worktree is missing or outside the staging directory.');
 }else{
  if(fs.existsSync(statePath))throw new Error('A publication state already exists. Review it and use --resume; no repository is overwritten.');
  const existing=gh(['api',`repos/${FULL}`],{allowFailure:true});
  if(existing.status===0)throw new Error(`${FULL} already exists. This publisher refuses to overwrite it or reuse its history.`);
  if(!/HTTP 404|\(404\)/i.test(existing.stderr))throw new Error('Could not establish that the repository is absent; check GitHub permissions.');
  const worktree=path.join(ROOT,'.publish-work',`clean-${Date.now()}`);fs.mkdirSync(worktree,{recursive:true});
  for(const item of [...manifest.files,{path:'PACKAGE-MANIFEST.json'}]){
   const relative=safeRelative(item.path);const destination=path.join(worktree,relative);fs.mkdirSync(path.dirname(destination),{recursive:true});fs.copyFileSync(path.join(ROOT,relative),destination);
  }
  const git=(args)=>run('git',args,{cwd:worktree,env:gitEnv});
  git(['init','--initial-branch=main']);
  fs.mkdirSync(path.join(worktree,'.git','no-hooks'),{recursive:true});
  git(['config','--local','core.hooksPath','.git/no-hooks']);
  git(['config','--local','core.autocrlf','false']);
  git(['config','--local','user.name',OWNER]);git(['config','--local','user.email',authorEmail]);
  git(['config','--local','commit.gpgsign','false']);
  git(['config','--local','credential.https://github.com.helper','!gh auth git-credential']);
  git(['add','--all']);git(['commit','-m','Release Wildbound Field Edition 04 distribution and launch production']);
  const commit=git(['rev-parse','HEAD']).stdout.trim();
  const history=git(['rev-list','--count','HEAD']).stdout.trim();if(history!=='1')throw new Error('Expected exactly one clean commit.');
  const actualEmail=git(['show','-s','--format=%ae|%ce','HEAD']).stdout.trim();if(actualEmail!==`${authorEmail}|${authorEmail}`)throw new Error('Commit privacy identity check failed.');
  console.log(`Creating public repository ${FULL}.`);
  gh(['repo','create',FULL,'--public','--description',description,'--homepage',live,'--disable-wiki']);
  state={format:1,repo:FULL,tag:TAG,worktree,commit,manifestDigest,pushed:false,releasePublished:false};stateSave(state);
 }
 const git=(args)=>run('git',args,{cwd:state.worktree,env:gitEnv});
 const repo=JSON.parse(api(`repos/${FULL}`).stdout);
 if(repo.private||repo.owner.login.toLowerCase()!==OWNER.toLowerCase())throw new Error('Unexpected visibility or owner. Refusing to change it automatically.');
 if(!state.pushed){
  const url=`https://github.com/${FULL}.git`;
  const origin=git(['remote']).stdout.trim().split(/\s+/);
  if(!origin.includes('origin'))git(['remote','add','origin',url]);
  if(git(['remote','get-url','origin']).stdout.trim()!==url)throw new Error('Unexpected Git remote.');
  // Normal push only: never mirror or force-push.
  git(['push','--set-upstream','origin','main']);state.pushed=true;stateSave(state);
 }
 api(`repos/${FULL}/topics`,'PUT',{names:['browser-game','creature-collection','pixel-art','local-first','offline','pixijs','remotion','react','game','trailer']});
 api(`repos/${FULL}`,'PATCH',{description,homepage:live,has_issues:true,has_wiki:false});
 const tagCheck=gh(['release','view',TAG,'--repo',FULL,'--json','tagName'],{allowFailure:true});
 if(tagCheck.status!==0){
  if(!/release not found|HTTP 404|not found/i.test(tagCheck.stderr))throw new Error('Could not determine release status.');
  gh(['release','create',TAG,'--repo',FULL,'--target',state.commit,'--title','Wildbound — Field Edition 04','--notes-file',path.join(ROOT,'docs/RELEASE.md'),'--draft']);
 }
 let released=releaseData();
 if(released.tag_name!==TAG)throw new Error('Unexpected release tag.');
 if(!released.draft&&!state.releasePublished)throw new Error('An unexpected already-public release exists. No files were replaced.');
 for(const expected of releaseManifest.files){
  const present=released.assets.find(a=>a.name===expected.name);
  if(present){
   if(present.size!==expected.bytes||(present.digest&&present.digest!==`sha256:${expected.sha256}`))throw new Error(`Existing asset differs; no clobber: ${expected.name}`);
  }else{
   if(!released.draft)throw new Error('Will not change an already-published release.');
   console.log(`Uploading ${expected.name} (${(expected.bytes/1048576).toFixed(1)} MiB).`);
   gh(['release','upload',TAG,path.join(RELEASE,expected.name),'--repo',FULL]);
  }
 }
 released=releaseData();inspectAssets(released.assets,releaseManifest);
 if(released.draft)gh(['release','edit',TAG,'--repo',FULL,'--draft=false','--latest']);
 state.releasePublished=true;stateSave(state);
 const finalRelease=releaseData();if(finalRelease.draft)throw new Error('Release is still a draft.');inspectAssets(finalRelease.assets,releaseManifest);
 let pages='not configured', privateReporting='not configured';
 try{
  const existing=gh(['api',`repos/${FULL}/pages`],{allowFailure:true});
  if(existing.status!==0){if(!/HTTP 404|\(404\)/.test(existing.stderr))throw new Error('Pages read permission unavailable.');api(`repos/${FULL}/pages`,'POST',{build_type:'workflow'});}
  else if(JSON.parse(existing.stdout).build_type!=='workflow')throw new Error('Existing Pages configuration is not Actions-based; change it explicitly in Settings.');
  gh(['workflow','run','pages.yml','--repo',FULL,'--ref','main']);pages='workflow requested; check Actions for deployment success';
 }catch{pages='manual setup needed: Settings → Pages → GitHub Actions, then run Deploy game to Pages';}
 try{api(`repos/${FULL}/private-vulnerability-reporting`,'PUT');privateReporting='enabled';}catch{privateReporting='not confirmed; check repository Security settings';}
 const finalRepo=JSON.parse(api(`repos/${FULL}`).stdout);if(finalRepo.private)throw new Error('Repository is not public.');
 const receipt={repository:finalRepo.html_url,visibility:'public',release:finalRelease.html_url,tag:TAG,cleanCommit:state.commit,originalHistoryUploaded:false,privateContactEmailUploaded:false,pages,privateVulnerabilityReporting:privateReporting,assets:finalRelease.assets.map(a=>({name:a.name,bytes:a.size,url:a.browser_download_url,digest:a.digest??null}))};
 fs.writeFileSync(path.join(RELEASE,'PUBLISHED.json'),JSON.stringify(receipt,null,2)+'\n');
 console.log(JSON.stringify(receipt,null,2));
}catch(error){console.error(`Publication stopped: ${error.message}`);process.exitCode=1;}
