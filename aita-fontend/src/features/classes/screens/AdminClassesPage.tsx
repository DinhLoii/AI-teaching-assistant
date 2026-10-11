'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { ADMIN_NAV } from '@/config/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Modal } from '@/components/ui/modal'
import { ErrorNotice, Pagination } from '@/components/ui/feedback'
import { classesApi } from '@/lib/api/modules/classes'
import { subjectsApi } from '@/lib/api/modules/subjects'
import { semestersApi } from '@/lib/api/modules/semesters'
import { usersApi } from '@/lib/api/modules/users'
import { errorMessage } from '@/lib/api/errors'
import type { ClassRow, CreateClassBody, SemesterRow, SubjectRow, UserRow } from '@/lib/api/contracts'
import { useAuth } from '@/providers/auth-provider'
import { useLanguage } from '@/providers/language-provider'
import Link from 'next/link'
import { ExternalLink, GraduationCap, Users, BookOpen, Calendar, Sparkles, School } from 'lucide-react'

const blankForm = { code: '', subjectId: '', semesterId: '', lecturerId: '' }
const selectStyle = 'w-full rounded-xl border border-slate-300 bg-white p-2.5 text-xs dark:border-slate-700 dark:bg-slate-900 focus:outline-none focus:border-[#FA7014]'

// Selectors require available IDs; the class list remains server-paginated.
async function loadOptions<T>(fetchPage: (page: number, limit: number) => Promise<T[]>): Promise<T[]> {
  const rows: T[] = []
  for (let page = 1; ; page++) {
    const batch = await fetchPage(page, 50)
    rows.push(...batch)
    if (batch.length < 50) return rows
  }
}

export default function AdminClassesPage() {
  const { isAuthenticated, role } = useAuth()
  const { t } = useLanguage()
  const [classes, setClasses] = useState<ClassRow[]>([])
  const [subjects, setSubjects] = useState<SubjectRow[]>([])
  const [semesters, setSemesters] = useState<SemesterRow[]>([])
  const [lecturers, setLecturers] = useState<UserRow[]>([])
  const [allStudents, setAllStudents] = useState<any[]>([])
  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<string>>(new Set())
  const [studentCohortFilter, setStudentCohortFilter] = useState('all')
  const [studentMajorFilter, setStudentMajorFilter] = useState('all')
  const [studentSearch, setStudentSearch] = useState('')

  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [hasNext, setHasNext] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [optionsLoading, setOptionsLoading] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState(blankForm)
  const sequence = useRef({ value: 0 })

  const loadClasses = useCallback(async () => {
    if (!isAuthenticated || role !== 'admin') return
    const requestId = ++sequence.current.value
    setLoading(true)
    return Promise.all([classesApi.getClasses(page, 10, search), classesApi.getClasses(page + 1, 10, search)]).then(([rows, next]) => {
      if (requestId !== sequence.current.value) return
      setClasses(rows)
      setError(null)
      setHasNext(next.length > 0)
    }).catch(cause => {
      if (requestId === sequence.current.value) setError(errorMessage(cause))
    }).finally(() => {
      if (requestId === sequence.current.value) setLoading(false)
    })
  }, [isAuthenticated, role, page, search])

  useEffect(() => {
    const tracker = sequence.current
    const handler = setTimeout(() => {
      void loadClasses()
    }, 300)
    return () => { tracker.value++; clearTimeout(handler) }
  }, [loadClasses])

  async function openForm(row?: ClassRow) {
    setEditingId(row?.id ?? null)
    setForm(row ? {
      code: row.code,
      subjectId: typeof row.subject === 'object' && row.subject ? row.subject.id : '',
      semesterId: typeof row.semester === 'object' && row.semester ? row.semester.id : '',
      lecturerId: row.lecturers?.[0]?.id ?? '',
    } : blankForm)
    setFormError(null)
    setSelectedStudentIds(new Set())
    setStudentCohortFilter('all')
    setStudentMajorFilter('all')
    setStudentSearch('')
    setModalOpen(true)
    setOptionsLoading(true)
    try {
      const [subjectRows, semesterRows, lecturerRows, studentRows] = await Promise.all([
        loadOptions(subjectsApi.getSubjects),
        semestersApi.getSemesters(),
        usersApi.getUsers('lecturer', 1, 100),
        usersApi.getUsers('student', 1, 200),
      ])
      setSubjects(subjectRows)
      setSemesters(semesterRows)
      setLecturers(lecturerRows)
      setAllStudents(Array.isArray(studentRows) ? studentRows : [])
    } catch (cause) { setFormError(errorMessage(cause)) }
    finally { setOptionsLoading(false) }
  }

  // Filter students based on cohort, major, and search text
  const filteredStudents = allStudents.filter(st => {
    const code = (st.studentCode || st.code || '').toUpperCase()
    const name = (st.name || st.fullName || '').toLowerCase()
    const email = (st.email || '').toLowerCase()
    const searchMatch = !studentSearch || name.includes(studentSearch.toLowerCase()) || code.includes(studentSearch.toUpperCase()) || email.includes(studentSearch.toLowerCase())
    if (!searchMatch) return false

    // Cohort filter (K17, K18, K19...)
    if (studentCohortFilter !== 'all') {
      const cohortDigits = studentCohortFilter.replace('K', '')
      if (!code.includes(cohortDigits)) return false
    }

    // Major filter (SE, IA, AI, IS, GD...)
    if (studentMajorFilter !== 'all') {
      if (!code.startsWith(studentMajorFilter)) return false
    }

    return true
  })

  const toggleStudent = (id: string) => {
    setSelectedStudentIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const selectAllFilteredStudents = () => {
    setSelectedStudentIds(prev => {
      const next = new Set(prev)
      filteredStudents.forEach(st => next.add(st.id))
      return next
    })
  }

  const clearAllSelectedStudents = () => {
    setSelectedStudentIds(new Set())
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    if (saving || optionsLoading) return
    setSaving(true)
    setFormError(null)
    const payload: CreateClassBody = {
      code: form.code.trim(),
      subjectId: form.subjectId,
      ...(form.semesterId ? { semesterId: form.semesterId } : {}),
      ...(form.lecturerId ? { lecturerId: form.lecturerId } : {}),
      studentIds: Array.from(selectedStudentIds),
    }
    try {
      if (editingId) {
        await classesApi.updateClass(editingId, { ...payload, keepExistingInstructors: false })
        // If editing and selected students to add
        if (selectedStudentIds.size > 0) {
          for (const sId of selectedStudentIds) {
            try { await classesApi.enrollStudent(editingId, sId) } catch { /* ignore duplicate */ }
          }
        }
      } else {
        await classesApi.createClass(payload)
      }
      setModalOpen(false)
      await loadClasses()
    } catch (cause) { setFormError(errorMessage(cause)) }
    finally { setSaving(false) }
  }

  async function deleteClass(row: ClassRow) {
    if (!window.confirm(t('admin.classes.confirm_delete', 'Xóa lớp {{code}}?').replace('{{code}}', row.code))) return
    setSaving(true)
    try {
      await classesApi.deleteClass(row.id)
      if (classes.length === 1 && page > 1) setPage(page - 1)
      else await loadClasses()
    } catch (cause) { setError(errorMessage(cause)) }
    finally { setSaving(false) }
  }

  // Derived statistics for executive KPI cards
  const totalClassesCount = classes.length
  const assignedLecturerCount = classes.filter(c => c.lecturers && c.lecturers.length > 0).length
  const totalStudentsEnrolled = classes.reduce((sum, c) => sum + (c.studentCount ?? 0), 0)

  return (
    <DashboardLayout
      navItems={ADMIN_NAV}
      title="AITA Admin"
      roleLabel={t('profile.role_admin', 'Quản trị viên')}
      requiredRole="admin"
      headerTitle={t('admin.classes.title', 'Quản lý lớp học phần')}
      headerSubtitle={t('admin.classes.subtitle', 'Môn học, học kỳ và phân công giảng viên')}
    >
      <div className="space-y-6 max-w-7xl mx-auto pb-12">
        {/* ── 1. SIGNATURE EXECUTIVE KPI CARDS ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* KPI 1: Tổng số lớp */}
          <div className="relative overflow-hidden p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-orange-50/80 via-white to-amber-50/40 dark:from-slate-900 dark:via-slate-900/90 dark:to-orange-950/20 border border-orange-100/90 dark:border-orange-900/30 shadow-xs hover:shadow-md transition-all group">
            <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-gradient-to-tr from-orange-400/15 via-amber-300/15 to-transparent rounded-full blur-2xl group-hover:from-orange-400/25 group-hover:via-amber-300/25 transition-all pointer-events-none" />
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Tổng Lớp Học Phần
              </span>
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-orange-500 via-amber-500 to-orange-400 text-white flex items-center justify-center shadow-md shadow-orange-500/25">
                <BookOpen className="w-5 h-5" />
              </div>
            </div>
            <div className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              {loading ? '…' : totalClassesCount}
            </div>
            <div className="flex items-center gap-1.5 mt-2 text-[11px] font-medium text-slate-500 dark:text-slate-400">
              <span className="w-1.5 h-1.5 rounded-full bg-orange-400" />
              <span>Đang mở trong kỳ hiện tại</span>
            </div>
          </div>

          {/* KPI 2: Đã phân công giảng viên */}
          <div className="relative overflow-hidden p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-orange-50/80 via-white to-amber-50/40 dark:from-slate-900 dark:via-slate-900/90 dark:to-orange-950/20 border border-orange-100/90 dark:border-orange-900/30 shadow-xs hover:shadow-md transition-all group">
            <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-gradient-to-tr from-orange-400/15 via-amber-300/15 to-transparent rounded-full blur-2xl group-hover:from-orange-400/25 group-hover:via-amber-300/25 transition-all pointer-events-none" />
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Đã Gán Giảng Viên
              </span>
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-orange-500 via-amber-500 to-orange-400 text-white flex items-center justify-center shadow-md shadow-orange-500/25">
                <School className="w-5 h-5" />
              </div>
            </div>
            <div className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              {loading ? '…' : assignedLecturerCount}
            </div>
            <div className="flex items-center gap-1.5 mt-2 text-[11px] font-medium text-slate-500 dark:text-slate-400">
              <span className="w-1.5 h-1.5 rounded-full bg-orange-400" />
              <span>{Math.round((assignedLecturerCount / (totalClassesCount || 1)) * 100)}% lớp có GV đứng lớp</span>
            </div>
          </div>

          {/* KPI 3: Sinh viên ghi danh */}
          <div className="relative overflow-hidden p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-orange-50/80 via-white to-amber-50/40 dark:from-slate-900 dark:via-slate-900/90 dark:to-orange-950/20 border border-orange-100/90 dark:border-orange-900/30 shadow-xs hover:shadow-md transition-all group">
            <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-gradient-to-tr from-orange-400/15 via-amber-300/15 to-transparent rounded-full blur-2xl group-hover:from-orange-400/25 group-hover:via-amber-300/25 transition-all pointer-events-none" />
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Lượt Ghi Danh SV
              </span>
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-orange-500 via-amber-500 to-orange-400 text-white flex items-center justify-center shadow-md shadow-orange-500/25">
                <Users className="w-5 h-5" />
              </div>
            </div>
            <div className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              {loading ? '…' : totalStudentsEnrolled}
            </div>
            <div className="flex items-center gap-1.5 mt-2 text-[11px] font-medium text-slate-500 dark:text-slate-400">
              <span className="w-1.5 h-1.5 rounded-full bg-orange-400" />
              <span>Sinh viên đã vào lớp</span>
            </div>
          </div>

          {/* KPI 4: Học kỳ áp dụng */}
          <div className="relative overflow-hidden p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-orange-50/80 via-white to-amber-50/40 dark:from-slate-900 dark:via-slate-900/90 dark:to-orange-950/20 border border-orange-100/90 dark:border-orange-900/30 shadow-xs hover:shadow-md transition-all group">
            <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-gradient-to-tr from-orange-400/15 via-amber-300/15 to-transparent rounded-full blur-2xl group-hover:from-orange-400/25 group-hover:via-amber-300/25 transition-all pointer-events-none" />
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Học Kỳ Triển Khai
              </span>
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-orange-500 via-amber-500 to-orange-400 text-white flex items-center justify-center shadow-md shadow-orange-500/25">
                <Calendar className="w-5 h-5" />
              </div>
            </div>
            <div className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              {semesters.length || 1}
            </div>
            <div className="flex items-center gap-1.5 mt-2 text-[11px] font-medium text-slate-500 dark:text-slate-400">
              <span className="w-1.5 h-1.5 rounded-full bg-orange-400" />
              <span>Spring / Summer / Fall</span>
            </div>
          </div>
        </div>

        {/* ── 2. TOOLBAR: SEARCH & ACTIONS ── */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-orange-50/80 via-white to-amber-50/40 dark:from-slate-900 dark:via-slate-900/90 dark:to-orange-950/20 border border-orange-100/90 dark:border-orange-900/30 shadow-xs">
          <div>
            <h2 className="text-base font-extrabold text-slate-900 dark:text-white">
              {t('admin.classes.list_title', 'Danh sách lớp học phần')}
            </h2>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Quản lý phân công giảng viên, danh sách sinh viên theo lớp
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
            <Input 
              placeholder={t('admin.classes.search_placeholder', 'Tìm kiếm mã lớp, môn học...')} 
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="w-full sm:w-64 text-xs focus:ring-2 focus:ring-orange-400/25 focus:border-orange-400 rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900"
            />
            <Button
              onClick={() => void openForm()}
              className="shrink-0 bg-gradient-to-r from-orange-500 via-amber-500 to-orange-500 hover:from-orange-600 hover:via-amber-600 hover:to-orange-600 shadow-orange-500/25 text-white font-bold rounded-2xl h-10 px-5 text-xs cursor-pointer shadow-md active:scale-95 transition-all"
            >
              <Sparkles className="w-4 h-4 mr-1.5" />
              {t('admin.classes.open_new', 'Mở lớp mới')}
            </Button>
          </div>
        </div>

        <ErrorNotice message={error} onRetry={() => void loadClasses()} />

        {/* ── 3. CLASSES LIST ── */}
        <div className="space-y-3">
          {loading ? (
            <div className="p-12 text-center text-slate-400 text-sm bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs">
              {t('admin.classes.loading', 'Đang tải danh sách lớp học…')}
            </div>
          ) : !error && classes.length === 0 ? (
            <div className="p-12 text-center text-slate-400 text-sm bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs">
              {t('admin.classes.no_classes', 'Chưa có lớp học ở trang này.')}
            </div>
          ) : !error && classes.map(row => (
            <article
              key={row.id}
              className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-2xs hover:border-slate-300 dark:hover:border-slate-700 transition-all"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Link
                    href={`/admin/classes/${row.id}`}
                    className="font-extrabold flex items-center gap-1.5 text-slate-900 dark:text-white hover:text-[#FA7014] text-base font-mono transition-colors"
                  >
                    {row.code}
                    <ExternalLink className="w-3.5 h-3.5" />
                  </Link>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700">
                    {typeof row.semester === 'object' ? row.semester?.code : row.semester || 'Chưa có kỳ'}
                  </span>
                </div>
                <p className="text-sm font-semibold text-slate-900 dark:text-white">
                  {typeof row.subject === 'object' ? `${row.subject?.code} — ${row.subject?.name}` : row.subject || t('admin.classes.no_subject', 'Chưa có môn học')}
                </p>
              </div>

              <div className="flex items-center gap-4 text-xs">
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800">
                  <School className="w-4 h-4 text-slate-700 dark:text-slate-300 shrink-0" />
                  <div>
                    <p className="text-[10px] text-slate-500 uppercase font-semibold">Giảng viên phụ trách</p>
                    <p className="font-bold text-slate-900 dark:text-white">
                      {row.lecturers?.map(l => l.name).join(', ') || t('admin.classes.unassigned_lecturer', 'Chưa phân công')}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800">
                  <Users className="w-4 h-4 text-slate-700 dark:text-slate-300 shrink-0" />
                  <div>
                    <p className="text-[10px] text-slate-500 uppercase font-semibold">Sĩ số lớp</p>
                    <p className="font-bold text-slate-900 dark:text-white">
                      {row.studentCount ?? 0} sinh viên
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={saving}
                  onClick={() => void openForm(row)}
                  className="text-xs border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-xl cursor-pointer font-bold"
                >
                  {t('ui.edit', 'Chỉnh sửa')}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={saving}
                  onClick={() => void deleteClass(row)}
                  className="text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl cursor-pointer font-bold"
                >
                  {t('ui.delete', 'Xóa')}
                </Button>
              </div>
            </article>
          ))}

          <Pagination page={page} hasNext={hasNext} loading={loading || saving} onChange={next => { setLoading(true); setPage(next) }} />
        </div>
      </div>
    {(() => {
      const selectedSubject = subjects.find(s => s.id === form.subjectId)
      const selectedSemester = semesters.find(s => s.id === form.semesterId)
      const selectedLecturer = lecturers.find(l => l.id === form.lecturerId)

      return (
        <Modal
          isOpen={modalOpen}
          onClose={() => { if (!saving) setModalOpen(false) }}
          maxWidth="5xl"
          title={
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-orange-50 text-[#FA7014] dark:bg-orange-950/60 dark:text-orange-400 border border-orange-200">
                <GraduationCap className="w-5 h-5" />
              </span>
              <span className="font-extrabold text-slate-900 dark:text-white">{editingId ? t('admin.classes.edit_modal_title', 'Chỉnh sửa lớp học & Phân công') : t('admin.classes.modal_title', 'Mở lớp học mới & Phân công Giảng viên')}</span>
            </div>
          }
          description="Thiết lập mã lớp, môn học, phân công giảng viên và thêm sinh viên theo Khóa & Ngành"
        >
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Form Column (7 cols) */}
            <form onSubmit={submit} className="lg:col-span-7 space-y-4">
              <ErrorNotice message={formError} />
              {optionsLoading && <p role="status" className="text-xs text-[#FA7014] font-semibold">{t('admin.classes.loading_options', 'Đang tải môn, kỳ, giảng viên và sinh viên…')}</p>}
              
              <div className="grid grid-cols-2 gap-3">
                <label className="block space-y-1">
                  <span className="text-xs font-semibold text-slate-900 dark:text-slate-200">{t('admin.classes.form_code', 'Mã lớp học')}</span>
                  <Input required minLength={2} placeholder="Ví dụ: PRM392_SE1701" value={form.code} onChange={e => setForm({ ...form, code: e.target.value })} className="text-xs focus:border-[#FA7014] rounded-xl border-slate-200 dark:border-slate-800" />
                </label>

                <label className="block space-y-1">
                  <span className="text-xs font-semibold text-slate-900 dark:text-slate-200">{t('admin.classes.col_semester', 'Học kỳ')}</span>
                  <select aria-label={t('admin.classes.col_semester', 'Học kỳ')} disabled={optionsLoading || saving} className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-2.5 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-[#FA7014]" value={form.semesterId} onChange={e => setForm({ ...form, semesterId: e.target.value })}>
                    <option value="" disabled={!!editingId && !!form.semesterId}>{t('admin.classes.select_semester', 'Chọn học kỳ')}</option>
                    {semesters.map(semester => <option key={semester.id} value={semester.id}>{semester.season} {semester.code}</option>)}
                  </select>
                </label>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <label className="block space-y-1">
                  <span className="text-xs font-semibold text-slate-900 dark:text-slate-200">{t('admin.classes.form_subject', 'Môn học')}</span>
                  <select aria-label={t('admin.classes.form_subject', 'Môn học')} required disabled={optionsLoading || saving} className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-2.5 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-[#FA7014]" value={form.subjectId} onChange={e => setForm({ ...form, subjectId: e.target.value })}>
                    <option value="">{t('admin.classes.select_subject', 'Chọn môn học')}</option>
                    {subjects.map(subject => <option key={subject.id} value={subject.id}>{subject.code} — {subject.name}</option>)}
                  </select>
                </label>

                <label className="block space-y-1">
                  <span className="text-xs font-semibold text-slate-900 dark:text-slate-200 flex items-center justify-between">
                    <span>{t('admin.classes.lecturer', 'Giảng viên phụ trách')}</span>
                    <span className="text-[10px] text-[#FA7014] font-bold">FPT Faculty</span>
                  </span>
                  <select aria-label={t('admin.classes.lecturer', 'Giảng viên')} disabled={optionsLoading || saving} className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-2.5 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-[#FA7014]" value={form.lecturerId} onChange={e => setForm({ ...form, lecturerId: e.target.value })}>
                    <option value="">-- Chưa chỉ định giảng viên --</option>
                    {lecturers.map(lecturer => (
                      <option key={lecturer.id} value={lecturer.id}>
                        {lecturer.lecturerCode ? `[${lecturer.lecturerCode}] ` : ''}{lecturer.name} ({lecturer.email})
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              {/* ── BỘ CHỌN SINH VIÊN THEO KHÓA & NGÀNH ── */}
              <div className="pt-2 border-t border-slate-200 dark:border-slate-800 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Users className="w-4 h-4 text-[#FA7014]" />
                    <span className="text-xs font-bold text-slate-900 dark:text-white">
                      Thêm sinh viên vào lớp theo Khóa & Ngành
                    </span>
                  </div>
                  <span className="text-xs font-mono font-bold text-slate-900 dark:text-white bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-lg border border-slate-200 dark:border-slate-700">
                    Đã chọn: {selectedStudentIds.size} SV
                  </span>
                </div>

                {/* Filter controls row */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                  {/* Cohort Filter */}
                  <select
                    className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-medium focus:border-[#FA7014]"
                    value={studentCohortFilter}
                    onChange={e => setStudentCohortFilter(e.target.value)}
                  >
                    <option value="all">Tất cả Khóa (K17, K18, K19)</option>
                    <option value="K17">Khóa K17</option>
                    <option value="K18">Khóa K18</option>
                    <option value="K19">Khóa K19</option>
                  </select>

                  {/* Major Filter */}
                  <select
                    className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-medium focus:border-[#FA7014]"
                    value={studentMajorFilter}
                    onChange={e => setStudentMajorFilter(e.target.value)}
                  >
                    <option value="all">Tất cả Ngành</option>
                    <option value="SE">SE - Kỹ thuật phần mềm</option>
                    <option value="IA">IA - An toàn thông tin</option>
                    <option value="AI">AI - Trí tuệ nhân tạo</option>
                    <option value="IS">IS - Hệ thống thông tin</option>
                    <option value="GD">GD - Thiết kế đồ họa</option>
                  </select>

                  {/* Student Search */}
                  <Input
                    placeholder="Tìm tên hoặc MSSV..."
                    value={studentSearch}
                    onChange={e => setStudentSearch(e.target.value)}
                    className="text-xs p-2 h-9 focus:border-[#FA7014] rounded-xl border-slate-200 dark:border-slate-800"
                  />
                </div>

                {/* Quick actions row */}
                <div className="flex items-center justify-between text-[11px] pt-1">
                  <span className="text-slate-500">
                    Hiển thị {filteredStudents.length} sinh viên phù hợp
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={selectAllFilteredStudents}
                      className="text-[#FA7014] hover:underline font-bold cursor-pointer"
                    >
                      Chọn tất cả ({filteredStudents.length})
                    </button>
                    <span className="text-slate-300">|</span>
                    <button
                      type="button"
                      onClick={clearAllSelectedStudents}
                      className="text-slate-500 hover:text-slate-700 font-semibold cursor-pointer"
                    >
                      Bỏ chọn tất cả
                    </button>
                  </div>
                </div>

                {/* Student Scrollable List */}
                <div className="max-h-72 overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900 p-1">
                  {filteredStudents.length === 0 ? (
                    <div className="p-4 text-center text-xs text-slate-400">
                      Không có sinh viên nào phù hợp bộ lọc.
                    </div>
                  ) : (
                    filteredStudents.map(st => {
                      const isSelected = selectedStudentIds.has(st.id)
                      const stCode = (st.studentCode || st.code || '').toUpperCase()

                      return (
                        <div
                          key={st.id}
                          onClick={() => toggleStudent(st.id)}
                          className={`flex items-center justify-between p-2 rounded-xl text-xs cursor-pointer transition-colors ${
                            isSelected
                              ? 'bg-orange-50/70 dark:bg-orange-950/30'
                              : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleStudent(st.id)}
                              className="w-4 h-4 rounded text-[#FA7014] focus:ring-[#FA7014] cursor-pointer"
                              onClick={e => e.stopPropagation()}
                            />
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="font-bold text-slate-900 dark:text-white truncate">
                                  {st.name || st.fullName}
                                </span>
                                <span className="px-1.5 py-0.2 rounded text-[10px] font-mono font-bold bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700">
                                  {stCode}
                                </span>
                              </div>
                              <span className="text-[11px] text-slate-400 truncate block">
                                {st.email}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            {stCode.startsWith('SE') && <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200">SE</span>}
                            {stCode.startsWith('IA') && <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-rose-50 text-rose-600">IA</span>}
                            {stCode.startsWith('AI') && <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-purple-50 text-purple-600">AI</span>}
                            {stCode.startsWith('IS') && <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-50 text-amber-600">IS</span>}
                            {stCode.startsWith('GD') && <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-50 text-emerald-600">GD</span>}
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <Button type="button" variant="ghost" disabled={saving} onClick={() => setModalOpen(false)} className="rounded-xl font-bold">{t('ui.cancel', 'Hủy')}</Button>
                <Button type="submit" variant="primary" disabled={saving || optionsLoading || !form.subjectId}>
                  {saving ? t('ui.saving', 'Đang lưu…') : (
                    selectedStudentIds.size > 0 
                      ? `Lưu lớp & Thêm ${selectedStudentIds.size} SV` 
                      : t('admin.classes.form_submit', 'Lưu lớp học')
                  )}
                </Button>
              </div>
            </form>

            {/* Live Class Card Preview Column (5 cols) */}
            <div className="lg:col-span-5 bg-slate-50 dark:bg-slate-800/40 p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-extrabold tracking-wider text-slate-900 dark:text-white uppercase flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5 text-[#FA7014]" />
                  Thẻ Lớp Học Trực Quan
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  Live View
                </span>
              </div>

              {/* Class Card */}
              <div className="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs">
                <div className="p-4 bg-[#FA7014] text-white relative">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-white/90">Lớp Học FPT</span>
                    <span className="px-2 py-0.5 rounded-md bg-white/20 text-white text-[10px] font-bold backdrop-blur-sm">
                      {selectedSemester ? `${selectedSemester.season} ${selectedSemester.code}` : 'Học kỳ chưa chọn'}
                    </span>
                  </div>
                  <h3 className="text-xl font-black tracking-tight text-white mt-2 font-mono">
                    {form.code.trim() || 'CLASS_CODE'}
                  </h3>
                </div>

                <div className="p-4 space-y-3">
                  <div>
                    <p className="text-[10px] uppercase font-semibold text-slate-500">Môn học phụ trách</p>
                    <p className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">
                      {selectedSubject ? `${selectedSubject.code} — ${selectedSubject.name}` : 'Chưa chọn môn học'}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                    <p className="text-[10px] uppercase font-semibold text-slate-500">Giảng viên đứng lớp</p>
                    <div className="flex items-center gap-2.5 mt-1.5">
                      <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 flex items-center justify-center font-bold text-xs">
                        {selectedLecturer ? selectedLecturer.name.charAt(0) : <School className="w-4 h-4" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                          {selectedLecturer ? selectedLecturer.name : 'Chưa phân công giảng viên'}
                        </p>
                        <p className="text-[10px] text-slate-500 truncate">
                          {selectedLecturer ? selectedLecturer.email : 'Sẽ chỉ định sau khi mở lớp'}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1 font-semibold text-slate-900 dark:text-slate-200">
                      <Users className="w-3.5 h-3.5 text-[#FA7014]" />
                      Sĩ số: {selectedStudentIds.size} sinh viên
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-300">
                      Sẵn sàng kích hoạt
                    </span>
                  </div>
                </div>
              </div>

              {/* Selected Students Preview Chips */}
              {selectedStudentIds.size > 0 && (
                <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1.5">
                  <span className="text-[11px] font-bold text-slate-900 dark:text-white block">
                    Sinh viên được chọn đưa vào lớp ({selectedStudentIds.size}):
                  </span>
                  <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto">
                    {Array.from(selectedStudentIds).slice(0, 10).map(sId => {
                      const st = allStudents.find(s => s.id === sId)
                      return (
                        <span key={sId} className="px-2 py-0.5 rounded-md text-[10px] font-mono bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200">
                          {st?.studentCode || st?.code || 'SV'}: {st?.name || st?.fullName || ''}
                        </span>
                      )
                    })}
                    {selectedStudentIds.size > 10 && (
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold text-[#FA7014]">
                        +{selectedStudentIds.size - 10} SV khác
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </Modal>
      )
    })()}
    </DashboardLayout>
  )
}
