import 'dotenv/config'
import fs from 'node:fs/promises'
import assert from 'node:assert/strict'
import {prisma} from '../src/database/prisma.ts'
const id='77e8f7be-b8db-40cc-92e0-24cac8538555'
try {
 const exam=await prisma.exam.findUniqueOrThrow({where:{Id:id},include:{ExamSection:{include:{RubricRule:{include:{RubricCriterion:true}}}},Submission:true}})
 assert.ok(exam.Submission.every(s=>s.ReviewStatus!=='PUBLISHED'))
 const contract=JSON.parse(await fs.readFile('../output/FER202_Auth/teacher-browser-contract.json','utf8'))
 const rules=exam.ExamSection.flatMap(s=>s.RubricRule)
 assert.equal(rules.length,7)
 const tests=contract.testSuites.browser
 assert.deepEqual(tests.map(t=>t.id),Array.from({length:13},(_,i)=>'TC'+String(i+1).padStart(2,'0')))
 for(const test of tests) test.ruleIds=[]
 for(const source of contract.rubric.rules) {
  const rule=rules.find(r=>r.Description===source.title)
  assert.ok(rule,source.title)
  for(const testId of source.requiredEvidence.flatMap(e=>e.browserProbe?.testIds||[])) {
   const test=tests.find(t=>t.id===testId);assert.ok(test);test.ruleIds.push(rule.Id)
  }
 }
 assert.ok(tests.every(t=>t.ruleIds.length))
 tests.find(t=>t.id==='TC11').steps.unshift({action:'reload'})
 const config=JSON.parse(exam.AiGeneratedContent)
 await fs.writeFile('../tmp/fer-full-suite-backup-'+Date.now()+'.json',JSON.stringify(exam,null,2))
 config.testSuites={...config.testSuites,browser:tests}
 await prisma.$transaction(async tx=>{
  await tx.exam.update({where:{Id:id},data:{AiGeneratedContent:JSON.stringify(config)}})
  const ui=rules.find(r=>r.Description==='Giao diện, labels, component và responsive')
  assert.ok(ui)
  for(const criterion of ui.RubricCriterion) await tx.rubricCriterion.update({where:{Id:criterion.Id},data:{ValidationType:'VISION'}})
 },{timeout:30000})
 console.log(JSON.stringify({configured:id,browserTests:tests.length,rubricRules:rules.length,mapping:tests.map(t=>({id:t.id,rules:t.ruleIds.length}))}))
}finally{await prisma.$disconnect()}
