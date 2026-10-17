import dotenv from 'dotenv'
dotenv.config({ quiet: true })
const { prisma } = await import('../src/database/prisma.ts')
try {
  const rows = await prisma.submission.findMany({ ...(process.argv[2] ? { where: { Id: process.argv[2] } } : {}), orderBy: { SubmittedAt: 'desc' }, take: 5, select: { Id: true, ExamId: true, GradingStatus: true, RawScore: true, FinalScore: true, SubmittedAt: true, ReviewStatus: true, ReportData: true, Exam: { select: { Title: true, IsDeleted: true } } } })
  for (const row of rows) {
    let report = {}; try { report = JSON.parse(row.ReportData || '{}') } catch {}
    const { SubmissionResponseDto } = await import('../src/modules/submissions/application/dtos/submission.dto.ts')
    const staff = SubmissionResponseDto.from(row, 'LECTURER')
    console.log(JSON.stringify({ id: row.Id, examId: row.ExamId, title: row.Exam?.Title, deleted: row.Exam?.IsDeleted, submitted: row.SubmittedAt, status: row.GradingStatus, review: row.ReviewStatus, raw: row.RawScore, final: row.FinalScore, staffScore: staff.score, error: report.error, previousRetryError: report.lastGradingError, criteria: (report.passedRules?.length || 0) + (report.failedRules?.length || 0), criteriaTotal: [...(report.passedRules || []), ...(report.failedRules || [])].reduce((sum, rule) => sum + Number(rule.earnedScore || 0), 0) }))
  }
} finally { await prisma.$disconnect() }
