import test from 'node:test'
import assert from 'node:assert/strict'
import {chromium} from 'playwright'
import {BrowserTestRunner} from '../src/modules/grading/engine/plugins/playwright/BrowserTestRunner.js'
import {studentReportView} from '../src/modules/submissions/application/student-report-view.js'
test('hidden browser outcomes retain state without disclosing step details',()=>{
 const r=studentReportView({payload:{testId:'hidden',success:false,isHidden:true,executionError:true,steps:[{target:'secret'}],failedStep:{expected:'answer'}}})
 assert.equal(r.payload.testId,'hidden');assert.equal(r.payload.executionError,true);assert.equal(r.payload.steps,undefined);assert.doesNotMatch(JSON.stringify(r),/secret|answer/)
})
test('real browser trace records each action, failed assertion, observed value and duration',async()=>{
 const browser=await chromium.launch({headless:true});let runner:any
 try{
  runner=new BrowserTestRunner('PlaywrightPlugin',{submissionId:'trace',baseUrl:'http://localhost',artifactsDir:'.',browserSession:{browser,visible:false}} as any,{} as any)
  await runner.initializeAsync();runner.page.setDefaultTimeout(10000)
  await runner.page.setContent('<button type="button" id="add" onclick="document.getElementById(\'count\').textContent=\'1\'">Add</button><span id="count">0</span>')
  const evidence=await runner.executeTestAsync({id:'TC01',name:'Trace',startUrl:'',steps:[{action:'click',target:'#add'},{action:'assertText',target:'#count',value:'2'}]})
  const p=evidence.find((e:any)=>e.type==='browser.workflow.completed').payload
  assert.equal(p.success,false);assert.equal(p.steps[0].status,'passed');assert.equal(p.failedStep.index,2);assert.equal(p.failedStep.expected,'2');assert.equal(p.failedStep.actual.text,'1');assert.ok(p.executionMs>0)
 }finally{if(runner)await runner.teardownAsync();await browser.close()}
})
