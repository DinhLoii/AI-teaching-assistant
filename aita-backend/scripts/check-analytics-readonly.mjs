import 'dotenv/config'
import assert from 'node:assert/strict'
import { PrismaClient } from '@prisma/client'
import { PrismaReportsRepository } from '../dist/modules/reports/infrastructure/repositories/prisma-reports-repository.js'
import { reportRange } from '../dist/modules/reports/application/report-range.js'

const prisma = new PrismaClient()
try {
  await prisma.$transaction(async tx => {
    await tx.$executeRaw`SET TRANSACTION READ ONLY`
    const { start, end } = reportRange('30d')
    const report = await new PrismaReportsRepository(tx).getAnalytics(start, end)
    assert.equal(report.trend.length, 30)
    assert.equal(report.roles.reduce((sum, row) => sum + row.count, 0), report.summary.users)
    assert.equal(report.trend.reduce((sum, row) => sum + row.submissions, 0), report.summary.submissions)
    assert.equal(report.trend.reduce((sum, row) => sum + row.evaluated, 0), report.summary.evaluated)
    assert.equal(report.grades.bins.reduce((sum, n) => sum + n, 0), report.grades.count)
    assert.equal(await tx.user.count(), report.summary.users)
    assert.equal(await tx.class.count(), report.summary.classes)
    assert.equal(await tx.exam.count({ where: { IsDeleted: { not: true } } }) + await tx.exam.count({ where: { IsDeleted: null } }), report.summary.exams)
    assert.ok(report.grades.average === null || (report.grades.average >= 0 && report.grades.average <= 10))
    console.log('PASS: read-only database snapshot; global counts, role totals, 30 calendar days, daily sums and grade histogram agree.')
  }, { isolationLevel: 'RepeatableRead', timeout: 30_000 })
} catch (error) {
  console.error('Analytics check failed:', error.code || error.name, error.meta?.message || (error.name === 'AssertionError' ? error.message : 'Database query could not be validated.'))
  process.exitCode = 1
} finally { await prisma.$disconnect() }
