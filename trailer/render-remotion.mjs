#!/usr/bin/env node
/** Optional renderer for an environment with Remotion bundler/renderer + Chrome.
 * The delivered MP4 was rendered using render-trailer.mjs, not this path.
 * No automatic install, browser download, remote render, or service signup.
 */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.dirname(fileURLToPath(import.meta.url));
const browserExecutable=process.env.REMOTION_BROWSER_EXECUTABLE;
if(!browserExecutable||!fs.existsSync(browserExecutable)){
 throw new Error('Set REMOTION_BROWSER_EXECUTABLE to an installed Chrome executable. No browser will be downloaded.');
}
const [{bundle},{selectComposition,renderMedia}]=await Promise.all([
 import('@remotion/bundler'),import('@remotion/renderer'),
]);
await import('./prepare-remotion.mjs');
const serveUrl=await bundle({entryPoint:path.join(root,'remotion/index.ts'),publicDir:path.join(root,'public')});
const composition=await selectComposition({serveUrl,id:'WildboundLaunch',browserExecutable});
await renderMedia({composition,serveUrl,codec:'h264',audioCodec:'aac',audioBitrate:'192k',
  pixelFormat:'yuv420p',crf:18,concurrency:2,browserExecutable,
  outputLocation:path.join(root,'wildbound-launch-remotion.mp4')});
console.log('Rendered optional Remotion export.');
