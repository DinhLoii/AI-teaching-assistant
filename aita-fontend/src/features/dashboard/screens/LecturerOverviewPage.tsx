'use client'

import * as React from 'react'
import Link from 'next/link'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { LECTURER_NAV } from '@/config/navigation'
import { useLanguage } from '@/providers/language-provider'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { classesApi } from '@/lib/api/modules/classes'
import { assignmentsApi } from '@/lib/api/modules/assignments'
import { submissionsApi } from '@/lib/api/modules/submissions'
import { formatDate } from '@/lib/utils'
import {
  BookOpen,
  FileCheck,
  Users,
  Sparkles,
  ArrowRight,
  Clock,
  CheckCircle2,
} from 'lucide-react'

export default function LecturerOverviewPage() {
  const [classes, setClasses] = React.useState<any[]>([])
  const [exams, setExams] = React.useState<any[]>([])
  const [submissions, setSubmissions] = React.useState<any[]>([])
  const [loading, setLoading] = React.useState(true)
  const { t } = useLanguage()

  React.useEffect(() => {
    Promise.all([
      classesApi.getClasses(1, 1000).catch(() => []),
      assignmentsApi.getAssignments().catch(() => []),
      submissionsApi.getSubmissions().catch(() => []),
    ])
      .then(([cls, exms, subs]) => {
        setClasses(cls || [])
        setExams(exms || [])
        setSubmissions(subs || [])
      })
      .finally(() => setLoading(false))
  }, [])

  const pendingCount = submissions.filter(
    (s) => s.status === 'pending' || s.gradingStatus === 'Pending' || s.gradingStatus === 'Queued'
  ).length
  const gradedCount = submissions.filter(
    (s) => s.status === 'graded' || s.gradingStatus === 'Graded'
  ).length

  return (
    <DashboardLayout
      navItems={LECTURER_NAV}
      title="AITA Lecturer"
      roleLabel={t('profile.role_lecturer', 'Giảng viên')}
      requiredRole="lecturer"
      headerTitle={t('lecturer.dashboard.title', 'Không gian làm việc giảng viên')}
      headerSubtitle={t('lecturer.dashboard.subtitle', 'Quản lý lớp học, cấu hình Rubric AI và giám sát hàng đợi chấm bài')}
    >
      <div className="space-y-6">
        {/* Banner with Quick Action (Harmonious in both Light & Dark) */}
        <div className="rounded-3xl p-6 sm:p-8 bg-gradient-to-r from-orange-50 via-amber-50/60 to-blue-50/70 dark:bg-gradient-to-r dark:from-orange-950/40 dark:via-slate-900/90 dark:to-blue-950/30 border border-orange-200/80 dark:border-orange-500/20 relative overflow-hidden flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-xs dark:shadow-xl transition-colors">
          <div className="space-y-2 z-10 max-w-2xl">
            <Badge variant="orange" className="text-xs">
              <Sparkles className="w-3.5 h-3.5 text-orange-500" /> {t('lecturer.dashboard.ai_assistant', 'Hệ thống Trợ lý Giảng dạy Thông minh')}
            </Badge>
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              {t('lecturer.dashboard.ready', 'Giảng dạy & Chấm bài cùng Trí Tuệ Nhân Tạo')}
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              {t('lecturer.dashboard.desc', 'Tạo đề thi, cấu hình barem Rubric tự động theo Part A, B, C và để hệ thống chấm ngầm liên tục theo thời gian thực giúp bạn tiết kiệm 90% thời gian chấm code.')}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 z-10 shrink-0">
            <Link href="/lecturer/grading/assignments">
              <Button variant="primary" size="md">
                <FileCheck className="w-4 h-4" />
                <span>{t('lecturer.dashboard.manage_assignments', 'Quản Lý Bài Tập')}</span>
              </Button>
            </Link>
          </div>
        </div>

        {/* Stats Bento Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                {t('lecturer.dashboard.teaching_classes', 'Lớp Đang Phụ Trách')}
              </span>
              <div className="w-8 h-8 rounded-xl bg-orange-50 dark:bg-orange-500/15 text-orange-600 dark:text-orange-400 flex items-center justify-center">
                <BookOpen className="w-4 h-4" />
              </div>
            </div>
            <div className="text-3xl font-extrabold text-slate-900 dark:text-white mt-2">{classes.length}</div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{t('lecturer.dashboard.teaching_classes_desc', 'Các lớp SE đang giảng dạy trong kỳ')}</p>
          </Card>

          <Card className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                {t('lecturer.dashboard.total_exams', 'Đề Thi / Assignment')}
              </span>
              <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-500/15 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                <FileCheck className="w-4 h-4" />
              </div>
            </div>
            <div className="text-3xl font-extrabold text-slate-900 dark:text-white mt-2">{exams.length}</div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{t('lecturer.dashboard.total_exams_desc', 'Tổng số bài tập đã ban hành')}</p>
          </Card>

          <Card className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                {t('lecturer.dashboard.pending_grading', 'Bài Cần Chấm (Pending)')}
              </span>
              <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <div className="text-3xl font-extrabold text-slate-900 dark:text-white mt-2">{pendingCount}</div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{t('lecturer.dashboard.pending_grading_desc', 'Đang chờ hoặc đang trong hàng đợi AI')}</p>
          </Card>

          <Card className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                {t('lecturer.dashboard.completed_grading', 'Bài Đã Hoàn Thành')}
              </span>
              <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>
            <div className="text-3xl font-extrabold text-slate-900 dark:text-white mt-2">{gradedCount}</div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{t('lecturer.dashboard.completed_grading_desc', 'Đã có điểm và nhận xét Rubric')}</p>
          </Card>
        </div>

        {/* Two-Column Section: Active Assignments & Classes */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Active Assignments (2 cols) */}
          <div className="lg:col-span-2 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                <FileCheck className="w-4 h-4 text-orange-500" />
                {t('lecturer.dashboard.assignments_list', 'Danh sách Bài tập & Tiến độ nộp bài')}
              </h3>
              <Link href="/lecturer/grading/assignments" className="text-xs font-semibold text-orange-600 dark:text-orange-400 hover:underline">
                {t('lecturer.dashboard.view_all', 'Xem tất cả')}
              </Link>
            </div>

            {loading ? (
              <div className="p-12 text-center text-slate-400 text-sm">{t('lecturer.dashboard.loading', 'Đang tải dữ liệu...')}</div>
            ) : exams.length === 0 ? (
              <Card className="p-8 text-center text-slate-400 border-dashed">
                <p>{t('lecturer.dashboard.no_assignments', 'Chưa có bài tập nào được tạo.')}</p>
              </Card>
            ) : (
              <div className="space-y-3">
                {exams.slice(0, 5).map((exam: any) => (
                  <Card
                    key={exam.id}
                    className="p-4 hover:border-orange-500/40 transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                  >
                    <div className="space-y-1.5 min-w-0">
                      <div className="flex items-center gap-2">
                        <Badge variant="orange" className="text-[10px]">
                          {exam.subjectCode || t('lecturer.dashboard.subject', 'Môn học')}
                        </Badge>
                        <Badge variant="default" className="text-[10px]">
                          {exam.strategy || 'CONTINUOUS_QUEUE'}
                        </Badge>
                      </div>
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white truncate">{exam.title}</h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {t('lecturer.dashboard.deadline', 'Hạn chót')}: {formatDate(exam.due || exam.dueDate)}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <Link href={`/lecturer/assignments/${exam.id}/submissions`}>
                        <Button variant="outline" size="sm" className="text-xs">
                          <Users className="w-3.5 h-3.5" />
                          <span>{t('lecturer.dashboard.view_submissions', 'Xem bài nộp')}</span>
                        </Button>
                      </Link>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Classes (1 col) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-blue-500" />
                {t('lecturer.dashboard.classes_list', 'Lớp học giảng dạy')}
              </h3>
              <Link href="/lecturer/classes" className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline">
                {t('lecturer.dashboard.view_details', 'Chi tiết')}
              </Link>
            </div>

            <div className="space-y-3">
              {classes.slice(0, 5).map((c: any) => (
                <Card key={c.id} className="p-4 hover:border-blue-500/40 transition-all">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-orange-600 dark:text-orange-400">{c.classCode}</span>
                      <h5 className="text-sm font-semibold text-slate-900 dark:text-white mt-0.5">
                        {c.subject?.name || c.subject?.code}
                      </h5>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">{c.studentCount ?? 30} {t('lecturer.dashboard.students', 'sinh viên')}</p>
                    </div>
                    <Link href={`/lecturer/grading/assignments`}>
                      <Button variant="ghost" size="icon" className="text-slate-400 hover:text-slate-700 dark:hover:text-white">
                        <ArrowRight className="w-4 h-4" />
                      </Button>
                    </Link>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
