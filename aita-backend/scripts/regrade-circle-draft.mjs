import 'dotenv/config'
import assert from 'node:assert/strict'
import {prisma} from '../src/database/prisma.ts'
import {durableGradingQueue} from '../src/modules/grading/engine/application/queue/durable-grading-queue.ts'
const id='014a8658-423b-4435-a774-86fa15e8a6ba'
try {
 const row=await prisma.submission.findUniqueOrThrow({where:{Id:id},include:{Exam:{include:{TestCase:true}}}})
 assert.equal(row.ReviewStatus,'DRAFT'); assert.equal(row.Exam.TestCase.length,21)
 if(process.argv.includes('--enqueue')) console.log(JSON.stringify(await durableGradingQueue.enqueue(id,'batch')))
 else {
  const report=JSON.parse(row.ReportData||'{}')
  const task=await prisma.submissionGradingTask.findUnique({where:{SubmissionId:id}})
  console.log(JSON.stringify({status:row.GradingStatus,review:row.ReviewStatus,score:row.FinalScore,task:task?.Status,error:report.error,caseCount:report.consoleVerification?.totalCases,criteria:[...(report.passedRules||[]),...(report.failedRules||[])].map(r=>({title:r.title,score:r.earnedScore})),lastLog:report.gradingLogs?.slice(-1)}))
 }
}finally{await prisma.$disconnect()}
