import { randomUUID } from 'node:crypto'
import { prisma } from '../../../../../database/prisma.js'
import { globalJobManager } from './SubmissionJobManager.js'
import { failedGradingUpdate } from '../../infrastructure/file-system/grading-failure.js'
import { gradingLease } from './grading-lease.js'
import { memoryCache } from '../../../../../shared/infrastructure/memory-cache.js'

export type QueueLane = 'continuous' | 'batch'

const maxAttempts = 3

export class DurableGradingQueue {
  private timer?: ReturnType<typeof setInterval>
  private polling = false
  private stopped = false
  private running = new Set<Promise<void>>()
  constructor(private readonly db: any = prisma) {}

  async enqueue(id: string, lane: QueueLane = 'continuous') {
    const inserted = await this.db.$transaction(async (tx: any) => {
      const row = await tx.submission.findUnique({ where: { Id: id }, select: { Id: true, ZipFileUrl: true } })
      if (!row?.ZipFileUrl) throw new Error('Bài nộp chưa có ZIP để chấm.')
      const rows = await tx.$queryRaw`
        INSERT INTO "SubmissionGradingTask" ("SubmissionId", "Lane") VALUES (${id}, ${lane})
        ON CONFLICT ("SubmissionId") DO UPDATE SET "Status"='pending', "Lane"=EXCLUDED."Lane",
          "Attempts"=0, "RequestedAt"=NOW(), "AvailableAt"=NOW(), "LeaseOwner"=NULL, "LeaseUntil"=NULL, "LastError"=NULL
        WHERE "SubmissionGradingTask"."Status" IN ('completed', 'failed', 'cancelled') AND ("SubmissionGradingTask"."LeaseUntil" IS NULL OR "SubmissionGradingTask"."LeaseUntil"<NOW())
        RETURNING "SubmissionId", "RequestedAt"`
      if (rows.length) await tx.submission.update({ where: { Id: id }, data: { GradingStatus: 'Processing', ReviewStatus: 'DRAFT' } })
      return rows[0] || null
    })
    if (inserted) {
      globalJobManager.initJob(id, 'Đang chờ trong hàng đợi chấm bài...', { requestVersion: new Date(inserted.RequestedAt).getTime(), attempt: 0 })
      for (const prefix of ['sub_detail_', 'subs_list_', 'subs_recent_', 'student_dash_']) memoryCache.invalidatePrefix(prefix)
    }
    return { submissionId: id, accepted: !!inserted }
  }

  /** Claims across processes are serialized briefly; evaluation runs outside this transaction. */
  async claim(): Promise<{ SubmissionId: string; Attempts: number; LeaseOwner: string; LeaseUntil: Date; RequestedAt: Date } | null> {
    const owner = randomUUID()
    return this.db.$transaction(async (tx: any) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(17392026)`
      const rows = await tx.$queryRaw`
        WITH candidate AS (
          SELECT t."SubmissionId" FROM "SubmissionGradingTask" t
          WHERE (t."Status"='pending' AND t."AvailableAt"<=NOW() OR t."Status"='running' AND t."LeaseUntil"<NOW())
            AND t."Attempts"<${maxAttempts}
            AND (SELECT COUNT(*) FROM "SubmissionGradingTask" a WHERE a."Lane"=t."Lane" AND a."Status" IN ('running','cancelled') AND a."LeaseUntil">NOW()) < CASE WHEN t."Lane"='continuous' THEN 1 ELSE 3 END
          ORDER BY t."RequestedAt" LIMIT 1 FOR UPDATE SKIP LOCKED
        ) UPDATE "SubmissionGradingTask" t SET "Status"='running', "Attempts"=t."Attempts"+1,
          "LeaseOwner"=${owner}, "LeaseUntil"=NOW()+INTERVAL '2 minutes'
        FROM candidate c WHERE t."SubmissionId"=c."SubmissionId" RETURNING t."SubmissionId", t."Attempts", t."LeaseOwner", t."LeaseUntil", t."RequestedAt"`
      return rows[0] || null
    })
  }

  async cancel(id: string) {
    // A running evaluator must retain its lease until it acknowledges cancellation.
    const changed = await this.db.$executeRaw`UPDATE "SubmissionGradingTask" SET "Status"='cancelled' WHERE "SubmissionId"=${id} AND "Status" IN ('pending', 'running')`
    if (changed) {
      globalJobManager.cancelJob(id)
      await this.persistFailure(id, 'Đã hủy lượt chấm theo yêu cầu.', 'cancelled')
    }
    return changed > 0
  }

  start(execute: (id: string) => Promise<void>) {
    if (this.timer) return
    this.stopped = false
    const tick = async () => {
      if (this.polling || this.stopped) return
      this.polling = true
      try {
        // A process may have died on its final attempt. Expose failure instead of hanging forever.
        const exhausted = await this.db.$queryRaw`UPDATE "SubmissionGradingTask" SET "Status"='failed', "LastError"='Worker interrupted after maximum attempts', "LeaseOwner"=NULL, "LeaseUntil"=NULL WHERE "Status"='running' AND "LeaseUntil"<NOW() AND "Attempts">=${maxAttempts} RETURNING "SubmissionId"`
        for (const task of exhausted) await this.persistFailure(task.SubmissionId, 'Lượt chấm bị gián đoạn nhiều lần. Vui lòng chấm lại.')
        const task = await this.claim()
        if (task) {
          const work = this.run(task, execute).catch(error => console.error('[GradingQueue] Worker failed; lease will be recovered:', error instanceof Error ? error.message : error))
          this.running.add(work)
          void work.finally(() => this.running.delete(work))
        }
      } catch (error) { console.error('[GradingQueue] Poll failed; check database migrations:', error instanceof Error ? error.message : 'database unavailable') }
      finally { this.polling = false }
    }
    this.timer = setInterval(() => { void tick() }, 1000)
    this.timer.unref?.()
    void tick()
  }

  private async persistFailure(id: string, message: string, status = 'failed') {
    const existing = await this.db.submission.findUnique({ where: { Id: id } })
    if (existing) {
      let partial: any = {}
      try { partial = JSON.parse(existing.ReportData || '{}') } catch {}
      const activeJob = globalJobManager.getJob(id)
      if (activeJob && ['queued', 'processing'].includes(activeJob.state) && activeJob.logs?.length) partial = { ...partial, error: message, gradingLogs: [...activeJob.logs] }
      const updated = await this.db.submission.updateMany({ where: { Id: id, GradingTask: { is: { Status: status } } }, data: failedGradingUpdate(existing, message, partial) })
      if (updated.count) globalJobManager.failJob(id, message)
    }
  }

  private async run(task: { SubmissionId: string; Attempts: number; LeaseOwner: string; LeaseUntil: Date; RequestedAt: Date }, execute: (id: string) => Promise<void>) {
    const id = task.SubmissionId
    const owner = task.LeaseOwner
    const heartbeat = setInterval(() => {
      void this.db.$executeRaw`UPDATE "SubmissionGradingTask" SET "LeaseUntil"=NOW()+INTERVAL '2 minutes' WHERE "SubmissionId"=${id} AND "LeaseOwner"=${owner} AND "Status"='running'`.then((count: number) => { if (!count) globalJobManager.cancelJob(id) }).catch((error: unknown) => console.error('[GradingQueue] Lease renewal failed', error))
    }, 20000)
    heartbeat.unref?.()
    try {
      await gradingLease.run({ owner, startedAt: new Date(task.LeaseUntil).getTime() - 120000, requestVersion: new Date(task.RequestedAt).getTime(), attempt: task.Attempts }, () => execute(id))
      const job = globalJobManager.getJob(id)
      if (job?.state === 'failed') throw new Error(job.error || 'Grading failed')
      const saved = await this.db.submission.findUnique({ where: { Id: id }, select: { GradingStatus: true } })
      if (saved?.GradingStatus?.toLowerCase() !== 'graded') throw new Error('Grading did not persist a completed report')
      const completed = await this.db.$executeRaw`UPDATE "SubmissionGradingTask" SET "Status"='completed', "LeaseOwner"=NULL, "LeaseUntil"=NULL, "LastError"=NULL WHERE "SubmissionId"=${id} AND "LeaseOwner"=${owner} AND "Status"='running'`
      if (!completed) throw new Error('Cancelled by user or grading lease expired')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Grading failed'
      const state = await this.db.$queryRaw`SELECT "Status" FROM "SubmissionGradingTask" WHERE "SubmissionId"=${id} AND "LeaseOwner"=${owner}`
      const cancelled = state[0]?.Status === 'cancelled' || /cancelled by user/i.test(message)
      const retry = !cancelled && task.Attempts < maxAttempts && /timeout|timed out|503|502|429|unavailable|overload|provider|ECONN|fetch failed/i.test(message)
      const updated = await this.db.$executeRaw`UPDATE "SubmissionGradingTask" SET "Status"=${cancelled ? 'cancelled' : retry ? 'pending' : 'failed'}, "LastError"=${message.slice(0, 2000)}, "AvailableAt"=NOW()+INTERVAL '30 seconds', "LeaseOwner"=NULL, "LeaseUntil"=NULL WHERE "SubmissionId"=${id} AND "LeaseOwner"=${owner}`
      if (updated && retry) {
        await this.db.submission.updateMany({ where: { Id: id, GradingTask: { is: { Status: 'pending' } } }, data: { GradingStatus: 'Processing' } })
        globalJobManager.initJob(id, 'Dịch vụ chấm tạm gián đoạn; hệ thống sẽ tự thử lại trong 30 giây.', { requestVersion: new Date(task.RequestedAt).getTime(), attempt: task.Attempts + 1 })
      }
      else if (updated) await this.persistFailure(id, message, cancelled ? 'cancelled' : 'failed')
    } finally { clearInterval(heartbeat) }
  }

  async stop() {
    this.stopped = true
    if (this.timer) clearInterval(this.timer)
    this.timer = undefined
    await Promise.allSettled([...this.running])
  }
}

export const durableGradingQueue = new DurableGradingQueue()
