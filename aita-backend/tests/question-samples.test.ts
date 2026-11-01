import assert from 'node:assert/strict';
import test from 'node:test';
import { extractQuestionSamples } from '../src/modules/ai/infrastructure/analysis/question-samples.js';
import { detectAssignmentProfile } from '../src/modules/ai/infrastructure/analysis/assignment-contract.js';
import { examTestCasesView } from '../src/modules/exams/application/exam-criteria-view.js';
const source = `Question 1
(1 mark, file to be edited: Q1.c)
Create a C program reading standard input.
Test cases:
Test case 1
3.5 4.2
OUTPUT:
5.47
Test case 2
5.0 12.0
OUTPUT:
13.00
Question 2
(1 mark, file to be edited: Q2.c)
Create a C program.
Test cases:
Test case 1
1234
OUTPUT:
10
Test case 2
9999
OUTPUT:
36`;
test('extracts public samples per question without INPUT label and preserves text', () => {
 const tests=extractQuestionSamples(source);
 assert.equal(tests.length,4);
 assert.deepEqual(tests.map(t=>t.id),['Q1-TC1','Q1-TC2','Q2-TC1','Q2-TC2']);
 assert.deepEqual(tests.map(t=>[t.input,t.expectedOutput]),[['3.5 4.2','5.47'],['5.0 12.0','13.00'],['1234','10'],['9999','36']]);
 assert.ok(tests.every(t=>t.isHidden===false && t.source==='EXTRACTED'));
 assert.equal(tests[2].entryFile,'Q2.c');
 assert.equal(detectAssignmentProfile(source).language,'C');
 const visible=examTestCasesView([...tests,{id:'hidden',isHidden:true,input:'secret'}],false);
 assert.equal(visible.length,4); assert.equal(visible[2].questionId,'Q2');
});
test('does not invent missing output or include following question text',()=>{
 assert.equal(extractQuestionSamples('Question 1\nTest case 1\n42').length,0);
 assert.equal(extractQuestionSamples(source)[1].expectedOutput,'13.00');
});
import { DocumentExtractorService } from '../src/modules/ai/infrastructure/analysis/document-extractor.service.js';
import { DeterministicParserService } from '../src/modules/ai/infrastructure/analysis/deterministic-parser.service.js';
import { AnalyzedTestCaseSchema } from '../src/modules/ai/infrastructure/analysis/analysis-validator.service.js';
test('document parser and validation retain all question samples',async()=>{
 const extraction=await new DocumentExtractorService().extract(undefined,source);
 const parsed=new DeterministicParserService().parse(extraction,10);
 assert.equal(parsed.testCases.length,4);
 assert.equal(AnalyzedTestCaseSchema.parse(parsed.testCases[2]).entryFile,'Q2.c');
});
import { verifiedPaper } from '../src/modules/ai/infrastructure/analysis/verified-paper.js';
test('question rubric includes requirements, failure conditions and code review guidance',async()=>{
 const extraction=await new DocumentExtractorService().extract(undefined,verifiedPaper.text);
 const parsed=new DeterministicParserService().parse(extraction,10);
 assert.equal(parsed.rubricCriteria.length,7);
 assert.equal(parsed.testCases.length,19);
 assert.deepEqual(parsed.rubricCriteria.map(c=>c.maxPoints),[1,1,1,1,2,2,2]);
 for(let i=0;i<7;i++) {
  const c=parsed.rubricCriteria[i];
  assert.ok(c.passCondition.startsWith(`Đạt testcase của Q${i+1}.c.`));
  assert.ok(c.description.length>60);
  assert.match(c.passCondition,/không in cứng/);
  assert.match(c.aiGuidance,/tên biến/);
  assert.match(c.aiGuidance,/không tự cộng hoặc trừ điểm/);
 }
 assert.match(parsed.rubricCriteria[0].name,/đường chéo/);
 assert.match(parsed.rubricCriteria[4].passCondition,/18\.5, 25\.0, 30\.0/);
 assert.match(parsed.rubricCriteria[6].failCondition,/≥ thay vì >/);
});
