'use client'

import * as React from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { ADMIN_NAV } from '@/config/navigation'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Modal } from '@/components/ui/modal'
import { EvaluationReportViewer } from '@/features/submissions/components/EvaluationReportViewer'
import { assignmentsApi } from '@/lib/api/modules/assignments'
import { submissionsApi } from '@/lib/api/modules/submissions'
import { formatDate } from '@/lib/utils'
import {
  ArrowLeft,
  Users,
  Download,
  CheckCircle2,
  Clock,
  Play,
  Share2,
  Edit,
  Award,
  Search,
  RefreshCw,
  Sparkles,
  RotateCcw,
  Eye,
  Check,
  X,
  FileSearch,
} from 'lucide-react'
import { useLanguage } from '@/providers/language-provider'

export default function AdminSubmissionsPage() {
  const { t } = useLanguage()
  const params = useParams()
  const assignmentId = String(params?.id ?? '')

  const [assignment, setAssignment] = React.useState<any>(null)
  const [submissions, setSubmissions] = React.useState<any[]>([])
  const [loading, setLoading] = React.useState(true)
  const [search, setSearch] = React.useState('')


  // Review Rubric Modal State
  const [reviewModal, setReviewModal] = React.useState<{
    open: boolean
    sub: any | null
  }>({
    open: false,
    sub: null,
  })

  const loadData = React.useCallback(async () => {
    try {
      const [assign, subs] = await Promise.all([
        assignmentsApi.getAssignment(assignmentId).catch(() => null),
        submissionsApi.getSubmissions({ assignmentId }).catch(() => []),
      ])
      setAssignment(assign)
      setSubmissions(subs || [])
    } catch (err) {
      console.error('Failed to load submissions:', err)
    } finally {
      setLoading(false)
    }
  }, [assignmentId])

  React.useEffect(() => {
    loadData()
  }, [loadData])

  React.useEffect(() => {
    // If any submission is queued or grading, poll every 3 seconds
    const hasPending = submissions.some(sub => {
      const status = String(sub.gradingStatus || sub.status || '').toLowerCase()
      return status === 'queued' || status === 'grading' || status === 'in_progress' || status === 'pending'
    })
    
    if (hasPending) {
      const interval = setInterval(() => {
        submissionsApi.getSubmissions({ assignmentId })
          .then(subs => setSubmissions(subs || []))
          .catch(console.error)
      }, 3000)
      return () => clearInterval(interval)
    }
  }, [submissions, assignmentId])


  const filtered = submissions.filter((s) => {
    const studentText = typeof s.student === 'object' ? (s.student?.fullName || s.student?.name || '') : String(s.student || '')
    const idText = typeof s.studentId === 'object' ? (s.studentId?.studentCode || '') : String(s.studentId || '')
    const text = `${studentText} ${idText} ${s.filename || ''}`.toLowerCase()
    return text.includes(search.toLowerCase())
  })

  return (
    <DashboardLayout
      navItems={ADMIN_NAV}
      title="AITA Admin"
      roleLabel={t('profile.role_admin', 'Quản trị viên')}
      requiredRole="admin"
      headerTitle={t('lecturer.submissions.header_title', 'Danh sách bài nộp & Chấm điểm')}
      headerSubtitle={assignment?.title || 'Assignment Submissions'}
    >
      <div className="space-y-6">
        <Link
          href="/admin/exams"
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          {t('admin.exams.back_to_dashboard', 'Quay lại danh sách đề thi')}
        </Link>

        {/* Header Actions */}
        <div className="rounded-3xl p-6 bg-gradient-to-r from-orange-50 via-amber-50/60 to-blue-50/70 dark:bg-gradient-to-r dark:from-orange-950/40 dark:via-slate-900/90 dark:to-blue-950/30 border border-orange-200/80 dark:border-orange-500/20 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xs dark:shadow-xl transition-colors">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Badge variant="orange">{assignment?.subjectCode || 'Môn học'}</Badge>
              <span className="text-xs text-slate-600 dark:text-slate-400">{t('lecturer.submissions.total_count', 'Tổng số:')} {submissions.length} {t('lecturer.submissions.submissions_label', 'bài nộp')}</span>
            </div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">{assignment?.title}</h2>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={loadData}
              className="text-xs gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              {t('ui.refresh', 'Làm mới')}
            </Button>

          </div>
        </div>

        {/* Stats Section */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-center">
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium mb-1">Tổng số bài nộp</span>
            <div className="flex items-end gap-2">
              <span className="text-2xl font-bold text-slate-900 dark:text-white">{submissions.length}</span>
              <Users className="w-4 h-4 text-slate-400 mb-1.5" />
            </div>
          </Card>
          <Card className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-center">
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium mb-1">Đã có điểm (AI)</span>
            <div className="flex items-end gap-2">
              <span className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                {submissions.filter(s => s.score !== null || s.gradingStatus?.toLowerCase() === 'graded').length}
              </span>
              <CheckCircle2 className="w-4 h-4 text-emerald-500 mb-1.5" />
            </div>
          </Card>
          <Card className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-center">
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium mb-1">Điểm trung bình (AI)</span>
            <div className="flex items-end gap-2">
              <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {submissions.filter(s => s.score !== null || s.gradingStatus?.toLowerCase() === 'graded').length > 0 
                  ? (submissions.reduce((acc, sub) => acc + (sub.score ?? sub.finalScore ?? sub.totalScore ?? sub.aiScore ?? 0), 0) / submissions.filter(s => s.score !== null || s.gradingStatus?.toLowerCase() === 'graded').length).toFixed(1)
                  : '--'}
              </span>
              <Award className="w-4 h-4 text-blue-500 mb-1.5" />
            </div>
          </Card>
          <Card className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-center">
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium mb-1">Chưa chấm / Đang chấm</span>
            <div className="flex items-end gap-2">
              <span className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                {submissions.filter(s => s.score === null && s.gradingStatus?.toLowerCase() !== 'graded').length}
              </span>
              <Clock className="w-4 h-4 text-amber-500 mb-1.5" />
            </div>
          </Card>
        </div>

        {/* Search Bar */}
        <div className="flex items-center justify-between gap-4">
          <div className="w-full max-w-sm">
            <Input
              type="text"
              placeholder={t('lecturer.submissions.search_placeholder', 'Tìm kiếm theo tên sinh viên, MSSV, file...')}
              icon={<Search className="w-4 h-4" />}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {/* Submissions Table */}
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-200/80 dark:border-slate-800/80 bg-slate-50/80 dark:bg-slate-950/60 text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                  <th className="p-4 pl-6">{t('lecturer.submissions.col_student', 'Sinh viên & MSSV')}</th>
                  <th className="p-4">{t('lecturer.submissions.col_submitted_at', 'Thời gian nộp')}</th>
                  <th className="p-4">{t('lecturer.submissions.col_status', 'Trạng thái chấm & Công bố')}</th>
                  <th className="p-4">{t('lecturer.submissions.col_score', 'Điểm Rubric AI')}</th>
                  <th className="p-4">{t('lecturer.submissions.col_file', 'File bài làm')}</th>
                  <th className="p-4 pr-6 text-right">{t('lecturer.submissions.col_action', 'Thao tác')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-400 text-xs">
                      {t('lecturer.submissions.loading', 'Đang tải danh sách bài nộp...')}
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-400 text-xs">
                      {t('lecturer.submissions.no_submissions', 'Không tìm thấy bài nộp nào phù hợp.')}
                    </td>
                  </tr>
                ) : (
                  filtered.map((sub: any) => {
                    const statusStr = String(sub.gradingStatus || sub.status || '').toLowerCase()
                    const isGraded = statusStr === 'graded' || sub.score !== null
                    const displayScore = sub.score ?? sub.finalScore ?? sub.totalScore ?? sub.aiScore ?? null
                    const isPublished = sub.isPublished === true

                    return (
                      <tr key={sub.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/30 transition-colors">
                        <td className="p-4 pl-6">
                          <div className="font-bold text-slate-900 dark:text-white">
                            {typeof sub.student === 'object' ? (sub.student?.fullName || sub.student?.name || 'Sinh viên') : (sub.student || 'Sinh viên')}
                          </div>
                          <div className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                            {typeof sub.studentId === 'object' ? (sub.studentId?.studentCode || 'HE170001') : (sub.studentId || 'HE170001')}
                          </div>
                        </td>
                        <td className="p-4 text-xs text-slate-500 dark:text-slate-400">
                          {formatDate(sub.submittedAt)}
                        </td>
                        <td className="p-4">
                          <div className="flex flex-col gap-1.5 items-start">
                            <Badge
                              variant={
                                isGraded
                                  ? 'success'
                                  : sub.gradingStatus === 'Grading' || sub.gradingStatus === 'Queued'
                                  ? 'warning'
                                  : 'default'
                              }
                              className="text-[11px]"
                            >
                              {sub.gradingStatus || sub.status || 'Pending'}
                            </Badge>

                            {/* Publication Status Badge */}
                            {isPublished ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                                <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                                {t('lecturer.submissions.status_published', 'Đã công bố điểm')}
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                                <Clock className="w-3 h-3 text-amber-500" />
                                {t('lecturer.submissions.status_unpublished', 'Chưa công bố')}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="p-4">
                          {displayScore !== null && displayScore !== undefined ? (
                            <span className="font-extrabold text-base text-emerald-600 dark:text-emerald-400 font-mono">
                              {Number(displayScore).toFixed(1)}
                              <span className="text-xs text-slate-400 font-normal"> / 10</span>
                            </span>
                          ) : (
                            <span className="text-xs text-slate-400">—</span>
                          )}
                        </td>
                        <td className="p-4 text-xs">
                          {sub.downloadUrl || sub.zipFileUrl ? (
                            <a
                              href={sub.downloadUrl || sub.zipFileUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="text-orange-600 dark:text-orange-400 hover:underline flex items-center gap-1 font-mono"
                            >
                              <Download className="w-3.5 h-3.5" />
                              <span className="truncate max-w-[140px]">{sub.filename || 'source.zip'}</span>
                            </a>
                          ) : (
                            <span className="text-slate-400">{t('lecturer.submissions.no_link', 'Chưa có link')}</span>
                          )}
                        </td>
                        <td className="p-4 pr-6 text-right">
                          <div className="flex items-center justify-end gap-2 flex-wrap">
                            {/* Review Report Button */}
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setReviewModal({ open: true, sub })}
                              className="text-xs py-1 px-2.5 gap-1 border-slate-200 dark:border-slate-800"
                              title="Xem chi tiết phân tích AI & Rubric"
                            >
                              <FileSearch className="w-3 h-3 text-blue-500" />
                              <span>{t('lecturer.submissions.btn_detail', 'Chi tiết')}</span>
                            </Button>
                          </div>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </Card>


        {/* Review Rubric Modal for Lecturer */}
        {reviewModal.open && reviewModal.sub && (
          <Modal
            isOpen={reviewModal.open}
            onClose={() => setReviewModal({ open: false, sub: null })}
            maxWidth="6xl"
            title={
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-orange-500/10 text-orange-600 dark:text-orange-400 flex items-center justify-center shrink-0">
                  <Award className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-slate-900 dark:text-white">
                      {t('lecturer.submissions.modal_review_title', 'Báo cáo đánh giá chi tiết:')} {typeof reviewModal.sub?.student === 'object' ? (reviewModal.sub?.student?.fullName || reviewModal.sub?.student?.name) : reviewModal.sub?.student}
                    </span>
                    <span className="font-mono text-xs px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-medium">
                      {typeof reviewModal.sub?.studentId === 'object' ? (reviewModal.sub?.studentId?.studentCode || '') : reviewModal.sub?.studentId}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-normal">
                    {t('lecturer.submissions.modal_review_desc', 'Xem trước kết quả phân tích Barem Rubric AI trước khi công bố điểm cho sinh viên')}
                  </p>
                </div>
              </div>
            }
          >
            <div className="space-y-6">
              <EvaluationReportViewer submission={reviewModal.sub} />

              {/* Bottom Action Footer */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-5 border-t border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-2.5">
                  <span className="text-xs text-slate-500 dark:text-slate-400">{t('lecturer.submissions.modal_review_status', 'Trạng thái:')}</span>
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                    reviewModal.sub?.isPublished
                      ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                      : 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30'
                  }`}>
                    <span className={`w-2 h-2 rounded-full ${reviewModal.sub?.isPublished ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'}`} />
                    {reviewModal.sub?.isPublished ? t('lecturer.submissions.modal_review_status_published', 'Đã công bố cho sinh viên') : t('lecturer.submissions.modal_review_status_draft', 'Chưa công bố (Đang ở chế độ nháp)')}
                  </span>
                </div>

                <div className="flex items-center gap-2.5">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setReviewModal({ open: false, sub: null })}
                    className="text-xs"
                  >
                    {t('ui.close', 'Đóng')}
                  </Button>
                </div>
              </div>
            </div>
          </Modal>
        )}
      </div>
    </DashboardLayout>
  )
}
