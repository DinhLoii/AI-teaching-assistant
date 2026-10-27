import assert from 'node:assert/strict'
import test from 'node:test'
import { DocumentExtractorService } from '../src/modules/ai/infrastructure/analysis/document-extractor.service.js'
import { DeterministicParserService } from '../src/modules/ai/infrastructure/analysis/deterministic-parser.service.js'
import { AnalysisValidatorService } from '../src/modules/ai/infrastructure/analysis/analysis-validator.service.js'

async function parse(text: string) {
  return new DeterministicParserService().parse(await new DocumentExtractorService().extract(undefined, text), 10)
}

test('numbered 10-point heading and later penalties are not scored criteria', async () => {
  const result = await parse(`Ngôn ngữ: C\nConsole application
5. Thang điểm tham khảo (10 điểm)
• ADD và kiểm tra ID trùng: 2 điểm.
• UPDATE thông tin: 2 điểm.
• DELETE theo ID: 2 điểm.
• SEARCH theo tên: 2 điểm.
• Hiển thị danh sách: 2 điểm.
Tổng điểm: 10 điểm
6. Quy định nộp bài
• Nộp muộn: 2 điểm.
`)
  assert.equal(result.rubricDetectionStatus, 'DETECTED_COMPLETE')
  assert.equal(result.criteriaPointsSum, 10)
  assert.equal(result.rubricCriteria.length, 5)
  assert.equal(result.rubricCriteria[0].name, 'ADD và kiểm tra ID trùng')
  assert.equal(result.rubricCriteria[0].description, 'ADD và kiểm tra ID trùng')
  assert.ok(result.rubricCriteria.every(row => !row.aiGuidance.includes('"iểm')))
})

test('numbered table rows exclude total and preserve component scores and evidence', async () => {
  const result = await parse(`Ngôn ngữ: C
5. Thang điểm tham khảo (10 điểm)
| STT | Tiêu chí | Điểm |
| 1 | ADD và kiểm tra ID trùng | 2 điểm |
| 2 | UPDATE | 3 điểm |
| 3 | SEARCH | 5 điểm |
| Tổng điểm | 10 điểm |
`)
  assert.equal(result.criteriaPointsSum, 10)
  assert.equal(result.rubricCriteria.length, 3)
  assert.deepEqual(result.rubricCriteria.map(row => row.maxPoints), [2, 3, 5])
  assert.match(result.rubricCriteria[0].evidence!, /ADD và kiểm tra ID trùng/)
})

test('genuine source mismatch remains visible without rescaling the original rubric', async () => {
  const result = await parse(`Ngôn ngữ: C
5. Thang điểm tham khảo (10 điểm)
- ADD: 2 điểm.
- SEARCH: 3 điểm.
`)
  assert.equal(result.criteriaPointsSum, 5)
  assert.equal(result.rubricDetectionStatus, 'DETECTED_MISMATCH_TOTAL')
  assert.deepEqual(result.rubricCriteria.map(row => row.maxPoints), [2, 3])
})

function analysisFixture(points: number[], source = 'ORIGINAL_DOCUMENT'): any {
  return {
    suggestedTitle: 'Quản lý danh sách', detectedLanguage: 'C', assignmentCategory: 'standard',
    submissionFormat: { submissionType: 'single_file', allowedFormats: ['.c'], requiredLanguage: 'C', entryFile: 'main.c', directoryStructure: '', resubmissionPolicy: 'highest' },
    runtimeConfig: { language: 'C', version: 'C17', submissionStyle: 'single_file', buildCommand: 'gcc main.c', runCommand: './a.out', category: 'standard' },
    requirements: ['ADD và kiểm tra ID trùng'], testCases: [],
    rubricCriteria: points.map((maxPoints, index) => ({ id: `rc-${index}`, name: `Yêu cầu ${index}`, description: `Nội dung ${index}`, maxPoints, method: 'ai_assessment', passCondition: 'Đúng đề', failCondition: 'Chưa đạt', aiGuidance: 'Đối chiếu đề gốc', source: 'EXTRACTED', evidence: `Trích dẫn gốc ${index}: ${maxPoints} điểm`, reviewNeeded: false })),
    edgeCasesAndPitfalls: { edgeCases: [], commonPitfalls: '', referenceMaterials: '' },
    summaryExplanation: '', modelUsed: 'test',
    provenanceReport: { rubricSourceType: source, targetTotalPoints: 10, pointsSumDelta: 2 },
    analysisReview: { warnings: [] },
  }
}

test('final response distributes a 12-point original rubric evenly to exactly 10', () => {
  const input = analysisFixture([2, 1, 1, 2, 1, 1, 1, 1, 2])
  const evidence = input.rubricCriteria.map((row: any) => row.evidence)
  const result = AnalysisValidatorService.validateAndRepair(input, 10)
  assert.equal(result.isValid, true)
  assert.deepEqual(result.output.rubricCriteria.map(row => row.maxPoints), [1.12, ...Array(8).fill(1.11)])
  assert.equal(result.output.rubricCriteria.reduce((sum, row) => sum + Math.round(row.maxPoints * 100), 0), 1000)
  assert.deepEqual(result.output.rubricCriteria.map(row => row.evidence), evidence)
  assert.equal(result.output.provenanceReport.pointsSumDelta, 0)
  assert.match(input.analysisReview.warnings.join(' '), /chia đều/)
  const snapshot = JSON.stringify(result.output)
  AnalysisValidatorService.validateAndRepair(result.output, 10)
  assert.equal(JSON.stringify(result.output), snapshot, 'Repeated validation must not alter points or add duplicate notes')
})

test('zero-point proposals and rounding-heavy rubrics receive an exact nonnegative scale', () => {
  for (const count of [3, 9, 24]) {
    const result = AnalysisValidatorService.validateAndRepair(analysisFixture(Array(count).fill(0), 'AI_GENERATED'), 10)
    const points = result.output.rubricCriteria.map(row => Math.round(row.maxPoints * 100))
    assert.equal(result.isValid, true)
    assert.equal(points.reduce((sum, value) => sum + value, 0), 1000)
    assert.ok(Math.max(...points) - Math.min(...points) <= 1)
  }
})

test('valid original ten-point weighting is preserved', () => {
  const result = AnalysisValidatorService.validateAndRepair(analysisFixture([2, 1, 3, 4]), 10)
  assert.deepEqual(result.output.rubricCriteria.map(row => row.maxPoints), [2, 1, 3, 4])
})
