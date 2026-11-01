import 'dotenv/config'
import fs from 'node:fs/promises'
import path from 'node:path'
import assert from 'node:assert/strict'
import AdmZip from 'adm-zip'
import {chromium} from 'playwright'
import {ExecutionSandboxService} from '../src/modules/grading/engine/application/sandbox/ExecutionSandboxService.ts'
import {PlaywrightPlugin} from '../src/modules/grading/engine/plugins/playwright/PlaywrightPlugin.ts'
import {browserPresentationContext} from '../src/modules/grading/engine/application/execution/browser-presentation.ts'
import {scoreBrowserWorkflows} from '../src/modules/grading/engine/application/evaluator/browser-workflow-score.ts'
const base=path.resolve('../output/FER202_3-4')
const folder=path.resolve('../tmp/fer-low-check-'+Date.now())
await fs.mkdir(folder,{recursive:true})
new AdmZip(path.join(base,'folder3-4.zip')).extractAllTo(folder)
const contract=JSON.parse(await fs.readFile('../output/FER202_Auth/teacher-browser-contract.json','utf8'))
contract.testSuites.browser.find(t=>t.id==='TC11').steps.unshift({action:'reload'})
const buffers=new Map()
const store={async storeArtifactAsync(submissionId,type,buffer,filename){const id='low-'+buffers.size;buffers.set(id,buffer);await fs.writeFile(path.join(base,filename.replace(/[^\w.-]/g,'_')),buffer);return {id,submissionId,type,uri:filename};},async getArtifactAsync(id){return buffers.get(id)}}
const service=new ExecutionSandboxService()
let handle,browser
try {
 handle=await service.startAsync(folder,'project');assert.equal(handle.isReady,true,handle.crashLogs)
 const evidence=await browserPresentationContext.run({watchBrowser:false},()=>new PlaywrightPlugin(store).executeAsync({submissionId:'fer-low-local-check',apiUrl:handle.baseUrl,sandboxWorkspacePath:path.join(folder,'artifacts')},contract.testSuites.browser))
 const workflows=evidence.filter(e=>e.type==='browser.workflow.completed')
 assert.equal(workflows.length,13)
 assert.deepEqual(workflows.filter(e=>e.payload.success).map(e=>e.payload.testId),['TC01','TC02','TC03'])
 browser=await chromium.launch({headless:true})
 const page=await browser.newPage()
 for(const [name,width,route] of [['desktop-login',1280,'login'],['desktop-register',1280,'register'],['mobile-register',390,'register']]) {
  await page.setViewportSize({width,height:844});await page.goto(handle.baseUrl+'/#'+route);await page.locator('form').waitFor()
  const artifact=await store.storeArtifactAsync('fer-low-local-check','screenshot',await page.screenshot({fullPage:true}),name+'.png')
  evidence.push({id:'screenshot-'+name,type:'browser.screenshot.captured',source:'PlaywrightPlugin',confidence:1,payload:{artifactId:artifact.id}})
 }
 const criteria=contract.rubric.rules.slice(0,6).map(r=>({title:r.title,...scoreBrowserWorkflows(r.requiredEvidence.flatMap(e=>e.browserProbe?.testIds||[]),evidence,r.weight)}))
 const functionalScore=criteria.reduce((sum,c)=>sum+c.score,0)
 assert.equal(functionalScore,2)
 await fs.writeFile(path.join(base,'verification.json'),JSON.stringify({verifiedAt:new Date().toISOString(),functionalScore,visualPointsPending:2,externalAiCalls:0,tests:workflows.map(w=>w.payload),criteria},null,2))
 console.log(JSON.stringify({functionalScore,visualPointsPending:2,passed:workflows.filter(w=>w.payload.success).length,total:13}))
}finally{if(browser)await browser.close();if(handle)await service.stopAsync(handle)}
process.exit(0)
