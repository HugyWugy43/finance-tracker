import {chromium} from 'playwright';
import {writeFile} from 'node:fs/promises';
const browser=await chromium.launch({channel:'chrome',headless:true});
const page=await browser.newPage();
await page.goto('http://127.0.0.1:5173/',{waitUntil:'domcontentloaded'});
await page.getByRole('heading',{name:'Куда уходят деньги'}).waitFor();
const results=[];
async function extract(selector){return page.evaluate(selector=>{
 const round=v=>Math.round(v*100)/100;
 function box(el){const r=el.getBoundingClientRect();return {x:round(r.x+scrollX),y:round(r.y+scrollY),w:round(r.width),h:round(r.height)}}
 function texts(node,parent){const style=getComputedStyle(parent),size=parseFloat(style.fontSize);if(size<1)return[];const lines=[];let current=null;for(let i=0;i<node.textContent.length;i++){const range=document.createRange();range.setStart(node,i);range.setEnd(node,i+1);const r=range.getBoundingClientRect();if(!r.width||!r.height)continue;if(!current||Math.abs(current.y-r.y-scrollY)>3){current={kind:'text',value:'',x:r.x+scrollX,y:r.y+scrollY,w:0,h:r.height,size,weight:Number(style.fontWeight),color:style.color,spacing:parseFloat(style.letterSpacing)||0,line:parseFloat(style.lineHeight)||size*1.5};lines.push(current);}current.value+=node.textContent[i];current.w=r.right+scrollX-current.x;}return lines.filter(l=>l.value.trim());}
 function walk(el){const s=getComputedStyle(el),b=box(el);if(s.display==='none'||s.visibility==='hidden'||Number(s.opacity)===0||b.w<.1||b.h<.1||['SCRIPT','STYLE','LINK','TITLE'].includes(el.tagName))return null;
  const n={kind:'frame',name:el.getAttribute('aria-label')||el.className||el.tagName.toLowerCase(),tag:el.tagName,...b,bg:s.backgroundColor,border:s.borderTopColor,borderWidth:parseFloat(s.borderTopWidth)||0,radius:parseFloat(s.borderTopLeftRadius)||0,opacity:Number(s.opacity),clip:s.overflow==='hidden',display:s.display,direction:s.flexDirection,gap:parseFloat(s.gap)||0,justify:s.justifyContent,align:s.alignItems,padding:[s.paddingTop,s.paddingRight,s.paddingBottom,s.paddingLeft].map(v=>parseFloat(v)||0),children:[]};
  if(el instanceof SVGElement&&el.tagName==='svg'){const copy=el.cloneNode(true);const src=[el,...el.querySelectorAll('*')],dst=[copy,...copy.querySelectorAll('*')];for(let i=0;i<src.length;i++){const cs=getComputedStyle(src[i]);for(const prop of ['fill','stroke','stroke-width','color','stop-color','stop-opacity','opacity']){const val=cs.getPropertyValue(prop);if(val)dst[i].setAttribute(prop,val);}dst[i].removeAttribute('class');dst[i].removeAttribute('style');}copy.setAttribute('width',b.w);copy.setAttribute('height',b.h);copy.setAttribute('xmlns','http://www.w3.org/2000/svg');return {...n,kind:'svg',svg:copy.outerHTML};}
  if(el.tagName==='IMG')return {...n,kind:'image',src:el.getAttribute('src'),blend:s.mixBlendMode,filter:s.filter};
  for(const child of el.childNodes){if(child.nodeType===Node.TEXT_NODE)n.children.push(...texts(child,el));else if(child.nodeType===Node.ELEMENT_NODE){const x=walk(child);if(x)n.children.push(x);}}
  if(el instanceof HTMLInputElement||el instanceof HTMLSelectElement){const value=el instanceof HTMLSelectElement?el.selectedOptions[0]?.textContent:el.type==='password'?'••••••••••••':el.value||el.placeholder;n.children.push({kind:'text',value,x:b.x+n.padding[3],y:b.y+(b.h-parseFloat(s.fontSize)*1.3)/2,w:b.w-n.padding[1]-n.padding[3],h:parseFloat(s.fontSize)*1.3,size:parseFloat(s.fontSize),weight:400,color:el.value?s.color:'#878d83',spacing:0,line:parseFloat(s.fontSize)*1.3});}
  if(el.classList.contains('breadcrumb')&&innerWidth<=760)n.children.push({kind:'text',value:'orbit.',x:b.x,y:b.y-3,w:90,h:35,size:27,weight:800,color:s.color,spacing:-1,line:35});
  return n;
 }
 return {width:innerWidth,height:document.documentElement.scrollHeight,bg:getComputedStyle(document.body).backgroundColor,tree:walk(document.querySelector(selector)),tokens:Object.fromEntries(['bg','sidebar','panel','panel-hover','input','text','muted','subtle','line','accent','accent-strong','accent-ink','danger'].map(k=>[k,getComputedStyle(document.documentElement).getPropertyValue('--'+k).trim()]))};
},selector);}
for(const device of [{name:'Desktop',width:1440,height:1100},{name:'Tablet',width:834,height:1112},{name:'Mobile',width:390,height:844}]){
 await page.setViewportSize(device);
 for(const theme of ['dark','light']){
  await page.evaluate(t=>localStorage.setItem('orbit-theme',t),theme);await page.reload({waitUntil:'domcontentloaded'});await page.getByRole('heading',{name:'Куда уходят деньги'}).waitFor();await page.evaluate(()=>document.fonts.ready);
  const data=await extract('.app-shell');data.name=`${device.name} / ${theme} / Обзор`;data.theme=theme;data.device=device.name;
  results.push(data);
 }
}
await page.getByRole('button',{name:'Создать аккаунт',exact:true}).first().click();
await page.getByLabel('Пароль',{exact:true}).fill('OrbitSecure!2026');
results.push({...await extract('dialog'),name:'Mobile / light / Регистрация',theme:'light',device:'Form'});
await page.getByRole('button',{name:'Закрыть',exact:true}).click();
await page.getByRole('button',{name:'Добавить операцию',exact:true}).click();
await page.getByLabel('Сумма, ₽',{exact:true}).fill('1 250');await page.getByLabel('Название',{exact:true}).fill('Продукты на неделю');
results.push({...await extract('dialog'),name:'Mobile / light / Новая операция',theme:'light',device:'Form'});
await writeFile('design/layout-data.json',JSON.stringify(results));
await browser.close();console.log('Exported',results.length,'editable layout specifications');
