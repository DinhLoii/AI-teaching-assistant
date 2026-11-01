import 'dotenv/config'
import fs from 'node:fs/promises'
import path from 'node:path'
import assert from 'node:assert/strict'
import AdmZip from 'adm-zip'
import {ExecutionSandboxService} from '../src/modules/grading/engine/application/sandbox/ExecutionSandboxService.ts'
import {BrowserTestRunner} from '../src/modules/grading/engine/plugins/playwright/BrowserTestRunner.ts'
import {browserPresentationContext} from '../src/modules/grading/engine/application/execution/browser-presentation.ts'
const base=path.resolve('../output/fer202-giohang')
const contract=JSON.parse(await fs.readFile(path.join(base,'teacher-browser-contract.json'),'utf8'))
const out=path.resolve('../output/ui-observation');await fs.mkdir(out,{recursive:true})
const results=[]
for(const [label,caseId,success] of [['submit_8-9_diem','TC06',true],['submit_1-2_diem','TC02',false]]) {
 const folder=path.resolve('../tmp/observe-'+label+'-'+Date.now());await fs.mkdir(folder,{recursive:true});new AdmZip(path.join(base,label+'.zip')).extractAllTo(folder)
 const service=new ExecutionSandboxService();let handle,runner
 try {
  handle=await service.startAsync(folder,'project');assert.equal(handle.isReady,true)
  const messages=[]
  runner=new BrowserTestRunner('PlaywrightPlugin',{submissionId:'observe',baseUrl:handle.baseUrl,artifactsDir:out,onBrowserMessage:m=>messages.push(m)},{})
  await browserPresentationContext.run({watchBrowser:true},()=>runner.initializeAsync())
  runner.page.setDefaultTimeout(2500)
  const evidence=await runner.executeTestAsync(contract.testSuites.browser.find(t=>t.id===caseId))
  const workflow=evidence.find(e=>e.type==='browser.workflow.completed').payload
  assert.equal(workflow.success,success)
  assert.ok(evidence.filter(e=>e.type==='browser.element.clicked').length>=2)
  assert.match(await runner.page.locator('[data-aita-runner=status]').innerText(),new RegExp(caseId))
  const total=await runner.page.getByTestId('cart-total').innerText()
  assert.equal(total,success?'450000':'0')
  await runner.page.screenshot({path:path.join(out,label+'.png'),fullPage:true})
  results.push({label,workflow,total,messages,clicks:evidence.filter(e=>e.type==='browser.element.clicked').length})
 }finally{if(runner)await runner.teardownAsync();if(handle)await service.stopAsync(handle)}
}
await fs.writeFile(path.join(out,'verification.json'),JSON.stringify(results,null,2))
console.log(JSON.stringify(results.map(r=>({label:r.label,passed:r.workflow.success,clicks:r.clicks,total:r.total}))))
process.exit(0)
