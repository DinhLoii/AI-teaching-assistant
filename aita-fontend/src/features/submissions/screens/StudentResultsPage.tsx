'use client'

import * as React from 'react'
import Link from 'next/link'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { STUDENT_NAV } from '@/config/navigation'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { submissionsApi } from '@/lib/api/modules/submissions'
import { formatDate } from '@/lib/utils'
import {
  GraduationCap,
  Award,
  ArrowRight,
  FileCheck,
  Search,
  Clock,
  CheckCircle2,
  AlertCircle,
  MessageSquare,
  FileText,
  RotateCcw,
} from 'lucide-react'
import { useLanguage } from '@/providers/language-provider'

export default function StudentResultsPage() {
  const { t } = useLanguage()
  const [submissions, setSubmissions] = React.useState<any[]>([])
  const [loading, setLoading] = React.useState(true)
  const [searchQuery, setSearchQuery] = React.useState('')
  const [filterTab, setFilterTab] = React.useState<'all' | 'published' | 'pending_publish' | 'grading'>('all')

  React.useEffect(() => {
    submissionsApi.getSubmissions()
      .then((subs) => setSubmissions(subs || []))
      .catch(() => setSubmissions([]))
      .finally(() => setLoading(false))
  }, [])

  const filteredSubmissions = React.useMemo(() => {
    return submissions.filter((sub) => {
      const isGraded = sub.gradingStatus === 'Graded' || sub.status === 'graded' || sub.status === 'COMPLETED'
      const isPublished = Boolean(sub.isPublished)

      if (filterTab === 'published' && (!isGraded || !isPublished)) return false
      if (filterTab === 'pending_publish' && (!isGraded || isPublished)) return false
      if (filterTab === 'grading' && isGraded) return false

      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase()
        const title = (sub.assignment || sub.assignmentTitle || '').toLowerCase()
        const id = (sub.id || '').toLowerCase()
        const filename = (sub.filename || '').toLowerCase()
        if (!title.includes(query) && !id.includes(query) && !filename.includes(query)) {
          return false
        }
      }

      return true
    })
  }, [submissions, filterTab, searchQuery])

  const publishedCount = submissions.filter(s => (s.gradingStatus === 'Graded' || s.status === 'graded' || s.status === 'COMPLETED') && s.isPublished).length
  const pendingPublishCount = submissions.filter(s => (s.gradingStatus === 'Graded' || s.status === 'graded' || s.status === 'COMPLETED') && !s.isPublished).length
  const gradingCount = submissions.filter(s => !(s.gradingStatus === 'Graded' || s.status === 'graded' || s.status === 'COMPLETED')).length

  return (
    <DashboardLayout
      navItems={STUDENT_NAV}
      title="AITA Student"
      roleLabel={t('profile.role_student', 'Sinh viên')}
      requiredRole="student"
      headerTitle={t('student.subjects.header_title', 'Kết quả & Lịch sử nộp bài')}
      headerSubtitle={t('student.subjects.header_subtitle', 'Bảng tổng hợp điểm số chính thức và nhận xét chi tiết từ Rubric AI')}
    >
      <div className="space-y-6 max-w-7xl mx-auto">
        {/* Top Header Actions & Search */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-500/10 text-orange-500 flex items-center justify-center">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
                {t('student.subjects.list_title', 'Lịch sử bài nộp')} ({submissions.length})
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Theo dõi trạng thái chấm, báo cáo rubric và phúc khảo điểm
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <Link href="/student/assignments">
              <Button variant="outline" size="sm" className="text-xs gap-1.5 shrink-0">
                <FileCheck className="w-4 h-4 text-orange-500" />
                <span>Danh sách Bài tập & Deadline</span>
              </Button>
            </Link>
          </div>
        </div>

        {/* Filter Bar & Search Input */}
        <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setFilterTab('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                filterTab === 'all'
                  ? 'bg-orange-500 text-white shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              Tất cả ({submissions.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterTab('published')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                filterTab === 'published'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              Đã công bố ({publishedCount})
            </button>
            <button
              type="button"
              onClick={() => setFilterTab('pending_publish')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                filterTab === 'pending_publish'
                  ? 'bg-amber-500 text-white shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              Chờ giảng viên duyệt ({pendingPublishCount})
            </button>
            <button
              type="button"
              onClick={() => setFilterTab('grading')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                filterTab === 'grading'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              Đang chấm ({gradingCount})
            </button>
          </div>

          <div className="relative min-w-[260px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <Input
              type="text"
              placeholder="Tìm theo tên bài tập, file..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 text-xs h-9 bg-slate-50 dark:bg-slate-800/50"
            />
          </div>
        </div>

        {/* Submissions List */}
        {loading ? (
          <div className="p-16 text-center space-y-3">
            <div className="w-8 h-8 rounded-full border-2 border-orange-500 border-t-transparent animate-spin mx-auto" />
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {t('student.subjects.loading', 'Đang tải lịch sử bài làm...')}
            </p>
          </div>
        ) : filteredSubmissions.length === 0 ? (
          <Card className="p-12 text-center text-slate-500 dark:text-slate-400 border-dashed space-y-3">
            <FileText className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto" />
            <p className="text-sm font-medium">Không tìm thấy bài nộp nào phù hợp bộ lọc.</p>
            {submissions.length === 0 && (
              <Link href="/student/assignments">
                <Button variant="primary" size="sm" className="text-xs">
                  Xem danh sách bài tập cần nộp
                </Button>
              </Link>
            )}
          </Card>
        ) : (
          <div className="space-y-3">
            {filteredSubmissions.map((sub: any) => {
              const isGraded = sub.gradingStatus === 'Graded' || sub.status === 'graded' || sub.status === 'COMPLETED'
              const isPublished = Boolean(sub.isPublished)
              const assignmentId = sub.assignmentId || sub.examId || sub.ExamId

              return (
                <Card
                  key={sub.id}
                  className="p-5 hover:border-orange-500/40 hover:shadow-md transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800"
                >
                  <div className="space-y-2 min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="orange" className="text-xs font-semibold">
                        {sub.assignment || sub.assignmentTitle || 'Assignment'}
                      </Badge>

                      {isGraded ? (
                        isPublished ? (
                          <Badge variant="success" className="text-[11px] gap-1 py-0.5">
                            <CheckCircle2 className="w-3 h-3" />
                            Đã công bố điểm
                          </Badge>
                        ) : (
                          <Badge variant="warning" className="text-[11px] gap-1 py-0.5">
                            <Clock className="w-3 h-3" />
                            Đã chấm - Chờ giảng viên duyệt
                          </Badge>
                        )
                      ) : (
                        <Badge variant="default" className="text-[11px] gap-1 py-0.5 bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20">
                          <RotateCcw className="w-3 h-3 animate-spin" />
                          {sub.gradingStatus || sub.status || 'Đang xử lý'}
                        </Badge>
                      )}

                      {sub.studentFeedback && (
                        <Badge variant="outline" className="text-[10px] text-purple-600 dark:text-purple-400 border-purple-300 dark:border-purple-800 gap-1">
                          <MessageSquare className="w-2.5 h-2.5" />
                          {sub.feedbackResponse || sub.appealStatus === 'resolved' ? 'Đã phản hồi phúc khảo' : 'Đang khiếu nại/phúc khảo'}
                        </Badge>
                      )}

                      {sub.attemptNumber && (
                        <span className="text-[11px] text-slate-400 font-mono">
                          Lần nộp #{sub.attemptNumber}
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-xs text-slate-500 dark:text-slate-400">
                      <span>{t('student.subjects.submitted_at', 'Nộp lúc:')} <strong className="text-slate-700 dark:text-slate-300">{formatDate(sub.submittedAt)}</strong></span>
                      <span>•</span>
                      <span className="truncate max-w-xs">{t('student.subjects.file_name', 'File:')} <strong className="font-mono text-slate-700 dark:text-slate-300">{sub.filename || sub.fileName || 'source.zip'}</strong></span>
                      {sub.isLate && (
                        <>
                          <span>•</span>
                          <span className="text-amber-600 dark:text-amber-400 font-medium">Nộp trễ hạn</span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-4 shrink-0 w-full md:w-auto justify-between md:justify-end border-t md:border-t-0 pt-3 md:pt-0 border-slate-100 dark:border-slate-800">
                    {/* Grade Section */}
                    {isGraded ? (
                      isPublished ? (
                        <div className="text-right">
                          <div className="flex items-baseline gap-1 justify-end">
                            <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight">
                              {sub.finalScore ?? sub.score ?? sub.totalScore ?? 0}
                            </span>
                            <span className="text-xs text-slate-400 font-semibold">/ 10.0</span>
                          </div>
                          {typeof sub.latePenalty === 'number' && sub.latePenalty > 0 && (
                            <p className="text-[10px] text-rose-500 font-medium">
                              (Đã trừ trễ hạn -{sub.latePenalty}đ)
                            </p>
                          )}
                        </div>
                      ) : (
                        <div className="text-right text-xs text-amber-600 dark:text-amber-400 font-medium bg-amber-500/10 px-3 py-1.5 rounded-lg border border-amber-500/20">
                          Điểm chưa công bố
                        </div>
                      )
                    ) : (
                      <span className="text-xs text-slate-400 italic">
                        {t('student.subjects.grading_pending', 'Đang chờ chấm...')}
                      </span>
                    )}

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      {isGraded && isPublished ? (
                        <Link href={`/student/grading/result/${sub.id}`}>
                          <Button variant="primary" size="sm" className="text-xs gap-1.5 shadow-sm">
                            <Award className="w-3.5 h-3.5" />
                            <span>{t('student.subjects.btn_detail', 'Xem Báo cáo')}</span>
                          </Button>
                        </Link>
                      ) : assignmentId ? (
                        <Link href={`/student/assignments/${assignmentId}`}>
                          <Button variant="outline" size="sm" className="text-xs gap-1.5">
                            <span>Chi tiết bài tập</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </Button>
                        </Link>
                      ) : null}
                    </div>
                  </div>
                </Card>
              )
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
