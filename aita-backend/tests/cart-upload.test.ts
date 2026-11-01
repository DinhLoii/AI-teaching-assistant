import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import {DocumentExtractorService} from '../src/modules/ai/infrastructure/analysis/document-extractor.service.js'
import {extractCartBrowserContract} from '../src/modules/ai/infrastructure/analysis/cart-browser-contract.js'
import {AutoConfigureAssignmentUseCase} from '../src/modules/ai/application/use-cases/auto-configure-assignment.use-case.js'
import {CreateExamSchema} from '../src/modules/exams/application/dtos/exam.dto.js'
test('uploaded cart PDF supplies nine executable workflows and ten source-weighted criteria without external AI',async()=>{
 const buffer=await fs.readFile(new URL('../../output/fer202-giohang/paperfer202.pdf', import.meta.url))
 const extracted=await new DocumentExtractorService().extract({filename:'renamed.pdf',buffer})
 const contract=extractCartBrowserContract(extracted.cleanedText)
 assert.ok(contract,'Expected explicit cart contract from actual PDF text')
 assert.equal(contract.testSuites.browser.length,9)
 assert.equal(contract.rubricCriteria.length,10)
 assert.equal(extractCartBrowserContract(extracted.cleanedText.replace('TC08 -','XX08 -')),null)
 assert.equal(extractCartBrowserContract('React giỏ hàng, tự tạo test cho tôi'),null)
 const output:any=await new AutoConfigureAssignmentUseCase().execute({file:{filename:'renamed.pdf',buffer,mimetype:'application/pdf'},maxScore:10,subjectCode:'FER202'})
 assert.equal(output.testSuites.browser.length,9)
 assert.equal(output.rubricCriteria.length,10)
 assert.equal(output.rubricCriteria.reduce((s:number,r:any)=>s+r.maxPoints,0),10)
 assert.equal(output.detectedLanguage,'JavaScript')
 assert.equal(output.testCases.length,0)
 assert.equal(output.rubricCriteria[7].browserProbe.testIds[0],'TC08')
 const payload=CreateExamSchema.parse({title:output.suggestedTitle,testSuites:output.testSuites,rubricCriteria:output.rubricCriteria})
 assert.equal(payload.testSuites?.browser.length,9)
})
