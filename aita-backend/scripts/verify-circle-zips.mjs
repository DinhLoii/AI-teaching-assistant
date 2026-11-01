import 'dotenv/config'
import fs from 'node:fs/promises'
import path from 'node:path'
import assert from 'node:assert/strict'
import AdmZip from 'adm-zip'
import {verifiedCirclePaper} from '../src/modules/ai/infrastructure/analysis/verified-circle-paper.ts'
import {extractQuestionSamples} from '../src/modules/ai/infrastructure/analysis/question-samples.ts'
import {verifyConsoleTests} from '../src/modules/grading/engine/application/evaluator/console-verification.ts'
import {RubricEvaluator} from '../src/modules/grading/engine/application/evaluator/RubricEvaluator.ts'
process.env.STDIO_SANDBOX_ENABLED='true'
const emit=x=>process.stdout.write(JSON.stringify(x)+'\n')
console.log=()=>{}
const cases=extractQuestionSamples(verifiedCirclePaper.text)
const reports=[]
for(const [label,score,count] of [['Bai_lam_3-4_diem',4,8],['Bai_lam_6-7_diem',6,11]]) {
 const folder=path.resolve('../tmp/circle-verification',label)
 await fs.mkdir(folder,{recursive:true})
 new AdmZip(path.resolve('../output/paper-submissions',label+'.zip')).extractAllTo(folder,true)
 const config={submissionFormat:{requiredLanguage:'C',entryFile:'',entryFiles:Array.from({length:7},(_,i)=>`Q${i+1}.c`)},testCases:cases}
 const exam={Description:verifiedCirclePaper.text,AiGeneratedContent:JSON.stringify(config),TestCase:cases.map((t,i)=>({Id:'db-'+i,Input:t.input,ExpectedOutput:t.expectedOutput,IsHidden:false}))}
 const verification=await verifyConsoleTests(exam,[{category:'Functional',scoringStrategy:'AICodeReview'}],folder)
 assert.equal(verification.status,'completed');assert.equal(verification.passedCases,count)
 const rules=Array.from({length:7},(_,i)=>({id:`Q${i+1}`,title:`Q${i+1}.c`,description:`Q${i+1}.c`,weight:i<4?1:2,category:'Functional',scoringStrategy:'AICodeReview',requiredEvidence:[]}))
 const evaluator=new RubricEvaluator({generateOverallFeedbackAsync:async()=>''},{})
 const report=await evaluator.evaluateAsync(label,'circle-exam','test',{rules,totalWeight:10,passThreshold:.5},{sourceSnapshot:{files:[],projectType:'c'},evidencePool:[],sandbox:{},consoleVerification:verification})
 assert.equal(report.totalScore,score)
 reports.push({label,score:report.totalScore,verification,criteria:[...report.passedRules,...report.failedRules].map(r=>({title:r.title,score:r.earnedScore}))})
 emit({label,score:report.totalScore,passed:count,total:cases.length})
}
await fs.writeFile('../output/paper-submissions/verification.json',JSON.stringify(reports,null,2))
