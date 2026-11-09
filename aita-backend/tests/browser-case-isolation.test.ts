import test from 'node:test'
import assert from 'node:assert/strict'
import {createServer} from 'node:http'
import {chromium} from 'playwright'
import {BrowserTestRunner} from '../src/modules/grading/engine/plugins/playwright/BrowserTestRunner.js'

test('independent cases reset storage without clear-cart; reload retains it and live input values are checked',async()=>{
 const server=createServer((_,res)=>{res.setHeader('Content-Type','text/html');res.end(`<input id="qty" value="1"><button id="add" onclick="localStorage.setItem('qty','2');document.querySelector('#qty').value='2'">Add</button><script>document.querySelector('#qty').value=localStorage.getItem('qty')||'1'</script>`)})
 await new Promise<void>(resolve=>server.listen(0,'127.0.0.1',resolve))
 const browser=await chromium.launch({headless:true}).catch(error=>{server.close();throw error})
 const runner:any=new BrowserTestRunner('PlaywrightPlugin',{submissionId:'isolation',baseUrl:`http://127.0.0.1:${(server.address() as any).port}`,artifactsDir:'.',browserSession:{browser,visible:false}} as any,{} as any)
 const run=async(id:string,steps:any[])=>{
  const evidence=await runner.executeTestAsync({id,name:id,startUrl:'/',isolateStorage:true,steps})
  return evidence.find((e:any)=>e.type==='browser.workflow.completed').payload
 }
 try {
  await runner.initializeAsync()
  const first=await run('persist',[{action:'click',target:'#add'},{action:'assertValue',target:'#qty',value:'2'},{action:'reload'},{action:'assertValue',target:'#qty',value:'2'}])
  assert.equal(first.success,true)
  const second=await run('independent',[{action:'assertValue',target:'#qty',value:'1'},{action:'assertCount',target:'#missing-row',count:0},{action:'assertCount',target:'#qty',count:1}])
  assert.equal(second.success,true)
  const wrong=await run('wrong-count',[{action:'assertCount',target:'#qty',count:0}])
  assert.equal(wrong.success,false)
  assert.equal(wrong.failedStep.expected,0)
  assert.equal(wrong.failedStep.actual.count,1)
  const last=await run('after-failure',[{action:'assertValue',target:'#qty',value:'1'}])
  assert.equal(last.success,true)
 } finally {await runner.teardownAsync();await browser.close();await new Promise<void>(resolve=>server.close(()=>resolve()))}
})
