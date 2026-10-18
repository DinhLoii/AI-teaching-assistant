'use client'

import { RefreshAction } from '@/components/actions/RefreshAction'

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
import { semestersApi } from '@/lib/api/modules/semesters'
import { clearClientApiCache } from '@/lib/api/client'
import {
  Users,
  BookOpen,
  ArrowRight,
  Search,
  Filter,
  FileText,
  RefreshCw,
  AlertTriangle
} from 'lucide-react'

export default function StudentClassesPage() {
  const [classes, setClasses] = React.useState<any[]>([])
  const [semesters, setSemesters] = React.useState<any[]>([])
  const [selectedSemester, setSelectedSemester] = React.useState<string>('all')
  const [searchQuery, setSearchQuery] = React.useState('')
  const [loading, setLoading] = React.useState(true)
  const [refreshing, setRefreshing] = React.useState(false)
  const [status, setStatus] = React.useState('')
  const inFlight = React.useRef(false)
  const hasLoaded = React.useRef(false)
  const sequence = React.useRef(0)
  const [error, setError] = React.useState<string | null>(null)
  const { t, language } = useLanguage()
  const isVi = language === 'vi'

  const loadData = React.useCallback(async (forceRefresh = false) => {
    if (inFlight.current) return
    inFlight.current = true
    const current = ++sequence.current
    const isRefresh = hasLoaded.current
    setLoading(!isRefresh)
    setRefreshing(isRefresh || forceRefresh)
    setStatus('')
    setError(null)
    try {
      if (forceRefresh) {
        clearClientApiCache('/student-portal/dashboard')
        clearClientApiCache('/semesters')
      }
      const options = forceRefresh ? { cache: 'no-store' as const } : {}
      const [dashData, semsData] = await Promise.allSettled([
        studentPortalApi.getStudentDashboard(options).then(data => {
          if (current === sequence.current) {
            setClasses(data?.enrolledClasses || [])
            setLoading(false)
          }
          return data
        }),
        semestersApi.getSemesters(options)
      ])
      if (current !== sequence.current) return

      if (dashData.status === 'fulfilled') {
        setClasses(dashData.value?.enrolledClasses || [])
      } else {
        if (isRefresh) throw dashData.reason
        console.error('Failed to load student dashboard:', dashData.reason)
        try {
          const subjects = await studentPortalApi.getStudentSubjects()
          if (current !== sequence.current) return
          if (Array.isArray(subjects) && subjects.length > 0) {
            setClasses(subjects.map((s: any) => ({
              id: s.classId || s.id,
              classCode: s.classCode || s.code,
              subject: {
                id: s.id,
                code: s.code,
                name: s.name,
                credit: s.credit || 3,
                description: s.description
              },
              semester: s.semester,
              lecturers: s.lecturers || [],
              studentCount: 30,
              assignmentCount: 0
            })))
          } else {
            setClasses([])
          }
        } catch (err) {
          throw err
        }
      }

      if (semsData.status === 'fulfilled') {
        const list = Array.isArray(semsData.value) ? semsData.value : []
        setSemesters(list)
      }
      hasLoaded.current = true
      if (semsData.status === 'rejected') {
        setError(isVi ? 'Đã cập nhật lớp học nhưng chưa tải được danh sách học kỳ. Vui lòng thử lại.' : 'Classes updated, but semesters could not be refreshed. Please try again.')
      } else if (forceRefresh) {
        setStatus(isVi ? 'Đã cập nhật danh sách lớp học.' : 'Class list updated.')
      }
    } catch (err: any) {
      if (current !== sequence.current) return
      console.error('Error loading classes:', err)
      setError(err?.message || (isVi ? 'Không thể tải danh sách lớp học.' : 'Failed to load classes.'))
    } finally {
      if (current === sequence.current) {
        inFlight.current = false
        setLoading(false)
        setRefreshing(false)
      }
    }
  }, [isVi])

  React.useEffect(() => {
    void loadData()
    return () => { sequence.current++; inFlight.current = false }
  }, [loadData])

  const filteredClasses = React.useMemo(() => {
    let list = classes
    if (selectedSemester !== 'all') {
      list = list.filter((cls: any) => {
        const semSeason = cls.semester?.season || cls.semester?.code || ''
        const semLabel = cls.semester?.label || ''
        return (
          semSeason.toLowerCase().includes(selectedSemester.toLowerCase()) ||
          semLabel.toLowerCase().includes(selectedSemester.toLowerCase())
        )
      })
    }
    if (!searchQuery.trim()) return list
    const q = searchQuery.toLowerCase().trim()
    return list.filter((cls: any) => {
      const classCode = (cls.classCode || '').toLowerCase()
      const subjCode = (cls.subject?.code || '').toLowerCase()
      const subjName = (cls.subject?.name || '').toLowerCase()
      const lecturerNames = (cls.lecturers || []).map((l: any) => (l.name || '').toLowerCase()).join(' ')
      return (
        classCode.includes(q) ||
        subjCode.includes(q) ||
        subjName.includes(q) ||
        lecturerNames.includes(q)
      )
    })
  }, [classes, selectedSemester, searchQuery])

  const totalClasses = classes.length
  const totalAssignments = classes.reduce((sum, c) => sum + (c.assignmentCount || 0), 0)

  return (
    <DashboardLayout
      navItems={STUDENT_NAV}
      title="AITA Student"
      roleLabel={t('profile.role_student', 'Sinh viên')}
      requiredRole="student"
      headerTitle={t('student.classes.title', 'Lớp học & Môn học')}
      headerSubtitle={t('student.classes.subtitle', 'Danh sách các lớp học phần sinh viên đang tham gia')}
    >
      <div className="space-y-6 w-full pb-12">
        <p role="status" aria-live="polite" className="sr-only">
          {refreshing ? (isVi ? 'Đang làm mới danh sách lớp học...' : 'Refreshing classes...') : status}
        </p>
        {/* Executive KPI Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="relative overflow-hidden p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-orange-50/80 via-white to-amber-50/40 dark:from-slate-900 dark:via-slate-900/90 dark:to-orange-950/20 border border-orange-100/90 dark:border-orange-900/30 shadow-xs hover:shadow-md transition-all group">
            <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-gradient-to-tr from-orange-400/15 via-amber-300/15 to-transparent rounded-full blur-2xl group-hover:from-orange-400/25 group-hover:via-amber-300/25 transition-all pointer-events-none" />
            <div className="flex items-start justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                {isVi ? 'Tổng lớp học' : 'Enrolled Classes'}
              </span>
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-orange-500 via-amber-500 to-orange-400 text-white flex items-center justify-center shadow-md shadow-orange-500/25">
                <BookOpen className="w-5 h-5 text-white" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">{filteredClasses.length}</span>
              <span className="text-xs font-semibold text-slate-500">{isVi ? 'lớp' : 'classes'}</span>
            </div>
            <p className="mt-1 text-[11px] font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-orange-400" />
              <span>{isVi ? 'Học phần đang mở' : 'Active courses'}</span>
            </p>
          </div>

          <div className="relative overflow-hidden p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-orange-50/80 via-white to-amber-50/40 dark:from-slate-900 dark:via-slate-900/90 dark:to-orange-950/20 border border-orange-100/90 dark:border-orange-900/30 shadow-xs hover:shadow-md transition-all group">
            <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-gradient-to-tr from-orange-400/15 via-amber-300/15 to-transparent rounded-full blur-2xl group-hover:from-orange-400/25 group-hover:via-amber-300/25 transition-all pointer-events-none" />
            <div className="flex items-start justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                {isVi ? 'Bài tập thực hành' : 'Total Tasks'}
              </span>
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-orange-500 via-amber-500 to-orange-400 text-white flex items-center justify-center shadow-md shadow-orange-500/25">
                <FileText className="w-5 h-5 text-white" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">{totalAssignments}</span>
              <span className="text-xs font-semibold text-slate-500">{isVi ? 'nhiệm vụ' : 'tasks'}</span>
            </div>
            <p className="mt-1 text-[11px] font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-orange-400" />
              <span>{isVi ? 'Đang triển khai' : 'In progress'}</span>
            </p>
          </div>

          <div className="relative overflow-hidden p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-orange-50/80 via-white to-amber-50/40 dark:from-slate-900 dark:via-slate-900/90 dark:to-orange-950/20 border border-orange-100/90 dark:border-orange-900/30 shadow-xs hover:shadow-md transition-all group">
            <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-gradient-to-tr from-orange-400/15 via-amber-300/15 to-transparent rounded-full blur-2xl group-hover:from-orange-400/25 group-hover:via-amber-300/25 transition-all pointer-events-none" />
            <div className="flex items-start justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                {isVi ? 'Tổng tín chỉ' : 'Credits'}
              </span>
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-orange-500 via-amber-500 to-orange-400 text-white flex items-center justify-center shadow-md shadow-orange-500/25">
                <Users className="w-5 h-5 text-white" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                {classes.reduce((sum, c) => sum + (c.subject?.credit || 3), 0)}
              </span>
              <span className="text-xs font-semibold text-slate-500">TC</span>
            </div>
            <p className="mt-1 text-[11px] font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-orange-400" />
              <span>{isVi ? 'Tín chỉ đăng ký' : 'Enrolled credits'}</span>
            </p>
          </div>

          <div className="relative overflow-hidden p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-orange-50/80 via-white to-amber-50/40 dark:from-slate-900 dark:via-slate-900/90 dark:to-orange-950/20 border border-orange-100/90 dark:border-orange-900/30 shadow-xs hover:shadow-md transition-all group">
            <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-gradient-to-tr from-orange-400/15 via-amber-300/15 to-transparent rounded-full blur-2xl group-hover:from-orange-400/25 group-hover:via-amber-300/25 transition-all pointer-events-none" />
            <div className="flex items-start justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                {isVi ? 'Học kỳ' : 'Semester'}
              </span>
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-orange-500 via-amber-500 to-orange-400 text-white flex items-center justify-center shadow-md shadow-orange-500/25">
                <BookOpen className="w-5 h-5 text-white" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                {classes[0]?.semester?.season || 'Spring 2026'}
              </span>
            </div>
            <p className="mt-1 text-[11px] font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-orange-400" />
              <span>{isVi ? 'Kỳ học chính khóa' : 'Current term'}</span>
            </p>
          </div>
        </div>

        {/* Compact Filter & Search Bar */}
        <div className="p-4 sm:p-5 rounded-2xl shadow-xs bg-gradient-to-br from-orange-50/80 via-white to-amber-50/40 dark:from-slate-900 dark:via-slate-900/90 dark:to-orange-950/20 border border-orange-100/90 dark:border-orange-900/30 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1 sm:max-w-md">
            <Search className="w-4 h-4 absolute left-3.5 top-3 text-orange-500" />
            <Input
              placeholder={isVi ? 'Tìm mã lớp, mã môn, tên môn...' : 'Search class, subject...'}
              className="pl-9 h-10 text-xs bg-white dark:bg-slate-900 border-orange-200/80 focus:ring-2 focus:ring-orange-400/25 focus:border-orange-400 rounded-xl"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-2.5">
            <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300">
              <Filter className="w-3.5 h-3.5 text-orange-500" />
              <select
                value={selectedSemester}
                onChange={(e) => setSelectedSemester(e.target.value)}
                className="bg-white dark:bg-slate-900 border border-orange-200/80 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-slate-200 outline-none focus:border-orange-400 cursor-pointer shadow-xs"
              >
                <option value="all">{isVi ? 'Tất cả học kỳ' : 'All Semesters'}</option>
                {semesters.map((sem: any) => (
                  <option key={sem.id || sem.season} value={sem.season || sem.id}>
                    {sem.season || sem.name || sem.code || sem.id}
                  </option>
                ))}
              </select>
            </div>

            <RefreshAction onRefresh={() => loadData(true)} disabled={loading} busy={refreshing} cachePaths={[]} />
          </div>
        </div>

        {/* Error State */}
        {error && (
          <div role="alert" className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 text-rose-700 dark:text-rose-300">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
            <Button variant="outline" size="sm" onClick={() => { void loadData(true) }} disabled={loading || refreshing} className="h-7 text-xs px-2.5 rounded-xl">
              {isVi ? 'Thử lại' : 'Retry'}
            </Button>
          </div>
        )}

        {/* Loading State */}
        {loading ? (
          <div className="p-12 text-center text-slate-400 text-xs flex flex-col items-center justify-center gap-2">
            <RefreshCw className="w-5 h-5 animate-spin text-orange-500" />
            <span>{isVi ? 'Đang tải danh sách lớp học...' : 'Loading classes...'}</span>
          </div>
        ) : filteredClasses.length === 0 && !error ? (
          <Card className="p-8 text-center text-slate-400 border-dashed rounded-2xl border-orange-200/80 dark:border-orange-900/30 text-xs">
            <BookOpen className="w-8 h-8 mx-auto text-orange-300 dark:text-orange-600 mb-2" />
            <p>{isVi ? 'Chưa có lớp học nào phù hợp.' : 'No classes found.'}</p>
          </Card>
        ) : (
          /* Cards Grid */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredClasses.map((cls: any) => {
              const subjectCode = cls.subject?.code || cls.classCode?.split('-')?.[0] || 'SUBJ'
              const subjectName = cls.subject?.name || cls.classCode || 'Môn học'
              const credits = cls.subject?.credit || 3
              const primaryLecturer = cls.lecturers?.[0]
              const lecturerName = primaryLecturer?.name || (isVi ? 'Giảng viên Bộ môn' : 'Instructor')
              const studentCount = cls.studentCount || 0
              const assignmentCount = cls.assignmentCount ?? 0

              return (
                <div
                  key={cls.id}
                  className="rounded-2xl bg-white dark:bg-slate-900 p-5 border border-orange-100/90 dark:border-orange-900/30 hover:border-orange-300 dark:hover:border-orange-700/60 shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    {/* Header info */}
                    <div className="flex items-center justify-between gap-1.5">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold px-2.5 py-0.5 rounded-lg bg-orange-50 dark:bg-orange-950/40 text-orange-700 dark:text-orange-300 border border-orange-200/80 dark:border-orange-900/60 font-mono">
                          {subjectCode}
                        </span>
                        <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                          {cls.classCode}
                        </span>
                      </div>
                      <span className="text-xs text-orange-600 dark:text-orange-400 font-bold">
                        {credits} TC
                      </span>
                    </div>

                    {/* Subject Title */}
                    <Link href={`/student/classes/${cls.id}`} className="block group">
                      <h3 className="text-base font-bold text-slate-900 dark:text-white group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors line-clamp-1">
                        {subjectName}
                      </h3>
                    </Link>

                    {/* Lecturer & Class stats */}
                    <div className="text-xs text-slate-500 dark:text-slate-400 space-y-1.5 pt-2 border-t border-orange-100/60 dark:border-slate-800/80">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-slate-400">{isVi ? 'GV:' : 'Lecturer:'}</span>
                        <span className="text-slate-700 dark:text-slate-300 font-semibold truncate max-w-[170px]">
                          {lecturerName}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-500">{studentCount} {isVi ? 'sinh viên' : 'students'}</span>
                        <span className="font-semibold text-orange-600 dark:text-orange-400">{assignmentCount} {isVi ? 'bài tập' : 'tasks'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Footer link */}
                  <div className="pt-3.5 mt-3 border-t border-orange-100/60 dark:border-slate-800 flex items-center justify-between">
                    <span className="text-xs text-slate-400 font-medium">
                      {cls.semester?.season || 'Spring 2026'}
                    </span>
                    <Link
                      href={`/student/classes/${cls.id}`}
                      className="text-xs font-bold text-orange-600 dark:text-orange-400 hover:text-orange-700 dark:hover:text-orange-300 flex items-center gap-1 transition-colors"
                    >
                      <span>{isVi ? 'Vào lớp' : 'Enter'}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
