'use client'

import * as React from 'react'
import Link from 'next/link'
import { submissionsApi } from '@/lib/api/modules/submissions'
import { useAuth } from '@/providers/auth-provider'

export function SubmissionHistory({ submissionId }: { submissionId: string }) {
  const { role } = useAuth()
  const [state, setState] = React.useState<{ id: string; rows: any[]; error: string | null; loading: boolean }>({ id: '', rows: [], error: null, loading: true })
  const [revision, retry] = React.useReducer(n => n + 1, 0)
  React.useEffect(() => {
    const controller = new AbortController()
    setState({ id: submissionId, rows: [], error: null, loading: true })
    submissionsApi.getAttempts(submissionId, controller.signal).then(rows => {
      if (!controller.signal.aborted) setState({ id: submissionId, rows, error: null, loading: false })
    }).catch(error => { if (!controller.signal.aborted) setState({ id: submissionId, rows: [], error: error.message || 'Không tải được lịch sử.', loading: false }) })
    return () => controller.abort()
  }, [submissionId, revision])
  if (state.id !== submissionId || state.loading) return <p role="status">Đang tải lịch sử nộp bài...</p>
  if (state.error) return <div role="alert">{state.error} <button onClick={retry} className="text-orange-600 underline">Thử lại</button></div>
  return <div className="space-y-3">
    <p className="text-xs text-slate-500">Mỗi lần nộp lưu tệp, thời gian và kết quả riêng. Các lần nộp trước đây đã bị ghi đè không thể tự khôi phục từ dữ liệu hiện có.</p>
    {!state.rows.length && <p>Chưa có lịch sử nộp bài.</p>}
    {state.rows.map(row => <div key={row.id} className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 space-y-2 text-sm">
      <div className="flex flex-wrap justify-between gap-2"><strong>Lần nộp #{row.attemptNumber ?? '—'}{row.id === submissionId ? ' · Đang xem' : ''}</strong><span>{row.score == null ? (row.isPublished ? 'Chưa có điểm' : 'Chưa công bố điểm') : `${Number(row.score)}${row.maxScore ? ` / ${Number(row.maxScore)}` : ''} điểm`}</span></div>
      <p className="text-xs text-slate-500">{row.submittedAt ? new Date(row.submittedAt).toLocaleString('vi-VN') : 'Chưa rõ thời gian'} · {row.filename || 'Chưa có tên tệp'} · {row.gradingStatus || 'Chưa có trạng thái'}</p>
      {row.id !== submissionId && <Link className="text-orange-600 text-xs font-semibold" href={role === 'student' ? `/student/results/${row.id}` : `/lecturer/grading/result/${row.id}`}>Xem lần nộp này →</Link>}
    </div>)}
  </div>
}
