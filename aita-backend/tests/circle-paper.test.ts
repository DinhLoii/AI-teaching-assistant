import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import {DocumentExtractorService} from '../src/modules/ai/infrastructure/analysis/document-extractor.service.js'
import {verifiedCirclePaper} from '../src/modules/ai/infrastructure/analysis/verified-circle-paper.js'
import {extractQuestionSamples} from '../src/modules/ai/infrastructure/analysis/question-samples.js'
import {DeterministicParserService} from '../src/modules/ai/infrastructure/analysis/deterministic-parser.service.js'
test('circle PDF transcription preserves 21 original samples across page boundaries',()=>{
 const cases=extractQuestionSamples(verifiedCirclePaper.text)
 assert.equal(cases.length,21)
 assert.deepEqual(cases.filter(t=>t.entryFile==='Q4.c').map(t=>[t.input,t.expectedOutput]),[['5\n10 3 7 20 15','Second largest = 15, index = 4'],['4\n10 30 20 40','Second largest = 30, index = 1']])
 assert.equal(cases.find(t=>t.id==='Q2-TC1')?.input,'1 20')
 assert.equal(cases.find(t=>t.id==='Q3-TC1')?.expectedOutput,'10 8 4')
 assert.match(verifiedCirclePaper.notice,/mâu thuẫn/)
})
test('circle rubric uses source weights and requirements instead of the other paper',async()=>{
 const extraction=await new DocumentExtractorService().extract(undefined,verifiedCirclePaper.text)
 const parsed=new DeterministicParserService().parse(extraction,10)
 assert.deepEqual(parsed.rubricCriteria.map(c=>c.maxPoints),[1,1,1,1,2,2,2])
 assert.match(parsed.rubricCriteria[0].description,/radius/)
 assert.match(parsed.rubricCriteria[3].description,/second largest/)
 assert.match(parsed.rubricCriteria[5].description,/vowels/)
 assert.equal(parsed.testCases.length,21)
})
test('renamed exact circle PDF uses verified extraction without OCR',async()=>{
 const file=process.env.CIRCLE_PDF_PATH
 if(!file) return
 const extraction=await new DocumentExtractorService().extract({filename:'renamed.pdf',buffer:await fs.readFile(file)})
 assert.equal(extraction.verifiedReference,true)
 assert.equal(extraction.pageCount,6)
 assert.equal(extraction.rawText,verifiedCirclePaper.text)
})
