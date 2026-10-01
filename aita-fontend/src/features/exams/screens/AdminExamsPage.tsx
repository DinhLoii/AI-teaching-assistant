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
  Users, Clock, Star, ChevronRight, AlertCircle, Loader2
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
  const openEdit = (ex: ExamRow) => {
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

  return (
    <DashboardLayout
      navItems={ADMIN_NAV}
      title="AITA Admin"
      roleLabel={t('profile.role_admin', 'Quản trị viên')}
      requiredRole="admin"
      headerTitle={t('admin.exams.header_title', 'Quản lý Đề thi & Bài tập')}
      headerSubtitle={t('admin.exams.header_subtitle', 'Tạo, chỉnh sửa và giám sát đề thi, bài tập trên toàn trường')}
    >
      <div className="space-y-6">
        {/* Header bar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <FileSignature className="w-5 h-5 text-orange-500 dark:text-orange-400" />
            {t('admin.exams.list_title', 'Danh sách đề thi & bài tập')} ({filtered.length})
          </h2>
          <Button variant="primary" size="sm" onClick={openCreate} className="gap-1.5 text-xs shrink-0">
            <Plus className="w-4 h-4" />
            <span>Tạo đề thi mới</span>
          </Button>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="w-full sm:max-w-xs">
            <Input
              type="text"
              placeholder="Tìm theo tên, môn học..."
              icon={<Search className="w-4 h-4" />}
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1) }}
            />
          </div>
          <select
            value={filterSubject}
            onChange={e => { setFilterSubject(e.target.value); setPage(1) }}
            className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            <option value="">Tất cả môn học</option>
            {subjects.map(s => (
              <option key={s.id} value={s.id}>{s.code} — {s.name}</option>
            ))}
          </select>
        </div>

        {/* List */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin text-brand-500" />
            <span className="text-sm">Đang tải danh sách...</span>
          </div>
        ) : paginated.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4 bg-white/50 dark:bg-slate-900/50 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800">
            <AlertCircle className="w-10 h-10 text-slate-300" />
            <p className="text-sm text-slate-400">Chưa có đề thi nào. Hãy tạo đề thi đầu tiên.</p>
            <Button variant="primary" size="sm" onClick={openCreate} className="gap-1.5 text-xs">
              <Plus className="w-4 h-4" /> Tạo đề thi mới
            </Button>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="hidden lg:grid grid-cols-[2fr_1fr_1fr_1fr_1fr_auto] gap-4 px-5 py-3 bg-slate-100/80 dark:bg-slate-900/80 rounded-2xl border border-slate-200/60 dark:border-slate-800 text-xs font-bold text-slate-500 uppercase tracking-wider">
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
                  <div key={ex.id} className="group grid grid-cols-1 lg:grid-cols-[2fr_1fr_1fr_1fr_1fr_auto] gap-4 items-center p-4 lg:px-5 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/60 dark:border-slate-800 shadow-sm hover:shadow-md hover:border-orange-500/30 transition-all">
                    {/* Title */}
                    <div className="min-w-0">
                      <Link href={`/admin/exams/${ex.id}/submissions`} className="block">
                        <h4 className="font-bold text-sm text-slate-900 dark:text-white group-hover:text-orange-500 transition-colors truncate">
                          {ex.title}
                        </h4>
                        {ex.description && (
                          <p className="text-xs text-slate-400 truncate mt-0.5">{ex.description}</p>
                        )}
                      </Link>
                    </div>

                    {/* Subject */}
                    <div className="text-xs text-slate-600 dark:text-slate-300 font-medium truncate">
                      {ex.subjectName || ex.subjectId?.slice(0, 8) || '—'}
                    </div>

                    {/* Type */}
                    <div>
                      <Badge variant="orange" className="text-[10px] px-2 py-0.5 font-semibold capitalize">
                        {typLabel}
                      </Badge>
                    </div>

                    {/* Status */}
                    <div>
                      <Badge variant={badge.variant as any} className="text-[10px] px-2 py-0.5">
                        {badge.label}
                      </Badge>
                    </div>

                    {/* Due */}
                    <div className="flex items-center gap-1.5 text-xs text-slate-500">
                      <Calendar className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                      <span>{ex.due ? new Date(ex.due).toLocaleDateString('vi-VN') : '—'}</span>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 justify-end">
                      <Link href={`/admin/exams/${ex.id}/submissions`} title="Xem bài nộp">
                        <button className="p-2 rounded-xl text-slate-400 hover:text-brand-500 hover:bg-brand-50 dark:hover:bg-brand-500/10 transition-colors">
                          <Users className="w-4 h-4" />
                        </button>
                      </Link>
                      <button
                        onClick={() => openEdit(ex)}
                        className="p-2 rounded-xl text-slate-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-colors"
                        title="Chỉnh sửa"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(ex.id)}
                        className="p-2 rounded-xl text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors"
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
                <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}>← Trước</Button>
                <span className="text-sm text-slate-500 self-center">Trang {page}/{totalPages}</span>
                <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages}>Sau →</Button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Create/Edit Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => !saving && setModalOpen(false)}
        title={editingId ? 'Chỉnh sửa đề thi' : 'Tạo đề thi mới'}
      >
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Row 1: Title + Subject */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400">Tên đề thi *</label>
              <input
                required
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                value={form.title || ''}
                onChange={e => setForm({ ...form, title: e.target.value })}
                placeholder="VD: Cuối kỳ Spring 2025"
              />
            </div>
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400">Môn học *</label>
              <select
                required
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
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
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400">Loại đề thi</label>
              <select
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                value={form.type || 'assignment'}
                onChange={e => setForm({ ...form, type: e.target.value })}
              >
                {EXAM_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400">Thời lượng (phút)</label>
              <input
                type="number" min={0}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                value={form.duration ?? 90}
                onChange={e => setForm({ ...form, duration: +e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400">Điểm tối đa</label>
              <input
                type="number" min={0}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                value={form.maxScore ?? 100}
                onChange={e => setForm({ ...form, maxScore: +e.target.value })}
              />
            </div>
          </div>

          {/* Row 3: Due date + Weight */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400">Hạn nộp</label>
              <input
                type="datetime-local"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                value={form.dueDate || ''}
                onChange={e => setForm({ ...form, dueDate: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400">Trọng số (%)</label>
              <input
                type="number" min={0} max={100}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                value={form.weightPercentage ?? 10}
                onChange={e => setForm({ ...form, weightPercentage: +e.target.value })}
              />
            </div>
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400">Mô tả / Ghi chú</label>
            <textarea
              rows={3}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
              value={form.description || ''}
              onChange={e => setForm({ ...form, description: e.target.value })}
              placeholder="Thông tin bổ sung về đề thi..."
            />
          </div>

          {/* Late penalty section */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-3">
            <p className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Cấu hình độ trễ (Late Policy)</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-500">Loại phạt</label>
                <select
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                  value={form.latePenaltyType || 'NONE'}
                  onChange={e => setForm({ ...form, latePenaltyType: e.target.value as any })}
                >
                  {PENALTY_TYPES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                </select>
              </div>
              {form.latePenaltyType !== 'NONE' && (
                <>
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-slate-500">Giá trị phạt</label>
                    <input
                      type="number" min={0}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                      value={form.latePenaltyValue ?? 0}
                      onChange={e => setForm({ ...form, latePenaltyValue: +e.target.value })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-slate-500">Phạt tối đa</label>
                    <input
                      type="number" min={0}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                      value={form.maxLatePenalty ?? 0}
                      onChange={e => setForm({ ...form, maxLatePenalty: +e.target.value })}
                    />
                  </div>
                </>
              )}
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                className="w-4 h-4 rounded border-slate-300 text-brand-600"
                checked={form.allowLateSubmission ?? true}
                onChange={e => setForm({ ...form, allowLateSubmission: e.target.checked })}
              />
              <span className="text-xs text-slate-600 dark:text-slate-400">Cho phép nộp trễ</span>
            </label>
          </div>

          {/* Send notification */}
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              className="w-4 h-4 rounded border-slate-300 text-brand-600"
              checked={form.sendNotification ?? false}
              onChange={e => setForm({ ...form, sendNotification: e.target.checked })}
            />
            <span className="text-xs text-slate-600 dark:text-slate-400">Gửi thông báo cho sinh viên khi publish</span>
          </label>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
            <Button variant="outline" size="sm" type="button" onClick={() => setModalOpen(false)}>Hủy bỏ</Button>
            <Button variant="primary" size="sm" type="submit" isLoading={saving}>
              {editingId ? 'Lưu thay đổi' : 'Tạo đề thi'}
            </Button>
          </div>
        </form>
      </Modal>
    </DashboardLayout>
  )
}