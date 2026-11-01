import test from 'node:test'
import assert from 'node:assert/strict'
import {extractAcceptanceScenarios} from '../src/modules/ai/infrastructure/analysis/assignment-contract.js'
test('Vietnamese browser table retains all thirteen action and result cells',()=>{
 const source='5. Kịch bản kiểm thử trình duyệt\nTC Thao tác và kết quả mong đợi\n'+Array.from({length:13},(_,i)=>`TC${String(i+1).padStart(2,'0')} | Thao tác ${i+1}: Kết quả ${i+1}`).join('\n')
 const cases=extractAcceptanceScenarios(source)
 assert.equal(cases.length,13);assert.equal(cases[12].id,'TC13');assert.equal(cases[0].expectedResult,'Kết quả 1')
 assert.ok(cases.every(c=>c.execution==='manual_review'))
 assert.equal(extractAcceptanceScenarios(source.replaceAll(' | ', ' ')).length,13)
})
