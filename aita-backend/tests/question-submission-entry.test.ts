import assert from 'node:assert/strict'
import test from 'node:test'
import { assertSubmissionLanguage, examConfiguration } from '../src/modules/submissions/application/submission-language.js'
const files=Array.from({length:7},(_,i)=>`material_${i}/Q${i+1}.c`)
const legacy={submissionFormat:{requiredLanguage:'C',entryFile:'main.c'},testCases:files.map(file=>({entryFile:file.split('/').pop()}))}
test('question files are accepted despite stale main.c in saved configuration',()=>{
 assert.doesNotThrow(()=>assertSubmissionLanguage(legacy,files))
 const resolved=examConfiguration({AiGeneratedContent:JSON.stringify(legacy)})
 assert.equal(resolved.submissionFormat.entryFile,'')
 assert.equal(resolved.submissionFormat.entryFiles.length,7)
 assert.doesNotThrow(()=>assertSubmissionLanguage(resolved,files))
})
test('filenames declared in paper work even without saved testcase metadata',()=>{
 const resolved=examConfiguration({AiGeneratedContent:JSON.stringify({submissionFormat:legacy.submissionFormat}),Description:'Question 1\n(1 mark, file to be edited: Q1.c)\nQuestion 2\n(1 mark, file to be edited: Q2.c)'})
 assert.deepEqual(resolved.submissionFormat.entryFiles,['Q1.c','Q2.c'])
 assert.doesNotThrow(()=>assertSubmissionLanguage(resolved,files))
})
test('partial question submissions stay eligible for grading, unrelated source does not',()=>{
 assert.doesNotThrow(()=>assertSubmissionLanguage(legacy,['material_0/Q1.c']))
 assert.throws(()=>assertSubmissionLanguage(legacy,['other.c']),/Q1.c/)
 assert.throws(()=>assertSubmissionLanguage(legacy,['material_0/Q1.py']),/Sai ngôn ngữ/)
})
test('single program assignments still enforce their configured entry file',()=>{
 const single={submissionFormat:{requiredLanguage:'C',entryFile:'main.c'}}
 assert.throws(()=>assertSubmissionLanguage(single,files),/main.c/)
 assert.doesNotThrow(()=>assertSubmissionLanguage(single,['project/main.c']))
})
