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
const libraryFixture = fs.readFileSync('tests/fixtures/mini-library-manager.txt', 'utf8')
const inventoryFixture = fs.readFileSync('tests/fixtures/mini-inventory-manager.txt', 'utf8')
const productFixture = fs.readFileSync('tests/fixtures/product-inventory-c.txt', 'utf8')

test('synthetic PDF page separators never enter reference test expected outputs', async () => {
  const { DocumentExtractorService } = plain('modules/ai/infrastructure/analysis/document-extractor.service.ts')
  const { DeterministicParserService } = plain('modules/ai/infrastructure/analysis/deterministic-parser.service.ts')
  const extractor = new DocumentExtractorService()
  const document = productFixture.replace('UPDATED\n10 But 10 3000', 'UPDATED\n-- 3 of 7 --\n10 But 10 3000')
  const result = new DeterministicParserService().parse(await extractor.extract(undefined, document), 10)
  assert.equal(result.testCases.length, 1)
  assert.equal(result.testCases[0].expectedOutput.includes('-- 3 of 7 --'), false)
  assert.equal(result.testCases[0].expectedOutput.split('\n').length, 9)
  assert.equal(extractor.normalizeText('value -- 3 of 7 -- remains'), 'value -- 3 of 7 -- remains')
})

test('acceptance extraction never interprets console input counts, output zero or later sections as test IDs', () => {
  const consoleDocument = 'Test cases\nTC01 – Input sample\nInput\n4\nADD A 1 2\nQUERY A\nOutput\n0\nNOT_FOUND\nTOTAL 0\n4\nADD B 2 3\nQUERY B'
  assert.equal(contract.extractAcceptanceScenarios(consoleDocument).length, 0)
  const document = '8. Acceptance tests\n01\nCreate a record\nRecord is visible\n9. Submission rules\n04\nUpload source code\nREADME is required'
  const scenarios = contract.extractAcceptanceScenarios(document)
  assert.equal(scenarios.length, 1)
  assert.equal(scenarios[0].id, 'TC01')
  assert.equal(scenarios[0].steps, 'Create a record')
  const explicitZero = contract.extractAcceptanceScenarios('Acceptance tests\nTC00 | Open empty list | Empty state is shown')
  assert.equal(explicitZero[0].id, 'TC00')
})
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

test('product inventory assignment preserves seven source weights and extracts the unnumbered sample', async () => {
  const result = await useCase({}, true).execute({ promptText: productFixture, maxScore: 10 })
  assert.equal(result.detectedLanguage, 'C')
  assert.equal(result.submissionFormat.entryFile, 'main.c')
  assert.equal(result.rubricCriteria.length, 7)
  assert.deepEqual(Array.from(result.rubricCriteria, row => row.maxPoints), [2, 1, 2, 1, 1, 2, 1])
  assert.equal(result.provenanceReport.pointsSumDelta, 0)
  assert.equal(result.analysisReview.warnings.some(warning => warning.includes('chia đều')), false)
  assert.equal(result.testCases.length, 1)
  const tc = result.testCases[0]
  assert.equal(tc.input, '9\nADD 10 But 5 2000\nADD 20 Vo 2 7000\nCOUNT\nFIND 10\nTOP\nUPDATE 10 10 3000\nTOP\nDELETE 20\nCOUNT')
  assert.equal(tc.expectedOutput, 'ADDED\nADDED\n2\n10 But 5 2000\n20 Vo 2 7000\nUPDATED\n10 But 10 3000\nDELETED\n1')
  assert.equal(tc.points, 0)
  assert.equal(tc.source, 'EXTRACTED')
  assert.equal(tc.input.split('\n').length, 10)
  assert.equal(tc.expectedOutput.split('\n').length, 9)
})

test('inventory sample extraction rejects truncated command/output blocks and specification-only text', () => {
  const { DocumentExtractorService } = plain('modules/ai/infrastructure/analysis/document-extractor.service.ts')
  const { extractLabeledConsoleTests } = plain('modules/ai/infrastructure/analysis/console-test-extractor.ts')
  const cleaned = new DocumentExtractorService().normalizeText(productFixture)
  assert.equal(extractLabeledConsoleTests(cleaned.replace('DELETED\n1\n5.', 'DELETED\n5.')).length, 0)
  assert.equal(extractLabeledConsoleTests(cleaned.slice(0, cleaned.indexOf('4. Ví dụ'))).length, 0)
})

test('Mini Library reference table produces exactly TC01–TC10 with original I/O, not the illustrative example or rubric text', async () => {
  const result = await useCase({}, true).execute({ promptText: libraryFixture, maxScore: 10 })
  assert.equal(result.detectedLanguage, 'C')
  assert.equal(result.testCases.length, 10)
  assert.equal(result.rubricCriteria.length, 7)
  assert.equal(result.rubricCriteria.reduce((sum, rule) => sum + rule.maxPoints, 0), 10)
  for (const [index, tc] of result.testCases.entries()) {
    assert.equal(tc.id, `TC${String(index + 1).padStart(2, '0')}`)
    const lines = tc.input.split('\n')
    assert.equal(lines.length - 1, Number(lines[0]))
    assert.equal(tc.expectedOutput.split('\n').length, Number(lines[0]))
    assert.equal(tc.source, 'EXTRACTED')
    assert.equal(tc.isHidden, false)
    assert.equal(tc.points, 0) // Rubric is the sole score budget.
  }
  assert.equal(result.testCases[0].input, '3\nADD 10 3\nFIND 10\nSTATS')
  assert.equal(result.testCases[0].expectedOutput, 'OK\n10 3 3 0\n1 3 3 0')
  assert.equal(result.testCases[9].expectedOutput, 'OK\nOK\n7 0\n7 1 1 0')
})

test('labelled sequential console examples work; ambiguous flattened cells and UI scenarios are not invented', () => {
  const { extractLabeledConsoleTests } = plain('modules/ai/infrastructure/analysis/console-test-extractor.ts')
  const cases = extractLabeledConsoleTests('TC01 – Sum\nInput:\n2 3\nExpected output:\n5\n\n8. Rubric\n10 points')
  assert.equal(cases.length, 1)
  assert.equal(cases[0].input, '2 3')
  assert.equal(cases[0].expectedOutput, '5')
  assert.equal(extractLabeledConsoleTests('TC01\nInput / stdin\nExpected output / stdout\n2 3\n5').length, 0)
  assert.equal(extractLabeledConsoleTests('TC01\nMở ứng dụng, thêm giao dịch.\nKết quả: Lưu thành công.').length, 0)
})

test('native DOCX I/O tables retain all ten cases when commands use Word soft line breaks', async () => {
  const AdmZip = createRequire(path.resolve('../aita-backend/package.json'))('adm-zip')
  const { extractLabeledConsoleTests } = plain('modules/ai/infrastructure/analysis/console-test-extractor.ts')
  const cases = extractLabeledConsoleTests(libraryFixture)
  const escape = text => text.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
  const paragraph = text => `<w:p><w:r><w:t xml:space="preserve">${escape(text)}</w:t></w:r></w:p>`
  const cell = text => `<w:tc><w:p><w:r>${text.split('\n').map(line => `<w:t xml:space="preserve">${escape(line)}</w:t>`).join('<w:br/>')}</w:r></w:p></w:tc>`
  const intro = libraryFixture.slice(0, libraryFixture.indexOf('7. Bộ kiểm thử'))
  const tables = cases.map(tc => paragraph(tc.id) + `<w:tbl><w:tr>${cell('Input / stdin')}${cell('Expected output / stdout')}</w:tr><w:tr>${cell(tc.input)}${cell(tc.expectedOutput)}</w:tr></w:tbl>`).join('')
  const zip = new AdmZip()
  zip.addFile('[Content_Types].xml', Buffer.from('<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>'))
  zip.addFile('_rels/.rels', Buffer.from('<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>'))
  zip.addFile('word/document.xml', Buffer.from(`<?xml version="1.0"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${intro.split('\n').map(paragraph).join('')}${tables}${paragraph('8. Rubric')}</w:body></w:document>`))
  const { DocumentExtractorService } = plain('modules/ai/infrastructure/analysis/document-extractor.service.ts')
  const { DeterministicParserService } = plain('modules/ai/infrastructure/analysis/deterministic-parser.service.ts')
  const extraction = await new DocumentExtractorService().extract({ filename: 'Library.docx', buffer: zip.toBuffer() })
  const result = new DeterministicParserService().parse(extraction)
  assert.equal(result.testCases.length, 10)
  assert.equal(result.testCases[0].expectedOutput, 'OK\n10 3 3 0\n1 3 3 0')
  assert.equal(result.testCases[9].input, '4\nADD 12 2\nADD 7 1\nTOP\nFIND 7')
})

test('Inventory source yields ten exact cases and never turns prose mentioning input/output into executable tests', async () => {
  const result = await useCase({}, true).execute({ promptText: inventoryFixture, maxScore: 10 })
  assert.equal(result.detectedLanguage, 'C++')
  assert.equal(result.testCases.length, 10)
  assert.equal(result.testCases[0].input, '3\nADD A 4 50\nQUERY A\nTOTAL')
  assert.equal(result.testCases[0].expectedOutput, 'ADDED\nA 4 50\nTOTAL 200')
  const { DocumentExtractorService } = plain('modules/ai/infrastructure/analysis/document-extractor.service.ts')
  const { DeterministicParserService } = plain('modules/ai/infrastructure/analysis/deterministic-parser.service.ts')
  const prose = await new DocumentExtractorService().extract(undefined, 'Ngôn ngữ: C++\nĐọc standard input qua luồng chuẩn (stdin), quản lý hàng hóa và in kết quả ra standard output.\n2. Yêu cầu công nghệ\nDữ liệu không có testcase.')
  assert.equal(new DeterministicParserService().parse(prose).testCases.length, 0)
})
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
  assert.ok(result.rubricCriteria.every(row => row.reviewNeeded && row.maxPoints >= 0 && text.includes(row.evidence)))
  assert.equal(result.rubricCriteria.reduce((sum, row) => sum + Math.round(row.maxPoints * 100), 0), 1000)
  assert.ok(result.analysisReview.warnings.some(warning => warning.includes('chia đều')))
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
