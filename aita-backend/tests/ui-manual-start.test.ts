import test from 'node:test'
import assert from 'node:assert/strict'
import {requiresManualUiStart} from '../src/modules/submissions/application/ui-grading-policy.js'
import {PrismaSubmissionRepository} from '../src/modules/submissions/infrastructure/repositories/prisma-submission-repository.js'
import {Submission} from '../src/modules/submissions/domain/entities/submission.entity.js'
test('FER and browser-configured exams await lecturers even when subject or project type is missing',()=>{
 for(const exam of [
  {Subject:{SubjectCode:'FER202'}},
  {AiGeneratedContent:JSON.stringify({testSuites:{browser:[{id:'TC01'}]}})},
  {AiGeneratedContent:JSON.stringify({rubricCriteria:[{browserProbe:{testIds:['TC01']}}]})},
  {AiGeneratedContent:JSON.stringify({aiConfig:{analysisReview:{profile:{platform:'Web'}}}})},
 ])assert.equal(requiresManualUiStart(exam),true)
})
test('ordinary console and SQL submissions retain their automatic grading policy',()=>{
 for(const language of ['C','SQL','JavaScript'])assert.equal(requiresManualUiStart({AiGeneratedContent:JSON.stringify({runtimeConfig:{language},testCases:[{input:'1',expectedOutput:'2'}]})}),false)
})
test('upload commits UI attempts as Pending without inserting an automatic job, while console still queues',async()=>{
 for(const ui of [true,false]) {
  let saved:any; const statements:string[]=[]
  const tx={
   $executeRaw:async(parts:TemplateStringsArray)=>{statements.push(parts.join(''));return 1},
   exam:{findUnique:async()=>({GradingStrategy:'CONTINUOUS_QUEUE',AiGeneratedContent:JSON.stringify(ui?{testSuites:{browser:[{id:'TC01'}]}}:{runtimeConfig:{language:'C'}})})},
   submission:{aggregate:async()=>({_max:{AttemptNumber:0}}),updateMany:async()=>({count:0}),create:async({data}:any)=>{saved=data}},
  }
  const repository=new PrismaSubmissionRepository({$transaction:async(work:any)=>work(tx)})
  const attempt=Submission.create('s','student','exam','class',1,'/source.zip')
  await repository.createAttempt(attempt)
  assert.equal(saved.GradingStatus,ui?'Pending':'Processing')
  assert.equal(statements.some(s=>s.includes('INSERT INTO "SubmissionGradingTask"')),!ui)
 }
})
