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
  const { t } = useLanguage()

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
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-orange-500 dark:text-orange-400" />
            {t('lecturer.classes.list_title', 'Lớp học đang phụ trách')} ({classes.length})
          </h2>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-500 dark:text-slate-400 text-sm">{t('ui.loading_classes', 'Đang tải danh sách lớp học...')}</div>
        ) : classes.length === 0 ? (
          <Card className="p-8 text-center text-slate-500 dark:text-slate-400 border-dashed">
            <p>{t('lecturer.classes.empty', 'Chưa có lớp học nào được phân công.')}</p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {classes.map((c: any) => (
              <Card key={c.id} className="p-6 hover:border-orange-500/40 transition-all flex flex-col justify-between space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Badge variant="orange" className="font-mono text-xs">
                      {c.classCode}
                    </Badge>
                    <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                      <Users className="w-3.5 h-3.5 text-blue-500 dark:text-blue-400" />
                      {c.studentCount ?? 30} {t('lecturer.classes.students', 'SV')}
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    {c.subject?.name || c.subject?.code}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {t('lecturer.classes.subject_code', 'Mã môn')}: <span className="text-slate-700 dark:text-slate-200 font-mono font-medium">{c.subject?.code}</span>
                  </p>
                </div>

                <div className="pt-4 border-t border-slate-100 dark:border-slate-800/60 flex items-center justify-between">
                  <span className="text-xs text-slate-500 dark:text-slate-400">{t('lecturer.classes.semester', 'Kỳ: Spring 2026')}</span>
                  <Link href={`/lecturer/classes/${c.id}`}>
                    <Button variant="ghost" size="sm" className="text-xs text-orange-600 dark:text-orange-400 hover:text-orange-700 dark:hover:text-orange-300 gap-1">
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
