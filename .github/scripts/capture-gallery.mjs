import {chromium} from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';

const LIVE = 'https://wildbound-aster.itsryanlenk.chatgpt.site/';
const OUT = process.env.GALLERY_DIR;
if (!OUT) throw new Error('GALLERY_DIR is required');
await fs.mkdir(OUT, {recursive:true});
const shots=[];
const browser=await chromium.launch({headless:true, args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});

async function capture(page,name,description) {
  await page.mouse.move(1,1);
  await page.evaluate(()=>document.fonts.ready);
  await page.waitForTimeout(900);
  const image=await page.screenshot({type:'jpeg',quality:88,fullPage:false,caret:'hide'});
  await fs.writeFile(path.join(OUT,name),image);
  shots.push({file:name,description,viewport:page.viewportSize(),bytes:image.length,sha256:crypto.createHash('sha256').update(image).digest('hex')});
  console.log(`Captured ${name}: ${description}`);
}

async function begin(page,{opening=false}={}) {
  await page.goto(LIVE,{waitUntil:'domcontentloaded',timeout:60000});
  await page.getByRole('button',{name:'Start your adventure',exact:true}).waitFor({state:'visible',timeout:60000});
  if(opening) await capture(page,'title.jpg','Animated title screen, captured in a fresh anonymous browser context.');
  await page.getByRole('button',{name:'Start your adventure',exact:true}).click();
  await page.getByRole('button',{name:/^(Skip intro|Choose your companion)$/}).waitFor({state:'visible',timeout:30000});
  await page.getByRole('button',{name:/^(Skip intro|Choose your companion)$/}).click();
  await page.getByRole('textbox',{name:'Ranger name',exact:true}).fill('Ranger');
  await page.getByRole('radio',{name:'Choose Spriglit',exact:true}).check();
  if(opening) await capture(page,'companions.jpg','Starter selection with Spriglit, Cindlet and Bubblot; the player name is synthetic.');
  await page.getByRole('button',{name:/^Begin with Spriglit/}).click();
  await page.getByRole('button',{name:'Explore on my own',exact:true}).waitFor({state:'visible',timeout:30000});
  await page.getByRole('button',{name:'Explore on my own',exact:true}).click();
  await page.getByRole('button',{name:'Field guide',exact:true}).waitFor({state:'visible',timeout:30000});
  await page.waitForTimeout(1800);
}

try {
  const desktop=await browser.newContext({viewport:{width:1440,height:1000},deviceScaleFactor:1,reducedMotion:'reduce',locale:'en-US'});
  const page=await desktop.newPage();
  page.setDefaultTimeout(18000);
  try {
    await begin(page,{opening:true});
    await capture(page,'desktop.jpg','Actual desktop exploration in Meadowreach.');
    await page.getByRole('button',{name:'Field guide',exact:true}).click();
    await page.getByRole('textbox',{name:'Search creatures',exact:true}).waitFor({state:'visible'});
    await capture(page,'field-guide.jpg','The in-game field guide in an early-game adventure.');
    await page.getByRole('button',{name:'Close',exact:true}).click();
    await page.getByRole('button',{name:'Try the lesson',exact:true}).click();
    await page.waitForTimeout(1600);
    await capture(page,'desktop-battle.jpg','Actual guided first battle in the desktop interface.');
  } catch(error) {
    console.log('Current visible buttons:',await page.getByRole('button').allTextContents());
    throw error;
  }
  await desktop.close();

  const phone=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:1,isMobile:true,hasTouch:true,reducedMotion:'reduce',locale:'en-US'});
  const mobile=await phone.newPage();
  mobile.setDefaultTimeout(18000);
  try {
    await begin(mobile);
    await capture(mobile,'phone.jpg','Actual exploration at a 390 by 844 touch-enabled browser viewport.');
    await mobile.getByRole('button',{name:'Try the lesson',exact:true}).click();
    await mobile.waitForTimeout(1600);
    await capture(mobile,'phone-battle.jpg','Guided battle in the portrait touch layout, captured using browser emulation.');
  } catch(error) {
    console.log('Current mobile buttons:',await mobile.getByRole('button').allTextContents());
    throw error;
  }
  await phone.close();
  await fs.writeFile(path.join(OUT,'capture-manifest.json'),JSON.stringify({source:LIVE,method:'Playwright Chromium, fresh anonymous contexts, interface interactions only',playerName:'Ranger (synthetic)',physicalDeviceTest:false,reducedMotion:true,images:shots},null,2)+'\n');
  console.log(JSON.stringify({screenshots:shots.length,complete:true}));
} finally {
  await browser.close();
}
