'use client'

import * as React from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { STUDENT_NAV } from '@/config/navigation'
import { EvaluationReportViewer } from '@/features/submissions/components/EvaluationReportViewer'
import { Modal } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { submissionsApi } from '@/lib/api/modules/submissions'
import { studentPortalApi } from '@/lib/api/modules/student-portal'
import { ArrowLeft, Sparkles, Loader2, Clock, MessageSquare, Send, CheckCircle2, AlertCircle } from 'lucide-react'
import { useLanguage } from '@/providers/language-provider'
import { ErrorNotice } from '@/components/ui/feedback'
import { errorMessage } from '@/lib/api/errors'

export default function StudentResultPage() {
  const { t } = useLanguage()
  const params = useParams()
  const router = useRouter()
  const submissionId = String(params?.id ?? '')

  const [result, setResult] = React.useState<any>(null)
  const [loading, setLoading] = React.useState(true)
  const [loadError, setLoadError] = React.useState<string | null>(null)
  const [revision, setRevision] = React.useState(0)
  const [hintModal, setHintModal] = React.useState<{ open: boolean; title: string; hint: string }>({
    open: false,
    title: '',
    hint: '',
  })
  const [hintLoading, setHintLoading] = React.useState(false)

  // Appeal modal state (G6.6)
  const [appealModal, setAppealModal] = React.useState(false)
  const [appealReason, setAppealReason] = React.useState('')
  const [submittingAppeal, setSubmittingAppeal] = React.useState(false)

  React.useEffect(() => {
    submissionsApi.getSubmissionDetail(submissionId)
      .then(data => { setResult(data); setLoadError(null) })
      .catch(err => setLoadError(errorMessage(err)))
      .finally(() => setLoading(false))
  }, [submissionId, revision])

  const handleGetHint = async (ruleScoreId: string, ruleTitle: string) => {
    setHintLoading(true)
    setHintModal({ open: true, title: ruleTitle, hint: t('student.result.hint_loading', 'Đang kết nối AI Teaching Assistant để phân tích mã nguồn và tạo định hướng sửa lỗi...') })
    try {
      const hintRes = await studentPortalApi.getStudentAiHint(submissionId, ruleScoreId)
      const content = hintRes?.hint || hintRes?.feedback || hintRes?.message || t('student.result.hint_default', 'Hãy kiểm tra lại cấu trúc xử lý ngoại lệ và logic nghiệp vụ.')
      setHintModal({ open: true, title: ruleTitle, hint: content })
    } catch (err: any) {
      setHintModal({
        open: true,
        title: ruleTitle,
        hint: err?.message || t('student.result.hint_error', 'Không thể tạo gợi ý lúc này. Vui lòng thử lại sau.'),
      })
    } finally {
      setHintLoading(false)
    }
  }

  const handleSubmitAppeal = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!result?.id || !appealReason.trim()) return

    setSubmittingAppeal(true)
    try {
      await submissionsApi.submitFeedback(result.id, appealReason.trim())
      alert('Đã gửi yêu cầu phúc khảo/phản hồi đến Giảng viên thành công!')
      setAppealModal(false)
      setResult((prev: any) => ({ ...prev, studentFeedback: appealReason.trim() }))
    } catch (err) {
      alert(err instanceof Error ? err.message : String(err))
    } finally {
      setSubmittingAppeal(false)
    }
  }

  if (loading) {
    return (
      <DashboardLayout
        navItems={STUDENT_NAV}
        title="AITA Student"
        roleLabel={t('profile.role_student', 'Sinh viên')}
        requiredRole="student"
      >
        <div className="p-16 flex flex-col items-center justify-center space-y-4 text-center">
          <div className="w-12 h-12 rounded-2xl bg-orange-500/10 text-orange-500 flex items-center justify-center animate-spin">
            <Loader2 className="w-6 h-6" />
          </div>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
            {t('student.result.loading', 'Đang tải dữ liệu báo cáo đánh giá bài nộp...')}
          </p>
        </div>
      </DashboardLayout>
    )
  }

  const assignmentId = result?.assignmentId || result?.ExamId || result?.examId

  return (
    <DashboardLayout
      navItems={STUDENT_NAV}
      title="AITA Student"
      roleLabel={t('profile.role_student', 'Sinh viên')}
      requiredRole="student"
      headerTitle={t('student.result.header_title', 'Kết quả phân tích & Chấm điểm Rubric AI')}
      headerSubtitle={result?.assignmentTitle || `${t('student.result.submission_code', 'Mã bài nộp:')} ${submissionId.substring(0, 8)}...`}
    >
      <div className="space-y-6 max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <Link
            href={assignmentId ? `/student/assignments/${assignmentId}` : '/student/assignments'}
            className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            {assignmentId ? t('student.result.back_to_assignment', 'Quay lại Chi tiết Bài tập') : 'Quay lại Danh sách Bài tập'}
          </Link>

          {result?.isPublished && (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setAppealModal(true)}
                className="text-xs gap-1.5 text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-800/40 hover:bg-purple-50 dark:hover:bg-purple-950/20"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>{result?.studentFeedback ? 'Xem / Gửi lại phúc khảo' : 'Phúc khảo / Phản hồi điểm'}</span>
              </Button>
            </div>
          )}
        </div>

        {/* If grades are not published yet, show waiting notice and block report view */}
        {loadError ? (
          <ErrorNotice message={loadError} onRetry={() => setRevision(value => value + 1)} />
        ) : !result?.isPublished ? (
          <div className="p-8 md:p-12 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center space-y-4 max-w-2xl mx-auto shadow-sm">
            <div className="w-16 h-16 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center mx-auto">
              <Clock className="w-8 h-8" />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                {t('student.result.not_published_title', 'Điểm số bài tập chưa được công bố')}
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed max-w-md mx-auto">
                {t('student.result.not_published_desc', 'Hệ thống AI đã hoàn tất chấm điểm bài nộp và chuyển kết quả đến Giảng viên. Giảng viên đang xem xét, đánh giá và sẽ công bố kết quả phân tích chi tiết cho bạn sau.')}
              </p>
            </div>
            <div className="pt-2 flex justify-center gap-3">
              {assignmentId && (
                <Link href={`/student/assignments/${assignmentId}`}>
                  <Button variant="primary" size="sm" className="text-xs">
                    {t('student.result.back_assignment_btn', 'Quay lại Chi tiết bài tập')}
                  </Button>
                </Link>
              )}
              <Link href="/student">
                <Button variant="outline" size="sm" className="text-xs">
                  {t('student.result.back_dashboard_btn', 'Về Bàn học tập')}
                </Button>
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Student Feedback & Appeal Status Banner */}
            {result?.studentFeedback && (
              <Card className="p-4 rounded-2xl border-purple-200 dark:border-purple-800/40 bg-purple-50/50 dark:bg-purple-950/20">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0 mt-0.5">
                    <MessageSquare className="w-4 h-4" />
                  </div>
                  <div className="space-y-1.5 flex-1 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-purple-900 dark:text-purple-200">Đơn phúc khảo / Phản hồi của bạn:</span>
                      <Badge variant="outline" className="text-[10px] text-purple-600 border-purple-300">
                        {result.feedbackResponse || result.appealStatus === 'resolved' ? 'Đã giải quyết' : 'Đang chờ giảng viên xem'}
                      </Badge>
                    </div>
                    <p className="text-slate-700 dark:text-slate-300 italic bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-purple-100 dark:border-purple-900/30">
                      &ldquo;{result.studentFeedback}&rdquo;
                    </p>

                    {result.feedbackResponse && (
                      <div className="pt-2 border-t border-purple-100 dark:border-purple-900/30 mt-2">
                        <span className="font-semibold text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5 mb-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Phản hồi từ Giảng viên:
                        </span>
                        <p className="text-slate-800 dark:text-slate-200 bg-emerald-50 dark:bg-emerald-950/20 p-2.5 rounded-xl border border-emerald-200 dark:border-emerald-800/30">
                          {result.feedbackResponse}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            )}

            {/* The Rich Evaluation Report Viewer */}
            <EvaluationReportViewer
              submission={result}
              onResubmit={assignmentId ? () => router.push(`/student/assignments/${assignmentId}`) : undefined}
              onGetHint={handleGetHint}
            />
          </div>
        )}

        {/* AI Hint Modal */}
        <Modal
          isOpen={hintModal.open}
          onClose={() => setHintModal({ open: false, title: '', hint: '' })}
          title={t('student.result.hint_modal_title', 'Gợi ý cải thiện code: {{title}}').replace('{{title}}', hintModal.title)}
          description={t('student.result.hint_modal_desc', 'Phân tích định hướng từ AI Teaching Assistant giúp bạn sửa lỗi và nâng cao điểm số')}
        >
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-orange-50/80 dark:bg-orange-500/10 border border-orange-200 dark:border-orange-500/20 text-slate-800 dark:text-slate-200 text-sm leading-relaxed whitespace-pre-wrap">
              {hintLoading ? (
                <div className="flex items-center gap-3 py-4 text-orange-600 dark:text-orange-400 font-medium">
                  <Sparkles className="w-5 h-5 animate-spin" />
                  <span>{t('student.result.hint_analyzing', 'AI đang phân tích mã nguồn và soạn gợi ý sửa lỗi...')}</span>
                </div>
              ) : (
                hintModal.hint
              )}
            </div>
            <div className="flex justify-end">
              <Button
                variant="primary"
                size="sm"
                onClick={() => setHintModal({ open: false, title: '', hint: '' })}
              >
                {t('ui.got_it', 'Đã hiểu')}
              </Button>
            </div>
          </div>
        </Modal>

        {/* Student Appeal / Feedback Modal (G6.6) */}
        <Modal
          isOpen={appealModal}
          onClose={() => setAppealModal(false)}
          title="Gửi đơn phúc khảo / Phản hồi điểm"
          description={`Mã bài nộp: ${result?.id?.substring(0, 8)}... • Điểm hiện tại: ${result?.score ?? 0}/10`}
        >
          <form onSubmit={handleSubmitAppeal} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Nội dung yêu cầu phúc khảo & Giải trình lý do
              </label>
              <textarea
                rows={4}
                required
                placeholder="Trình bày rõ tiêu chí nào bạn thấy chấm chưa chính xác, giải thích cấu trúc code hoặc cung cấp bằng chứng để giảng viên xem xét..."
                value={appealReason}
                onChange={(e) => setAppealReason(e.target.value)}
                className="w-full text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-3 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-orange-500"
              />
            </div>

            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
              Lưu ý: Đơn phúc khảo sẽ được gửi trực tiếp đến hộp thư của Giảng viên phụ trách môn học. Giảng viên sẽ xem lại báo cáo chi tiết và có thể điều chỉnh điểm nếu hợp lệ.
            </p>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="ghost"
                size="sm"
                type="button"
                onClick={() => setAppealModal(false)}
              >
                Hủy bỏ
              </Button>
              <Button
                variant="primary"
                size="sm"
                type="submit"
                isLoading={submittingAppeal}
                className="bg-orange-500 hover:bg-orange-600 text-white"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Gửi đơn phúc khảo</span>
              </Button>
            </div>
          </form>
        </Modal>
      </div>
    </DashboardLayout>
  )
}
