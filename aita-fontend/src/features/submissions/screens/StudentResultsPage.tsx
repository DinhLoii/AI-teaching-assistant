'use client'

import { RefreshAction } from '@/components/actions/RefreshAction'

import * as React from 'react'
import Link from 'next/link'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { STUDENT_NAV } from '@/config/navigation'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { submissionsApi } from '@/lib/api/modules/submissions'
import { formatDate } from '@/lib/utils'
import {
  GraduationCap,
  ArrowRight,
  FileCheck,
  Search,
  Clock,
  Check,
  CheckCircle2,
  AlertCircle,
  MessageSquare,
  FileText,
  FileCode,
  RotateCcw,
  Sparkles,
  RefreshCw,
  ExternalLink,
  Award,
} from 'lucide-react'
import { useLanguage } from '@/providers/language-provider'

export default function StudentResultsPage() {
  const [submissions, setSubmissions] = React.useState<any[]>([])
  const [loading, setLoading] = React.useState(true)
  const [filterTab, setFilterTab] = React.useState<'all' | 'published' | 'pending_publish' | 'grading'>('all')
  const [searchQuery, setSearchQuery] = React.useState('')
  const { t, language } = useLanguage()
  const isVi = language === 'vi'

  const loadSubmissions = React.useCallback(async (background = false) => {
    if (!background) setLoading(true)
    return submissionsApi
      .getSubmissions({ view: 'summary' })
      .then((data: any) => {
        setSubmissions(Array.isArray(data) ? data : [])
      })
      .catch((err: any) => {
        if (background) throw err
        console.error('Failed to load my submissions:', err)
        setSubmissions([])
      })
      .finally(() => setLoading(false))
  }, [])

  React.useEffect(() => {
    loadSubmissions()
  }, [loadSubmissions])

  // Helper for case-insensitive status checks
  const checkIsGraded = React.useCallback((s: any) => {
    const gs = String(s.gradingStatus || s.status || '').toUpperCase()
    return gs === 'GRADED' || gs === 'COMPLETED' || gs === 'SUCCESS' || s.score != null || s.finalScore != null || s.totalScore != null
  }, [])

  const checkIsPublished = React.useCallback((s: any) => {
    return Boolean(s.isPublished) || String(s.reviewStatus || '').toUpperCase() === 'PUBLISHED'
  }, [])

  // Filters
  const gradedAndPublished = submissions.filter(
    s => checkIsGraded(s) && checkIsPublished(s)
  )
  const pendingPublish = submissions.filter(
    s => checkIsGraded(s) && !checkIsPublished(s)
  )
  const gradingCount = submissions.filter(
    s => !checkIsGraded(s)
  ).length

  // Average Score
  const publishedScores = gradedAndPublished
    .map(s => Number(s.finalScore ?? s.score ?? 0))
    .filter(s => !isNaN(s) && s > 0)
  const avgScore = publishedScores.length > 0
    ? (publishedScores.reduce((a, b) => a + b, 0) / publishedScores.length).toFixed(1)
    : '—'

  const filteredSubmissions = React.useMemo(() => {
    return submissions.filter((sub) => {
      const isGraded = checkIsGraded(sub)
      const isPublished = checkIsPublished(sub)

      if (filterTab === 'published' && (!isGraded || !isPublished)) return false
      if (filterTab === 'pending_publish' && (!isGraded || isPublished)) return false
      if (filterTab === 'grading' && isGraded) return false

      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase()
        const title = (sub.assignment || sub.assignmentTitle || '').toLowerCase()
        const subCode = (sub.subjectCode || '').toLowerCase()
        const id = (sub.id || '').toLowerCase()
        const filename = (sub.filename || sub.fileName || '').toLowerCase()
        if (!title.includes(query) && !subCode.includes(query) && !id.includes(query) && !filename.includes(query)) {
          return false
        }
      }

      return true
    })
  }, [submissions, filterTab, searchQuery, checkIsGraded, checkIsPublished])

  return (
    <DashboardLayout
      navItems={STUDENT_NAV}
      title="AITA Student"
      roleLabel={t('profile.role_student', 'Sinh viên')}
      requiredRole="student"
      headerTitle={t('student.subjects.header_title', 'Kết quả & Đánh giá Rubric AI')}
      headerSubtitle={t('student.subjects.header_subtitle', 'Bảng tổng hợp điểm số chính thức và nhận xét chi tiết từ Rubric AI Engine')}
    >
      <div className="space-y-6 w-full max-w-[99%] 2xl:max-w-[1850px] mx-auto pb-12 px-1 sm:px-2">
        {/* Executive KPI Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="relative overflow-hidden p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-orange-50/80 via-white to-amber-50/40 dark:from-slate-900 dark:via-slate-900/90 dark:to-orange-950/20 border border-orange-100/90 dark:border-orange-900/30 shadow-xs hover:shadow-md transition-all group">
            <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-gradient-to-tr from-orange-400/15 via-amber-300/15 to-transparent rounded-full blur-2xl group-hover:from-orange-400/25 group-hover:via-amber-300/25 transition-all pointer-events-none" />
            <div className="flex items-start justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                {isVi ? 'Tổng bài đã nộp' : 'Total Submissions'}
              </span>
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-orange-500 via-amber-500 to-orange-400 text-white flex items-center justify-center shadow-md shadow-orange-500/25">
                <FileCheck className="w-5 h-5 text-white" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">{submissions.length}</span>
              <span className="text-xs font-semibold text-slate-500">{isVi ? 'bài' : 'items'}</span>
            </div>
            <p className="mt-1 text-[11px] font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-orange-400" />
              <span>{isVi ? 'Toàn bộ học kỳ Spring 2026' : 'All semester tasks'}</span>
            </p>
          </div>

          <div className="relative overflow-hidden p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-orange-50/80 via-white to-amber-50/40 dark:from-slate-900 dark:via-slate-900/90 dark:to-orange-950/20 border border-orange-100/90 dark:border-orange-900/30 shadow-xs hover:shadow-md transition-all group">
            <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-gradient-to-tr from-orange-400/15 via-amber-300/15 to-transparent rounded-full blur-2xl group-hover:from-orange-400/25 group-hover:via-amber-300/25 transition-all pointer-events-none" />
            <div className="flex items-start justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                {isVi ? 'Điểm trung bình (GPA)' : 'Average Score'}
              </span>
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-orange-500 via-amber-500 to-orange-400 text-white flex items-center justify-center shadow-md shadow-orange-500/25">
                <Award className="w-5 h-5 text-white" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-3xl font-black text-orange-600 dark:text-orange-400 tracking-tight font-mono">{avgScore}</span>
              <span className="text-xs font-semibold text-slate-500">/ 10</span>
            </div>
            <p className="mt-1 text-[11px] font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-orange-400" />
              <span>{isVi ? 'Bài đã công bố điểm' : 'Published results'}</span>
            </p>
          </div>

          <div className="relative overflow-hidden p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-orange-50/80 via-white to-amber-50/40 dark:from-slate-900 dark:via-slate-900/90 dark:to-orange-950/20 border border-orange-100/90 dark:border-orange-900/30 shadow-xs hover:shadow-md transition-all group">
            <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-gradient-to-tr from-orange-400/15 via-amber-300/15 to-transparent rounded-full blur-2xl group-hover:from-orange-400/25 group-hover:via-amber-300/25 transition-all pointer-events-none" />
            <div className="flex items-start justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                {isVi ? 'Đã công bố điểm' : 'Published'}
              </span>
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-orange-500 via-amber-500 to-orange-400 text-white flex items-center justify-center shadow-md shadow-orange-500/25">
                <CheckCircle2 className="w-5 h-5 text-white" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">{gradedAndPublished.length}</span>
              <span className="text-xs font-semibold text-slate-500">{isVi ? 'kết quả' : 'published'}</span>
            </div>
            <p className="mt-1 text-[11px] font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-orange-400" />
              <span>{isVi ? 'Đã có Báo cáo Rubric AI' : 'AI Rubric Ready'}</span>
            </p>
          </div>

          <div className="relative overflow-hidden p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-orange-50/80 via-white to-amber-50/40 dark:from-slate-900 dark:via-slate-900/90 dark:to-orange-950/20 border border-orange-100/90 dark:border-orange-900/30 shadow-xs hover:shadow-md transition-all group">
            <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-gradient-to-tr from-orange-400/15 via-amber-300/15 to-transparent rounded-full blur-2xl group-hover:from-orange-400/25 group-hover:via-amber-300/25 transition-all pointer-events-none" />
            <div className="flex items-start justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                {isVi ? 'Đang chấm / Chờ duyệt' : 'Grading in Queue'}
              </span>
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-orange-500 via-amber-500 to-orange-400 text-white flex items-center justify-center shadow-md shadow-orange-500/25">
                <Clock className="w-5 h-5 text-white" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">{pendingPublish.length + gradingCount}</span>
              <span className="text-xs font-semibold text-slate-500">{isVi ? 'chờ xử lý' : 'pending'}</span>
            </div>
            <p className="mt-1 text-[11px] font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-orange-400" />
              <span>{isVi ? 'Sandbox & Giảng viên duyệt' : 'Under evaluation'}</span>
            </p>
          </div>
        </div>

        {/* Toolbar: Filter Tabs & Search */}
        <div className="p-4 sm:p-5 rounded-2xl shadow-xs bg-gradient-to-br from-orange-50/80 via-white to-amber-50/40 dark:from-slate-900 dark:via-slate-900/90 dark:to-orange-950/20 border border-orange-100/90 dark:border-orange-900/30 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="inline-flex flex-wrap p-1.5 bg-gradient-to-br from-orange-50/80 via-white to-amber-50/40 dark:from-slate-900 dark:via-slate-900/90 dark:to-orange-950/20 rounded-2xl border border-orange-100/90 dark:border-orange-900/30 shadow-xs gap-1">
            <button
              type="button"
              onClick={() => setFilterTab('all')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                filterTab === 'all'
                  ? 'bg-gradient-to-r from-orange-500 via-amber-500 to-orange-500 text-white shadow-md shadow-orange-500/20'
                  : 'text-slate-600 hover:text-orange-600 dark:text-slate-300 dark:hover:text-white hover:bg-orange-50/60'
              }`}
            >
              <span>{isVi ? 'Tất cả' : 'All'}</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold ${filterTab === 'all' ? 'bg-white/20 text-white' : 'bg-orange-100/80 text-orange-700'}`}>
                {submissions.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setFilterTab('published')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                filterTab === 'published'
                  ? 'bg-gradient-to-r from-orange-500 via-amber-500 to-orange-500 text-white shadow-md shadow-orange-500/20'
                  : 'text-slate-600 hover:text-orange-600 dark:text-slate-300 dark:hover:text-white hover:bg-orange-50/60'
              }`}
            >
              <span>{isVi ? 'Đã công bố điểm' : 'Published'}</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold ${filterTab === 'published' ? 'bg-white/20 text-white' : 'bg-orange-100/80 text-orange-700'}`}>
                {gradedAndPublished.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setFilterTab('pending_publish')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                filterTab === 'pending_publish'
                  ? 'bg-gradient-to-r from-orange-500 via-amber-500 to-orange-500 text-white shadow-md shadow-orange-500/20'
                  : 'text-slate-600 hover:text-orange-600 dark:text-slate-300 dark:hover:text-white hover:bg-orange-50/60'
              }`}
            >
              <span>{isVi ? 'Chờ duyệt' : 'Pending review'}</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold ${filterTab === 'pending_publish' ? 'bg-white/20 text-white' : 'bg-orange-100/80 text-orange-700'}`}>
                {pendingPublish.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setFilterTab('grading')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                filterTab === 'grading'
                  ? 'bg-gradient-to-r from-orange-500 via-amber-500 to-orange-500 text-white shadow-md shadow-orange-500/20'
                  : 'text-slate-600 hover:text-orange-600 dark:text-slate-300 dark:hover:text-white hover:bg-orange-50/60'
              }`}
            >
              <span>{isVi ? 'Đang chấm AI' : 'Grading'}</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold ${filterTab === 'grading' ? 'bg-white/20 text-white' : 'bg-orange-100/80 text-orange-700'}`}>
                {gradingCount}
              </span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 absolute left-3 top-3 text-orange-500" />
              <Input
                type="text"
                placeholder={isVi ? 'Tìm theo tên bài tập, mã môn...' : 'Search by assignment, subject...'}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-10 text-xs bg-white dark:bg-slate-900 border-orange-200/80 focus:ring-2 focus:ring-orange-400/25 focus:border-orange-400 rounded-xl"
              />
            </div>

            <RefreshAction onRefresh={() => loadSubmissions(true)} disabled={loading} iconOnly cachePaths={["/submissions"]} />
          </div>
        </div>

        {/* ── Modern Professional Data Table ── */}
        <div className="rounded-2xl border border-orange-100/90 dark:border-orange-900/30 overflow-hidden bg-white dark:bg-slate-900 shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-orange-100/90 dark:border-slate-800 bg-gradient-to-r from-orange-50/70 via-amber-50/40 to-orange-50/50 dark:bg-slate-800/60 text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider whitespace-nowrap">
                  <th className="px-4 py-3.5 w-12 text-center">#</th>
                  <th className="px-4 py-3.5 w-24 text-center">{isVi ? 'Mã môn' : 'Course'}</th>
                  <th className="px-4 py-3.5 min-w-[260px]">{isVi ? 'Bài tập & Source Code' : 'Assignment & Code'}</th>
                  <th className="px-4 py-3.5 w-24 text-center">{isVi ? 'Lần nộp' : 'Attempt'}</th>
                  <th className="px-4 py-3.5 min-w-[160px]">{isVi ? 'Thời gian nộp' : 'Submitted At'}</th>
                  <th className="px-4 py-3.5 w-40 text-center">{isVi ? 'Trạng thái chấm' : 'Grading Status'}</th>
                  <th className="px-4 py-3.5 w-28 text-center">{isVi ? 'Điểm AI' : 'AI Score'}</th>
                  <th className="px-4 py-3.5 w-36 text-right pr-5">{isVi ? 'Thao tác' : 'Actions'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-orange-100/50 dark:divide-slate-800/70">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="p-12 text-center text-slate-400">
                      <RefreshCw className="w-5 h-5 animate-spin mx-auto text-orange-500 mb-2" />
                      <span>{isVi ? 'Đang tải kết quả bài làm...' : 'Loading submission results...'}</span>
                    </td>
                  </tr>
                ) : filteredSubmissions.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-12 text-center text-slate-400">
                      <FileText className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-600 mb-2" />
                      <p className="font-medium text-xs">
                        {isVi ? 'Không tìm thấy bài nộp nào phù hợp bộ lọc.' : 'No submissions found.'}
                      </p>
                    </td>
                  </tr>
                ) : (
                  filteredSubmissions.map((sub: any, idx: number) => {
                    const isGraded = checkIsGraded(sub)
                    const isPublished = checkIsPublished(sub)
                    const assignmentId = sub.assignmentId || sub.examId || sub.ExamId

                    return (
                      <tr
                        key={sub.id || idx}
                        className="hover:bg-slate-50/90 dark:hover:bg-slate-800/50 transition-colors group"
                      >
                        {/* STT */}
                        <td className="px-4 py-3.5 text-center text-slate-400 font-mono font-bold text-xs">
                          {idx + 1}
                        </td>

                        {/* Subject Code */}
                        <td className="px-4 py-3.5 text-center whitespace-nowrap">
                          <span className="inline-flex items-center px-2.5 py-1 rounded-md font-mono text-xs font-bold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/60 border border-blue-200/80 dark:border-blue-800/80 shadow-2xs">
                            {sub.subjectCode || 'SWP391'}
                          </span>
                        </td>

                        {/* Assignment Title & File */}
                        <td className="px-4 py-3.5">
                          <div className="space-y-1.5">
                            <span className="font-bold text-slate-900 dark:text-white text-xs block line-clamp-1 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                              {sub.assignment || sub.assignmentTitle || 'Assignment'}
                            </span>

                            <div className="flex items-center gap-2 text-[11px]">
                              <span className="inline-flex items-center gap-1.5 font-mono text-[11px] font-medium text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 px-2 py-0.5 rounded-md hover:bg-slate-200/70 transition-colors">
                                <FileCode className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                                <span className="truncate max-w-xs">{sub.filename || sub.fileName || 'source.zip'}</span>
                              </span>

                              {sub.isLate && (
                                <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold text-rose-700 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900">
                                  <AlertCircle className="w-2.5 h-2.5" />
                                  <span>{isVi ? 'Trễ hạn' : 'Late'}</span>
                                </span>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Attempt Number */}
                        <td className="px-4 py-3.5 text-center">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md font-mono text-xs font-bold text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/50 border border-purple-200/60 dark:border-purple-800/60">
                            #{sub.attemptNumber || 1}
                          </span>
                        </td>

                        {/* Submitted Time */}
                        <td className="px-4 py-3.5 text-slate-600 dark:text-slate-300">
                          <div className="flex items-center gap-1.5 font-medium text-xs">
                            <Clock className="w-3.5 h-3.5 text-blue-500/70 shrink-0" />
                            <span>{formatDate(sub.submittedAt)}</span>
                          </div>
                        </td>

                        {/* Grading Status */}
                        <td className="px-4 py-3.5 text-center whitespace-nowrap">
                          {isGraded ? (
                            isPublished ? (
                              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800/80 shadow-2xs">
                                <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 stroke-[2.5]" />
                                <span>{isVi ? 'Đã công bố' : 'Published'}</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border border-amber-200/80 dark:border-amber-800/80 shadow-2xs">
                                <span className="w-2 h-2 rounded-full bg-amber-500 shadow-[0_0_6px_rgba(245,158,11,0.7)] shrink-0" />
                                <span>{isVi ? 'Chờ duyệt' : 'Pending review'}</span>
                              </span>
                            )
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-sky-50 dark:bg-sky-950/50 text-sky-700 dark:text-sky-300 border border-sky-200/80 dark:border-sky-800/80 shadow-2xs">
                              <span className="relative flex h-2 w-2 shrink-0">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75" />
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-sky-500" />
                              </span>
                              <span>{isVi ? 'Đang chấm AI' : 'Grading AI'}</span>
                            </span>
                          )}

                          {sub.studentFeedback && (
                            <div className="mt-1">
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-200/60 dark:border-purple-800">
                                <MessageSquare className="w-2.5 h-2.5" />
                                <span>{isVi ? 'Có phúc khảo' : 'Appealed'}</span>
                              </span>
                            </div>
                          )}
                        </td>

                        {/* AI Score */}
                        <td className="px-4 py-3.5 text-center whitespace-nowrap">
                          {isGraded && isPublished ? (
                            <div className="inline-flex flex-col items-center">
                              <div className={`inline-flex items-baseline px-2.5 py-1 rounded-lg border shadow-2xs font-mono ${
                                Number(sub.finalScore ?? sub.score ?? 0) >= 8.5
                                  ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200/80 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300'
                                  : Number(sub.finalScore ?? sub.score ?? 0) >= 6.5
                                  ? 'bg-blue-50 dark:bg-blue-950/60 border-blue-200/80 dark:border-blue-800 text-blue-700 dark:text-blue-300'
                                  : 'bg-amber-50 dark:bg-amber-950/60 border-amber-200/80 dark:border-amber-800 text-amber-700 dark:text-amber-300'
                              }`}>
                                <span className="text-sm font-black">
                                  {Number(sub.finalScore ?? sub.score ?? 0).toFixed(1)}
                                </span>
                                <span className="text-[11px] font-bold opacity-60 ml-0.5">/10</span>
                              </div>
                              {typeof sub.latePenalty === 'number' && sub.latePenalty > 0 && (
                                <p className="text-[10px] text-rose-600 font-semibold leading-none mt-1">
                                  -{sub.latePenalty}đ trễ
                                </p>
                              )}
                            </div>
                          ) : isGraded && !isPublished ? (
                            <span className="px-2.5 py-1 rounded-md text-[11px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                              {isVi ? 'Chưa công bố' : 'Pending'}
                            </span>
                          ) : (
                            <span className="text-slate-400 font-mono text-xs">—</span>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="px-4 py-3.5 text-right pr-5 whitespace-nowrap">
                          {isGraded && isPublished ? (
                            <Link href={`/student/grading/result/${sub.id}`}>
                              <button
                                type="button"
                                className="inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-500 rounded-lg transition-all shadow-xs hover:shadow cursor-pointer group"
                              >
                                <span>{isVi ? 'Xem kết quả' : 'View result'}</span>
                                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                              </button>
                            </Link>
                          ) : assignmentId ? (
                            <Link href={`/student/assignments/${assignmentId}`}>
                              <button
                                type="button"
                                className="inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-blue-700 dark:text-blue-300 hover:text-blue-800 dark:hover:text-blue-200 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/40 dark:hover:bg-blue-900/60 border border-blue-200/80 dark:border-blue-800/80 rounded-lg transition-all shadow-2xs cursor-pointer group"
                              >
                                <span>{isVi ? 'Chi tiết bài' : 'Details'}</span>
                                <ArrowRight className="w-3.5 h-3.5 text-blue-500 group-hover:translate-x-0.5 transition-transform" />
                              </button>
                            </Link>
                          ) : (
                            <span className="text-slate-400 font-mono text-xs">—</span>
                          )}
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
