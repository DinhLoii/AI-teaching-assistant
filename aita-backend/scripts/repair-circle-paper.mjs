import 'dotenv/config'
import fs from 'node:fs/promises'
import path from 'node:path'
import assert from 'node:assert/strict'
import {createHash} from 'node:crypto'
import {verifiedCirclePaper} from '../src/modules/ai/infrastructure/analysis/verified-circle-paper.ts'
import {DocumentExtractorService} from '../src/modules/ai/infrastructure/analysis/document-extractor.service.ts'
import {DeterministicParserService} from '../src/modules/ai/infrastructure/analysis/deterministic-parser.service.ts'
import {prisma} from '../src/database/prisma.ts'
const examId='4d8f3680-8f01-497f-a51a-8fb94bfaba21'
try {
 const exam=await prisma.exam.findUniqueOrThrow({where:{Id:examId},include:{TestCase:{orderBy:{SortOrder:'asc'}},Submission:true,ExamAttachment:true}})
 assert.equal(exam.IsDeleted,false)
 assert.ok(exam.Description.includes('radius of a circle'))
 assert.ok(exam.Submission.every(s=>s.ReviewStatus!=='PUBLISHED'),'Do not change published grades')
 const attachment=exam.ExamAttachment.find(a=>a.FileName==='paper (1).pdf')
 assert.ok(attachment)
 const pdf=await fs.readFile(path.resolve('.'+attachment.FileUrl))
 assert.equal(createHash('sha256').update(pdf).digest('hex'),verifiedCirclePaper.sha256,'Require the exact attached PDF')
 const extraction=await new DocumentExtractorService().extract({filename:'paper.pdf',buffer:pdf})
 const parsed=new DeterministicParserService().parse(extraction,10)
 assert.equal(parsed.testCases.length,21)
 const config=JSON.parse(exam.AiGeneratedContent)
 assert.deepEqual(config.rubricCriteria.map(c=>c.maxPoints),[1,1,1,1,2,2,2])
 const backup=path.resolve('../tmp/circle-repair-backup-'+Date.now()+'.json')
 await fs.writeFile(backup,JSON.stringify(exam,null,2))
 config.testCases=parsed.testCases
 config.rubricCriteria=parsed.rubricCriteria
 config.sourceVerification={sha256:verifiedCirclePaper.sha256,pageCount:6,notice:verifiedCirclePaper.notice,verifiedAt:new Date().toISOString()}
 await prisma.$transaction(async tx=>{
  await tx.exam.update({where:{Id:examId},data:{Description:verifiedCirclePaper.text,AiGeneratedContent:JSON.stringify(config)}})
  // Retain existing IDs in source order; append the missing cross-page Q4 case.
  for(let i=0;i<parsed.testCases.length;i++) {
   const t=parsed.testCases[i]
   const data={Input:t.input,ExpectedOutput:t.expectedOutput,IsHidden:false,Points:0,SortOrder:i+1}
   if(exam.TestCase[i]) await tx.testCase.update({where:{Id:exam.TestCase[i].Id},data})
   else await tx.testCase.create({data:{...data,ExamId:examId}})
  }
 },{timeout:30000})
 console.log(JSON.stringify({repaired:examId,tests:21,backup,sourceHash:verifiedCirclePaper.sha256}))
}finally{await prisma.$disconnect()}
