'use client'

import * as React from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { LECTURER_NAV } from '@/config/navigation'
import { EvaluationReportViewer } from '@/features/submissions/components/EvaluationReportViewer'
import { Modal } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { submissionsApi } from '@/lib/api/modules/submissions'
import { gradingApi } from '@/lib/api/modules/grading'
import { formatDate } from '@/lib/utils'
import { errorMessage } from '@/lib/api/errors'
import {
  ArrowLeft,
  Share2,
  RotateCcw,
  Download,
  RefreshCw,
  Edit,
  Award,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Sparkles,
  MessageSquare,
  ShieldAlert,
} from 'lucide-react'
import { useLanguage } from '@/providers/language-provider'

export default function GradingResultPage() {
  const { t } = useLanguage()
  const params = useParams()
  const router = useRouter()
  const submissionId = String(params?.id ?? '')

  const [submission, setSubmission] = React.useState<any>(null)
  const [loading, setLoading] = React.useState(true)
  const [actionLoading, setActionLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  // Edit score modal
  const [editModal, setEditModal] = React.useState({
    open: false,
    score: 0,
    feedback: '',
    isPublished: false,
  })

  // Appeal resolution modal
  const [appealModal, setAppealModal] = React.useState({
    open: false,
    decision: 'ACCEPT' as 'ACCEPT' | 'REJECT',
    adjustedScore: 0,
    resolutionNote: '',
  })

  const loadData = React.useCallback(async () => {
    try {
      setLoading(true)
      const data = await submissionsApi.getSubmission(submissionId)
      setSubmission(data)
      setEditModal({
        open: false,
        score: Number(data.score ?? data.finalScore ?? data.rawScore ?? 0),
        feedback: data.instructorFeedback || (data as any).feedback || '',
        isPublished: !!data.isPublished,
      })
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setLoading(false)
    }
  }, [submissionId])

  React.useEffect(() => {
    loadData()
  }, [loadData])

  // Single publish / unpublish
  const handleTogglePublish = async () => {
    if (!submission) return
    const willPublish = !submission.isPublished
    setActionLoading(true)
    try {
      if (willPublish) {
        await gradingApi.publishSubmission(submission.id)
      } else {
        await gradingApi.unpublishSubmission(submission.id)
      }
      await loadData()
    } catch (err) {
      alert(errorMessage(err))
    } finally {
      setActionLoading(false)
    }
  }

  // Trigger re-grade
  const handleRegrade = async () => {
    if (!submission) return
    if (!confirm('Bạn có chắc chắn muốn chạy lại phiên chấm Rubric AI cho bài nộp này không?')) return
    setActionLoading(true)
    try {
      await gradingApi.gradeExistingSubmission(submission.id)
      router.push(`/lecturer/grading/live/${submission.id}?assignmentId=${submission.assignmentId || ''}`)
    } catch (err) {
      alert(errorMessage(err))
      setActionLoading(false)
    }
  }

  // Download submission file
  const handleDownload = async () => {
    if (!submission) return
    try {
      const studentName = typeof submission.student === 'object'
        ? (submission.student?.fullName || submission.student?.name)
        : submission.student
      await gradingApi.downloadSubmission(submission.id, studentName || 'submission')
    } catch (err) {
      alert(errorMessage(err))
    }
  }

  // Save score changes
  const handleSaveScore = async () => {
    if (!submission) return
    setActionLoading(true)
    try {
      await submissionsApi.gradeSubmission(submission.id, {
        score: editModal.score,
        feedback: editModal.feedback,
        isPublished: editModal.isPublished,
      })
      setEditModal(prev => ({ ...prev, open: false }))
      await loadData()
    } catch (err) {
      alert(errorMessage(err))
    } finally {
      setActionLoading(false)
    }
  }

  // Handle in-place rule score updates from report viewer
  const handleUpdateRuleScores = async (updatedRuleScores: any[], newTotalScore: number) => {
    if (!submission) return
    setActionLoading(true)
    try {
      const formattedRuleScores = updatedRuleScores.map((r: any) => ({
        ruleId: r.ruleId || r.id,
        earnedScore: r.earnedScore !== undefined ? r.earnedScore : r.score,
        score: r.earnedScore !== undefined ? r.earnedScore : r.score,
        lecturerNote: r.lecturerNote,
        feedback: r.feedback || r.lecturerNote,
        passed: r.passed,
      }))
      const passedRules = updatedRuleScores.filter((r: any) => r.passed)
      const failedRules = updatedRuleScores.filter((r: any) => !r.passed)

      await gradingApi.updateSubmissionResult(submission.id, {
        score: newTotalScore,
        ruleScores: formattedRuleScores,
        rules: passedRules,
        failedRules: failedRules,
      })
      await loadData()
    } catch (err) {
      alert(errorMessage(err))
    } finally {
      setActionLoading(false)
    }
  }

  // Resolve student appeal
  const handleResolveAppeal = async () => {
    if (!submission) return
    setActionLoading(true)
    try {
      await submissionsApi.gradeSubmission(submission.id, {
        score: appealModal.decision === 'ACCEPT' ? appealModal.adjustedScore : Number(submission.score ?? 0),
        feedback: `${submission.instructorFeedback || ''}\n[Phản hồi phúc khảo]: ${appealModal.resolutionNote}`.trim(),
        isPublished: true,
      })
      setAppealModal(prev => ({ ...prev, open: false }))
      await loadData()
    } catch (err) {
      alert(errorMessage(err))
    } finally {
      setActionLoading(false)
    }
  }

  const studentName = typeof submission?.student === 'object'
    ? (submission?.student?.fullName || submission?.student?.name)
    : (submission?.student || 'Sinh viên')

  const studentCode = typeof submission?.studentId === 'object'
    ? (submission?.studentId?.studentCode || 'HE170000')
    : (submission?.studentId || 'HE170000')

  const rawScore = Number(submission?.rawScore ?? submission?.rawAiScore ?? submission?.score ?? 0)
  const latePenalty = Number(submission?.latePenaltyAmount ?? 0)
  const finalScore = Number(submission?.finalScore ?? submission?.score ?? Math.max(0, rawScore - latePenalty))

  return (
    <DashboardLayout
      navItems={LECTURER_NAV}
      roleLabel={t('profile.role_lecturer', 'Giảng viên')}
      requiredRole="lecturer"
      title={t('lecturer.grading.result_title', 'Chi tiết bài chấm & Báo cáo Rubric')}
    >
      <div className="space-y-6 max-w-7xl mx-auto">
        {/* Navigation & Action Bar */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.back()}
              className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-slate-600 dark:text-slate-400" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  {submission?.assignment || 'Bài tập'}
                </span>
                <span className="text-slate-300 dark:text-slate-700">•</span>
                <span className="text-xs font-mono text-slate-500">ID: {submissionId.slice(0, 8)}</span>
              </div>
              <h1 className="text-xl font-bold text-slate-900 dark:text-white">
                {studentName} ({studentCode})
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownload}
              className="text-xs gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Tải file bài làm</span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handleRegrade}
              disabled={actionLoading}
              className="text-xs gap-1.5 border-orange-200 text-orange-600 hover:bg-orange-50 dark:border-orange-500/30 dark:text-orange-400"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Chấm lại (AI)</span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setEditModal({
                open: true,
                score: finalScore,
                feedback: submission?.instructorFeedback || '',
                isPublished: !!submission?.isPublished,
              })}
              className="text-xs gap-1.5"
            >
              <Edit className="w-3.5 h-3.5 text-orange-500" />
              <span>Sửa điểm</span>
            </Button>

            {submission?.isPublished ? (
              <Button
                variant="outline"
                size="sm"
                onClick={handleTogglePublish}
                disabled={actionLoading}
                className="text-xs gap-1.5 text-rose-500 border-rose-200 hover:bg-rose-50 dark:border-rose-900/40"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Thu hồi công bố</span>
              </Button>
            ) : (
              <Button
                variant="primary"
                size="sm"
                onClick={handleTogglePublish}
                disabled={actionLoading}
                className="text-xs gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>Công bố điểm</span>
              </Button>
            )}
          </div>
        </div>

        {/* Score Breakdown Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-1">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
              Điểm AI / Barem
            </span>
            <div className="text-2xl font-black text-slate-900 dark:text-white font-mono">
              {rawScore.toFixed(2)}
              <span className="text-xs text-slate-400 font-normal"> / 10</span>
            </div>
            <span className="text-[11px] text-slate-400">Điểm thô tự động tính từ Rubric</span>
          </div>

          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-1">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
              Trừ trễ hạn / Vi phạm
            </span>
            <div className="text-2xl font-black text-rose-600 dark:text-rose-400 font-mono">
              {latePenalty > 0 ? `-${latePenalty.toFixed(2)}` : '0.00'}
            </div>
            <span className="text-[11px] text-slate-400">
              {latePenalty > 0 ? 'Áp dụng theo chính sách nộp muộn' : 'Không vi phạm thời gian nộp'}
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-gradient-to-br from-orange-500/10 via-amber-500/10 to-emerald-500/10 border border-orange-500/30 rounded-2xl shadow-xs space-y-1">
            <span className="text-xs font-bold text-orange-600 dark:text-orange-400 uppercase tracking-wider block">
              Điểm chính thức
            </span>
            <div className="text-3xl font-black text-emerald-600 dark:text-emerald-400 font-mono">
              {finalScore.toFixed(2)}
              <span className="text-xs text-slate-400 font-normal"> / 10</span>
            </div>
            <span className="text-[11px] text-slate-500 dark:text-slate-400">Điểm sau cùng hiển thị cho sinh viên</span>
          </div>

          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-1">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
              Trạng thái công bố
            </span>
            <div className="pt-1">
              <Badge variant={submission?.isPublished ? 'success' : 'warning'}>
                {submission?.isPublished ? 'Đã công bố điểm' : 'Bản nháp (Chưa công bố)'}
              </Badge>
            </div>
            <span className="text-[11px] text-slate-400 block pt-1">
              Nộp lúc: {submission?.submittedAt ? formatDate(submission.submittedAt) : 'Chưa rõ'}
            </span>
          </div>
        </div>

        {/* Student Appeal Notification Card if exists */}
        {submission?.studentFeedback && (
          <div className="p-5 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-amber-500" />
                <span className="text-xs font-bold text-amber-700 dark:text-amber-300 uppercase tracking-wider">
                  Sinh viên đã gửi phản hồi / Phúc khảo điểm bài thi
                </span>
              </div>
              <p className="text-sm text-slate-700 dark:text-slate-200 italic">
                &ldquo;{submission.studentFeedback}&rdquo;
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setAppealModal({
                open: true,
                decision: 'ACCEPT',
                adjustedScore: finalScore,
                resolutionNote: '',
              })}
              className="text-xs font-semibold shrink-0 border-amber-300 dark:border-amber-600 text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-950/40"
            >
              Giải quyết phúc khảo
            </Button>
          </div>
        )}

        {/* Detailed Report Viewer */}
        {loading ? (
          <div className="p-12 text-center text-slate-400 text-sm">
            Đang tải dữ liệu bài làm và phân tích Rubric...
          </div>
        ) : (
          <EvaluationReportViewer
            submission={submission}
            isLecturer={true}
            onUpdateRuleScore={handleUpdateRuleScores}
          />
        )}

        {/* Edit Score Modal */}
        <Modal
          isOpen={editModal.open}
          onClose={() => setEditModal(prev => ({ ...prev, open: false }))}
          title="Điều chỉnh điểm & Nhận xét"
          description={`Sinh viên: ${studentName} (${studentCode})`}
        >
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Điểm số (Thang điểm 10)</label>
              <Input
                type="number"
                step="0.1"
                min="0"
                max="10"
                value={editModal.score}
                onChange={(e) => setEditModal({ ...editModal, score: parseFloat(e.target.value) || 0 })}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Nhận xét của giảng viên</label>
              <textarea
                rows={4}
                placeholder="Nhập nhận xét trực tiếp cho sinh viên..."
                value={editModal.feedback}
                onChange={(e) => setEditModal({ ...editModal, feedback: e.target.value })}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 py-2 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-orange-500"
              />
            </div>

            <div className="p-3 rounded-xl bg-orange-50/60 dark:bg-orange-500/10 border border-orange-200 dark:border-orange-500/20">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={editModal.isPublished}
                  onChange={(e) => setEditModal({ ...editModal, isPublished: e.target.checked })}
                  className="w-4 h-4 rounded text-orange-500 focus:ring-orange-500 cursor-pointer"
                />
                <span className="text-xs font-bold text-slate-900 dark:text-white">
                  Công bố điểm ngay cho sinh viên này
                </span>
              </label>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setEditModal(prev => ({ ...prev, open: false }))}
              >
                Hủy bỏ
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleSaveScore}
                isLoading={actionLoading}
              >
                Lưu điểm
              </Button>
            </div>
          </div>
        </Modal>

        {/* Appeal Resolution Modal */}
        <Modal
          isOpen={appealModal.open}
          onClose={() => setAppealModal(prev => ({ ...prev, open: false }))}
          title="Xử lý đơn phúc khảo của sinh viên"
          description={`Sinh viên: ${studentName} - Lý do: "${submission?.studentFeedback || ''}"`}
        >
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Quyết định</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setAppealModal(prev => ({ ...prev, decision: 'ACCEPT' }))}
                  className={`p-3 rounded-xl border text-xs font-bold text-center transition-all ${
                    appealModal.decision === 'ACCEPT'
                      ? 'border-emerald-500 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                      : 'border-slate-200 dark:border-slate-800 text-slate-600'
                  }`}
                >
                  ✓ Chấp nhận phúc khảo (Điều chỉnh điểm)
                </button>
                <button
                  type="button"
                  onClick={() => setAppealModal(prev => ({ ...prev, decision: 'REJECT' }))}
                  className={`p-3 rounded-xl border text-xs font-bold text-center transition-all ${
                    appealModal.decision === 'REJECT'
                      ? 'border-rose-500 bg-rose-500/10 text-rose-600 dark:text-rose-400'
                      : 'border-slate-200 dark:border-slate-800 text-slate-600'
                  }`}
                >
                  ✗ Giữ nguyên điểm cũ
                </button>
              </div>
            </div>

            {appealModal.decision === 'ACCEPT' && (
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Điểm mới sau phúc khảo</label>
                <Input
                  type="number"
                  step="0.1"
                  min="0"
                  max="10"
                  value={appealModal.adjustedScore}
                  onChange={(e) => setAppealModal({ ...appealModal, adjustedScore: parseFloat(e.target.value) || 0 })}
                />
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Giải thích / Ghi chú phản hồi cho sinh viên</label>
              <textarea
                rows={3}
                placeholder="Nhập lý do chấp nhận hoặc giải thích vì sao giữ nguyên điểm..."
                value={appealModal.resolutionNote}
                onChange={(e) => setAppealModal({ ...appealModal, resolutionNote: e.target.value })}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 py-2 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-orange-500"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setAppealModal(prev => ({ ...prev, open: false }))}
              >
                Hủy bỏ
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleResolveAppeal}
                isLoading={actionLoading}
              >
                Xác nhận giải quyết
              </Button>
            </div>
          </div>
        </Modal>
      </div>
    </DashboardLayout>
  )
}
