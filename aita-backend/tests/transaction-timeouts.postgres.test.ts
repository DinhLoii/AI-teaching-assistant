import 'dotenv/config'
import test, { after } from 'node:test'
import assert from 'node:assert/strict'
import { prisma } from '../src/database/prisma.js'
import { ReopenSubmissionUseCase } from '../src/modules/submissions/application/use-cases/reopen-submission.use-case.js'

// Opt-in real database regression. Only reads and transaction-local temporary
// tables are used; no application records or real notifications are changed.
const enabled = process.env.TEST_DATABASE_LATENCY === 'true'
after(async () => { await prisma.$disconnect() })

test('shared Prisma defaults allow a query after more than five seconds', { skip: !enabled, timeout: 60000 }, async () => {
  const result = await prisma.$transaction(async tx => {
    await tx.$queryRaw`SELECT 1 AS ok FROM pg_sleep(6)`
    return tx.$queryRaw<Array<{ ok: number }>>`SELECT 1 AS ok`
  })
  assert.equal(result[0].ok, 1)
})

test('slow extension updates only the latest attempt in the requested exam/student/class', { skip: !enabled, timeout: 60000 }, async () => {
  const notices: any[] = []
  const db: any = {
    exam: { findFirst: async () => ({ Id: 'mobile' }), findUnique: async () => ({ Id: 'mobile', Title: 'Mobile', ExamClass: [{ ClassId: 'class' }] }) },
    user: { findUnique: async () => ({ Id: 'student' }) },
    studentClass: { findFirst: async () => ({ ClassId: 'class' }) },
    $transaction: (work: any, options: any) => prisma.$transaction(async tx => {
      // pg_temp shadows the application table only on this transaction's connection.
      await tx.$executeRaw`CREATE TEMP TABLE "Submission" (
        "Id" TEXT PRIMARY KEY, "ExamId" TEXT, "StudentId" TEXT, "ClassId" TEXT,
        "AttemptNumber" INTEGER, "SubmittedAt" TIMESTAMPTZ,
        "IsReopened" BOOLEAN DEFAULT false, "ReopenReason" TEXT
      ) ON COMMIT DROP`
      await tx.$executeRaw`INSERT INTO pg_temp."Submission" ("Id", "ExamId", "StudentId", "ClassId", "AttemptNumber") VALUES
        ('old', 'mobile', 'student', 'class', 1), ('latest', 'mobile', 'student', 'class', 2),
        ('other-exam', 'java', 'student', 'class', 3), ('other-student', 'mobile', 'someone', 'class', 3),
        ('other-class', 'mobile', 'student', 'other', 3)`
      await tx.$queryRaw`SELECT 1 AS ok FROM pg_sleep(6)`
      const result = await work({
        $executeRaw: tx.$executeRaw.bind(tx),
        submissionOverride: { upsert: async (query: any) => ({ Id: 'override', ...query.create }) },
        notification: { create: async (query: any) => { notices.push(query.data); return { Id: 'notice', ...query.data } } },
        notificationRecipient: { create: async () => ({}) },
      })
      const updated = await tx.$queryRaw<Array<{ Id: string }>>`SELECT "Id" FROM pg_temp."Submission" WHERE "IsReopened"=true`
      assert.deepEqual(updated, [{ Id: 'latest' }])
      return result
    }, options),
  }
  const result = await new ReopenSubmissionUseCase(db).execute({
    dto: { data: { examId: 'mobile', studentId: 'student', extendedDueDate: new Date(Date.now() + 86400000).toISOString(), penaltyMode: 'WAIVE' } } as any,
    user: { id: 'teacher', role: 'LECTURER' } as any,
  })
  assert.equal(result.success, true)
  assert.equal(notices[0].Type, 'ASSIGNMENT_REOPENED')
})
