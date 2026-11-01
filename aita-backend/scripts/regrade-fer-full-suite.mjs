import 'dotenv/config'
import assert from 'node:assert/strict'
import {prisma} from '../src/database/prisma.ts'
import {durableGradingQueue} from '../src/modules/grading/engine/application/queue/durable-grading-queue.ts'
import {reportFacts} from '../../aita-fontend/src/features/submissions/report-facts.ts'
const id='6af8d81b-8337-4f3d-bb57-12984cbbe36e'
try {
 const row=await prisma.submission.findUniqueOrThrow({where:{Id:id}})
 assert.equal(row.ReviewStatus,'DRAFT')
 if(process.argv.includes('--enqueue')) console.log(JSON.stringify(await durableGradingQueue.enqueue(id,'batch',{watchBrowser:false})))
 else {
  const report=JSON.parse(row.ReportData||'{}'),facts=reportFacts({id,finalScore:row.FinalScore,reportData:report})
  const task=await prisma.submissionGradingTask.findUnique({where:{SubmissionId:id}})
  console.log(JSON.stringify({status:row.GradingStatus,task:task?.Status,attempts:task?.Attempts,lastError:task?.LastError,leaseUntil:task?.LeaseUntil,score:row.FinalScore,review:row.ReviewStatus,executed:facts.testExecuted,passed:facts.testPassed,tests:facts.tests.map(t=>({name:t.name,passed:t.passed,error:t.error})),criteria:[...(report.passedRules||[]),...(report.failedRules||[])].map(r=>({title:r.title,score:r.earnedScore,details:r.details})),error:report.error},null,2))
 }
}finally{await prisma.$disconnect()}
