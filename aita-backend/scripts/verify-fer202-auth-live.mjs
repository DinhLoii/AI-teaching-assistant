import fs from 'node:fs/promises'
import path from 'node:path'
import { chromium } from 'playwright'
const out = path.resolve('../output/fer202-auth-live')
await fs.mkdir(out,{recursive:true})
const tests = JSON.parse(await fs.readFile('../output/FER202_Auth/browser-tests.json','utf8'))
const base = 'https://ai-teaching-assistant-roan.vercel.app'
const browser = await chromium.launch({headless:false, executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE || 'C:/Program Files/Google/Chrome/Application/chrome.exe'})
const results=[]
try {
 const context=await browser.newContext({viewport:{width:1280,height:720}})
 const page=await context.newPage();page.setDefaultTimeout(1200)
 for(const tc of tests){
  let failedStep=null
  try {
   await page.goto(base+tc.startUrl,{waitUntil:'domcontentloaded',timeout:30000})
   for(const step of tc.steps){
    failedStep=step
    const locator=step.target ? page.locator(step.target) : null
    if(step.action==='assertVisible') await locator.waitFor({state:'visible'})
    else if(step.action==='fill') await locator.fill(step.value)
    else if(step.action==='click') await locator.click()
    else if(step.action==='screenshot') await page.screenshot({path:path.join(out,tc.id+'.png'),fullPage:true})
    else throw Error('Unsupported action: '+step.action)
   }
   results.push({id:tc.id,name:tc.name,status:'passed'})
  }catch(e){results.push({id:tc.id,name:tc.name,status:'failed',step:failedStep,error:e.message,url:page.url()})}
  await page.screenshot({path:path.join(out,tc.id+'-actual.png'),fullPage:true})
  console.log(tc.id+': '+results.at(-1).status)
 }
 await page.goto(base+'/login',{waitUntil:'networkidle'})
 const actual={url:page.url(),text:await page.locator('body').innerText(),inputs:await page.locator('input').evaluateAll(es=>es.map(e=>({type:e.type,id:e.id,testid:e.dataset.testid||null}))),registerLinks:await page.locator('a').evaluateAll(es=>es.filter(e=>/register|sign.up|đăng ký/i.test(e.textContent+' '+e.href)).map(e=>e.href))}
 await page.screenshot({path:path.join(out,'login-desktop.png'),fullPage:true})
 await page.keyboard.press('Tab');await page.keyboard.press('Tab')
 actual.keyboardFocusedTag=await page.evaluate(()=>document.activeElement?.tagName)
 await page.setViewportSize({width:390,height:844})
 actual.mobileNoHorizontalOverflow=await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)
 await page.screenshot({path:path.join(out,'login-mobile.png'),fullPage:true})
 let source=null
 try{const r=await fetch('https://api.github.com/repos/DinhLoii/AI-teaching-assistant/commits/HEAD');source={status:r.status,commit:(await r.json()).sha}}catch(e){source={error:e.message}}
 await fs.writeFile(path.join(out,'results.json'),JSON.stringify({testedAt:new Date().toISOString(),repository:'https://github.com/DinhLoii/AI-teaching-assistant',deployment:base+'/login',source,suite:'Exact instructor TC01-TC13, same clean context, no selector substitutions',passed:results.filter(r=>r.status==='passed').length,total:13,results,actual,limitation:'Deployed AITA login is not the FER202 frontend-only registration app. No grading score or database record is changed.'},null,2))
 console.log(JSON.stringify({passed:results.filter(r=>r.status==='passed').length,total:13,actual,out}))
}finally{await browser.close()}
