'use client'

import * as React from 'react'
import Link from 'next/link'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { STUDENT_NAV } from '@/config/navigation'
import { useLanguage } from '@/providers/language-provider'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { studentPortalApi } from '@/lib/api/modules/student-portal'
import { assignmentsApi } from '@/lib/api/modules/assignments'
import { submissionsApi } from '@/lib/api/modules/submissions'
import { semestersApi } from '@/lib/api/modules/semesters'
import {
  BookOpen,
  Calendar,
  Clock,
  ChevronDown,
  ChevronUp,
  Database,
  Code,
  ArrowRight,
  GraduationCap,
  Check,
  CheckCircle2,
  AlertCircle,
  FileText,
  User,
  ExternalLink,
  RefreshCw,
} from 'lucide-react'

export default function StudentSubjectsPage() {
  const { t } = useLanguage()
  const [subjects, setSubjects] = React.useState<any[]>([])
  const [assignments, setAssignments] = React.useState<any[]>([])
  const [semesters, setSemesters] = React.useState<any[]>([])
  const [selectedSemester, setSelectedSemester] = React.useState<string>('')
  const [activeSubjectTab, setActiveSubjectTab] = React.useState<string>('All')
  const [expandedSubjectId, setExpandedSubjectId] = React.useState<string | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

  // Load semesters
  React.useEffect(() => {
    semestersApi
      .getSemesters()
      .then((sems) => {
        const list = Array.isArray(sems) ? sems : []
        setSemesters(list)
        const active = list.find((s: any) => s.isActive) || list[0]
        if (active) setSelectedSemester(active.id || active.code || '')
      })
      .catch(() => {})
  }, [])

  // Load subjects, assignments, submissions
  const loadData = React.useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [subjectsRes, assignmentsRes, submissionsRes] = await Promise.all([
        studentPortalApi.getStudentSubjects(selectedSemester || undefined),
        assignmentsApi.getAssignments(),
        submissionsApi.getSubmissions(),
      ])

      const rawSubjects = Array.isArray(subjectsRes) ? subjectsRes : []
      setSubjects(rawSubjects)

      const activeAssignments = (Array.isArray(assignmentsRes) ? assignmentsRes : []).filter(
        (a: any) => !a.isDeleted && !a.IsDeleted && (a.status || '').toLowerCase() !== 'deleted'
      )

      const subsList = Array.isArray(submissionsRes) ? submissionsRes : []
      const submissionsMap = new Map(subsList.map((s: any) => [s.assignmentId || s.examId, s]))

      const merged = activeAssignments.map((a: any) => {
        const sub = submissionsMap.get(a.id)
        if (sub) {
          const isPublished = sub.reviewStatus === 'PUBLISHED' || sub.isPublished === true
          const validScore = isPublished
            ? (sub.finalScore ?? sub.totalScore ?? sub.score ?? sub.Score)
            : undefined
          return {
            ...a,
            status: isPublished && validScore !== undefined && validScore !== null ? 'Graded' : 'Submitted',
            score: validScore,
            submissionId: sub.id,
          }
        }
        return a
      })

      // Sort newest to oldest
      merged.sort((a, b) => {
        const timeA = a.createdAt || a.due ? new Date(a.createdAt || a.due).getTime() : 0
        const timeB = b.createdAt || b.due ? new Date(b.createdAt || b.due).getTime() : 0
        return timeB - timeA
      })

      setAssignments(merged)

      // Auto expand first subject
      if (rawSubjects.length > 0 && !expandedSubjectId) {
        setExpandedSubjectId(rawSubjects[0].id || rawSubjects[0].code)
      }
    } catch (err: any) {
      console.error('Failed to load student subjects data:', err)
      setError(err?.message || 'Không thể tải dữ liệu môn học. Vui lòng thử lại.')
    } finally {
      setLoading(false)
    }
  }, [selectedSemester])

  React.useEffect(() => {
    loadData()
  }, [loadData])

  // Subject tabs
  const subjectTabs = React.useMemo(() => {
    const codes = Array.from(new Set(subjects.map((s: any) => s.code || s.SubjectCode).filter(Boolean)))
    return ['All', ...codes]
  }, [subjects])

  // Filtered subjects
  const visibleSubjects = React.useMemo(() => {
    if (activeSubjectTab === 'All') return subjects
    return subjects.filter((s: any) => (s.code || s.SubjectCode) === activeSubjectTab)
  }, [subjects, activeSubjectTab])

  // Overall Statistics
  const stats = React.useMemo(() => {
    const total = assignments.length
    const submitted = assignments.filter((a) => a.status === 'Submitted' || a.status === 'Graded').length
    const graded = assignments.filter((a) => a.status === 'Graded' && a.score !== undefined).length
    const missing = total - submitted

    let totalScore = 0
    let gradedCount = 0
    assignments.forEach((a) => {
      if (a.status === 'Graded' && a.score !== undefined && a.score !== null) {
        totalScore += Number(a.score)
        gradedCount++
      }
    })
    const avgScore = gradedCount > 0 ? (totalScore / gradedCount).toFixed(1) : '—'

    return { total, submitted, graded, missing, avgScore }
  }, [assignments])

  return (
    <DashboardLayout
      navItems={STUDENT_NAV}
      title="AITA Student"
      roleLabel={t('profile.role_student', 'Sinh viên')}
      requiredRole="student"
      headerTitle={t('student.results.title', 'Môn học & Kết quả học tập')}
      headerSubtitle={t('student.results.subtitle', 'Theo dõi tiến độ làm bài, điểm số và hạn nộp theo từng môn học')}
    >
      <div className="space-y-6 max-w-7xl mx-auto pb-16">
        {/* Controls Bar: Semester Selector & Tabs */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-orange-50/80 via-white to-amber-50/40 dark:from-slate-900 dark:via-slate-900/90 dark:to-orange-950/20 border border-orange-100/90 dark:border-orange-900/30 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-orange-500 via-amber-500 to-orange-400 text-white flex items-center justify-center shadow-md shadow-orange-500/25 shrink-0">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">{t('student.results.semester', 'Kỳ học')}</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">{t('student.results.semester_desc', 'Chọn kỳ học để lọc môn và bài tập')}</p>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <select
              value={selectedSemester}
              onChange={(e) => setSelectedSemester(e.target.value)}
              className="px-4 py-2 rounded-xl border border-orange-200/80 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-400/25"
            >
              <option value="">{t('student.results.all_semesters', 'Tất cả học kỳ')}</option>
              {semesters.map((sem: any) => (
                <option key={sem.id} value={sem.id}>
                  {sem.season || sem.code || sem.name} {sem.isActive ? t('student.results.current', '(Hiện tại)') : ''}
                </option>
              ))}
            </select>

            <Button variant="outline" size="sm" onClick={loadData} className="gap-1.5 text-xs">
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              {t('ui.refresh', 'Làm mới')}
            </Button>
          </div>
        </div>

        {/* Executive KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="relative overflow-hidden p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-orange-50/80 via-white to-amber-50/40 dark:from-slate-900 dark:via-slate-900/90 dark:to-orange-950/20 border border-orange-100/90 dark:border-orange-900/30 shadow-xs hover:shadow-md transition-all group">
            <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-gradient-to-tr from-orange-400/15 via-amber-300/15 to-transparent rounded-full blur-2xl group-hover:from-orange-400/25 group-hover:via-amber-300/25 transition-all pointer-events-none" />
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Tổng môn học
              </span>
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-orange-500 via-amber-500 to-orange-400 text-white flex items-center justify-center shadow-md shadow-orange-500/25">
                <BookOpen className="w-5 h-5" />
              </div>
            </div>
            <div className="text-3xl font-black text-slate-900 dark:text-white tracking-tight font-mono">
              {loading ? '…' : subjects.length}
            </div>
            <div className="flex items-center gap-1.5 mt-2 text-[11px] font-medium text-slate-500 dark:text-slate-400">
              <span className="w-1.5 h-1.5 rounded-full bg-orange-400" />
              <span>Chương trình Spring 2026</span>
            </div>
          </div>

          <div className="relative overflow-hidden p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-orange-50/80 via-white to-amber-50/40 dark:from-slate-900 dark:via-slate-900/90 dark:to-orange-950/20 border border-orange-100/90 dark:border-orange-900/30 shadow-xs hover:shadow-md transition-all group">
            <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-gradient-to-tr from-orange-400/15 via-amber-300/15 to-transparent rounded-full blur-2xl group-hover:from-orange-400/25 group-hover:via-amber-300/25 transition-all pointer-events-none" />
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Tổng bài tập
              </span>
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-orange-500 via-amber-500 to-orange-400 text-white flex items-center justify-center shadow-md shadow-orange-500/25">
                <FileText className="w-5 h-5" />
              </div>
            </div>
            <div className="text-3xl font-black text-slate-900 dark:text-white tracking-tight font-mono">
              {loading ? '…' : stats.total}
            </div>
            <div className="flex items-center gap-1.5 mt-2 text-[11px] font-medium text-slate-500 dark:text-slate-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span>Đã nộp: {stats.submitted} bài</span>
            </div>
          </div>

          <div className="relative overflow-hidden p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-orange-50/80 via-white to-amber-50/40 dark:from-slate-900 dark:via-slate-900/90 dark:to-orange-950/20 border border-orange-100/90 dark:border-orange-900/30 shadow-xs hover:shadow-md transition-all group">
            <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-gradient-to-tr from-orange-400/15 via-amber-300/15 to-transparent rounded-full blur-2xl group-hover:from-orange-400/25 group-hover:via-amber-300/25 transition-all pointer-events-none" />
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Đã có điểm
              </span>
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-orange-500 via-amber-500 to-orange-400 text-white flex items-center justify-center shadow-md shadow-orange-500/25">
                <CheckCircle2 className="w-5 h-5" />
              </div>
            </div>
            <div className="text-3xl font-black text-slate-900 dark:text-white tracking-tight font-mono">
              {loading ? '…' : stats.graded}
            </div>
            <div className="flex items-center gap-1.5 mt-2 text-[11px] font-medium text-slate-500 dark:text-slate-400">
              <span className="w-1.5 h-1.5 rounded-full bg-orange-400" />
              <span>Chờ chấm: {Math.max(0, stats.submitted - stats.graded)}</span>
            </div>
          </div>

          <div className="relative overflow-hidden p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-orange-50/80 via-white to-amber-50/40 dark:from-slate-900 dark:via-slate-900/90 dark:to-orange-950/20 border border-orange-100/90 dark:border-orange-900/30 shadow-xs hover:shadow-md transition-all group">
            <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-gradient-to-tr from-orange-400/15 via-amber-300/15 to-transparent rounded-full blur-2xl group-hover:from-orange-400/25 group-hover:via-amber-300/25 transition-all pointer-events-none" />
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Điểm TB GPA
              </span>
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-orange-500 via-amber-500 to-orange-400 text-white flex items-center justify-center shadow-md shadow-orange-500/25">
                <GraduationCap className="w-5 h-5" />
              </div>
            </div>
            <div className="text-3xl font-black text-slate-900 dark:text-white tracking-tight font-mono">
              {loading ? '…' : stats.avgScore}
            </div>
            <div className="flex items-center gap-1.5 mt-2 text-[11px] font-medium text-slate-500 dark:text-slate-400">
              <span className="w-1.5 h-1.5 rounded-full bg-orange-400" />
              <span>Thang điểm 10</span>
            </div>
          </div>
        </div>

        {/* Subject Chips */}
        {subjectTabs.length > 2 && (
          <div className="inline-flex flex-wrap p-1.5 bg-gradient-to-br from-orange-50/80 via-white to-amber-50/40 dark:from-slate-900 dark:via-slate-900/90 dark:to-orange-950/20 rounded-2xl border border-orange-100/90 dark:border-orange-900/30 shadow-xs gap-1">
            {subjectTabs.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveSubjectTab(tab)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                  activeSubjectTab === tab
                    ? 'bg-gradient-to-r from-orange-500 via-amber-500 to-orange-400 text-white shadow-md shadow-orange-500/20'
                    : 'text-slate-600 hover:text-orange-600 dark:text-slate-300 dark:hover:text-white hover:bg-orange-50/60'
                }`}
              >
                {tab === 'All' ? t('student.results.all_subjects', 'Tất cả môn học') : tab}
              </button>
            ))}
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800/60 flex items-center justify-between text-xs text-rose-700 dark:text-rose-300">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
              <span>{error}</span>
            </div>
            <Button variant="outline" size="sm" onClick={loadData} className="text-xs">
              {t('ui.retry', 'Thử lại')}
            </Button>
          </div>
        )}

        {/* Content List */}
        {loading ? (
          <div className="p-16 text-center text-slate-400 text-sm">{t('ui.loading', 'Đang tải danh sách môn học và bài tập...')}</div>
        ) : visibleSubjects.length === 0 ? (
          <Card className="p-12 text-center text-slate-500 border-dashed">
            <BookOpen className="w-10 h-10 mx-auto text-slate-400 mb-3" />
            <p className="font-semibold text-sm">{t('student.results.empty_semester', 'Chưa có môn học nào được đăng ký trong kỳ học này.')}</p>
            <p className="text-xs text-slate-400 mt-1">{t('student.results.empty_semester_desc', 'Chọn kỳ học khác hoặc liên hệ phòng đào tạo.')}</p>
          </Card>
        ) : (
          <div className="space-y-4">
            {visibleSubjects.map((sub: any) => {
              const subId = sub.id || sub.code || sub.SubjectCode
              const subCode = sub.code || sub.SubjectCode || 'SUB'
              const subName = sub.name || sub.SubjectName || 'Môn học'
              const isExpanded = expandedSubjectId === subId

              // Filter assignments belonging to this subject
              const subAssignments = assignments.filter((a) => {
                const aCode = (a.subjectCode || a.SubjectCode || '').toLowerCase()
                const sCode = subCode.toLowerCase()
                return aCode === sCode || a.subjectId === sub.id || a.SubjectId === sub.id
              })

              const lecturer = sub.lecturers?.[0] || sub.instructor || null

              return (
                <Card
                  key={subId}
                  className="bg-white dark:bg-slate-900 border border-orange-100/90 dark:border-orange-900/30 rounded-2xl overflow-hidden shadow-xs hover:border-orange-200/90 transition-all"
                >
                  {/* Subject Header */}
                  <div
                    onClick={() => setExpandedSubjectId(isExpanded ? null : subId)}
                    className="p-5 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 cursor-pointer hover:bg-orange-50/20 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-orange-500 via-amber-500 to-orange-400 text-white flex items-center justify-center shrink-0 shadow-md shadow-orange-500/25">
                        {subCode.startsWith('DB') ? <Database className="w-6 h-6" /> : subCode.startsWith('SE') || subCode.startsWith('CS') ? <Code className="w-6 h-6" /> : <BookOpen className="w-6 h-6" />}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="orange" className="font-mono text-xs">
                            {subCode}
                          </Badge>
                          {sub.classCode && (
                            <Badge variant="outline" className="font-mono text-[10px]">
                              {t('student.results.class', 'Lớp')}: {sub.classCode}
                            </Badge>
                          )}
                          <span className="text-xs text-slate-400">• {subAssignments.length} {t('student.results.tasks_count', 'bài tập')}</span>
                        </div>
                        <h3 className="text-base font-bold text-slate-900 dark:text-white mt-1">
                          {subName}
                        </h3>
                        {lecturer && (
                          <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mt-1">
                            <User className="w-3.5 h-3.5 text-slate-400" />
                            <span>{t('student.results.lecturer', 'Giảng viên')}: {lecturer.name || lecturer.FullName || t('student.results.unassigned', 'Chưa phân công')}</span>
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
                      <Link
                        href={`/student/courses/${subCode}`}
                        onClick={(e) => e.stopPropagation()}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-orange-600 dark:text-orange-400 hover:text-orange-700 dark:hover:text-orange-300 px-3 py-1.5 rounded-xl hover:bg-orange-50 dark:hover:bg-orange-950/30 transition-colors"
                      >
                        <span>{t('student.results.view_syllabus', 'Xem Giáo trình (Syllabus)')}</span>
                        <ExternalLink className="w-3 h-3" />
                      </Link>

                      <div className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                        {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                      </div>
                    </div>
                  </div>

                  {/* Expanded Assignments Accordion */}
                  {isExpanded && (
                    <div className="border-t border-slate-100 dark:border-slate-800 p-5 sm:p-6 bg-slate-50/40 dark:bg-slate-900/60 space-y-3">
                      <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                        {t('student.results.assignment_list', 'Danh sách bài tập & kiểm tra')}
                      </h4>

                      {subAssignments.length === 0 ? (
                        <div className="p-6 text-center text-xs text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
                          {t('student.results.no_assignments_for_subject', 'Chưa có bài tập nào được giao cho môn học này.')}
                        </div>
                      ) : (
                        <div className="space-y-2.5">
                          {subAssignments.map((a: any) => {
                            const isGraded = a.status === 'Graded'
                            const isSubmitted = a.status === 'Submitted'
                            const isOverdue = a.due && new Date(a.due) < new Date() && !isSubmitted && !isGraded

                            return (
                              <div
                                key={a.id}
                                className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs hover:border-orange-300 dark:hover:border-orange-800/60 transition-all"
                              >
                                <div className="space-y-1">
                                  <div className="flex items-center gap-2">
                                    <span className="font-bold text-sm text-slate-900 dark:text-white">
                                      {a.title || 'Assignment'}
                                    </span>
                                    <Badge variant="outline" className="text-[10px]">
                                      {a.type || 'Assignment'}
                                    </Badge>
                                  </div>
                                  <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
                                    {a.due && (
                                      <span className="flex items-center gap-1">
                                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                                        {t('student.results.due', 'Hạn nộp')}: {new Date(a.due).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' })}
                                      </span>
                                    )}
                                    {a.maxScore !== undefined && (
                                      <span>{t('student.results.max_score', 'Điểm tối đa')}: {a.maxScore}đ</span>
                                    )}
                                  </div>
                                </div>

                                <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
                                  <div>
                                    {isGraded ? (
                                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                                        <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400 stroke-[2.5]" />
                                        <span>{t('student.results.score_label', 'Điểm')}: {a.score} / {a.maxScore || 10}</span>
                                      </span>
                                    ) : isSubmitted ? (
                                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                                        <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400 stroke-[2.5]" />
                                        <span>{t('student.results.status_submitted', 'Đã nộp bài')}</span>
                                      </span>
                                    ) : isOverdue ? (
                                      <Badge variant="danger" className="text-xs">
                                        {t('student.results.status_overdue', 'Quá hạn nộp')}
                                      </Badge>
                                    ) : (
                                      <Badge variant="default" className="text-xs">
                                        {t('student.results.status_pending', 'Chưa nộp')}
                                      </Badge>
                                    )}
                                  </div>

                                  <Link href={`/student/assignments/${a.id}`}>
                                    <Button
                                      size="sm"
                                      variant={isGraded ? 'outline' : 'primary'}
                                      className="text-xs gap-1.5"
                                    >
                                      <span>{isGraded ? t('student.results.view_result', 'Xem kết quả') : isSubmitted ? t('student.results.view_submission', 'Xem bài nộp') : t('student.results.do_assignment', 'Làm bài')}</span>
                                      <ArrowRight className="w-3.5 h-3.5" />
                                    </Button>
                                  </Link>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </Card>
              )
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
