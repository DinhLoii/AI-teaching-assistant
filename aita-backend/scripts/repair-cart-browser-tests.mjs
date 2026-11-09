import 'dotenv/config'
import fs from 'node:fs/promises'
import path from 'node:path'
import assert from 'node:assert/strict'
import {prisma} from '../src/database/prisma.ts'
import {extractCartBrowserContract} from '../src/modules/ai/infrastructure/analysis/cart-browser-contract.ts'

// Explicit target only; leave teacher rubric, other exams and existing grades intact.
const examId=process.argv.find(a=>a.startsWith('--exam='))?.slice(7)
assert.ok(examId,'Pass --exam=<id>; preview by default, --apply to save')
try {
 const exam=await prisma.exam.findUniqueOrThrow({where:{Id:examId}})
 const contract=extractCartBrowserContract(exam.Description||'')
 assert.ok(contract,'Exam description must contain the complete supported paper contract')
 const config=JSON.parse(exam.AiGeneratedContent||'{}')
 assert.deepEqual(config.testSuites?.browser?.map(t=>t.id),contract.testSuites.browser.map(t=>t.id),'Only repair the existing nine-case cart suite')
 const published=await prisma.publishedAssignment.findUnique({where:{Id:examId}})
 const publishedData=published?.Data?JSON.parse(published.Data):null
 if(process.argv.includes('--apply')) {
  const backup=path.resolve('../output/fer202-giohang/repair-backup-'+Date.now()+'.json')
  await fs.mkdir(path.dirname(backup),{recursive:true})
  await fs.writeFile(backup,JSON.stringify({examId,aiGeneratedContent:exam.AiGeneratedContent,publishedData:published?.Data},null,2))
  await prisma.$transaction(async tx=>{
   const saved=await tx.exam.updateMany({where:{Id:examId,AiGeneratedContent:exam.AiGeneratedContent},data:{AiGeneratedContent:JSON.stringify({...config,testSuites:{...config.testSuites,browser:contract.testSuites.browser}})}})
   assert.equal(saved.count,1,'Exam changed during repair; retry after review')
   if(publishedData) {
    const savedPublished=await tx.publishedAssignment.updateMany({where:{Id:examId,Data:published.Data},data:{Data:JSON.stringify({...publishedData,testSuites:{...publishedData.testSuites,browser:contract.testSuites.browser}})}})
    assert.equal(savedPublished.count,1,'Published assignment changed during repair')
   }
  })
  console.log(JSON.stringify({saved:true,examId,backup,testcases:9,gradesChanged:false}))
 } else console.log(JSON.stringify({preview:true,examId,testcases:contract.testSuites.browser.map(t=>({id:t.id,isolateStorage:t.isolateStorage,steps:t.steps.length})),published:!!publishedData}))
} finally {await prisma.$disconnect()}
