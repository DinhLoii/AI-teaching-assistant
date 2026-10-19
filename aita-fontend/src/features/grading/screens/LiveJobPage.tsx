'use client'

import * as React from 'react'
import { useParams, useRouter } from 'next/navigation'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { LECTURER_NAV } from '@/config/navigation'
import { gradingApi } from '@/lib/api/modules/grading'
import { GradingLogViewer } from '../components/LiveGradingRunnerModal'

export default function LiveJobPage() {
  const params = useParams()
  const router = useRouter()
  const submissionId = String(params?.id ?? '')
  const [session, setSession] = React.useState(0)
  const [busy, setBusy] = React.useState(false)
  const [error, setError] = React.useState('')
  const [finished, setFinished] = React.useState(false)
  const regrade = async () => {
    setBusy(true); setError('')
    try {
      await gradingApi.gradeExistingSubmission(submissionId)
      setFinished(false); setSession(value => value + 1)
    } catch (err) { setError(err instanceof Error ? err.message : 'Không thể bắt đầu chấm lại.') }
    finally { setBusy(false) }
  }
  const cancel = async () => {
    if (!window.confirm('Hủy lượt chấm bài nộp này?')) return
    setBusy(true); setError('')
    try { await gradingApi.cancelSubmission(submissionId); setSession(value => value + 1) }
    catch (err) { setError(err instanceof Error ? err.message : 'Không hủy được lượt chấm.') }
    finally { setBusy(false) }
  }
  return <DashboardLayout navItems={LECTURER_NAV} roleLabel="Lecturer" requiredRole="lecturer" title="Nhật ký chấm bài">
    <div className="space-y-5">
      <div className="flex flex-wrap gap-3 items-center">
        <button onClick={() => router.back()} className="px-3 py-2 rounded-lg border cursor-pointer">Quay lại</button>
        <h1 className="text-xl font-bold flex-1">Nhật ký chấm bài</h1>
        <button disabled={busy} onClick={regrade} className="px-3 py-2 rounded-lg border disabled:opacity-50 cursor-pointer">{busy ? 'Đang xử lý...' : 'Chấm lại'}</button>
        {!finished && <button disabled={busy} onClick={cancel} className="px-3 py-2 rounded-lg border text-rose-600 disabled:opacity-50 cursor-pointer">Hủy lượt chấm</button>}
        {finished && <button onClick={() => router.push('/lecturer/grading/result/' + submissionId)} className="px-3 py-2 rounded-lg border cursor-pointer">Xem báo cáo</button>}
      </div>
      {error && <p role="alert" className="text-rose-600">{error}</p>}
      <div className="relative overflow-hidden rounded-3xl border border-slate-700 bg-slate-900 text-slate-100 flex flex-col">
        <GradingLogViewer key={submissionId + ':' + session} submissionId={submissionId} role="lecturer" onFinished={() => setFinished(true)} />
      </div>
    </div>
  </DashboardLayout>
}
