'use client'

import * as React from 'react'
import Link from 'next/link'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { STUDENT_NAV } from '@/config/navigation'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { studentPortalApi } from '@/lib/api/modules/student-portal'
import { submissionsApi } from '@/lib/api/modules/submissions'
import { assignmentsApi } from '@/lib/api/modules/assignments'
import { formatDate } from '@/lib/utils'
import {
  FileText,
  Clock,
  CheckCircle2,
  AlertCircle,
  Search,
  Filter,
  ArrowRight,
  BookOpen,
  Calendar,
  Sparkles,
  Award,
  Layers,
  RefreshCw,
} from 'lucide-react'
import { useLanguage } from '@/providers/language-provider'

export default function StudentAssignmentsPage() {
  const { t } = useLanguage()

  const [loading, setLoading] = React.useState(true)
  const [tasks, setTasks] = React.useState<any[]>([])
  const [submissions, setSubmissions] = React.useState<any[]>([])
  const [search, setSearch] = React.useState('')
  const [statusTab, setStatusTab] = React.useState<'all' | 'pending' | 'submitted' | 'graded'>('all')
  const [semesterFilter, setSemesterFilter] = React.useState<string>('all')

  const loadData = React.useCallback(async () => {
    setLoading(true)
    try {
      const [dashboard, subs, allAssignments] = await Promise.all([
        studentPortalApi.getStudentDashboard().catch(() => null),
        submissionsApi.getSubmissions().catch(() => []),
        assignmentsApi.getAssignments().catch(() => []),
      ])

      setSubmissions(subs || [])

      // Merge upcoming assignments from dashboard with general assignments
      const upcoming = dashboard?.upcomingAssignments || []
      const taskMap = new Map<string, any>()

      // 1. Add all assignments
      allAssignments.forEach((a: any) => {
        taskMap.set(a.id, {
          id: a.id,
          title: a.title,
          description: a.description,
          due: a.due || a.dueAt || a.dueDate,
          type: a.type || 'Assignment',
          subjectCode: a.subjectCode || 'CNTT',
          semesterSeason: a.semesterSeason || 'Spring 2026',
        })
      })

      // 2. Overlay upcoming assignments with dashboard specifics
      upcoming.forEach((u: any) => {
        taskMap.set(u.id, {
          ...taskMap.get(u.id),
          ...u,
        })
      })

      setTasks(Array.from(taskMap.values()))
    } catch (err) {
      console.error('Failed to load student assignments:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => {
    loadData()
  }, [loadData])

  // Map submissions to task IDs
  const submissionMap = React.useMemo(() => {
    const map = new Map<string, any>()
    submissions.forEach(s => {
      const assignId = s.assignmentId || s.ExamId || s.examId
      if (assignId) {
        // Keep the latest or graded submission
        const existing = map.get(assignId)
        if (!existing || new Date(s.submittedAt || 0) > new Date(existing.submittedAt || 0)) {
          map.set(assignId, s)
        }
      }
    })
    return map
  }, [submissions])

  // Filter tasks
  const filteredTasks = tasks.filter(t => {
    const sub = submissionMap.get(t.id)
    const isSubmitted = !!sub
    const isPublished = isSubmitted && Boolean(sub.isPublished)

    if (statusTab === 'pending' && isSubmitted) return false
    if (statusTab === 'submitted' && (!isSubmitted || isPublished)) return false
    if (statusTab === 'graded' && !isPublished) return false

    if (semesterFilter !== 'all' && t.semesterSeason !== semesterFilter) return false

    if (search) {
      const text = `${t.title} ${t.subjectCode} ${t.type}`.toLowerCase()
      if (!text.includes(search.toLowerCase())) return false
    }

    return true
  })

  // Urgent tasks (due in < 48h and not submitted)
  const urgentTasks = tasks.filter(t => {
    const sub = submissionMap.get(t.id)
    if (sub) return false
    if (!t.due) return false
    const diff = new Date(t.due).getTime() - Date.now()
    return diff > 0 && diff <= 48 * 60 * 60 * 1000
  })

  return (
    <DashboardLayout
      navItems={STUDENT_NAV}
      roleLabel={t('profile.role_student', 'Sinh viên')}
      requiredRole="student"
      title={t('student.assignment.title', 'Tổng hợp bài tập & Nhiệm vụ học tập')}
      headerTitle={t('student.assignment.title', 'Tổng hợp bài tập & Nhiệm vụ học tập')}
      headerSubtitle={t('student.assignment.subtitle', 'Theo dõi toàn diện các bài tập lập trình cần hoàn thành')}
    >
      <div className="space-y-6 max-w-7xl mx-auto">
        {/* Header Banner */}
        <div className="rounded-3xl p-6 sm:p-8 bg-gradient-to-r from-orange-50 via-amber-50/60 to-blue-50/70 dark:bg-gradient-to-r dark:from-orange-950/40 dark:via-slate-900/90 dark:to-blue-950/30 border border-orange-200/80 dark:border-orange-500/20 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-xs dark:shadow-xl transition-colors">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Badge variant="orange">Study Tasks Hub</Badge>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                {t('student.assignment.track_progress', 'Theo dõi tiến độ & Hạn chót bài tập')}
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              {t('student.assignment.title', 'Tổng hợp Bài tập & Nhiệm vụ Học tập')}
            </h1>
            <p className="text-xs md:text-sm text-slate-600 dark:text-slate-300 max-w-2xl leading-relaxed">
              {t('student.assignment.subtitle', 'Theo dõi toàn diện các bài tập lập trình (Workshops, Practical Exams) cần hoàn thành, xem hạn nộp và truy cập nhanh báo cáo đánh giá Barem Rubric.')}
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <Link href="/student/subjects">
              <Button variant="outline" size="sm" className="text-xs gap-1.5">
                <Award className="w-4 h-4 text-orange-500" />
                <span>{t('student.assignment.history_btn', 'Lịch sử bài nộp')}</span>
              </Button>
            </Link>
            <Button
              variant="outline"
              size="sm"
              onClick={loadData}
              className="text-xs gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>{t('ui.refresh', 'Làm mới')}</span>
            </Button>
          </div>
        </div>

        {/* Urgent Warning Banner if any */}
        {urgentTasks.length > 0 && (
          <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-amber-800 dark:text-amber-300 uppercase tracking-wider">
                  {t('student.assignment.urgent_alert', `Cảnh báo: Bạn có ${urgentTasks.length} bài tập cần nộp gấp trong 48 giờ tới!`)}
                </h4>
                <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
                  {t('student.assignment.urgent_desc', 'Hãy nộp bài đúng hạn để tránh bị áp dụng chính sách trừ điểm phạt nộp trễ.')}
                </p>
              </div>
            </div>
            <Link href={`/student/assignments/${urgentTasks[0].id}`}>
              <Button variant="primary" size="sm" className="text-xs bg-amber-600 hover:bg-amber-700 text-white shrink-0">
                {t('student.assignment.submit_now', 'Nộp ngay')}
              </Button>
            </Link>
          </div>
        )}

        {/* Filter Controls */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
          <div className="w-full md:max-w-sm">
            <Input
              type="text"
              placeholder={t('student.assignment.search_placeholder', 'Tìm theo môn học, tên bài tập...')}
              icon={<Search className="w-4 h-4" />}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setStatusTab('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                statusTab === 'all'
                  ? 'bg-orange-500 text-white shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
              }`}
            >
              {t('student.assignment.tab_all', 'Tất cả')} ({tasks.length})
            </button>
            <button
              onClick={() => setStatusTab('pending')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                statusTab === 'pending'
                  ? 'bg-orange-500 text-white shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
              }`}
            >
              {t('student.assignment.tab_pending', 'Chưa nộp')} ({tasks.filter(t => !submissionMap.has(t.id)).length})
            </button>
            <button
              onClick={() => setStatusTab('submitted')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                statusTab === 'submitted'
                  ? 'bg-orange-500 text-white shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
              }`}
            >
              {t('student.assignment.tab_submitted', 'Đã nộp / Đang chấm')}
            </button>
            <button
              onClick={() => setStatusTab('graded')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                statusTab === 'graded'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
              }`}
            >
              {t('student.assignment.tab_graded', 'Đã công bố điểm')}
            </button>
          </div>
        </div>

        {/* Tasks Grid */}
        {loading ? (
          <div className="p-16 text-center text-slate-400 text-xs">
            {t('student.assignment.loading', 'Đang tải dữ liệu bài tập và tiến độ...')}
          </div>
        ) : filteredTasks.length === 0 ? (
          <Card className="p-12 text-center text-slate-400 text-xs border-dashed">
            {t('student.assignment.empty', 'Không tìm thấy bài tập nào phù hợp với bộ lọc hiện tại.')}
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredTasks.map((task) => {
              const sub = submissionMap.get(task.id)
              const isSubmitted = !!sub
              const isPublished = isSubmitted && Boolean(sub.isPublished)
              const isGraded = isSubmitted && (sub.gradingStatus === 'Graded' || sub.status === 'graded' || sub.status === 'COMPLETED')
              const displayScore = isPublished ? (sub?.finalScore ?? sub?.score ?? sub?.totalScore ?? null) : null
              const isDuePassed = task.due ? new Date(task.due).getTime() < Date.now() : false

              return (
                <Card
                  key={task.id}
                  className="p-5 flex flex-col justify-between hover:border-orange-500/40 transition-all group space-y-4"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Badge variant="orange" className="font-mono text-xs">
                        {task.subjectCode}
                      </Badge>
                      <Badge variant={isPublished ? 'success' : isGraded ? 'warning' : isSubmitted ? 'blue' : isDuePassed ? 'danger' : 'default'}>
                        {isPublished ? t('student.assignment.status_published', 'ĐÃ CÔNG BỐ ĐIỂM') : isGraded ? t('student.assignment.status_awaiting_review', 'CHỜ DUYỆT ĐIỂM') : isSubmitted ? t('student.assignment.status_submitted', 'ĐÃ NỘP BÀI') : isDuePassed ? t('student.assignment.status_overdue', 'QUÁ HẠN NỘP') : t('student.assignment.status_pending', 'CHƯA NỘP')}
                      </Badge>
                    </div>

                    <div>
                      <h3 className="font-bold text-base text-slate-900 dark:text-white group-hover:text-orange-500 transition-colors line-clamp-1">
                        {task.title}
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mt-1">
                        {task.description || t('student.assignment.default_desc', 'Hoàn thành mã nguồn bài tập theo đúng Barem tiêu chí đánh giá.')}
                      </p>
                    </div>

                    <div className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400">
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-orange-500" />
                          {t('student.assignment.deadline', 'Hạn chót:')}
                        </span>
                        <span className="font-mono font-bold text-slate-700 dark:text-slate-300">
                          {task.due ? formatDate(task.due) : t('student.assignment.no_limit', 'Không giới hạn')}
                        </span>
                      </div>

                      {isPublished && displayScore !== null && (
                        <div className="flex items-center justify-between pt-1">
                          <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-bold">
                            <Award className="w-3.5 h-3.5" />
                            {t('student.assignment.official_score', 'Điểm chính thức:')}
                          </span>
                          <span className="font-mono font-black text-emerald-600 dark:text-emerald-400 text-sm">
                            {Number(displayScore).toFixed(1)} / 10
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <span className="text-[11px] text-slate-400 font-mono">
                      {task.type}
                    </span>

                    <Link href={`/student/assignments/${task.id}`}>
                      <Button
                        variant={isPublished ? 'outline' : 'primary'}
                        size="sm"
                        className={`text-xs gap-1.5 ${!isPublished ? 'bg-orange-500 hover:bg-orange-600 text-white' : ''}`}
                      >
                        <span>{isPublished ? t('student.assignment.view_report', 'Xem báo cáo') : isSubmitted ? t('student.assignment.resubmit_details', 'Chi tiết nộp lại') : t('student.assignment.do_and_submit', 'Làm & Nộp bài')}</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Button>
                    </Link>
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
