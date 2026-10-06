import {createRequire} from 'node:module';
import {mkdir,writeFile} from 'node:fs/promises';
const require=createRequire('C:/Users/Admin/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/package.json');
const {chromium}=require('playwright');
const browser=await chromium.launch({headless:true,channel:'chrome'});
const page=await browser.newPage({viewport:{width:1440,height:1100},deviceScaleFactor:1});
const errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.goto('http://127.0.0.1:5173/',{waitUntil:'domcontentloaded'});
await page.getByText('Деморежим',{exact:true}).waitFor();
await page.getByRole('heading',{name:'Куда уходят деньги'}).waitFor();
await page.screenshot({path:'design/desktop-dark.png',fullPage:true});
console.log(JSON.stringify({title:await page.title(),errors,width:await page.evaluate(()=>document.documentElement.scrollWidth),height:await page.evaluate(()=>document.documentElement.scrollHeight)}));
await browser.close();

