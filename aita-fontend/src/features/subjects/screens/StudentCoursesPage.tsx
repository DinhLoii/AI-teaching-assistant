'use client'

import * as React from 'react'
import Link from 'next/link'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { STUDENT_NAV } from '@/config/navigation'
import { useLanguage } from '@/providers/language-provider'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { studentPortalApi } from '@/lib/api/modules/student-portal'
import { subjectsApi } from '@/lib/api/modules/subjects'
import { semestersApi } from '@/lib/api/modules/semesters'
import { BookOpen, ArrowRight, Search, Filter, AlertTriangle, RefreshCw, Layers, CheckCircle2 } from 'lucide-react'

export default function StudentCoursesPage() {
  const [subjects, setSubjects] = React.useState<any[]>([])
  const [semesters, setSemesters] = React.useState<any[]>([])
  const [selectedSemester, setSelectedSemester] = React.useState<string>('all')
  const [viewTab, setViewTab] = React.useState<'enrolled' | 'all'>('enrolled')
  const [searchQuery, setSearchQuery] = React.useState('')
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const { t } = useLanguage()

  // Load semesters list
  React.useEffect(() => {
    semestersApi.getSemesters()
      .then((data) => {
        const list = Array.isArray(data) ? data : []
        setSemesters(list)
      })
      .catch((err) => {
        console.error('Failed to load semesters:', err)
      })
  }, [])

  const loadCourses = React.useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      if (viewTab === 'enrolled') {
        const semParam = selectedSemester === 'all' ? undefined : selectedSemester
        const data = await studentPortalApi.getStudentSubjects(semParam)
        if (Array.isArray(data)) {
          setSubjects(data)
        } else {
          setSubjects([])
        }
      } else {
        const res: any = await subjectsApi.getSubjects(1, 1000)
        const list = Array.isArray(res) ? res : res?.data || []
        setSubjects(list)
      }
    } catch (err: any) {
      console.error('Failed to load courses:', err)
      setError(err?.message || t('student.courses.load_error', 'Không thể kết nối máy chủ để tải danh sách môn học. Vui lòng thử lại.'))
      setSubjects([])
    } finally {
      setLoading(false)
    }
  }, [viewTab, selectedSemester, t])

  React.useEffect(() => {
    loadCourses()
  }, [loadCourses])

  const filteredSubjects = React.useMemo(() => {
    let list = subjects
    if (selectedSemester !== 'all' && viewTab === 'all') {
      list = list.filter((sub: any) => {
        const rawSem = sub.semester && typeof sub.semester === 'object'
          ? (sub.semester.season || sub.semester.label || sub.semester.code || '')
          : (sub.semester || sub.semesterSeason || sub.SemesterSeason || '')
        const subSem = String(rawSem)
        return subSem.toLowerCase().includes(selectedSemester.toLowerCase())
      })
    }
    if (!searchQuery.trim()) return list
    const q = searchQuery.toLowerCase().trim()
    return list.filter((sub: any) => {
      const code = (sub.code || sub.SubjectCode || '').toLowerCase()
      const name = (sub.name || sub.SubjectName || '').toLowerCase()
      return code.includes(q) || name.includes(q)
    })
  }, [subjects, selectedSemester, viewTab, searchQuery])

  return (
    <DashboardLayout
      navItems={STUDENT_NAV}
      title="AITA Student"
      roleLabel={t('profile.role_student', 'Sinh viên')}
      requiredRole="student"
      headerTitle={t('student.courses.title', 'Môn học của tôi')}
      headerSubtitle={t('student.courses.subtitle', 'Danh sách các môn học CNTT và chương trình đào tạo')}
    >
      <div className="space-y-6 max-w-7xl mx-auto pb-12">
        {/* Controls Bar */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs">
          {/* Tabs: Enrolled vs All */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl">
            <button
              onClick={() => setViewTab('enrolled')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                viewTab === 'enrolled'
                  ? 'bg-orange-500 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{t('student.courses.enrolled_tab', 'Môn đang học (Enrolled)')}</span>
            </button>
            <button
              onClick={() => setViewTab('all')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                viewTab === 'all'
                  ? 'bg-orange-500 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>{t('student.courses.all_tab', 'Tất cả môn học (All)')}</span>
            </button>
          </div>

          {/* Filters & Search */}
          <div className="flex items-center gap-3 flex-wrap">
            {/* Semester selector */}
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={selectedSemester}
                onChange={(e) => setSelectedSemester(e.target.value)}
                className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-orange-500"
              >
                <option value="all">{t('student.courses.all_semesters', 'Tất cả học kỳ')}</option>
                {semesters.map((sem: any) => (
                  <option key={sem.id || sem.season} value={sem.season || sem.id}>
                    {sem.season || sem.name || sem.id}
                  </option>
                ))}
              </select>
            </div>

            {/* Search */}
            <div className="relative w-full sm:w-60">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <Input
                placeholder={t('student.courses.search_placeholder', 'Tìm theo mã hoặc tên môn...')}
                className="pl-9 h-9 text-xs"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Section Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-orange-500 dark:text-orange-400" />
            {viewTab === 'enrolled'
              ? t('student.courses.enrolled_title', 'Môn học đã đăng ký trong chương trình')
              : t('student.courses.all_title', 'Toàn bộ danh mục môn học')}
            <span className="text-sm font-normal text-slate-500 ml-1">({filteredSubjects.length})</span>
          </h2>
        </div>

        {/* Error State Banner */}
        {error && (
          <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-rose-100 dark:bg-rose-900/50 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-rose-800 dark:text-rose-300">
                  {t('ui.error', 'Lỗi tải dữ liệu')}
                </h4>
                <p className="text-xs text-rose-600 dark:text-rose-400 mt-0.5">
                  {error}
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={loadCourses}
              className="text-xs gap-1.5 border-rose-300 dark:border-rose-800 hover:bg-rose-100 dark:hover:bg-rose-900/50 shrink-0"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>{t('ui.retry', 'Thử lại')}</span>
            </Button>
          </div>
        )}

        {/* Loading State */}
        {loading ? (
          <div className="p-16 text-center text-slate-500 dark:text-slate-400 text-sm flex flex-col items-center justify-center gap-2">
            <RefreshCw className="w-5 h-5 animate-spin text-orange-500" />
            <span>{t('ui.loading', 'Đang tải danh sách môn học...')}</span>
          </div>
        ) : filteredSubjects.length === 0 && !error ? (
          <Card className="p-12 text-center text-slate-500 dark:text-slate-400 border-dashed rounded-2xl">
            <BookOpen className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-600 mb-3" />
            <p className="text-sm font-medium">
              {searchQuery
                ? t('student.courses.no_search_results', 'Không tìm thấy môn học nào khớp với từ khóa tìm kiếm.')
                : viewTab === 'enrolled'
                ? t('student.courses.empty_enrolled', 'Chưa có môn học nào được đăng ký trong kỳ được chọn.')
                : t('student.courses.empty_all', 'Không có môn học nào trong hệ thống.')}
            </p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredSubjects.map((sub: any) => {
              const credits = sub.credit ?? sub.credits ?? 3
              const code = sub.code || sub.SubjectCode || ''
              const name = sub.name || sub.SubjectName || ''
              return (
                <Card
                  key={sub.id || code}
                  className="p-6 hover:border-orange-500/40 transition-all flex flex-col justify-between group bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xs hover:shadow-md"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Badge variant="orange" className="font-mono text-xs font-bold">
                        {code}
                      </Badge>
                      <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                        {credits} {t('student.courses.credits', 'Tín chỉ')}
                      </span>
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-slate-900 dark:text-white group-hover:text-orange-500 dark:group-hover:text-orange-400 transition-colors">
                        {name}
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mt-1">
                        {sub.description || t('student.courses.default_desc', 'Chương trình đào tạo kỹ thuật phần mềm chuẩn Đại học FPT.')}
                      </p>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-100 dark:border-slate-800/60 mt-4 flex items-center justify-between">
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">
                      {sub.semester && typeof sub.semester === 'object'
                        ? (sub.semester.season || sub.semester.label || sub.semester.code)
                        : (sub.semester || sub.semesterSeason || (viewTab === 'enrolled' ? t('student.courses.status_enrolled', 'Đã ghi danh') : t('student.courses.status_available', 'Có sẵn')))}
                    </span>
                    <Link href={`/student/courses/${encodeURIComponent(code)}`}>
                      <Button variant="ghost" size="sm" className="text-xs text-orange-600 dark:text-orange-400 hover:text-orange-700 dark:hover:text-orange-300 gap-1 font-semibold">
                        <span>{t('student.courses.enter', 'Vào môn')}</span>
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
