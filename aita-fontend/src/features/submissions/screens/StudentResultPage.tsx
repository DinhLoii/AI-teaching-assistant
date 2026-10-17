'use client'

import * as React from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { STUDENT_NAV } from '@/config/navigation'
import { Button } from '@/components/ui/button'
import { Modal } from '@/components/ui/modal'
import { submissionsApi } from '@/lib/api/modules/submissions'
import { studentPortalApi } from '@/lib/api/modules/student-portal'
import { EvaluationReportViewer } from '../components/EvaluationReportViewer'

export default function StudentResultPage() {
  const params = useParams(), router = useRouter()
  const id = String(params?.id || '')
  const [state, setState] = React.useState<{ id: string; result: any; error?: string }>({ id: '', result: null })
  const [revision, reload] = React.useReducer(n => n + 1, 0)
  const [appeal, setAppeal] = React.useState(false)
  const [reason, setReason] = React.useState('')
  const [saving, setSaving] = React.useState(false)
  const [appealError, setAppealError] = React.useState('')
  const [hint, setHint] = React.useState<{ title: string; text: string; loading?: boolean } | null>(null)
  React.useEffect(() => {
    let active = true
    setState({ id, result: null })
    submissionsApi.getSubmissionDetail(id).then(result => { if (active) setState({ id, result }) }).catch(error => { if (active) setState({ id, result: null, error: error.message || 'Không tải được bài nộp.' }) })
    return () => { active = false }
  }, [id, revision])
  const result = state.id === id ? state.result : null
  const getHint = async (ruleId: string, title: string) => {
    setHint({ title: title || 'Gợi ý theo tiêu chí', text: '', loading: true })
    try {
      const data = await studentPortalApi.getStudentAiHint(id, ruleId)
      setHint({ title: title || 'Gợi ý theo tiêu chí', text: data?.hint || data?.feedback || 'Chưa có gợi ý cho tiêu chí này.' })
    } catch (error) { setHint({ title: 'Chưa tải được gợi ý', text: error instanceof Error ? error.message : 'Vui lòng thử lại.' }) }
  }
  const submitAppeal = async () => {
    if (!reason.trim()) return
    setSaving(true); setAppealError('')
    try {
      await submissionsApi.submitFeedback(id, reason.trim())
      setAppeal(false); reload()
    } catch (error) { setAppealError(error instanceof Error ? error.message : 'Không gửi được phúc khảo. Vui lòng thử lại.') }
    finally { setSaving(false) }
  }
  return <DashboardLayout navItems={STUDENT_NAV} title="AITA Student" roleLabel="Sinh viên" requiredRole="student" headerTitle="Kết quả bài nộp">
    <div className="space-y-5 pb-8">
      <Link href="/student/results" className="text-sm text-slate-500">← Quay lại kết quả</Link>
      {state.error && <div role="alert" className="p-5 rounded-xl border border-red-200 text-red-600">{state.error} <button onClick={reload} className="underline">Thử lại</button></div>}
      {!result && !state.error && <p role="status" className="p-10 text-center">Đang tải bài nộp...</p>}
      {result && <>
        {!result.isPublished && <p className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">Giảng viên chưa công bố điểm. Bạn có thể xem tệp và lịch sử nộp bài; kết quả chấm sẽ hiển thị sau khi công bố.</p>}
        <EvaluationReportViewer submission={result} onGetHint={result.isPublished ? getHint : undefined} onOpenAppeal={result.isPublished ? () => { setReason(result.studentFeedback || ''); setAppeal(true) } : undefined} onResubmit={result.assignmentId ? () => router.push(`/student/assignments/${result.assignmentId}`) : undefined} />
      </>}
      <Modal isOpen={!!hint} onClose={() => setHint(null)} title={hint?.title}><p className="whitespace-pre-wrap text-sm">{hint?.loading ? 'Đang lấy gợi ý từ bài nộp và tiêu chí...' : hint?.text}</p></Modal>
      <Modal isOpen={appeal} onClose={() => { if (!saving) setAppeal(false) }} title="Phúc khảo điểm"><div className="space-y-4"><textarea aria-label="Lý do phúc khảo" className="w-full min-h-32 rounded-xl border p-3 bg-transparent" value={reason} onChange={event => setReason(event.target.value)} />{appealError && <p role="alert" className="text-red-600 text-sm">{appealError}</p>}<Button disabled={!reason.trim() || saving} isLoading={saving} onClick={() => void submitAppeal()}>Gửi phúc khảo</Button></div></Modal>
    </div>
  </DashboardLayout>
}
