import 'dotenv/config'
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'
import AdmZip from 'adm-zip'
import {AutoConfigureAssignmentUseCase} from '../src/modules/ai/application/use-cases/auto-configure-assignment.use-case.js'
import {CreateExamRequestDto} from '../src/modules/exams/application/dtos/exam.dto.js'
import {RubricEvaluator} from '../src/modules/grading/engine/application/evaluator/RubricEvaluator.js'
import {AiClientManager} from '../src/modules/grading/engine/infrastructure/ai/AiClientManager.js'
import {assertSubmissionLanguage,examConfiguration} from '../src/modules/submissions/application/submission-language.js'
process.env.SANDBOX_ENABLED='true'
test('fresh DBI upload uses real AI rubric, preserves SQL probes through save, and grades two ZIPs in isolated SQL Server containers',async()=>{
 assert.ok(process.env.DBI_PDF_PATH)
 const analysis:any=await new AutoConfigureAssignmentUseCase().execute({file:{filename:'paper-dbi202.pdf',buffer:await fs.readFile(process.env.DBI_PDF_PATH!),mimetype:'application/pdf'},subjectCode:'DBI202',maxScore:10})
 assert.equal(analysis.rubricCriteria.length,10);assert.equal(analysis.testCases.length,0)
 assert.ok(analysis.rubricCriteria.every((c:any)=>c.sqlProbe))
 assert.match(analysis.modelUsed,/gemini|gpt|llama|qwen|deepseek/i)
 const config=CreateExamRequestDto.from({title:analysis.suggestedTitle,description:analysis.description,maxScore:10,sqlConfig:analysis.sqlConfig,submissionFormat:analysis.submissionFormat,runtimeConfig:analysis.runtimeConfig,rubricCriteria:analysis.rubricCriteria}).data
 assert.equal(config.sqlConfig?.referenceId,'dbi202-hotel')
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'dbi-fresh-'))
 const reports:any[]=[]
 try {
  for(const [label,expected] of [['DBI202_1-2_diem',2],['DBI202_9-10_diem',10]] as const) {
   const dir=path.join(root,label);await fs.mkdir(dir)
   const zip=new AdmZip(path.resolve('../output/dbi202-demo',label+'.zip'));zip.extractAllTo(dir,true)
   assertSubmissionLanguage(examConfiguration({AiGeneratedContent:JSON.stringify(config)}),zip.getEntries().map(e=>e.entryName))
   const logs:any[]=[];const submissionId=label+'-'+Date.now()
   const feedbackProvider={generateOverallFeedbackAsync:async(_title:string,passed:any[],failed:any[],score:number)=>{
    assert.ok([...passed,...failed].every(rule=>Object.keys(rule.evidence||{}).length===0),'DBscript result data must not be sent to AI')
    const payload=[...passed,...failed].map(rule=>({question:rule.title,score:rule.earnedScore,max:rule.weight}))
    return await AiClientManager.executeWithFallback(async(client,model)=>{
     const response=await client.chat.completions.create({model,messages:[{role:'user',content:'Viết nhận xét ngắn bằng tiếng Việt về kết quả thực thi SQL Server sau. Không thay đổi điểm. Chỉ có điểm theo câu, không có thông tin sinh viên hay dữ liệu DBscript: '+JSON.stringify({score,questions:payload})}],temperature:0});return response.choices[0]?.message?.content||''
    })
   }}
   const rules=config.rubricCriteria!.map((c:any)=>({id:c.id,title:c.name,description:c.description,weight:c.maxPoints,category:'Functional',scoringStrategy:'SqlExecutionProbe',requiredEvidence:[{sqlProbe:structuredClone(c.sqlProbe)}]}))
   const report:any=await new RubricEvaluator(feedbackProvider as any,{} as any).evaluateAsync(submissionId,'fresh-dbi-demo','synthetic-'+label,{rules,totalWeight:10,passThreshold:.5} as any,{sourceSnapshot:{files:[],projectType:'sql'},evidencePool:[],sandbox:{},submissionPath:dir,onExecutionEvent:(event:any)=>logs.push({...event,submissionId})} as any)
   assert.equal(report.totalScore,expected)
   const cases=[...report.passedRules,...report.failedRules].flatMap(rule=>rule.evidence.sqlTestCases)
   assert.equal(cases.length,10);assert.equal(cases.filter(c=>c.passed).length,expected)
   assert.equal(logs.filter(e=>e.message.startsWith('[SQL testcase')).length,10)
   assert.equal(logs.filter(e=>e.message.startsWith('[Điểm tiêu chí]')).length,10)
   assert.ok(report.overallFeedback)
   reports.push({submissionId,score:report.totalScore,passed:expected,total:10,model:analysis.modelUsed,feedback:report.overallFeedback,logs})
  }
  assert.notEqual(reports[0].submissionId,reports[1].submissionId)
  await fs.writeFile('../output/dbi202-demo/fresh-upload-verification.json',JSON.stringify(reports,null,2))
 }finally{assert.ok(root.startsWith(os.tmpdir()+path.sep));await fs.rm(root,{recursive:true,force:true})}
})
