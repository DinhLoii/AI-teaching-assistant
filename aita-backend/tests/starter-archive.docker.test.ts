import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import path from 'node:path'
import AdmZip from 'adm-zip'
import { buildStarterArchive } from '../src/modules/exams/application/starter-archive.js'
import { assertSubmissionLanguage } from '../src/modules/submissions/application/submission-language.js'
import { StdInOutProbeEngine } from '../src/modules/grading/engine/application/evaluator/StdInOutProbeEngine.js'

process.env.STDIO_SANDBOX_ENABLED = 'true'
test('download, complete seven materials, rezip and grade each C file against its own testcase',async()=>{
 const root=path.resolve('temp',`starter-roundtrip-${Date.now()}`)
 await fs.mkdir(root,{recursive:true})
 try {
  const cases=Array.from({length:7},(_,i)=>({id:`Q${i+1}-TC1`,entryFile:`Q${i+1}.c`,input:'10',expectedOutput:String(10+i+1),isHidden:false,comparisonMode:'exact' as const}))
  const archive=new AdmZip(buildStarterArchive({aiGeneratedContent:{testCases:cases}}))
  for(let i=0;i<7;i++) archive.updateFile(`material_${i}/Q${i+1}.c`,Buffer.from(`#include <stdio.h>\nint main(void){int n; if(scanf("%d",&n)!=1)return 1; printf("%d\\n",n+${i+1});return 0;}\n`))
  const submitted=new AdmZip(archive.toBuffer())
  assertSubmissionLanguage({submissionFormat:{requiredLanguage:'C',entryFile:'main.c'},testCases:cases},submitted.getEntries().map(entry=>entry.entryName))
  submitted.extractAllTo(root,true)
  const events: any[] = []
  const result=await new StdInOutProbeEngine().evaluateAsync(root,{description:'Seven question material ZIP roundtrip',requiredLanguage:'C',testCases:cases},undefined,event=>events.push(event))
  assert.equal(events.filter(event=>event.message.startsWith('[Kết quả từng câu]')).length,7)
  assert.ok(events.some(event=>event.stage===1 && event.status==='completed'))
  assert.ok(events.some(event=>event.stage===2 && /PASS/.test(event.message)))
  assert.equal(result.totalCases,7)
  assert.equal(result.passedCases,7)
  assert.equal(result.compilationPassed,true)
 } finally {
  assert.ok(root.startsWith(path.resolve('temp')+path.sep))
  await fs.rm(root,{recursive:true,force:true})
 }
})
