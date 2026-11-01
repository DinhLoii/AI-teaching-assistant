import test from 'node:test'
import assert from 'node:assert/strict'
import {SqlExecutionProbeEngine} from '../src/modules/grading/engine/application/evaluator/SqlExecutionProbeEngine.js'
import {dbi202Reference} from '../src/modules/ai/infrastructure/analysis/dbi202-reference.js'
import {buildStarterArchive,starterSourceFiles} from '../src/modules/exams/application/starter-archive.js'
import {assertSubmissionLanguage,examConfiguration} from '../src/modules/submissions/application/submission-language.js'
import AdmZip from 'adm-zip'
test('SQL result parser ignores procedure PRINT messages before result table',()=>{
 const engine:any=new SqlExecutionProbeEngine()
 assert.deepEqual(engine.parseQueryOutput('Input values are not valid.\nInput values are not valid.\nPassed\n------\n1\n'),{columns:['Passed'],rows:[['1']]})
 assert.deepEqual(engine.parseQueryOutput('ServiceID|Name\n---------|----\n1|Breakfast\n(1 rows affected)'),{columns:['ServiceID','Name'],rows:[['1','Breakfast']]})
})
test('DBI reference has ten independent SQL checks and downloadable student materials',()=>{
 assert.equal(dbi202Reference.specs.length,10)
 assert.equal(dbi202Reference.specs[8].studentFile,'Q9.sql')
 assert.match(dbi202Reference.specs[8].testCases[0].verificationQuery!,/150,50/)
 const exam={aiGeneratedContent:{sqlConfig:{referenceId:'dbi202-hotel'},submissionFormat:{requiredLanguage:'SQL',entryFiles:dbi202Reference.specs.map(s=>s.studentFile)}}}
 assert.equal(starterSourceFiles(exam).length,10)
 const entries=new AdmZip(buildStarterArchive(exam)).getEntries().map(e=>e.entryName)
 assert.equal(entries.length,11)
 assert.ok(entries.includes('material_0/DBscript.sql'))
 assert.doesNotThrow(()=>assertSubmissionLanguage(examConfiguration(exam),entries))
 assert.throws(()=>assertSubmissionLanguage(examConfiguration(exam),['material_0/DBscript.sql']))
})
test('database command normalization never edits string literals in seed data',()=>{
 const engine:any=new SqlExecutionProbeEngine()
 const seed="INSERT Notes VALUES ('please use the room', 'CREATE DATABASE Example', 'GO');"
 assert.equal(engine.sanitizeSqlScript(seed),seed)
 assert.doesNotMatch(engine.sanitizeSqlScript('USE master\nGO\nCREATE DATABASE Demo\nGO'),/^USE |^CREATE DATABASE /m)
})
test('full DBI setup removes every database switch, not just USE on the first line',()=>{
 const engine:any=new SqlExecutionProbeEngine()
 const sql=engine.sanitizeSqlScript(dbi202Reference.setupScript)
 assert.doesNotMatch(sql,/^\s*USE\s+/im)
 assert.doesNotMatch(sql,/^\s*(?:CREATE|DROP)\s+DATABASE\s+/im)
 assert.match(sql,/SET IDENTITY_INSERT \[dbo\]\.\[Guest\] ON/)
})
