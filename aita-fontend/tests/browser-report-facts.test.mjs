import test from 'node:test'
import assert from 'node:assert/strict'
import {createLoader} from './helpers/load-typescript.mjs'
const {reportFacts,assessmentMethod}=createLoader()('features/submissions/report-facts.ts')
const workflow=(id,success,extra={})=>({type:'browser.workflow.completed',payload:{testId:id,success,...extra}})
test('browser evidence is visible, deduplicated across criteria and does not change score',()=>{
 const evidence={browserWorkflows:[workflow('register',true),workflow('login',false)]}
 const facts=reportFacts({id:'s',finalScore:8,reportData:{submissionId:'s',passedRules:[{ruleId:'a',evidence},{ruleId:'b',evidence}]}})
 assert.equal(facts.testExecuted,2);assert.equal(facts.testPassed,1);assert.equal(facts.score,8)
 assert.equal(facts.tests[0].ruleIds.join(','),'a,b')
 assert.equal(assessmentMethod({scoringStrategy:'AICodeReview',evidence}),'Kiểm thử giao diện bằng trình duyệt')
})
test('interrupted browser execution and prose claims are not passing tests',()=>{
 const facts=reportFacts({reportData:{failedRules:[{evidence:{browserWorkflows:[workflow('login',false,{executionError:true})]}}],overallFeedback:'13/13 tests passed'}})
 assert.equal(facts.testExecuted,0);assert.equal(facts.testPassed,0)
})
