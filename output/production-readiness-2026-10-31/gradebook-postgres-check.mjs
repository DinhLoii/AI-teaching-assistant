// Uses only the explicitly created local audit database. Never application data.
import fs from 'node:fs/promises'
import path from 'node:path'
import { randomBytes } from 'node:crypto'
import { spawnSync } from 'node:child_process'
import assert from 'node:assert/strict'
import { PrismaClient } from '../../aita-backend/node_modules/@prisma/client/default.js'

const root = path.resolve('aita-backend')
const source = 'postgresql://postgres:audit_fixture_only@127.0.0.1:55433/aita_audit'
const schema = `audit_gradebook_${randomBytes(8).toString('hex')}`
const url = `${source}?schema=${schema}`
const admin = new PrismaClient({ datasourceUrl: source })
const db = new PrismaClient({ datasourceUrl: url })
process.env.DATABASE_URL = url; process.env.DIRECT_URL = url; process.env.NODE_ENV = 'test'
process.env.JWT_SECRET = 'isolated-audit-fixture-secret-32-characters'
try {
  await admin.$executeRawUnsafe(`CREATE SCHEMA "${schema}"`)
  const baseline = (await fs.readFile(path.join(root, 'prisma/migrations/20261016000000_postgresql_baseline/migration.sql'), 'utf8'))
    .replace('CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA public;', '').replace('"Embedding" public.vector(768)', '"Embedding" TEXT')
  const sql = baseline + '\n' + await fs.readFile(path.join(root, 'prisma/migrations/20261017000000_durable_grading_realtime/migration.sql'), 'utf8')
  const migrate = spawnSync(process.execPath, ['node_modules/prisma/build/index.js', 'db', 'execute', '--schema', 'prisma/schema.prisma', '--stdin'], {
    cwd: root, input: sql, encoding: 'utf8', env: { ...process.env, DATABASE_URL: url, DIRECT_URL: url }, windowsHide: true, timeout: 60000,
  })
  assert.equal(migrate.status, 0, 'Temporary schema migration must succeed')
  const { AdminGradebookService } = await import('../../aita-backend/src/modules/classes/application/admin-gradebook.service.ts')
  const { prisma } = await import('../../aita-backend/src/database/prisma.ts')
  const service = new AdminGradebookService(db)
  const actor = { id: 'audit-admin', role: 'ADMIN' }
  await db.user.createMany({ data: [{ Id: actor.id, FullName: 'Audit Admin' }, { Id: 'audit-student', FullName: 'Fixture Student', StudentCode: 'FIXTURE' }] })
  await db.semester.create({ data: { Id: 'semester', Season: 'Fall', Code: 'AUDIT', IsActive: true } })
  await db.subject.create({ data: { Id: 'subject', SubjectCode: 'AUDIT', SubjectName: 'Fixture' } })
  await db.class.createMany({ data: [{ Id: 'class', ClassCode: 'FIXTURE', SemesterId: 'semester', SubjectId: 'subject' }, { Id: 'other-class', ClassCode: 'OTHER', SemesterId: 'semester', SubjectId: 'subject' }] })
  await db.studentClass.create({ data: { UserId: 'audit-student', ClassId: 'class' } })
  await db.exam.createMany({ data: [{ Id: 'lab', SubjectId: 'subject', Title: 'Lab', TotalPoints: 20, WeightPercentage: 40, IsDeleted: false }, { Id: 'project', SubjectId: 'subject', Title: 'Project', TotalPoints: 100, WeightPercentage: 60, IsDeleted: false }] })
  await db.examClass.createMany({ data: [{ ExamId: 'lab', ClassId: 'class' }, { ExamId: 'project', ClassId: 'class' }, { ExamId: 'lab', ClassId: 'other-class' }, { ExamId: 'project', ClassId: 'other-class' }] })
  await db.submission.createMany({ data: [{ Id: 'submission-a', StudentId: 'audit-student', ClassId: 'class', ExamId: 'lab', GradingStatus: 'Graded', ReviewStatus: 'DRAFT', RawScore: 18, FinalScore: 18, AttemptNumber: 1, IsLatest: true }, { Id: 'submission-b', StudentId: 'audit-student', ClassId: 'class', ExamId: 'project', GradingStatus: 'Graded', ReviewStatus: 'PUBLISHED', RawScore: 80, FinalScore: 80, AttemptNumber: 1, IsLatest: true }] })
  let book = await service.get('class', actor)
  assert.equal(book.rows[0].total, 8.4)
  assert.equal(book.rows[0].publishedTotal, null)
  const lab = book.rows[0].grades.find(g => g.examId === 'lab')
  await service.update('class', { reason: 'Isolated audit fixture', changes: [{ submissionId: lab.submissionId, revision: lab.revision, finalScore: 0, published: true }] }, actor)
  book = await service.get('class', actor)
  assert.equal(book.rows[0].publishedTotal, 4.8)
  assert.equal((await service.history('class', 'submission-a', actor)).length, 1)
  assert.equal(await db.notification.count(), 1)
  await assert.rejects(() => service.update('class', { reason: 'Stale audit fixture', changes: [{ submissionId: lab.submissionId, revision: lab.revision, finalScore: 9 }] }, actor), error => error.statusCode === 409)
  const current = book.rows[0].grades.find(g => g.examId === 'lab')
  await assert.rejects(() => service.update('class', { reason: 'Rollback audit fixture', changes: [
    { submissionId: current.submissionId, revision: current.revision, finalScore: 19 },
    { submissionId: 'submission-b', revision: '0'.repeat(64), finalScore: 90 },
  ] }, actor), error => error.statusCode === 409)
  assert.equal(Number((await db.submission.findUnique({ where: { Id: current.submissionId } })).FinalScore), 0)
  assert.equal(await db.auditLog.count(), 1)
  await service.updateWeights('class', { reason: 'Class specific weights', revision: book.weightsRevision, weights: [{ examId: 'lab', weight: 50 }, { examId: 'project', weight: 50 }] }, actor)
  assert.equal((await service.get('class', actor)).rows[0].total, 4)
  assert.equal((await service.get('other-class', actor)).exams.find(e => e.id === 'lab').weight, 40)
  const result = { status: 'passed', checks: ['real Prisma Decimal revision', 'zero score', 'weighted totals', 'persisted audit and notification', 'stale edit 409', 'bulk rollback', 'class-specific weights'], database: 'local temporary PostgreSQL; pgvector excluded', productionDataChanged: false }
  await fs.writeFile(new URL('./gradebook-postgres-check.json', import.meta.url), JSON.stringify(result, null, 2))
  console.log(JSON.stringify(result, null, 2))
  await prisma.$disconnect()
} finally {
  await db.$disconnect()
  if (/^audit_gradebook_[a-f0-9]{16}$/.test(schema)) await admin.$executeRawUnsafe(`DROP SCHEMA "${schema}" CASCADE`)
  await admin.$disconnect()
}
