import assert from 'node:assert/strict'
import test from 'node:test'
import fs from 'node:fs'
import path from 'node:path'
import vm from 'node:vm'
import { createRequire } from 'node:module'
import ts from 'typescript'

const candidateRoots = [
  path.resolve('../aita-backend/src'),
  path.resolve('../../aita-backend/src')
]
const root = candidateRoots.find(p => fs.existsSync(p)) || candidateRoots[0]
function loader(mocks = {}) {
  const cache = new Map()
  function load(file) {
    const resolved = path.resolve(root, file)
    if (cache.has(resolved)) return cache.get(resolved).exports
    const record = { exports: {} }
    cache.set(resolved, record)
    const source = ts.transpileModule(fs.readFileSync(resolved, 'utf8'), { compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS } }).outputText
    const requireExternal = createRequire(resolved)
    const requireLocal = name => {
      const match = Object.keys(mocks).find(key => name.endsWith(key))
      if (match) return mocks[match]
      return name.startsWith('.') ? load(path.resolve(path.dirname(resolved), name.replace(/\.js$/, '.ts'))) : requireExternal(name)
    }
    vm.runInNewContext(`(function(require,module,exports){${source}\n})`, { console, Date })(requireLocal, record, record.exports)
    return record.exports
  }
  return load
}

test('subject credit and syllabus survive create, update, persistence and response', async () => {
  const load = loader()
  const { SubjectRequestDto } = load('modules/subjects/application/dtos/subject.dto.ts')
  const { CreateSubjectUseCase } = load('modules/subjects/application/use-cases/create-subject.use-case.ts')
  const { UpdateSubjectUseCase } = load('modules/subjects/application/use-cases/update-subject.use-case.ts')
  const { SubjectMapper } = load('modules/subjects/infrastructure/mappers/subject.mapper.ts')
  let stored
  const repo = {
    findByCode: async () => null,
    create: async subject => { stored = SubjectMapper.toPersistence(subject) },
    findById: async () => SubjectMapper.toDomain(stored),
    save: async subject => { stored = SubjectMapper.toPersistence(subject) },
  }
  const create = new CreateSubjectUseCase(repo)
  const created = await create.execute(SubjectRequestDto.from({ code: 'TEST', name: 'Test subject', credit: 5, syllabusData: '{"sessions":[1]}' }))
  assert.equal(created.credit, 5)
  assert.equal(stored.Credit, 5)
  assert.equal(stored.SyllabusData, '{"sessions":[1]}')
  await new UpdateSubjectUseCase(repo).execute({ id: created.id, dto: SubjectRequestDto.from({ code: 'TEST', name: 'Changed name', credit: 0 }) })
  assert.equal(stored.Credit, 0)
  assert.equal(stored.SyllabusData, '{"sessions":[1]}')
  assert.throws(() => SubjectRequestDto.from({ code: 'TEST', name: 'Test', credit: -1 }))
})

test('draft, publish, unpublish, republish preserve raw score and feedback without repeated penalty', async () => {
  const db = {
    Id: 'submission', RawScore: 8, TotalScore: 8, FinalScore: 6, InstructorFeedback: 'Old',
    SubmittedAt: new Date('2026-09-02T00:00:00Z'),
    Exam: { DueDate: new Date('2026-09-01T00:00:00Z'), LatePenaltyType: 'DAILY_POINTS', LatePenaltyValue: 2 },
  }
  const prisma = { submission: { findUnique: async () => db, update: async ({ data }) => { Object.assign(db, data); return db } } }
  const load = loader({
    'database/prisma.js': { prisma },
    'dtos/submission.dto.js': { SubmissionResponseDto: { from: row => row } },
    'infrastructure/sse-service.js': { sseService: { push() {} } },
  })
  const entity = { totalScore: 8, isGraded: () => true, unpublish() {}, review() {} }
  const repo = { findById: async () => entity, save: async () => {} }
  const { PublishGradeUseCase } = load('modules/submissions/application/use-cases/publish-grade.use-case.ts')
  const useCase = new PublishGradeUseCase(repo)
  const execute = data => useCase.execute({ id: 'submission', dto: { data }, user: { id: 'lecturer', role: 'LECTURER' } })
  await execute({ score: 9, feedback: 'Saved draft', isPublished: false })
  assert.equal(db.RawScore, 9)
  assert.equal(db.FinalScore, 7)
  assert.equal(db.InstructorFeedback, 'Saved draft')
  for (const isPublished of [true, false, true]) {
    await execute({ isPublished })
    assert.equal(db.RawScore, 9)
    assert.equal(db.FinalScore, 7)
    assert.equal(db.LatePenaltyAmount, 2)
    assert.equal(db.InstructorFeedback, 'Saved draft')
  }
  await execute({ feedback: '', isPublished: true })
  assert.equal(db.InstructorFeedback, '')
})
