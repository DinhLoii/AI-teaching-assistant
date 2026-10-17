import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import vm from 'node:vm'
import { createRequire } from 'node:module'
import ts from 'typescript'

const root = path.resolve('../aita-backend/src')
function loader(mocks = {}) {
  const cache = new Map()
  const context = vm.createContext({ Buffer, console, setTimeout, clearTimeout, structuredClone, process: { env: {} } })
  function load(relative) {
    const file = path.resolve(root, relative), require = createRequire(file)
    if (cache.has(file)) return cache.get(file).exports
    const module = { exports: {} }; cache.set(file, module)
    const output = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, esModuleInterop: true } }).outputText
    vm.runInContext(`(function(require,module,exports){${output}\n})`, context, { filename: file })(name => {
      if (name in mocks) return mocks[name]
      if (name.startsWith('.')) return load(path.relative(root, path.resolve(path.dirname(file), name.replace(/\.js$/, '.ts'))))
      return require(name)
    }, module, module.exports)
    return module.exports
  }
  return load
}
const plain = loader()
const contract = plain('modules/ai/infrastructure/analysis/assignment-contract.ts')
const fixture = fs.readFileSync('tests/fixtures/personal-expense-tracker.txt', 'utf8')
function useCase(aiResponse, unavailable = false) {
  let prompt = ''
  const load = loader({
    '../../../grading/engine/infrastructure/ai/AiClientManager.js': { AiClientManager: { executeWithFallback: async callback => {
      if (unavailable) throw new Error('AI unavailable')
      return callback({ chat: { completions: { create: async payload => { prompt = payload.messages[0].content; return { choices: [{ message: { content: JSON.stringify(aiResponse) } }] } } } } }, 'test-real-provider')
    } } },
    '../../infrastructure/rag/pgvector-rubric.service.js': { PgVectorRubricService: class { async searchSimilarRubrics() { return [] } async saveRubricWithEmbeddings() {} } },
  })
  return { execute: input => new (load('modules/ai/application/use-cases/auto-configure-assignment.use-case.ts').AutoConfigureAssignmentUseCase)().execute(input), prompt: () => prompt }
}
test('language detection distinguishes app database dependencies from SQL assignments across subjects', () => {
  for (const [text, lang, mode] of [
    [fixture, 'Kotlin', 'project'],
    ['Ngôn ngữ: Java\nBuild a Java Servlet web application with JDBC and SQL Server.', 'Java', 'project'],
    ['Ngôn ngữ: C#\nỨng dụng WPF quản lý nhân viên sử dụng SQLite.', 'C#', 'project'],
    ['Ngôn ngữ: SQL\nCREATE TABLE Employee (id INT); SELECT * FROM Employee;', 'SQL', 'sql'],
    ['Ngôn ngữ: C++\nConsole program. Input: 2 3\nOutput: 5', 'C++', 'console'],
    ['Ngôn ngữ: C++\nConsole stdin/stdout.\nKhông bắt buộc\nBackend và frontend React.', 'C++', 'console'],
    ['Ngôn ngữ: Python\nImplement a Django web application with database storage.', 'Python', 'project'],
    ['Ngôn ngữ: Dart\nFlutter application offline SQLite.', 'Dart', 'project'],
    ['Ngôn ngữ: Swift\niOS application with SwiftUI.', 'Swift', 'project'],
    ['An assignment with no programming language or execution specification.', 'Unknown', 'unknown'],
  ]) {
    const profile = contract.detectAssignmentProfile(text)
    assert.equal(profile.language, lang, text.slice(0, 100)); assert.equal(profile.mode, mode)
  }
})
test('actual uploaded assignment preserves mandatory/advanced/excluded scope and all ten acceptance scenarios', () => {
  const rows = contract.extractAssignmentRequirements(fixture)
  assert.ok(rows.some(row => row.level === 'required' && /Hiển thị danh sách giao dịch/.test(row.text)))
  assert.ok(rows.some(row => row.level === 'advanced' && /ngân sách/.test(row.text)))
  assert.ok(rows.some(row => row.level === 'excluded' && /Đăng nhập/.test(row.text)))
  const scenarios = contract.extractAcceptanceScenarios(fixture)
  assert.equal(scenarios.length, 10)
  assert.equal(scenarios[0].id, 'TC01'); assert.match(scenarios[0].steps, /5.000.000/)
  assert.equal(scenarios.filter(row => row.level === 'advanced').length, 2)
  assert.ok(scenarios.every(row => row.execution === 'manual_review'))
})
test('end-to-end Android analysis rejects SQL hallucination, preserves source and original 10-point rubric', async () => {
  const runner = useCase({ detectedLanguage: 'SQL', testCases: [{ input: 'SELECT * FROM records', expectedOutput: '5 rows' }], rubricCriteria: [{ name: 'Web auth/session', maxPoints: 10, evidence: 'invented' }] })
  const result = await runner.execute({ text: fixture, subjectCode: 'PRM392', preferredLanguage: 'SQL' })
  assert.equal(result.detectedLanguage, 'Kotlin')
  assert.equal(result.runtimeConfig.language, 'Kotlin')
  assert.equal(result.submissionFormat.allowedFormats[0], '.zip')
  assert.equal(result.sqlConfig, undefined); assert.equal(result.testCases.length, 0)
  assert.equal(result.description.replace(/\s+/g, ' ').trim(), fixture.replace(/\s+/g, ' ').trim())
  assert.equal(result.acceptanceTests.length, 10)
  assert.equal(result.rubricCriteria.length, 6, JSON.stringify(result.rubricCriteria.map(row => [row.name, row.maxPoints])))
  assert.equal(result.rubricCriteria.reduce((sum, row) => sum + row.maxPoints, 0), 10)
  assert.equal(result.provenanceReport.rubricSourceType, 'ORIGINAL_DOCUMENT')
  assert.equal(result.runtimeConfig.buildCommand, '')
  assert.ok(!JSON.stringify(result.rubricCriteria).includes('Web auth/session'))
  assert.match(runner.prompt(), /Room\/SQLite/)
})
test('AI unavailable returns extraction-only and never invents SQL, stdin tests or verified weights', async () => {
  const runner = useCase(null, true)
  const text = 'Ngôn ngữ: Kotlin\nNền tảng Android\n4. Chức năng bắt buộc\nLưu giao dịch bằng Room và kiểm tra số tiền > 0.\n5. Chức năng nâng cao\nThiết lập ngân sách tháng.\n6. Không bắt buộc\nĐăng nhập và Firebase.'
  const result = await runner.execute({ text })
  assert.equal(result.analysisReview.status, 'extraction_only')
  assert.equal(result.testCases.length, 0)
  assert.ok(result.rubricCriteria.every(row => row.reviewNeeded && row.maxPoints === 0 && text.includes(row.evidence)))
  assert.ok(!result.rubricCriteria.some(row => /Đăng nhập/.test(row.name)))
})
test('DOCX upload reads native Word table cells through the actual extractor', async () => {
  const AdmZip = createRequire(path.resolve('../aita-backend/package.json'))('adm-zip')
  const escape = text => text.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
  const paragraph = text => `<w:p><w:r><w:t xml:space="preserve">${escape(text)}</w:t></w:r></w:p>`
  const rows = [
    ['Hạng mục', 'Điểm', 'Tiêu chí chấm'],
    ['CRUD giao dịch & validation', '3.0', 'Thêm/xem/sửa/xóa hoạt động'],
    ['Room & thiết kế dữ liệu', '1.5', 'Entity, DAO; dữ liệu tồn tại sau mở lại'],
    ['Dashboard & lọc cơ bản', '1.5', 'Tính thu/chi/số dư chính xác'],
    ['Giao diện & kiến trúc', '1.0', 'Tách UI và data hợp lý'],
    ['Ngân sách & thống kê nâng cao', '1.5', 'Ngân sách và cảnh báo'],
    ['Kiểm thử, báo cáo & khả năng chạy', '1.5', 'Build/run, README'],
    ['TỔNG', '10.0', 'Chấm theo minh chứng'],
  ]
  const zip = new AdmZip()
  zip.addFile('[Content_Types].xml', Buffer.from('<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>'))
  zip.addFile('_rels/.rels', Buffer.from('<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>'))
  const intro = fixture.slice(0, fixture.indexOf('9. Rubric'))
  const table = `<w:tbl>${rows.map(row => `<w:tr>${row.map(cell => `<w:tc>${paragraph(cell)}</w:tc>`).join('')}</w:tr>`).join('')}</w:tbl>`
  zip.addFile('word/document.xml', Buffer.from(`<?xml version="1.0"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${intro.split('\n').map(paragraph).join('')}${paragraph('9. Rubric chấm điểm (10 điểm)')}${table}</w:body></w:document>`))
  const result = await useCase({ detectedLanguage: 'SQL' }).execute({ file: { filename: 'Android-assignment.docx', mimetype: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', buffer: zip.toBuffer() } })
  assert.equal(result.detectedLanguage, 'Kotlin')
  assert.equal(result.rubricCriteria.length, 6)
  assert.equal(result.rubricCriteria.reduce((sum, row) => sum + row.maxPoints, 0), 10)
  assert.equal(result.acceptanceTests.length, 10)
})
test('console examples remain executable while empty analyses and SQL inputs get no sample tests', async () => {
  const runner = useCase({})
  const consoleResult = await runner.execute({ text: 'Ngôn ngữ: C++\n1. Yêu cầu\nViết chương trình console tính tổng hai số nguyên.\nSample Input: 2 3\nSample Output: 5' })
  assert.equal(consoleResult.detectedLanguage, 'C++')
  assert.ok(consoleResult.testCases.some(row => row.input === '2 3' && row.expectedOutput === '5'))
  const sqlResult = await runner.execute({ text: 'Ngôn ngữ: SQL\n1. Yêu cầu\nViết truy vấn SELECT từ bảng Employee theo đề bài.' })
  assert.equal(sqlResult.detectedLanguage, 'SQL')
  assert.equal(sqlResult.testCases.length, 0)
  assert.equal(sqlResult.sqlConfig.schemaDdl, '')
})
test('analysis cache is isolated by context and does not share mutable teacher changes', () => {
  const { AnalysisCacheService } = plain('modules/ai/infrastructure/analysis/analysis-cache.service.ts')
  const key = AnalysisCacheService.generateKey('hash', 10, undefined, 'teacher-A:PRM392')
  assert.notEqual(key, AnalysisCacheService.generateKey('hash', 10, undefined, 'teacher-B:DBI202'))
  AnalysisCacheService.set(key, { nested: { points: 1 } })
  const first = AnalysisCacheService.get(key); first.nested.points = 99
  assert.equal(AnalysisCacheService.get(key).nested.points, 1)
})
test('server refuses publication without teacher review or a consistent total, before database access', async () => {
  const load = loader()
  const { CreateExamUseCase } = load('modules/exams/application/use-cases/create-exam.use-case.ts')
  const useCase = new CreateExamUseCase({})
  const data = { status: 'published', maxScore: 10, runtimeConfig: { language: 'Kotlin' }, aiConfig: { analysisReview: { acknowledged: false } }, rubricCriteria: [{ maxPoints: 10 }] }
  await assert.rejects(useCase.execute({ dto: { data } }), /đối chiếu đề gốc/)
  data.aiConfig.analysisReview.acknowledged = true; data.rubricCriteria[0].maxPoints = 15
  await assert.rejects(useCase.execute({ dto: { data } }), /Tổng điểm barem/)
  data.rubricCriteria[0].maxPoints = 10; data.rubricCriteria[0].method = 'test_runner'
  await assert.rejects(useCase.execute({ dto: { data } }), /chưa có testcase/)
})
