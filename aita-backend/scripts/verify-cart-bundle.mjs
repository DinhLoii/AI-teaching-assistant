import 'dotenv/config'
import fs from 'node:fs/promises'
import path from 'node:path'
import assert from 'node:assert/strict'
import AdmZip from 'adm-zip'
import {ExecutionSandboxService} from '../src/modules/grading/engine/application/sandbox/ExecutionSandboxService.ts'
import {BrowserTestRunner} from '../src/modules/grading/engine/plugins/playwright/BrowserTestRunner.ts'
import {browserPresentationContext} from '../src/modules/grading/engine/application/execution/browser-presentation.ts'
import {scoreBrowserWorkflows} from '../src/modules/grading/engine/application/evaluator/browser-workflow-score.ts'
import {createDockerClient} from '../src/modules/grading/engine/application/sandbox/docker-client.ts'
import {decodeSandboxLogs} from '../src/modules/grading/engine/application/sandbox/java-runtime.ts'
import {AutoConfigureAssignmentUseCase} from '../src/modules/ai/application/use-cases/auto-configure-assignment.use-case.ts'
import {DocumentExtractorService} from '../src/modules/ai/infrastructure/analysis/document-extractor.service.ts'
import {extractCartBrowserContract} from '../src/modules/ai/infrastructure/analysis/cart-browser-contract.ts'
const base=path.resolve('../output/fer202-giohang')
const pdf=await fs.readFile(path.join(base,'paperfer202.pdf'))
const extraction=await new DocumentExtractorService().extract({filename:'paperfer202.pdf',buffer:pdf})
assert.ok(extractCartBrowserContract(extraction.cleanedText),'Do not call external analysis for an unsupported document')
const analyzed=await new AutoConfigureAssignmentUseCase().execute({file:{filename:'paperfer202.pdf',buffer:pdf,mimetype:'application/pdf'},maxScore:10,subjectCode:'FER202'})
const contract={testSuites:analyzed.testSuites,rubric:{rules:analyzed.rubricCriteria.map(r=>({title:r.name,weight:r.maxPoints,requiredEvidence:[{browserProbe:r.browserProbe}]}))}}
const reports=[]
for(const [label,expected] of [['submit_1-2_diem',['TC01']],['submit_8-9_diem',['TC01','TC02','TC03','TC04','TC05','TC06','TC07','TC09']]]) {
 const folder=path.resolve('../tmp/cart-check-'+label+'-'+Date.now());await fs.mkdir(folder,{recursive:true})
 new AdmZip(path.join(base,label+'.zip')).extractAllTo(folder)
 const artifacts=path.join(base,'verification',label);await fs.mkdir(artifacts,{recursive:true})
 const store={async storeArtifactAsync(submissionId,type,buffer,name){const file=path.join(artifacts,name);await fs.writeFile(file,buffer);return{id:name,uri:file}}}
 const service=new ExecutionSandboxService();let handle,runner
 try {
  handle=await service.startAsync(folder,'project');assert.equal(handle.isReady,true,handle.crashLogs)
  runner=new BrowserTestRunner('PlaywrightPlugin',{submissionId:label,baseUrl:handle.baseUrl,artifactsDir:artifacts},store)
  await browserPresentationContext.run({watchBrowser:false},()=>runner.initializeAsync())
  runner.page.setDefaultTimeout(1800)
  const evidence=[]
  for(const test of contract.testSuites.browser) evidence.push(...await runner.executeTestAsync(test))
  const results=evidence.filter(e=>e.type==='browser.workflow.completed').map(e=>e.payload)
  assert.deepEqual(results.filter(r=>r.success).map(r=>r.testId),expected)
  for(const width of [1280,390]){
   await runner.page.setViewportSize({width,height:900});await runner.page.goto(handle.baseUrl);await runner.page.locator('h1').waitFor()
   assert.equal(await runner.page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true)
   await runner.page.screenshot({path:path.join(artifacts,'screen-'+width+'.png'),fullPage:true})
  }
  const criteria=contract.rubric.rules.slice(0,9).map(r=>({title:r.title,...scoreBrowserWorkflows(r.requiredEvidence[0].browserProbe.testIds,evidence,r.weight)}))
  const score=criteria.reduce((s,r)=>s+r.score,0);assert.equal(score,expected.length)
  const exec=await createDockerClient().getContainer(handle.containerId).exec({Cmd:['sh','-c','cd /sandbox/folder_submit && npm run build'],AttachStdout:true,AttachStderr:true})
  const stream=await exec.start({Detach:false,Tty:false});const chunks=[];for await(const c of stream)chunks.push(c)
  const log=decodeSandboxLogs(Buffer.concat(chunks));await fs.writeFile(path.join(artifacts,'build.log'),log)
  assert.equal((await exec.inspect()).ExitCode,0,log)
  reports.push({label,functionalScore:score,visualPointsPending:1,passed:expected.length,total:9,productionBuildPassed:true,mobileWidth:390,noHorizontalOverflow:true,tests:results,criteria,externalAiCalls:0})
  console.log(JSON.stringify({label,functionalScore:score,passed:expected.length,total:9}))
 }finally{if(runner)await runner.teardownAsync();if(handle)await service.stopAsync(handle)}
}
await fs.writeFile(path.join(base,'verification.json'),JSON.stringify({verifiedAt:new Date().toISOString(),reports},null,2))
process.exit(0)
