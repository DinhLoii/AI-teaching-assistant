import test from 'node:test'
import assert from 'node:assert/strict'
import { AdminGradebookService } from '../src/modules/classes/application/admin-gradebook.service.js'
import { effectiveGrade, gradeRevision, weightedGrade, weightsRevision } from '../src/modules/classes/application/gradebook-policy.js'
import { publishedStudentScore } from '../src/modules/student-portal/application/dashboard-result-view.js'
import { PublishGradeUseCase } from '../src/modules/submissions/application/use-cases/publish-grade.use-case.js'
import { memoryCache } from '../src/shared/infrastructure/memory-cache.js'

const admin: any = { id: 'admin', role: 'ADMIN' }
const exam = { Id: 'e1', SubjectId: 'subject', Title: 'Lab 1', TotalPoints: 20, WeightPercentage: 100, IsDeleted: false, ExamType: 'LAB', DueDate: null }
function submission(id = 's1', overrides: any = {}) {
  return { Id: id, StudentId: 'student', ClassId: 'class', ExamId: 'e1', FinalScore: 16, TotalScore: 18, RawScore: 18,
    LatePenaltyAmount: 2, GradingStatus: 'Graded', ReviewStatus: 'DRAFT', ReviewedAt: null, ReviewedBy: null,
    InstructorFeedback: 'Original', IsLatest: true, AttemptNumber: 1, SubmittedAt: new Date('2026-10-01'), ...overrides }
}
const cls: any = {
  Id: 'class', ClassCode: 'SE19', SubjectId: 'subject', SemesterId: 'fall',
  Subject: { SubjectCode: 'PRF192', SubjectName: 'Programming' }, Semester: { Id: 'fall', Season: 'Fall', Code: '2026' },
  InstructorClass: [{ User: { FullName: 'Teacher' } }],
  StudentClass: [{ UserId: 'student', User: { Id: 'student', FullName: 'Nguyễn A', StudentCode: 'SE01', Email: 'a@example.invalid' } },
    { UserId: 'missing', User: { Id: 'missing', FullName: 'Nguyễn B', StudentCode: 'SE02', Email: null } }],
  ExamClass: [{ ExamId: 'e1', ClassId: 'class', DueDate: null, Exam: exam }],
}
function fixture(records = [submission()]) {
  let state = { records: structuredClone(records), logs: [] as any[], notices: [] as any[], config: null as string | null }
  const queries: any[] = []
  let newer = false, assigned = true, enrolled = true, wrongSubject = false
  const db: any = {
    class: { findUnique: async () => structuredClone(cls) },
    systemConfig: { findUnique: async () => state.config ? { Value: state.config } : null },
    submission: { findMany: async (query: any) => { queries.push(query); return state.records }, findFirst: async () => ({ Id: 's1' }) },
    auditLog: { findMany: async () => state.logs.map((l, i) => ({ Id: `log${i}`, ...l, User: { FullName: 'Admin' } })) },
    semester: { findMany: async () => [] },
    $transaction: async (work: any) => {
      const stage = structuredClone(state)
      const tx: any = {
        $queryRaw: async (parts: TemplateStringsArray) => { assert.match(parts.join(''), /FOR UPDATE/); return [] },
        submission: {
          findFirst: async ({ where }: any) => {
            if (where.OR) return newer ? { Id: 'new' } : null
            const record = stage.records.find(r => r.Id === where.Id && r.ClassId === where.ClassId)
            if (!record) return null
            return { ...record, Exam: { ...exam, SubjectId: wrongSubject ? 'other' : 'subject' }, Class: { ...cls, StudentClass: enrolled ? cls.StudentClass : [] } }
          },
          update: async ({ where, data }: any) => { const record = stage.records.find(r => r.Id === where.Id)!; Object.assign(record, data); return record },
        },
        examClass: { findUnique: async () => assigned ? {} : null },
        auditLog: { create: async ({ data }: any) => { stage.logs.push(data); return data } },
        notification: { create: async ({ data }: any) => { stage.notices.push(data); return { Id: 'notification', ...data } } },
        class: db.class,
        systemConfig: {
          findUnique: async () => stage.config ? { Value: stage.config } : null,
          upsert: async ({ create }: any) => { stage.config = create.Value },
        },
      }
      const result = await work(tx)
      state = stage
      return result
    },
  }
  return { service: new AdminGradebookService(db), get state() { return state }, queries,
    set newer(value: boolean) { newer = value }, set assigned(value: boolean) { assigned = value },
    set enrolled(value: boolean) { enrolled = value }, set wrongSubject(value: boolean) { wrongSubject = value } }
}
const payload = (sub = submission(), extra: any = {}) => ({ reason: 'Rà soát điểm theo barem', changes: [{ submissionId: sub.Id, revision: gradeRevision(sub), finalScore: 15, ...extra }] })

test('weighted totals use each exam scale, preserve zero and require complete weights and scores', () => {
  const exams = [{ id: 'a', maxScore: 20, weight: 40 }, { id: 'b', maxScore: 100, weight: 60 }]
  assert.equal(weightedGrade(exams, [{ examId: 'a', score: 10 }, { examId: 'b', score: 80 }]), 6.8)
  assert.equal(weightedGrade(exams, [{ examId: 'a', score: 0 }, { examId: 'b', score: 0 }]), 0)
  assert.equal(weightedGrade(exams, [{ examId: 'a', score: 10 }]), null)
  assert.equal(weightedGrade([{ id: 'a', maxScore: 20, weight: 50 }], [{ examId: 'a', score: 10 }]), null)
  assert.equal(weightedGrade([{ id: 'a', maxScore: 0, weight: 100 }], [{ examId: 'a', score: 0 }]), null)
  assert.equal(weightedGrade([{ id: 'a', maxScore: 20, weight: 100 }], [{ examId: 'a', score: 21 }]), null)
  assert.equal(weightedGrade([{ id: 'a', maxScore: 20, weight: 100 }, { id: 'b', maxScore: 10, weight: 0 }], [{ examId: 'a', score: 10 }]), 5)
})

test('grade revision ignores unrelated fields and detects score, publication and feedback changes', () => {
  const sub = submission()
  assert.equal(gradeRevision(sub), gradeRevision({ ...sub, Exam: exam } as any))
  for (const edit of [{ FinalScore: 0 }, { ReviewStatus: 'PUBLISHED' }, { InstructorFeedback: 'new' }, { IsLatest: false }, { GradingStatus: 'Processing' }]) assert.notEqual(gradeRevision(sub), gradeRevision({ ...sub, ...edit }))
})

test('only completed published grades are visible to students, including zero', () => {
  for (const ReviewStatus of ['DRAFT', 'PendingReview', null]) assert.equal(publishedStudentScore(submission('s1', { ReviewStatus })), null)
  assert.equal(publishedStudentScore(submission('s1', { ReviewStatus: 'PUBLISHED', FinalScore: 0 })), 0)
  assert.equal(publishedStudentScore(submission('s1', { ReviewStatus: 'PUBLISHED', GradingStatus: 'Processing' })), null)
  assert.equal(effectiveGrade(submission('s1', { GradingStatus: 'Error', FinalScore: 20 })), null)
})

test('non-admin cannot read catalog, detail, history or mutate gradebook settings', async () => {
  const { service } = fixture()
  for (const role of ['STUDENT', 'LECTURER', 'unknown']) {
    const user: any = { id: 'other', role }
    for (const work of [() => service.catalog(user), () => service.get('class', user), () => service.history('class', 's1', user), () => service.update('class', payload(), user), () => service.updateWeights('class', {}, user)]) await assert.rejects(work, (e: any) => e.statusCode === 403)
  }
})

test('legacy publish API also rejects students before touching grades', async () => {
  const useCase = new PublishGradeUseCase({ findById: () => { throw new Error('must not query') } } as any)
  await assert.rejects(() => useCase.execute({ id: 's1', dto: { data: {} } as any, user: { id: 'student', role: 'STUDENT' } as any }), (e: any) => e.statusCode === 403)
})

test('gradebook selects latest attempt per student and exam, includes missing enrollments, scopes query', async () => {
  const f = fixture([submission('older', { AttemptNumber: 1, IsLatest: null, FinalScore: 1 }), submission('new', { AttemptNumber: 2, FinalScore: 0 }), submission('not-latest', { AttemptNumber: 3, IsLatest: false, FinalScore: 20 })])
  const result = await f.service.get('class', admin)
  assert.equal(result.rows[0].grades[0].submissionId, 'new')
  assert.equal(result.rows[0].grades[0].score, 0)
  assert.equal(result.rows[0].total, 0)
  assert.equal(result.rows[0].publishedTotal, null)
  assert.equal(result.rows[1].grades[0].status, 'NOT_SUBMITTED')
  assert.equal(result.rows[1].total, null)
  assert.deepEqual(f.queries[0].where, { ClassId: 'class', ExamId: { in: ['e1'] }, StudentId: { in: ['student', 'missing'] } })
})

test('manual score preserves AI score and penalty, audits before/after and invalidates student cache', async () => {
  const f = fixture()
  memoryCache.set('student_dash_student', { stale: true })
  assert.deepEqual(await f.service.update('class', payload(), admin), { updated: 1 })
  assert.equal(f.state.records[0].FinalScore, 15)
  assert.equal(f.state.records[0].RawScore, 18)
  assert.equal(f.state.records[0].LatePenaltyAmount, 2)
  assert.equal(f.state.records[0].ReviewedBy, 'admin')
  assert.equal(f.state.logs.length, 1)
  assert.equal(JSON.parse(f.state.logs[0].OldValue).score, 16)
  assert.equal(JSON.parse(f.state.logs[0].NewValue).reason, 'Rà soát điểm theo barem')
  assert.equal(memoryCache.get('student_dash_student'), null)
  assert.equal(f.state.notices.length, 0)
  const history = await f.service.history('class', 's1', admin)
  assert.equal(history[0].after.score, 15)
})

test('publishing and retracting are atomic with audit and persisted notifications', async () => {
  const f = fixture()
  await f.service.update('class', payload(submission(), { published: true, finalScore: 0 }), admin)
  assert.equal(f.state.records[0].ReviewStatus, 'PUBLISHED')
  assert.equal(f.state.records[0].FinalScore, 0)
  assert.equal(f.state.notices[0].NotificationRecipient.create.UserId, 'student')
  const current = f.state.records[0]
  await f.service.update('class', { reason: 'Tạm thu hồi để rà soát', changes: [{ submissionId: current.Id, revision: gradeRevision(current), published: false }] }, admin)
  assert.equal(f.state.records[0].ReviewStatus, 'DRAFT')
  assert.equal(f.state.records[0].FinalScore, 0)
  assert.equal(f.state.notices.length, 2)
})

test('stale revision, older attempt, foreign class and invalid scoring contexts reject without writes', async () => {
  const cases: [string, (f: ReturnType<typeof fixture>) => void, any, number][] = [
    ['stale', () => {}, { ...payload(), changes: [{ ...payload().changes[0], revision: 'a'.repeat(64) }] }, 409],
    ['new attempt', f => { f.newer = true }, payload(), 409],
    ['other class', () => {}, payload(), 404],
    ['removed student', f => { f.enrolled = false }, payload(), 400],
    ['unassigned exam', f => { f.assigned = false }, payload(), 400],
    ['wrong subject', f => { f.wrongSubject = true }, payload(), 400],
  ]
  for (const [name, setup, body, code] of cases) {
    const f = fixture(); setup(f)
    await assert.rejects(() => f.service.update(name === 'other class' ? 'foreign' : 'class', body, admin), (e: any) => e.statusCode === code, name)
    assert.equal(f.state.logs.length, 0)
    assert.equal(f.state.records[0].FinalScore, 16)
  }
})

test('rejects negative, above-scale, non-number, over-precision scores, duplicate IDs and pending submissions', async () => {
  for (const value of [-1, 21, '10', null, NaN, Infinity, 10.001]) {
    const f = fixture()
    await assert.rejects(() => f.service.update('class', payload(submission(), { finalScore: value }), admin), (e: any) => e.statusCode === 400)
  }
  const f = fixture()
  const body = payload(); body.changes.push(body.changes[0])
  await assert.rejects(() => f.service.update('class', body, admin), (e: any) => e.statusCode === 400)
  const sub = submission('s1', { GradingStatus: 'Processing' })
  await assert.rejects(() => fixture([sub]).service.update('class', payload(sub), admin), (e: any) => e.statusCode === 400)
})

test('a conflict in bulk operation rolls back every grade, audit and notification', async () => {
  const first = submission('s1'), second = submission('s2')
  const f = fixture([first, second])
  await assert.rejects(() => f.service.update('class', { reason: 'Công bố theo danh sách', changes: [
    { submissionId: 's1', revision: gradeRevision(first), published: true },
    { submissionId: 's2', revision: 'a'.repeat(64), published: true },
  ] }, admin), (e: any) => e.statusCode === 409)
  assert.equal(f.state.records[0].ReviewStatus, 'DRAFT')
  assert.equal(f.state.logs.length, 0)
  assert.equal(f.state.notices.length, 0)
})

test('course weight settings validate full membership, total and revision; record audit without changing shared exams', async () => {
  const f = fixture()
  await f.service.updateWeights('class', { reason: 'Thiết lập trọng số môn', revision: weightsRevision(null), weights: [{ examId: 'e1', weight: 100 }] }, admin)
  assert.equal(f.state.config, '{"e1":100}')
  assert.equal(f.state.logs[0].Action, 'ADMIN_GRADEBOOK_WEIGHTS')
  assert.equal((await f.service.get('class', admin)).weightsSource, 'class')
  await assert.rejects(() => f.service.updateWeights('class', { reason: 'Thiết lập trọng số môn', revision: weightsRevision(null), weights: [{ examId: 'e1', weight: 100 }] }, admin), (e: any) => e.statusCode === 409)
  for (const weights of [[{ examId: 'e1', weight: 90 }], [{ examId: 'foreign', weight: 100 }], [{ examId: 'e1', weight: 50 }, { examId: 'e1', weight: 50 }]]) {
    await assert.rejects(() => fixture().service.updateWeights('class', { reason: 'Thiết lập trọng số môn', revision: weightsRevision(null), weights }, admin), (e: any) => [400, 409].includes(e.statusCode))
  }
})
