'use client'

import * as React from 'react'
import Link from 'next/link'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { LECTURER_NAV } from '@/config/navigation'
import { useLanguage } from '@/providers/language-provider'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { classesApi } from '@/lib/api/modules/classes'
import { BookOpen, Users, ArrowRight, School } from 'lucide-react'

export default function LecturerClassesPage() {
  const [classes, setClasses] = React.useState<any[]>([])
  const [loading, setLoading] = React.useState(true)
  const { t, language } = useLanguage()
  const isVi = language === 'vi'
  const semesterCodes = [...new Set(classes.map(c => c.semester?.code).filter(Boolean))]

  React.useEffect(() => {
    classesApi.getClasses(1, 1000)
      .then((res: any) => setClasses(Array.isArray(res) ? res : res?.data || []))
      .catch(() => setClasses([]))
      .finally(() => setLoading(false))
  }, [])

  return (
    <DashboardLayout
      navItems={LECTURER_NAV}
      title="AITA Lecturer"
      roleLabel={t('profile.role_lecturer', 'Giảng viên')}
      requiredRole="lecturer"
      headerTitle={t('lecturer.classes.title', 'Lớp học phụ trách')}
      headerSubtitle={t('lecturer.classes.subtitle', 'Quản lý danh sách sinh viên, thời khóa biểu và đề thi theo từng lớp')}
    >
      <div className="space-y-6">
        {/* Executive KPI Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="relative overflow-hidden p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-orange-50/80 via-white to-amber-50/40 dark:from-slate-900 dark:via-slate-900/90 dark:to-orange-950/20 border border-orange-100/90 dark:border-orange-900/30 shadow-xs hover:shadow-md transition-all group">
            <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-gradient-to-tr from-orange-400/15 via-amber-300/15 to-transparent rounded-full blur-2xl group-hover:from-orange-400/25 group-hover:via-amber-300/25 transition-all pointer-events-none" />
            <div className="flex items-start justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                {t('lecturer.classes.stat_total', 'Tổng lớp phụ trách')}
              </span>
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-orange-500 via-amber-500 to-orange-400 text-white flex items-center justify-center shadow-md shadow-orange-500/25">
                <BookOpen className="w-5 h-5 text-white" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">{classes.length}</span>
              <span className="text-xs font-semibold text-slate-500">lớp</span>
            </div>
            <p className="mt-1 text-[11px] font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-orange-400" />
              <span>Đang mở trong học kỳ</span>
            </p>
          </div>

          <div className="relative overflow-hidden p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-orange-50/80 via-white to-amber-50/40 dark:from-slate-900 dark:via-slate-900/90 dark:to-orange-950/20 border border-orange-100/90 dark:border-orange-900/30 shadow-xs hover:shadow-md transition-all group">
            <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-gradient-to-tr from-orange-400/15 via-amber-300/15 to-transparent rounded-full blur-2xl group-hover:from-orange-400/25 group-hover:via-amber-300/25 transition-all pointer-events-none" />
            <div className="flex items-start justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                {t('lecturer.classes.stat_students', 'Tổng sinh viên')}
              </span>
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-orange-500 via-amber-500 to-orange-400 text-white flex items-center justify-center shadow-md shadow-orange-500/25">
                <Users className="w-5 h-5 text-white" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                {classes.reduce((sum, c) => sum + (c.studentCount ?? 0), 0)}
              </span>
              <span className="text-xs font-semibold text-slate-500">SV</span>
            </div>
            <p className="mt-1 text-[11px] font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-orange-400" />
              <span>Ghi danh chính thức</span>
            </p>
          </div>

          <div className="relative overflow-hidden p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-orange-50/80 via-white to-amber-50/40 dark:from-slate-900 dark:via-slate-900/90 dark:to-orange-950/20 border border-orange-100/90 dark:border-orange-900/30 shadow-xs hover:shadow-md transition-all group">
            <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-gradient-to-tr from-orange-400/15 via-amber-300/15 to-transparent rounded-full blur-2xl group-hover:from-orange-400/25 group-hover:via-amber-300/25 transition-all pointer-events-none" />
            <div className="flex items-start justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                {t('lecturer.classes.stat_subjects', 'Môn học')}
              </span>
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-orange-500 via-amber-500 to-orange-400 text-white flex items-center justify-center shadow-md shadow-orange-500/25">
                <School className="w-5 h-5 text-white" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                {new Set(classes.map(c => c.subject?.code || c.subjectId)).size || classes.length}
              </span>
              <span className="text-xs font-semibold text-slate-500">học phần</span>
            </div>
            <p className="mt-1 text-[11px] font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-orange-400" />
              <span>Chương trình chuyên ngành</span>
            </p>
          </div>

          <div className="relative overflow-hidden p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-orange-50/80 via-white to-amber-50/40 dark:from-slate-900 dark:via-slate-900/90 dark:to-orange-950/20 border border-orange-100/90 dark:border-orange-900/30 shadow-xs hover:shadow-md transition-all group">
            <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-gradient-to-tr from-orange-400/15 via-amber-300/15 to-transparent rounded-full blur-2xl group-hover:from-orange-400/25 group-hover:via-amber-300/25 transition-all pointer-events-none" />
            <div className="flex items-start justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                {t('lecturer.classes.stat_semester', 'Học kỳ')}
              </span>
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-orange-500 via-amber-500 to-orange-400 text-white flex items-center justify-center shadow-md shadow-orange-500/25">
                <BookOpen className="w-5 h-5 text-white" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                {semesterCodes.length === 1 ? semesterCodes[0] : `${semesterCodes.length} ${isVi ? 'học kỳ' : 'semesters'}`}
              </span>
            </div>
            <p className="mt-1 text-[11px] font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-orange-400" />
              <span>{isVi ? 'Học kỳ của các lớp được phân công' : 'Semesters of assigned classes'}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-orange-500 dark:text-orange-400" />
            {t('lecturer.classes.list_title', 'Danh sách lớp học phụ trách')} ({classes.length})
          </h2>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-500 dark:text-slate-400 text-sm">{t('ui.loading_classes', 'Đang tải danh sách lớp học...')}</div>
        ) : classes.length === 0 ? (
          <Card className="p-8 text-center text-slate-500 dark:text-slate-400 border-dashed rounded-2xl border-orange-200/80 dark:border-orange-900/30">
            <p>{t('lecturer.classes.empty', 'Chưa có lớp học nào được phân công.')}</p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {classes.map((c: any) => (
              <Card key={c.id} className="p-6 rounded-2xl border border-orange-100/90 dark:border-orange-900/30 hover:border-orange-300 dark:hover:border-orange-700/60 transition-all flex flex-col justify-between space-y-4 shadow-xs hover:shadow-md bg-white dark:bg-slate-900">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-0.5 rounded-lg text-xs font-mono font-bold bg-orange-50 dark:bg-orange-950/40 text-orange-700 dark:text-orange-300 border border-orange-200/80 dark:border-orange-900/60">
                      {c.code}
                    </span>
                    <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1 font-medium">
                      <Users className="w-3.5 h-3.5 text-orange-500" />
                      {c.studentCount ?? 0} {t('lecturer.classes.students', 'SV')}
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    {c.subject?.name || c.subject?.code}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {t('lecturer.classes.subject_code', 'Mã môn')}: <span className="text-orange-700 dark:text-orange-300 font-mono font-bold">{c.subject?.code}</span>
                  </p>
                </div>

                <div className="pt-4 border-t border-orange-100/70 dark:border-slate-800/60 flex items-center justify-between">
                  <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                    {isVi ? 'Học kỳ' : 'Semester'}: {c.semester?.code || c.semester?.season || '—'}
                  </span>
                  <Link href={`/lecturer/classes/${c.id}`}>
                    <Button variant="ghost" size="sm" className="text-xs text-orange-600 dark:text-orange-400 hover:text-orange-700 dark:hover:text-orange-300 hover:bg-orange-50 dark:hover:bg-orange-950/30 gap-1 font-bold">
                      <span>{t('lecturer.classes.class_exercises', 'Bài tập lớp')}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Button>
                  </Link>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
