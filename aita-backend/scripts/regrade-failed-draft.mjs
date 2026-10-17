import dotenv from 'dotenv'
dotenv.config({ quiet: true })
// Suppress provider/library logs; emit only the job state and persisted grading summary.
for (const method of ['log', 'info', 'warn', 'error', 'debug']) console[method] = () => {}
const emit = value => process.stdout.write(JSON.stringify(value) + '\n')
const id = process.argv[2]
if (!id || !/^[0-9a-f-]{36}$/i.test(id)) throw new Error('An explicit submission UUID is required')
const { prisma } = await import('../src/database/prisma.ts')
let timer
try {
  const existing = await prisma.submission.findUnique({ where: { Id: id }, select: { Id: true, ReviewStatus: true, ReportData: true, ZipFileUrl: true } })
  let previous = {}; try { previous = JSON.parse(existing?.ReportData || '{}') } catch {}
  if (!existing || existing.ReviewStatus === 'PUBLISHED' || !previous.error || !existing.ZipFileUrl) throw new Error('Only an existing failed, unpublished ZIP submission can be retried')
  const { createSubmissionRoutes } = await import('../src/modules/grading/engine/modules/submissions/routes/index.ts')
  createSubmissionRoutes()
  const routes = await import('../src/modules/grading/engine/modules/submissions/routes/index.ts')
  const { globalJobManager } = await import('../src/modules/grading/engine/application/queue/SubmissionJobManager.ts')
  timer = setInterval(() => {
    const job = globalJobManager.getJob(id)
    emit({ state: job?.state, progress: job?.progressPercent, task: job?.currentTask })
  }, 15000)
  emit({ action: 'retry_failed_draft', id })
  await routes.engineSubmissionController.enqueueContinuousGrading(id)
  const result = await prisma.submission.findUnique({ where: { Id: id }, select: { GradingStatus: true, ReviewStatus: true, RawScore: true, FinalScore: true, ReportData: true } })
  let report = {}; try { report = JSON.parse(result.ReportData || '{}') } catch {}
  const { AiClientManager } = await import('../src/modules/grading/engine/infrastructure/ai/AiClientManager.ts')
  emit({ status: result.GradingStatus, review: result.ReviewStatus, raw: result.RawScore, final: result.FinalScore, criteria: (report.passedRules?.length || 0) + (report.failedRules?.length || 0), reviewNotes: report.manualReviewNotes, error: report.error, ...(report.error ? { diagnostic: AiClientManager.lastFailureDiagnostic } : {}) })
} catch (error) { emit({ error: error.message }); process.exitCode = 1 }
finally { clearInterval(timer); await prisma.$disconnect(); process.exit(process.exitCode || 0) }
