'use client'

import * as React from 'react'
import { gradingApi } from '@/lib/api/modules/grading'
import { acceptsProgress } from '@/features/grading/grading-log'

/** Read-only progress for this attempt; never starts grading or renders staff logs. */
export function StudentGradingProgress({ submissionId }: { submissionId: string }) {
  const [snapshot, setSnapshot] = React.useState<{ id: string; job: any; disconnected?: boolean } | null>(null)
  React.useEffect(() => {
    let active = true, current: any = null
    setSnapshot(null)
    const unsubscribe = gradingApi.subscribeToProgress(submissionId, incoming => {
      if (!active || !acceptsProgress(submissionId, current, incoming)) return
      current = incoming
      setSnapshot({ id: submissionId, job: incoming })
    }, () => {}, () => {
      if (active) setSnapshot({ id: submissionId, job: current, disconnected: true })
    })
    return () => { active = false; unsubscribe() }
  }, [submissionId])
  const current = snapshot?.id === submissionId ? snapshot : null
  const job = current?.job
  const state = job?.state
  const message = state === 'completed' ? 'Đã chấm xong. Chờ giảng viên công bố kết quả.'
    : state === 'failed' ? 'Lượt chấm gặp sự cố. Giảng viên cần kiểm tra và chấm lại.'
    : current?.disconnected ? 'Mất kết nối tiến trình. Bạn có thể mở lại để kiểm tra trạng thái.'
    : state === 'processing' ? 'Hệ thống đang chấm lần nộp này.'
    : state === 'queued' ? 'Lần nộp này đang chờ đến lượt chấm.'
    : state === 'pending' ? 'Bài đã được lưu, đang chờ giảng viên bắt đầu chấm.'
    : 'Đang kết nối với tiến trình chấm của lần nộp này…'
  const percent = typeof job?.progressPercent === 'number' && Number.isFinite(job.progressPercent) ? Math.max(0, Math.min(100, job.progressPercent)) : undefined
  return <section aria-label="Tiến trình chấm bài" className="rounded-2xl border border-sky-700/50 bg-sky-950/20 p-4 space-y-2">
    <h3 className="text-sm font-semibold text-sky-200">Tiến trình chấm bài</h3>
    <p role="status" className="text-xs text-slate-200">{message}</p>
    {percent !== undefined && <div role="progressbar" aria-label="Tiến trình chấm bài" aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent} className="h-1.5 rounded-full bg-slate-800 overflow-hidden"><div className="h-full bg-sky-400 transition-all" style={{ width: percent + '%' }} /></div>}
    <p className="text-[11px] text-slate-400 break-all">Mã lần nộp: {submissionId}</p>
  </section>
}
