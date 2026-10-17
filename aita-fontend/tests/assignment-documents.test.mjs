import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import vm from 'node:vm'
import { createRequire } from 'node:module'
import ts from 'typescript'
import { createLoader } from './helpers/load-typescript.mjs'

function backendLoader(mocks = {}, cwd = process.cwd()) {
  const root = path.resolve('../aita-backend/src'), cache = new Map()
  function load(relative) {
    const file = path.resolve(root, relative), require = createRequire(file)
    if (cache.has(file)) return cache.get(file).exports
    const module = { exports: {} }; cache.set(file, module)
    const output = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, esModuleInterop: true } }).outputText
    vm.runInNewContext(`(function(require,module,exports){${output}\n})`, { Buffer, URL, AbortSignal, console, process: { cwd: () => cwd, env: {} } })(name => {
      if (name in mocks) return mocks[name]
      if (name.startsWith('.')) return load(path.relative(root, path.resolve(path.dirname(file), name.replace(/\.js$/, '.ts'))))
      return require(name)
    }, module, module.exports)
    return module.exports
  }
  return load
}
test('multipart creation preserves nested rubric/config, booleans and original attachment metadata', async () => {
  const load = backendLoader({ '../../../../database/prisma.js': { prisma: {} } })
  const { CreateExamRequestDto } = load('modules/exams/application/dtos/exam.dto.ts')
  const payload = { title: 'Original Android assignment', subjectId: 'subject', description: 'Full teacher document\nRoom and Compose', status: 'draft', allowResubmission: false, runtimeConfig: { language: 'Kotlin' }, aiConfig: { acceptanceTests: [{ id: 'TC01', expectedResult: 'Data saved' }] } }
  const dto = CreateExamRequestDto.from({ payload: JSON.stringify(payload) })
  assert.equal(dto.data.allowResubmission, false); assert.equal(dto.data.runtimeConfig.language, 'Kotlin')
  assert.throws(() => CreateExamRequestDto.from({ payload: '{invalid' }))
  let saved, attachment
  const repo = { create: async exam => { saved = exam }, addAttachment: async (examId, file) => { attachment = { examId, ...file } }, findById: async () => saved }
  const { CreateExamUseCase } = load('modules/exams/application/use-cases/create-exam.use-case.ts')
  await new CreateExamUseCase(repo).execute({ dto, userId: 'lecturer', file: { originalname: 'Đề bài Android.docx', filename: 'stored-original.docx', mimetype: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' } })
  assert.equal(attachment.fileName, 'Đề bài Android.docx')
  assert.equal(attachment.fileUrl, '/uploads/attachments/stored-original.docx')
  assert.equal(saved.description, payload.description)
  assert.equal(JSON.parse(saved.aiGeneratedContent).aiConfig.acceptanceTests[0].id, 'TC01')
})
test('student response uses the full assignment rather than a rubric section and exposes only public analysis', () => {
  const { ExamResponseDto } = backendLoader()('modules/exams/application/dtos/exam.dto.ts')
  const dto = ExamResponseDto.from({ id: 'exam', description: 'Full original specification', ExamSection: [{ Description: 'Barem tiêu chí chấm điểm tự động và AI' }], aiGeneratedContent: JSON.stringify({ runtimeConfig: { language: 'Kotlin' }, sampleSolution: 'SECRET', aiConfig: { analysisReview: { acknowledged: true, profile: { platform: 'Android' } }, requirementGroups: { required: [{ text: 'Room persistence' }] }, acceptanceTests: [{ id: 'TC01' }] } }) })
  assert.equal(dto.content, 'Full original specification')
  assert.equal(dto.documentContent, 'Full original specification')
  assert.equal(dto.documentAnalysis.reviewStatus, 'teacher_reviewed')
  assert.ok(!JSON.stringify(dto.documentAnalysis).includes('SECRET'))
})
test('download access restricts students to published enrolled classes and lecturers to their own exams', () => {
  const { canAccessExamDocument } = backendLoader()('modules/exams/application/document-access.ts')
  const exam = { status: 'Published', createdBy: 'creator', classLecturers: [{ studentIds: ['student'], instructorIds: ['teacher'] }] }
  for (const user of [{ id: 'student', role: 'student' }, { id: 'teacher', role: 'lecturer' }, { id: 'creator', role: 'lecturer' }, { id: 'admin', role: 'admin' }]) assert.equal(canAccessExamDocument(exam, user), true)
  assert.equal(canAccessExamDocument(exam, { id: 'other', role: 'student' }), false)
  assert.equal(canAccessExamDocument(exam, { id: 'other', role: 'lecturer' }), false)
  assert.equal(canAccessExamDocument({ ...exam, status: 'Draft' }, { id: 'student', role: 'student' }), false)
  assert.equal(canAccessExamDocument(exam, undefined), false)
})
test('Vietnamese original filenames survive multipart Latin-1 decoding without changing Unicode names', () => {
  const { originalAttachmentName } = backendLoader()('modules/exams/application/document-access.ts')
  const name = 'Đề bài Android.docx'
  assert.equal(originalAttachmentName(Buffer.from(name, 'utf8').toString('latin1')), name)
  assert.equal(originalAttachmentName(name), name)
})
test('attachment controller downloads original disk bytes and filename only after checking access', async () => {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'aita-document-test-'))
  const directory = path.join(temp, 'uploads', 'attachments'); fs.mkdirSync(directory, { recursive: true })
  const filename = path.join(directory, 'original.docx'), bytes = Buffer.from([80, 75, 3, 4, 0, 255, 17])
  fs.writeFileSync(filename, bytes)
  try {
    const { ExamsController } = backendLoader({ '../../../shared/infrastructure/memory-cache.js': { memoryCache: {} } }, temp)('modules/exams/presentation/exams.controller.ts')
    const repo = { getAttachment: async () => ({ examId: 'exam', fileUrl: '/uploads/attachments/original.docx', fileName: 'Đề gốc.docx' }), findById: async () => ({ status: 'Published', classLecturers: [{ studentIds: ['student'] }] }) }
    const controller = new ExamsController(null, null, null, null, { debug() {}, error() {} }, repo)
    let downloaded, status, headers = {}
    const response = { setHeader(key, value) { headers[key] = value }, status(value) { status = value; return this }, json() {}, download(file, name) { downloaded = { bytes: fs.readFileSync(file), name } } }
    await controller.downloadAttachment({ params: { attachmentId: 'attachment' }, user: { id: 'other', role: 'student' }, query: {} }, response)
    assert.equal(status, 403); assert.equal(downloaded, undefined)
    await controller.downloadAttachment({ params: { attachmentId: 'attachment' }, user: { id: 'student', role: 'student' }, query: {} }, response)
    assert.deepEqual(downloaded.bytes, bytes); assert.equal(downloaded.name, 'Đề gốc.docx')
    assert.equal(headers['Cache-Control'], 'private, no-store')
  } finally { fs.unlinkSync(filename); fs.rmdirSync(directory); fs.rmdirSync(path.dirname(directory)); fs.rmdirSync(temp) }
})
test('authenticated document download returns unchanged binary data, bypasses JSON and cache', async () => {
  const calls = [], values = new Map([['aita_token', 'student-token']])
  const storage = { getItem: key => values.get(key) || null, setItem: (key, value) => values.set(key, value), removeItem: key => values.delete(key) }
  const bytes = Buffer.from([80, 75, 3, 4, 0, 255])
  const load = createLoader({ localStorage: storage, sessionStorage: { getItem: () => null, setItem() {}, removeItem() {} }, window: {}, fetch: async (url, options) => { calls.push({ url, options }); return new Response(bytes, { headers: { 'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' } }) } })
  const { assignmentsApi } = load('lib/api/modules/assignments.ts')
  const first = await assignmentsApi.getDocumentFile('file-id')
  assert.deepEqual(Buffer.from(await first.arrayBuffer()), bytes)
  await assignmentsApi.getDocumentFile('file-id')
  assert.equal(calls.length, 2); assert.equal(calls[0].options.headers.Authorization, 'Bearer student-token')
  assert.equal(calls[0].url, '/api/assignments/attachments/file-id/download')
})
test('web specification prioritizes original content and escapes unsafe legacy markup', () => {
  const { assignmentDocumentContent, readableAssignmentText } = createLoader()('features/assignments/document-content.ts')
  assert.equal(assignmentDocumentContent({ description: 'Full original' }, { metadata: { content: 'Barem tiêu chí chấm điểm tự động và AI' } }), 'Full original')
  assert.equal(assignmentDocumentContent({ content: 'Barem tiêu chí chấm điểm tự động và AI' }), '')
  const text = readableAssignmentText('<h2>Original</h2><p>Room &amp; Compose</p><script>evil()</script>')
  assert.match(text, /Original/); assert.match(text, /Room & Compose/); assert.ok(!text.includes('evil()'))
})
test('concurrent binary downloads keep original bytes after a shared token refresh', async () => {
  const values = new Map([['aita_token', 'old'], ['aita_refresh_token', 'refresh']])
  const storage = { getItem: key => values.get(key) || null, setItem: (key, value) => values.set(key, value), removeItem: key => values.delete(key) }
  let releaseRefresh, refreshes = 0
  const refreshed = new Promise(resolve => { releaseRefresh = resolve })
  const bytes = Buffer.from([80, 75, 255, 0])
  const load = createLoader({ localStorage: storage, sessionStorage: { getItem: () => null, setItem() {}, removeItem() {} }, window: {}, fetch: async (url, options) => {
    if (url.endsWith('/auth/refresh-token')) { refreshes++; await refreshed; return new Response(JSON.stringify({ success: true, data: { token: 'new', refreshToken: 'new-refresh' } })) }
    return options.headers.Authorization === 'Bearer new' ? new Response(bytes) : new Response(JSON.stringify({ success: false }), { status: 401 })
  } })
  const { assignmentsApi } = load('lib/api/modules/assignments.ts')
  const downloads = [assignmentsApi.getDocumentFile('one'), assignmentsApi.getDocumentFile('two')]
  await new Promise(resolve => setTimeout(resolve, 10)); releaseRefresh()
  const blobs = await Promise.all(downloads)
  assert.equal(refreshes, 1)
  for (const blob of blobs) assert.deepEqual(Buffer.from(await blob.arrayBuffer()), bytes)
})
