import 'dotenv/config'
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'
import AdmZip from 'adm-zip'
import {AutoConfigureAssignmentUseCase} from '../src/modules/ai/application/use-cases/auto-configure-assignment.use-case.js'
import {verifyConsoleTests} from '../src/modules/grading/engine/application/evaluator/console-verification.js'
import {RubricEvaluator} from '../src/modules/grading/engine/application/evaluator/RubricEvaluator.js'
process.env.STDIO_SANDBOX_ENABLED='true'
test('fresh paper upload generates seven weighted questions and grades both real ZIPs with isolated evidence',async()=>{
 const pdf=process.env.PAPER_PDF_PATH
 assert.ok(pdf,'Set PAPER_PDF_PATH to the source PDF')
 const output:any=await new AutoConfigureAssignmentUseCase().execute({file:{filename:'renamed-paper.pdf',buffer:await fs.readFile(pdf),mimetype:'application/pdf'},maxScore:10,subjectCode:'PRF192'})
 assert.equal(output.testCases.length,19)
 assert.equal(output.rubricCriteria.length,7)
 assert.deepEqual(output.rubricCriteria.map((c:any)=>c.maxPoints),[1,1,1,1,2,2,2])
 assert.equal(output.submissionFormat.entryFile,'')
 assert.deepEqual(output.testCases.slice(0,4).map((t:any)=>[t.input,t.expectedOutput]),[['3.5 4.2','5.47'],['5.0 12.0','13.00'],['1234','10'],['9999','36']])
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'paper-roundtrip-'))
 try {
  const reports:any[]=[]
  for(const [label,expectedScore,expectedPassed] of [['Bai_lam_1-2_diem',1,2],['Bai_lam_9-10_diem',9.5,18]] as const) {
   const submissionPath=path.join(root,label);await fs.mkdir(submissionPath)
   new AdmZip(path.resolve('../output/sample-submissions',label+'.zip')).extractAllTo(submissionPath,true)
   const events:any[]=[]
   // Simulate a NEW saved exam including database testcase IDs, keeping source labels in config.
   const exam={Description:output.description,AiGeneratedContent:JSON.stringify(output),TestCase:output.testCases.map((t:any,i:number)=>({Id:'db-'+label+'-'+i,Input:t.input,ExpectedOutput:t.expectedOutput,IsHidden:t.isHidden}))}
   const verification:any=await verifyConsoleTests(exam,[{category:'Functional',scoringStrategy:'AICodeReview'}],submissionPath,event=>events.push(event))
   assert.equal(verification.status,'completed');assert.equal(verification.passedCases,expectedPassed)
   assert.ok(verification.caseResults.every((c:any)=>/^Q\d-TC\d$/.test(c.caseId)))
   assert.equal(events.filter(e=>e.message.startsWith('[Kết quả từng câu]')).length,7)
   const rules=output.rubricCriteria.map((c:any)=>({id:c.id,title:c.name,description:c.description,weight:c.maxPoints,category:'Functional',scoringStrategy:'AICodeReview',requiredEvidence:[]}))
   const evaluator=new RubricEvaluator({generateOverallFeedbackAsync:async()=>''} as any,{} as any)
   const report=await evaluator.evaluateAsync(label,'fresh-exam','student-'+label,{rules,totalWeight:10,passThreshold:.5} as any,{sourceSnapshot:{files:[],projectType:'c'},evidencePool:[],sandbox:{},consoleVerification:verification,onExecutionEvent:event=>events.push(event)} as any)
   assert.equal(report.totalScore,expectedScore)
   assert.equal(events.filter(e=>e.message.startsWith('[Điểm tiêu chí]')).length,7)
   reports.push({submissionId:label,score:report.totalScore,passed:verification.passedCases,total:verification.totalCases,questionScores:[...report.passedRules,...report.failedRules].map(r=>({question:r.title,score:r.earnedScore})),logs:events})
  }
  assert.notDeepEqual(reports[0].questionScores,reports[1].questionScores)
  await fs.writeFile('../output/sample-submissions/fresh-upload-verification.json',JSON.stringify(reports,null,2))
 }finally{assert.ok(root.startsWith(os.tmpdir()+path.sep));await fs.rm(root,{recursive:true,force:true})}
})
