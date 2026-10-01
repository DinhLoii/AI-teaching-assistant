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
import { formatDate } from '@/lib/utils'
import {
  BookOpen,
  Calendar,
  Clock,
  ArrowRight,
  UploadCloud,
  CheckCircle2,
  FileCode,
  GraduationCap,
  Sparkles,
} from 'lucide-react'

export default function StudentOverviewPage() {
  const [dashboard, setDashboard] = React.useState<any>(null)
  const [loading, setLoading] = React.useState(true)
  const { t } = useLanguage()

  React.useEffect(() => {
    studentPortalApi.getStudentDashboard()
      .then((data) => setDashboard(data))
      .catch((err) => console.error('Failed to load student dashboard:', err))
      .finally(() => setLoading(false))
  }, [])

  const upcoming = dashboard?.upcomingAssignments || []
  const classes = dashboard?.enrolledClasses || []

  return (
    <DashboardLayout
      navItems={STUDENT_NAV}
      title="AITA Student"
      roleLabel={t('profile.role_student', 'Sinh viên')}
      requiredRole="student"
      headerTitle={t('student.dashboard.title', 'Bàn học tập sinh viên')}
      headerSubtitle={t('student.dashboard.subtitle', 'Theo dõi tiến độ bài tập, nộp bài code và xem kết quả chấm Rubric AI')}
    >
      <div className="space-y-6">
        {/* Welcome Banner (Adaptive Light & Dark) */}
        <div className="rounded-3xl p-6 sm:p-8 bg-gradient-to-r from-orange-50 via-amber-50/60 to-blue-50/70 dark:bg-gradient-to-r dark:from-orange-950/40 dark:via-slate-900/90 dark:to-blue-950/30 border border-orange-200/80 dark:border-orange-500/20 relative overflow-hidden flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-xs dark:shadow-xl transition-colors">
          <div className="space-y-2 z-10 max-w-2xl">
            <Badge variant="orange" className="text-xs">
              <Sparkles className="w-3.5 h-3.5 text-orange-500" /> {t('student.dashboard.current_semester', 'Kỳ Học Hiện Tại')}: Spring 2026
            </Badge>
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              {t('student.dashboard.ready', 'Sẵn sàng hoàn thành bài tập lập trình!')}
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              {t('student.dashboard.desc', 'Hệ thống tự động chấm bài liên tục (Continuous Queue) bằng AI sẽ phân tích cấu trúc code, kiểm tra tính đúng đắn và gửi phản hồi ngay sau khi bạn nộp file `.zip`.')}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 z-10 shrink-0">
            <Link href="/student/assignments">
              <Button variant="primary" size="md" className="gap-2 shadow-sm">
                <FileCode className="w-4 h-4" />
                <span>{t('student.dashboard.assignments_btn', 'Nhiệm vụ & Bài tập')}</span>
              </Button>
            </Link>
            <Link href="/student/courses">
              <Button variant="outline" size="md" className="gap-2">
                <BookOpen className="w-4 h-4" />
                <span>{t('student.dashboard.view_courses', 'Môn học')}</span>
              </Button>
            </Link>
          </div>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                {t('student.dashboard.enrolled_classes', 'Lớp Đang Tham Gia')}
              </span>
              <div className="w-8 h-8 rounded-xl bg-orange-50 dark:bg-orange-500/15 text-orange-600 dark:text-orange-400 flex items-center justify-center">
                <BookOpen className="w-4 h-4" />
              </div>
            </div>
            <div className="text-3xl font-extrabold text-slate-900 dark:text-white mt-2">{classes.length}</div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{t('student.dashboard.classes_desc', 'Các lớp học được phân công trong kỳ')}</p>
          </Card>

          <Card className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                {t('student.dashboard.upcoming', 'Bài Tập Sắp Đến Hạn')}
              </span>
              <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <div className="text-3xl font-extrabold text-slate-900 dark:text-white mt-2">{upcoming.length}</div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{t('student.dashboard.upcoming_desc', 'Cần nộp trước thời hạn quy định')}</p>
          </Card>

          <Card className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                {t('student.dashboard.new_notifs', 'Thông Báo Mới')}
              </span>
              <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>
            <div className="text-3xl font-extrabold text-slate-900 dark:text-white mt-2">{dashboard?.unreadNotifications ?? 0}</div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{t('student.dashboard.notifs_desc', 'Cập nhật điểm và thông báo từ lớp học')}</p>
          </Card>
        </div>

        {/* Main Content: Upcoming Assignments & Enrolled Classes */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Upcoming Assignments (2 cols) */}
          <div className="lg:col-span-2 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileCode className="w-4 h-4 text-orange-500" />
                <h3 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">{t('student.dashboard.assignments', 'Bài tập & Kỳ thi cần nộp')}</h3>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold">{upcoming.length} {t('student.dashboard.assignment_count', 'bài tập')}</span>
                <Link href="/student/assignments" className="text-xs font-semibold text-orange-600 dark:text-orange-400 hover:underline">
                  {t('student.dashboard.view_all', 'Xem tất cả')}
                </Link>
              </div>
            </div>

            {loading ? (
              <div className="p-12 text-center text-slate-400 text-sm">{t('student.dashboard.loading', 'Đang tải dữ liệu bài tập...')}</div>
            ) : upcoming.length === 0 ? (
              <Card className="p-8 text-center text-slate-400 border-dashed">
                <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                <p className="text-sm font-semibold text-slate-900 dark:text-white">{t('student.dashboard.all_done', 'Bạn đã hoàn thành tất cả bài tập!')}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{t('student.dashboard.no_upcoming', 'Không có bài tập nào sắp đến hạn trong thời gian này.')}</p>
              </Card>
            ) : (
              <div className="space-y-3">
                {upcoming.map((assign: any) => (
                  <Card
                    key={assign.id}
                    className="p-4 hover:border-orange-500/40 transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 group"
                  >
                    <div className="space-y-1.5 min-w-0">
                      <div className="flex items-center gap-2">
                        <Badge variant="orange" className="text-[10px]">
                          {assign.subjectCode || t('student.dashboard.subject', 'Môn học')}
                        </Badge>
                        <Badge variant="default" className="text-[10px]">
                          {assign.type || 'Assignment'}
                        </Badge>
                      </div>
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-orange-500 transition-colors truncate">
                        {assign.title}
                      </h4>
                      <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" />
                          {t('student.dashboard.deadline', 'Hạn chót')}: {formatDate(assign.due)}
                        </span>
                      </div>
                    </div>

                    <Link href={`/student/assignments/${assign.id}`}>
                      <Button variant="primary" size="sm" className="whitespace-nowrap text-xs font-semibold">
                        <UploadCloud className="w-3.5 h-3.5" />
                        <span>{t('student.dashboard.submit_now', 'Nộp bài ngay')}</span>
                      </Button>
                    </Link>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Enrolled Classes List (1 col) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <GraduationCap className="w-4 h-4 text-blue-500" />
                <h3 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">{t('student.dashboard.my_classes', 'Lớp học của tôi')}</h3>
              </div>
              <Link href="/student/classes" className="text-xs font-semibold text-orange-600 dark:text-orange-400 hover:underline">
                {t('student.dashboard.view_all', 'Xem tất cả')}
              </Link>
            </div>

            <div className="space-y-3">
              {classes.slice(0, 4).map((c: any) => (
                <Card key={c.id} className="p-4 hover:border-blue-500/40 transition-all">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-orange-600 dark:text-orange-400">{c.classCode}</span>
                      <h5 className="text-sm font-semibold text-slate-900 dark:text-white mt-0.5">{c.subject?.name || c.subject?.code}</h5>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">{t('student.dashboard.semester', 'Kỳ')}: {c.semester?.season} {c.semester?.code}</p>
                    </div>
                    <Link href={`/student/classes/${c.id}`}>
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
