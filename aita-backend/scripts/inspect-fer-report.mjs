import 'dotenv/config'
import fs from 'node:fs/promises'
import assert from 'node:assert/strict'
import {prisma} from '../src/database/prisma.ts'
import {reportFacts} from '../../aita-fontend/src/features/submissions/report-facts.ts'
import {extractAcceptanceScenarios} from '../src/modules/ai/infrastructure/analysis/assignment-contract.ts'
try {
 const s=await prisma.submission.findFirstOrThrow({where:{Id:{startsWith:'6af8d81b'}},include:{Exam:{include:{TestCase:true}}}})
 const r=JSON.parse(s.ReportData||'{}'),c=JSON.parse(s.Exam.AiGeneratedContent||'{}')
 const facts=reportFacts({id:s.Id,finalScore:s.FinalScore,reportData:r})
 if(process.argv.includes('--restore-scenarios')) {
  const scenarios=extractAcceptanceScenarios(s.Exam.Description||'')
  assert.equal(scenarios.length,13)
  assert.ok(!c.aiConfig?.acceptanceTests?.length,'Do not overwrite existing teacher scenarios')
  await fs.writeFile('../tmp/fer-scenarios-backup-'+Date.now()+'.json',JSON.stringify({exam:s.ExamId,config:c},null,2))
  c.aiConfig={...c.aiConfig,acceptanceTests:scenarios}
  await prisma.exam.update({where:{Id:s.ExamId},data:{AiGeneratedContent:JSON.stringify(c)}})
 }
 console.log(JSON.stringify({id:s.Id,exam:s.ExamId,storedAcceptanceTests:c.aiConfig?.acceptanceTests?.length||0,extractedAcceptanceTests:extractAcceptanceScenarios(s.Exam.Description||'').length,executed:facts.testExecuted,passed:facts.testPassed,score:facts.score,tests:facts.tests.map(t=>({name:t.name,passed:t.passed})),descriptionSample:s.Exam.Description?.match(/.{0,40}(?:TC01|TC1|Kịch bản kiểm thử).{0,120}/g)},null,2))
}finally{await prisma.$disconnect()}
