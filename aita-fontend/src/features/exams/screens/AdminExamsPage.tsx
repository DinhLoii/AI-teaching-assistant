'use client'

import * as React from 'react'
import Link from 'next/link'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { ADMIN_NAV } from '@/config/navigation'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Modal } from '@/components/ui/modal'
import { examsApi } from '@/lib/api/modules/exams'
import { subjectsApi } from '@/lib/api/modules/subjects'
import type { ExamRow, SubjectRow, CreateExamBody } from '@/lib/api/contracts'
import { useLanguage } from '@/providers/language-provider'
import {
  FileSignature, Plus, Search, Trash2, Edit, Calendar,
  Users, Clock, Star, ChevronRight, AlertCircle, Loader2,
  Sparkles, BookOpen, Award, CheckCircle2
} from 'lucide-react'

const EXAM_TYPES = [
  { value: 'assignment', label: 'Bài tập' },
  { value: 'quiz', label: 'Quiz' },
  { value: 'midterm', label: 'Giữa kỳ' },
  { value: 'final', label: 'Cuối kỳ' },
  { value: 'project', label: 'Dự án' },
]

const PENALTY_TYPES = [
  { value: 'NONE', label: 'Không phạt' },
  { value: 'DAILY_POINTS', label: 'Trừ điểm / ngày' },
  { value: 'DAILY_PERCENT', label: 'Trừ % / ngày' },
  { value: 'FLAT_POINTS', label: 'Trừ cố định' },
]

const STATUS_BADGE: Record<string, { variant: 'orange' | 'default' | 'green' | 'red'; label: string }> = {
  draft:     { variant: 'default', label: 'Nháp' },
  published: { variant: 'green',   label: 'Đã publish' },
  active:    { variant: 'green',   label: 'Hoạt động' },
  closed:    { variant: 'red',     label: 'Đã đóng' },
}

function emptyForm(): Partial<CreateExamBody> & { title: string; subjectId: string } {
  return {
    title: '',
    subjectId: '',
    description: '',
    type: 'assignment',
    duration: 90,
    dueDate: '',
    maxScore: 100,
    weightPercentage: 10,
    classIds: [],
    latePenaltyType: 'NONE',
    latePenaltyValue: 0,
    allowLateSubmission: true,
    sendNotification: false,
  }
}

export default function AdminExamsPage() {
  const { t } = useLanguage()
  const [exams, setExams] = React.useState<ExamRow[]>([])
  const [subjects, setSubjects] = React.useState<SubjectRow[]>([])
  const [loading, setLoading] = React.useState(true)
  const [search, setSearch] = React.useState('')
  const [filterSubject, setFilterSubject] = React.useState('')
  const [page, setPage] = React.useState(1)
  const PAGE_SIZE = 10

  const [modalOpen, setModalOpen] = React.useState(false)
  const [editingId, setEditingId] = React.useState<string | null>(null)
  const [editingLoading, setEditingLoading] = React.useState<string | null>(null)
  const [form, setForm] = React.useState(emptyForm())
  const [saving, setSaving] = React.useState(false)
  const [deleteId, setDeleteId] = React.useState<string | null>(null)

  const load = React.useCallback(async () => {
    setLoading(true)
    try {
      const res: any = await examsApi.getExams(1, 200, filterSubject || undefined)
      setExams(Array.isArray(res) ? res : res?.data || [])
    } catch { setExams([]) }
    finally { setLoading(false) }
  }, [filterSubject])

  React.useEffect(() => { load() }, [load])

  React.useEffect(() => {
    subjectsApi.getSubjects(1, 200)
      .then((res: any) => setSubjects(Array.isArray(res) ? res : res?.data || []))
      .catch(() => setSubjects([]))
  }, [])

  const filtered = React.useMemo(() => {
    if (!search.trim()) return exams
    const q = search.toLowerCase()
    return exams.filter(e =>
      e.title?.toLowerCase().includes(q) ||
      e.subjectName?.toLowerCase().includes(q) ||
      e.type?.toLowerCase().includes(q)
    )
  }, [exams, search])

  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))

  const openCreate = () => { setEditingId(null); setForm(emptyForm()); setModalOpen(true) }
  const openEdit = async (row: ExamRow) => {
    if (editingLoading) return
    setEditingLoading(row.id)
    try {
    // Lists contain a shortened description; edit only the complete saved record.
    const ex = await examsApi.getExam(row.id)
    setEditingId(ex.id)
    setForm({
      title: ex.title,
      subjectId: ex.subjectId || '',
      description: ex.description || '',
      type: ex.type || 'assignment',
      duration: ex.duration ?? 90,
      dueDate: ex.due ? ex.due.slice(0, 16) : '',
      maxScore: ex.maxScore ?? 100,
      weightPercentage: ex.weightPercentage ?? 10,
      classIds: ex.classes || [],
      latePenaltyType: (ex.latePenaltyType as any) || 'NONE',
      latePenaltyValue: ex.latePenaltyValue ?? 0,
      allowLateSubmission: ex.allowLateSubmission ?? true,
      sendNotification: false,
    })
    setModalOpen(true)
    } catch {
      alert('Không tải được thông tin chi tiết để chỉnh sửa. Vui lòng thử lại.')
    } finally { setEditingLoading(null) }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.title?.trim() || !form.subjectId) return
    setSaving(true)
    try {
      const body: CreateExamBody = {
        title: form.title!,
        subjectId: form.subjectId!,
        description: form.description,
        type: form.type,
        duration: Number(form.duration) || undefined,
        dueDate: form.dueDate || undefined,
        maxScore: Number(form.maxScore) || undefined,
        weightPercentage: Number(form.weightPercentage) || undefined,
        classIds: form.classIds || [],
        latePenaltyType: form.latePenaltyType as any,
        latePenaltyValue: Number(form.latePenaltyValue) || undefined,
        allowLateSubmission: form.allowLateSubmission,
        sendNotification: form.sendNotification,
      }
      if (editingId) {
        await examsApi.updateExam(editingId, body)
      } else {
        await examsApi.createExam(body)
      }
      setModalOpen(false)
      await load()
    } catch (err: any) {
      alert(err?.message || 'Lỗi khi lưu đề thi.')
    } finally { setSaving(false) }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Bạn có chắc muốn xóa đề thi này?')) return
    try {
      await examsApi.deleteExam(id)
      await load()
    } catch (err: any) {
      // Fallback: mark as deleted if hard delete not available
      try {
        await examsApi.updateExam(id, { status: 'deleted' } as any)
        await load()
      } catch {
        alert(err?.message || 'Lỗi khi xóa.')
      }
    }
  }

  // Derived statistics for executive KPI cards
  const activeExamsCount = exams.filter(e => e.status === 'published' || e.status === 'active').length
  const distinctSubjectsCount = new Set(exams.map(e => e.subjectId).filter(Boolean)).size

  return (
    <DashboardLayout
      navItems={ADMIN_NAV}
      title="AITA Admin"
      roleLabel={t('profile.role_admin', 'Quản trị viên')}
      requiredRole="admin"
      headerTitle={t('admin.exams.header_title', 'Quản lý Đề thi & Bài tập')}
      headerSubtitle={t('admin.exams.header_subtitle', 'Tạo, chỉnh sửa và giám sát đề thi, bài tập trên toàn trường')}
    >
      <div className="space-y-6 max-w-7xl mx-auto pb-12">
        {/* ── 1. SIGNATURE EXECUTIVE KPI CARDS ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* KPI 1: Tổng đề thi */}
          <div className="relative overflow-hidden p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-orange-50/80 via-white to-amber-50/40 dark:from-slate-900 dark:via-slate-900/90 dark:to-orange-950/20 border border-orange-100/90 dark:border-orange-900/30 shadow-xs hover:shadow-md transition-all group">
            <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-gradient-to-tr from-orange-400/15 via-amber-300/15 to-transparent rounded-full blur-2xl group-hover:from-orange-400/25 group-hover:via-amber-300/25 transition-all pointer-events-none" />
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Tổng Đề Thi & BTVN
              </span>
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-orange-500 via-amber-500 to-orange-400 text-white flex items-center justify-center shadow-md shadow-orange-500/25">
                <FileSignature className="w-5 h-5" />
              </div>
            </div>
            <div className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              {loading ? '…' : exams.length}
            </div>
            <div className="flex items-center gap-1.5 mt-2 text-[11px] font-medium text-slate-500 dark:text-slate-400">
              <span className="w-1.5 h-1.5 rounded-full bg-orange-400" />
              <span>Ngân hàng bài tập FPT</span>
            </div>
          </div>

          {/* KPI 2: Đang hoạt động */}
          <div className="relative overflow-hidden p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-orange-50/80 via-white to-amber-50/40 dark:from-slate-900 dark:via-slate-900/90 dark:to-orange-950/20 border border-orange-100/90 dark:border-orange-900/30 shadow-xs hover:shadow-md transition-all group">
            <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-gradient-to-tr from-orange-400/15 via-amber-300/15 to-transparent rounded-full blur-2xl group-hover:from-orange-400/25 group-hover:via-amber-300/25 transition-all pointer-events-none" />
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Đang Mở Nộp Bài
              </span>
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-orange-500 via-amber-500 to-orange-400 text-white flex items-center justify-center shadow-md shadow-orange-500/25">
                <CheckCircle2 className="w-5 h-5" />
              </div>
            </div>
            <div className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              {loading ? '…' : activeExamsCount}
            </div>
            <div className="flex items-center gap-1.5 mt-2 text-[11px] font-medium text-slate-500 dark:text-slate-400">
              <span className="w-1.5 h-1.5 rounded-full bg-orange-400" />
              <span>Sinh viên đang nộp bài</span>
            </div>
          </div>

          {/* KPI 3: Môn học liên kết */}
          <div className="relative overflow-hidden p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-orange-50/80 via-white to-amber-50/40 dark:from-slate-900 dark:via-slate-900/90 dark:to-orange-950/20 border border-orange-100/90 dark:border-orange-900/30 shadow-xs hover:shadow-md transition-all group">
            <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-gradient-to-tr from-orange-400/15 via-amber-300/15 to-transparent rounded-full blur-2xl group-hover:from-orange-400/25 group-hover:via-amber-300/25 transition-all pointer-events-none" />
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Môn Học Đã Gán
              </span>
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-orange-500 via-amber-500 to-orange-400 text-white flex items-center justify-center shadow-md shadow-orange-500/25">
                <BookOpen className="w-5 h-5" />
              </div>
            </div>
            <div className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              {loading ? '…' : distinctSubjectsCount}
            </div>
            <div className="flex items-center gap-1.5 mt-2 text-[11px] font-medium text-slate-500 dark:text-slate-400">
              <span className="w-1.5 h-1.5 rounded-full bg-orange-400" />
              <span>Môn có cấu hình Barem</span>
            </div>
          </div>

          {/* KPI 4: Chuẩn Barem AI */}
          <div className="relative overflow-hidden p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-orange-50/80 via-white to-amber-50/40 dark:from-slate-900 dark:via-slate-900/90 dark:to-orange-950/20 border border-orange-100/90 dark:border-orange-900/30 shadow-xs hover:shadow-md transition-all group">
            <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-gradient-to-tr from-orange-400/15 via-amber-300/15 to-transparent rounded-full blur-2xl group-hover:from-orange-400/25 group-hover:via-amber-300/25 transition-all pointer-events-none" />
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                AI Rubric Engine
              </span>
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-orange-500 via-amber-500 to-orange-400 text-white flex items-center justify-center shadow-md shadow-orange-500/25">
                <Sparkles className="w-5 h-5" />
              </div>
            </div>
            <div className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              100%
            </div>
            <div className="flex items-center gap-1.5 mt-2 text-[11px] font-medium text-slate-500 dark:text-slate-400">
              <span className="w-1.5 h-1.5 rounded-full bg-orange-400" />
              <span>Tự động chấm bằng Gemini</span>
            </div>
          </div>
        </div>

        {/* ── 2. TOOLBAR: SEARCH & FILTERS ── */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-orange-50/80 via-white to-amber-50/40 dark:from-slate-900 dark:via-slate-900/90 dark:to-orange-950/20 border border-orange-100/90 dark:border-orange-900/30 shadow-xs">
          <div>
            <h2 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <FileSignature className="w-5 h-5 text-orange-600" />
              {t('admin.exams.list_title', 'Danh sách đề thi & bài tập')} ({filtered.length})
            </h2>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Quản lý đề thi, bài tập và theo dõi danh sách bài nộp của sinh viên
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
            <div className="w-full sm:w-64">
              <Input
                type="text"
                placeholder="Tìm theo tên, môn học..."
                icon={<Search className="w-4 h-4" />}
                value={search}
                onChange={e => { setSearch(e.target.value); setPage(1) }}
                className="text-xs focus:ring-2 focus:ring-orange-400/25 focus:border-orange-400 rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900"
              />
            </div>
            <select
              value={filterSubject}
              onChange={e => { setFilterSubject(e.target.value); setPage(1) }}
              className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-orange-400 font-medium"
            >
              <option value="">Tất cả môn học</option>
              {subjects.map(s => (
                <option key={s.id} value={s.id}>{s.code} — {s.name}</option>
              ))}
            </select>
            <Button
              onClick={openCreate}
              disabled={editingLoading !== null}
              className="shrink-0 bg-gradient-to-r from-orange-500 via-amber-500 to-orange-500 hover:from-orange-600 hover:via-amber-600 hover:to-orange-600 shadow-orange-500/25 text-white font-bold rounded-2xl h-10 px-5 text-xs gap-1.5 cursor-pointer shadow-md active:scale-95 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Tạo đề thi mới</span>
            </Button>
          </div>
        </div>

        {/* ── 3. EXAMS DATA LIST ── */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-400 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs">
            <Loader2 className="w-8 h-8 animate-spin text-[#FA7014]" />
            <span className="text-xs font-semibold">Đang tải danh sách đề thi...</span>
          </div>
        ) : paginated.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs">
            <AlertCircle className="w-10 h-10 text-slate-300 dark:text-slate-600" />
            <p className="text-xs text-slate-400 font-semibold">Chưa có đề thi nào. Hãy tạo đề thi đầu tiên.</p>
            <Button onClick={openCreate} variant="primary" disabled={editingLoading !== null}>
              <Plus className="w-4 h-4 mr-1.5" /> Tạo đề thi mới
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Header */}
            <div className="hidden lg:grid grid-cols-[2fr_1fr_1fr_1fr_1fr_auto] gap-4 px-5 py-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-800 text-[11px] font-extrabold text-slate-900 dark:text-slate-200 uppercase tracking-wider">
              <div>Tên đề thi</div>
              <div>Môn học</div>
              <div>Loại</div>
              <div>Trạng thái</div>
              <div>Hạn nộp</div>
              <div className="text-right">Hành động</div>
            </div>

            <div className="space-y-2">
              {paginated.map(ex => {
                const badge = STATUS_BADGE[ex.status] || { variant: 'default', label: ex.status }
                const typLabel = EXAM_TYPES.find(t => t.value === ex.type)?.label || ex.type || 'Bài tập'
                return (
                  <div key={ex.id} className="group grid grid-cols-1 lg:grid-cols-[2fr_1fr_1fr_1fr_1fr_auto] gap-4 items-center p-4 lg:px-5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs hover:border-slate-300 dark:hover:border-slate-700 transition-all">
                    {/* Title */}
                    <div className="min-w-0">
                      <Link href={`/admin/exams/${ex.id}/submissions`} className="block">
                        <h4 className="font-extrabold text-sm text-slate-900 dark:text-white group-hover:text-[#FA7014] transition-colors truncate">
                          {ex.title}
                        </h4>
                        {ex.description && (
                          <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">{ex.description}</p>
                        )}
                      </Link>
                    </div>

                    {/* Subject */}
                    <div className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                      {ex.subjectName || ex.subjectId?.slice(0, 8) || '—'}
                    </div>

                    {/* Type */}
                    <div>
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 capitalize">
                        {typLabel}
                      </span>
                    </div>

                    {/* Status */}
                    <div>
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                        ex.status === 'published' || ex.status === 'active'
                          ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200'
                          : ex.status === 'closed'
                          ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200'
                          : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                      }`}>
                        {badge.label}
                      </span>
                    </div>

                    {/* Due */}
                    <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400 font-medium">
                      <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>{ex.due ? new Date(ex.due).toLocaleDateString('vi-VN') : '—'}</span>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 justify-end">
                      <Link href={`/admin/exams/${ex.id}/submissions`} title="Xem bài nộp">
                        <button className="p-2 rounded-xl text-slate-400 hover:text-[#FA7014] hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer">
                          <Users className="w-4 h-4" />
                        </button>
                      </Link>
                      <button
                        onClick={() => void openEdit(ex)}
                        disabled={editingLoading !== null}
                        className="p-2 rounded-xl text-slate-400 hover:text-[#FA7014] hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                        title="Chỉnh sửa"
                      >
                        {editingLoading === ex.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Edit className="w-4 h-4" />}
                      </button>
                      <button
                        onClick={() => handleDelete(ex.id)}
                        className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                        title="Xóa"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>

            {totalPages > 1 && (
              <div className="flex justify-center gap-2 pt-2">
                <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1} className="rounded-xl text-xs font-bold border-slate-200 dark:border-slate-800">← Trước</Button>
                <span className="text-xs font-semibold text-slate-500 self-center">Trang {page}/{totalPages}</span>
                <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages} className="rounded-xl text-xs font-bold border-slate-200 dark:border-slate-800">Sau →</Button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      {(() => {
        const selectedSubject = subjects.find(s => s.id === form.subjectId)
        const selectedTypeObj = EXAM_TYPES.find(t => t.value === form.type)

        return (
          <Modal
            isOpen={modalOpen}
            onClose={() => !saving && setModalOpen(false)}
            maxWidth="5xl"
            title={
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-orange-50 text-[#FA7014] dark:bg-orange-950/60 dark:text-orange-400 border border-orange-200">
                  <FileSignature className="w-5 h-5" />
                </span>
                <span className="font-extrabold text-slate-900 dark:text-white">{editingId ? 'Chỉnh sửa đề thi' : 'Tạo đề thi mới'}</span>
              </div>
            }
            description="Thiết lập nội dung đề thi, chuẩn đầu ra và chính sách nộp bài với bản xem trước trực quan"
          >
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Form Column (7 cols) */}
              <form onSubmit={handleSubmit} className="lg:col-span-7 space-y-4">
                {/* Row 1: Title + Subject */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-slate-900 dark:text-slate-200">Tên đề thi *</label>
                    <input
                      required
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-[#FA7014]"
                      value={form.title || ''}
                      onChange={e => setForm({ ...form, title: e.target.value })}
                      placeholder="VD: Cuối kỳ Spring 2025"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-slate-900 dark:text-slate-200">Môn học *</label>
                    <select
                      required
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-[#FA7014]"
                      value={form.subjectId || ''}
                      onChange={e => setForm({ ...form, subjectId: e.target.value })}
                    >
                      <option value="">— Chọn môn học —</option>
                      {subjects.map(s => (
                        <option key={s.id} value={s.id}>{s.code} — {s.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Row 2: Type + Duration + MaxScore */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-slate-900 dark:text-slate-200">Loại đề thi</label>
                    <select
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-[#FA7014]"
                      value={form.type || 'assignment'}
                      onChange={e => setForm({ ...form, type: e.target.value })}
                    >
                      {EXAM_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-slate-900 dark:text-slate-200">Thời lượng (phút)</label>
                    <input
                      type="number" min={0}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-[#FA7014]"
                      value={form.duration ?? 90}
                      onChange={e => setForm({ ...form, duration: +e.target.value })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-slate-900 dark:text-slate-200">Điểm tối đa</label>
                    <input
                      type="number" min={0}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-[#FA7014]"
                      value={form.maxScore ?? 100}
                      onChange={e => setForm({ ...form, maxScore: +e.target.value })}
                    />
                  </div>
                </div>

                {/* Row 3: Due date + Weight */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-slate-900 dark:text-slate-200">Hạn nộp</label>
                    <input
                      type="datetime-local"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-[#FA7014]"
                      value={form.dueDate || ''}
                      onChange={e => setForm({ ...form, dueDate: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-slate-900 dark:text-slate-200">Trọng số (%)</label>
                    <input
                      type="number" min={0} max={100}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-[#FA7014]"
                      value={form.weightPercentage ?? 10}
                      onChange={e => setForm({ ...form, weightPercentage: +e.target.value })}
                    />
                  </div>
                </div>

                {/* Description */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-900 dark:text-slate-200">Mô tả / Ghi chú</label>
                  <textarea
                    rows={2}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-[#FA7014] resize-none"
                    value={form.description || ''}
                    onChange={e => setForm({ ...form, description: e.target.value })}
                    placeholder="Thông tin bổ sung về đề thi..."
                  />
                </div>

                {/* Late penalty section */}
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-2.5">
                  <p className="text-[11px] font-bold text-slate-900 dark:text-white uppercase tracking-wider">Cấu hình độ trễ (Late Policy)</p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    <div className="space-y-1">
                      <label className="block text-[11px] font-semibold text-slate-500">Loại phạt</label>
                      <select
                        className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-[#FA7014]"
                        value={form.latePenaltyType || 'NONE'}
                        onChange={e => setForm({ ...form, latePenaltyType: e.target.value as any })}
                      >
                        {PENALTY_TYPES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                      </select>
                    </div>
                    {form.latePenaltyType !== 'NONE' && (
                      <>
                        <div className="space-y-1">
                          <label className="block text-[11px] font-semibold text-slate-500">Giá trị phạt</label>
                          <input
                            type="number" min={0}
                            className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-[#FA7014]"
                            value={form.latePenaltyValue ?? 0}
                            onChange={e => setForm({ ...form, latePenaltyValue: +e.target.value })}
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="block text-[11px] font-semibold text-slate-500">Phạt tối đa</label>
                          <input
                            type="number" min={0}
                            className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-[#FA7014]"
                            value={form.maxLatePenalty ?? 0}
                            onChange={e => setForm({ ...form, maxLatePenalty: +e.target.value })}
                          />
                        </div>
                      </>
                    )}
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer pt-1">
                    <input
                      type="checkbox"
                      className="w-3.5 h-3.5 rounded border-slate-300 text-[#FA7014] focus:ring-[#FA7014]"
                      checked={form.allowLateSubmission ?? true}
                      onChange={e => setForm({ ...form, allowLateSubmission: e.target.checked })}
                    />
                    <span className="text-xs text-slate-700 dark:text-slate-300">Cho phép nộp trễ</span>
                  </label>
                </div>

                {/* Send notification */}
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    className="w-3.5 h-3.5 rounded border-slate-300 text-[#FA7014] focus:ring-[#FA7014]"
                    checked={form.sendNotification ?? false}
                    onChange={e => setForm({ ...form, sendNotification: e.target.checked })}
                  />
                  <span className="text-xs text-slate-700 dark:text-slate-300">Gửi thông báo cho sinh viên khi công bố đề</span>
                </label>

                {/* Actions */}
                <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                  <Button variant="outline" size="sm" type="button" onClick={() => setModalOpen(false)} className="rounded-xl text-xs font-bold border-slate-200 dark:border-slate-800">Hủy bỏ</Button>
                  <Button size="sm" type="submit" variant="primary" isLoading={saving}>
                    {editingId ? 'Lưu thay đổi' : 'Tạo đề thi'}
                  </Button>
                </div>
              </form>

              {/* Right Column: Live Exam Card Preview (5 cols) */}
              <div className="lg:col-span-5 bg-slate-50 dark:bg-slate-800/40 p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-extrabold tracking-wider text-slate-900 dark:text-white uppercase flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-[#FA7014]" />
                    Thẻ Đề Thi Trực Quan
                  </span>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    Live Sync
                  </span>
                </div>

                {/* Exam Card Preview */}
                <div className="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs">
                  <div className="p-4 bg-[#FA7014] text-white relative">
                    <div className="flex items-center justify-between">
                      <span className="px-2 py-0.5 rounded-md bg-white/20 text-white text-[10px] font-bold backdrop-blur-sm uppercase">
                        {selectedTypeObj?.label || 'Đề thi'}
                      </span>
                      <span className="text-xs font-bold text-white bg-black/20 px-2 py-0.5 rounded-md backdrop-blur-sm">
                        {form.weightPercentage ?? 10}% trọng số
                      </span>
                    </div>
                    <h3 className="text-base font-bold text-white mt-2 leading-snug">
                      {form.title?.trim() || 'Tên đề thi chưa đặt'}
                    </h3>
                    <p className="text-[11px] text-white/90 font-mono mt-1">
                      {selectedSubject ? `${selectedSubject.code} — ${selectedSubject.name}` : 'Môn học chưa chọn'}
                    </p>
                  </div>

                  <div className="p-4 space-y-3 text-xs">
                    <div className="grid grid-cols-2 gap-2">
                      <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                        <span className="text-[10px] text-slate-500 block">Thời lượng làm bài</span>
                        <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1 mt-0.5">
                          <Clock className="w-3.5 h-3.5 text-[#FA7014]" />
                          {form.duration ?? 90} phút
                        </span>
                      </div>
                      <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                        <span className="text-[10px] text-slate-500 block">Thang điểm tối đa</span>
                        <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1 mt-0.5">
                          <Award className="w-3.5 h-3.5 text-[#FA7014]" />
                          {form.maxScore ?? 100} điểm
                        </span>
                      </div>
                    </div>

                    <div className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-slate-800">
                      <div className="flex items-center justify-between text-slate-700 dark:text-slate-300">
                        <span className="text-slate-500 flex items-center gap-1">
                          <Calendar className="w-3 h-3" /> Hạn nộp bài:
                        </span>
                        <span className="font-semibold text-slate-900 dark:text-white">
                          {form.dueDate ? new Date(form.dueDate).toLocaleString('vi-VN') : 'Chưa đặt hạn'}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-slate-700 dark:text-slate-300">
                        <span className="text-slate-500">Chính sách nộp muộn:</span>
                        <span className={`font-semibold ${form.allowLateSubmission ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                          {form.allowLateSubmission ? 'Cho phép' : 'Không cho phép'}
                        </span>
                      </div>
                    </div>

                    {form.description && (
                      <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                        <p className="text-[10px] text-slate-500 uppercase font-semibold">Ghi chú</p>
                        <p className="text-[11px] text-slate-700 dark:text-slate-300 line-clamp-2 mt-0.5">
                          {form.description}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                <p className="text-[11px] text-slate-500 text-center italic">
                  Xem trước giao diện thẻ bài thi sẽ hiển thị cho sinh viên và giảng viên khi công bố.
                </p>
              </div>
            </div>
          </Modal>
        )
      })()}
    </DashboardLayout>
  )
}
