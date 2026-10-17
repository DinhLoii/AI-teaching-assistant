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
const fallbackZod = (() => {
  const z = {
    object: (shape) => {
      const schema = {
        parse: (input) => {
        if (!input || typeof input !== 'object') throw new Error('Invalid input');
        const output = { ...input };
        for (const [key, validator] of Object.entries(shape)) {
          if (validator && typeof validator._validate === 'function') {
            validator._validate(output[key]);
          }
        }
        return output;
        },
        optional: () => schema,
        refine: () => schema,
      };
      return schema;
    },
    string: () => {
      let isOptional = false;
      let minLen = 0;
      const v = {
        min: (n) => { minLen = n; return v; },
        optional: () => { isOptional = true; return v; },
        _validate: (val) => {
          if (val === undefined || val === null) {
            if (!isOptional) throw new Error('Field required');
            return val;
          }
          if (typeof val !== 'string' || val.length < minLen) {
            throw new Error(`String too short (min ${minLen})`);
          }
          return val;
        },
      };
      return v;
    },
    number: () => {
      let isOptional = false;
      let minVal = -Infinity;
      let maxVal = Infinity;
      const v = {
        int: () => v,
        min: (n) => { minVal = n; return v; },
        max: (n) => { maxVal = n; return v; },
        optional: () => { isOptional = true; return v; },
        _validate: (val) => {
          if (val === undefined || val === null) {
            if (!isOptional) throw new Error('Field required');
            return val;
          }
          if (typeof val !== 'number' || Number.isNaN(val) || val < minVal || val > maxVal) {
            throw new Error(`Number out of range [${minVal}, ${maxVal}]`);
          }
          return val;
        },
      };
      return v;
    },
    boolean: () => ({ optional() { return this } }),
    enum: () => ({ optional() { return this }, default() { return this } }),
  };
  z.coerce = { number: z.number };
  return { z, default: z, ...z };
})();

function loader(mocks = {}) {
  const cache = new Map()
  const localRequire = createRequire(import.meta.url)
  function load(file) {
    const resolved = path.resolve(root, file)
    if (cache.has(resolved)) return cache.get(resolved).exports
    const record = { exports: {} }
    cache.set(resolved, record)
    const source = ts.transpileModule(fs.readFileSync(resolved, 'utf8'), { compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS } }).outputText
    const requireExternal = createRequire(resolved)
    const requireLocal = name => {
      const match = Object.keys(mocks).find(key => name === key || name.endsWith(key))
      if (match) return mocks[match]
      if (name.startsWith('.')) {
        return load(path.resolve(path.dirname(resolved), name.replace(/\.js$/, '.ts')))
      }
      if (name === 'zod') return fallbackZod
      try {
        return requireExternal(name)
      } catch {
        try {
          return localRequire(name)
        } catch {
          throw new Error(`Cannot find module '${name}'`)
        }
      }
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

test('lowercase student role cannot see unpublished scores and cannot read another student submission', async () => {
  const load = loader()
  const { SubmissionResponseDto } = load('modules/submissions/application/dtos/submission.dto.ts')
  const hidden = SubmissionResponseDto.from({
    Id: 'submission',
    StudentId: 'student-1',
    ReviewStatus: 'PENDING_REVIEW',
    TotalScore: 10,
    RawScore: 10,
    FinalScore: 10,
    ReportData: JSON.stringify({ totalScore: 10, overallFeedback: 'Private feedback' }),
  }, 'student')
  assert.equal(hidden.score, null)
  assert.equal(hidden.reportData, null)
  assert.equal(hidden.aiFeedback, null)

  const { GetSubmissionUseCase } = load('modules/submissions/application/use-cases/get-submission.use-case.ts')
  const repo = {
    findById: async () => ({ studentId: 'student-1', reviewStatus: 'PENDING_REVIEW', totalScore: 10 }),
    findByIdForInstructor: async () => null,
  }
  const useCase = new GetSubmissionUseCase(repo)
  await assert.rejects(
    () => useCase.execute({ id: 'submission', user: { id: 'student-2', role: 'student' } }),
    error => error?.statusCode === 403
  )
})

test('lecturer submission detail lookup is scoped to classes they teach', async () => {
  const load = loader()
  const { GetSubmissionUseCase } = load('modules/submissions/application/use-cases/get-submission.use-case.ts')
  const calls = []
  const repo = {
    findById: async () => { throw new Error('unscoped lookup must not be used') },
    findByIdForInstructor: async (id, instructorId) => {
      calls.push([id, instructorId])
      return { id, studentId: 'student-1', reviewStatus: 'PENDING_REVIEW', totalScore: 8 }
    },
  }
  const result = await new GetSubmissionUseCase(repo).execute({
    id: 'submission',
    user: { id: 'lecturer-1', role: 'lecturer' },
  })
  assert.deepEqual(calls, [['submission', 'lecturer-1']])
  assert.equal(result.totalScore, 8)
})
