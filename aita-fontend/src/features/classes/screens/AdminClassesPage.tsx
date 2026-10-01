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
import { ExternalLink } from 'lucide-react'

const blankForm = { code: '', subjectId: '', semesterId: '', lecturerId: '' }
const selectStyle = 'w-full rounded-xl border border-slate-300 bg-white p-3 text-sm dark:border-slate-700 dark:bg-slate-900'

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
    setModalOpen(true)
    setOptionsLoading(true)
    try {
      const [subjectRows, semesterRows, lecturerRows] = await Promise.all([
        loadOptions(subjectsApi.getSubjects), semestersApi.getSemesters(),
        loadOptions((p, limit) => usersApi.getUsers('lecturer', p, limit)),
      ])
      setSubjects(subjectRows)
      setSemesters(semesterRows)
      setLecturers(lecturerRows)
    } catch (cause) { setFormError(errorMessage(cause)) }
    finally { setOptionsLoading(false) }
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    if (saving || optionsLoading) return
    setSaving(true)
    setFormError(null)
    const payload: CreateClassBody = {
      code: form.code.trim(), subjectId: form.subjectId,
      ...(form.semesterId ? { semesterId: form.semesterId } : {}),
      ...(form.lecturerId ? { lecturerId: form.lecturerId } : {}),
    }
    try {
      if (editingId) await classesApi.updateClass(editingId, { ...payload, keepExistingInstructors: false })
      else await classesApi.createClass(payload)
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

  return <DashboardLayout navItems={ADMIN_NAV} title="AITA Admin" roleLabel={t('profile.role_admin', 'Quản trị viên')} requiredRole="admin" headerTitle={t('admin.classes.title', 'Quản lý lớp học phần')} headerSubtitle={t('admin.classes.subtitle', 'Môn học, học kỳ và phân công giảng viên')}>
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h2 className="text-xl font-bold">{t('admin.classes.list_title', 'Danh sách lớp')}</h2>
        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          <Input 
            placeholder={t('admin.classes.search_placeholder', 'Tìm kiếm lớp học...')} 
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full sm:w-64"
          />
          <Button onClick={() => void openForm()} className="shrink-0">{t('admin.classes.open_new', 'Mở lớp mới')}</Button>
        </div>
      </div>
      <ErrorNotice message={error} onRetry={() => void loadClasses()} />
      {loading ? <p role="status">{t('admin.classes.loading', 'Đang tải lớp học…')}</p> : !error && classes.length === 0 ? <p>{t('admin.classes.no_classes', 'Chưa có lớp học ở trang này.')}</p> : !error && classes.map(row => <article key={row.id} className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
        <div>
          <Link href={`/admin/classes/${row.id}`} className="font-bold flex items-center gap-2 hover:underline text-brand-600 text-lg">
            {row.code} <ExternalLink className="w-4 h-4" />
          </Link>
          <p className="text-sm">{typeof row.subject === 'object' ? row.subject?.name : row.subject || t('admin.classes.no_subject', 'Chưa có môn học')}</p>
          <p className="text-sm text-slate-500">{typeof row.semester === 'object' ? row.semester?.code : row.semester || t('admin.classes.no_semester', 'Chưa có học kỳ')}</p>
        </div>
        <div className="text-sm"><p>{row.studentCount ?? 0} {t('admin.classes.students_count', 'sinh viên')}</p><p>{row.lecturers?.map(lecturer => lecturer.name).join(', ') || t('admin.classes.unassigned_lecturer', 'Chưa phân công giảng viên')}</p></div>
        <div className="flex gap-2"><Button variant="outline" disabled={saving} onClick={() => void openForm(row)}>{t('ui.edit', 'Chỉnh sửa')}</Button><Button variant="ghost" disabled={saving} onClick={() => void deleteClass(row)}>{t('ui.delete', 'Xóa')}</Button></div>
      </article>)}
      <Pagination page={page} hasNext={hasNext} loading={loading || saving} onChange={next => { setLoading(true); setPage(next) }} />
    </div>
    <Modal isOpen={modalOpen} onClose={() => { if (!saving) setModalOpen(false) }} title={editingId ? t('admin.classes.edit_modal_title', 'Chỉnh sửa lớp học') : t('admin.classes.modal_title', 'Mở lớp học mới')}>
      <form onSubmit={submit} className="space-y-4">
        <ErrorNotice message={formError} />
        {optionsLoading && <p role="status">{t('admin.classes.loading_options', 'Đang tải môn, kỳ và giảng viên…')}</p>}
        <label className="block space-y-2"><span>{t('admin.classes.form_code', 'Mã lớp')}</span><Input required minLength={2} value={form.code} onChange={e => setForm({ ...form, code: e.target.value })} /></label>
        <label className="block space-y-2"><span>{t('admin.classes.form_subject', 'Môn học')}</span><select aria-label={t('admin.classes.form_subject', 'Môn học')} required disabled={optionsLoading || saving} className={selectStyle} value={form.subjectId} onChange={e => setForm({ ...form, subjectId: e.target.value })}><option value="">{t('admin.classes.select_subject', 'Chọn môn học')}</option>{subjects.map(subject => <option key={subject.id} value={subject.id}>{subject.code} — {subject.name}</option>)}</select></label>
        <label className="block space-y-2"><span>{t('admin.classes.col_semester', 'Học kỳ')}</span><select aria-label={t('admin.classes.col_semester', 'Học kỳ')} disabled={optionsLoading || saving} className={selectStyle} value={form.semesterId} onChange={e => setForm({ ...form, semesterId: e.target.value })}><option value="" disabled={!!editingId && !!form.semesterId}>{t('admin.classes.select_semester', 'Chọn học kỳ')}</option>{semesters.map(semester => <option key={semester.id} value={semester.id}>{semester.season} {semester.code}</option>)}</select></label>
        <label className="block space-y-2"><span>{t('admin.classes.lecturer', 'Giảng viên')}</span><select aria-label={t('admin.classes.lecturer', 'Giảng viên')} disabled={optionsLoading || saving} className={selectStyle} value={form.lecturerId} onChange={e => setForm({ ...form, lecturerId: e.target.value })}><option value="" disabled={!!editingId && !!form.lecturerId}>{t('admin.classes.unassigned', 'Chưa phân công')}</option>{lecturers.map(lecturer => <option key={lecturer.id} value={lecturer.id}>{lecturer.name} ({lecturer.email})</option>)}</select></label>
        <div className="flex justify-end gap-2"><Button type="button" variant="ghost" disabled={saving} onClick={() => setModalOpen(false)}>{t('ui.cancel', 'Hủy')}</Button><Button type="submit" disabled={saving || optionsLoading || !form.subjectId}>{saving ? t('ui.saving', 'Đang lưu…') : t('admin.classes.form_submit', 'Lưu lớp học')}</Button></div>
      </form>
    </Modal>
  </DashboardLayout>
}
