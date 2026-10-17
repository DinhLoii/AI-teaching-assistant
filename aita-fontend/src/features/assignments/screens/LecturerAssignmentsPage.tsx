'use client'

import * as React from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { LECTURER_NAV } from '@/config/navigation'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Modal } from '@/components/ui/modal'
import { ErrorNotice } from '@/components/ui/feedback'
import { assignmentsApi } from '@/lib/api/modules/assignments'
import { classesApi } from '@/lib/api/modules/classes'
import { peekClientApiCache } from '@/lib/api/client'
import { CardGridSkeleton } from '@/components/ui/skeleton'
import { formatDate } from '@/lib/utils'
import { useLanguage } from '@/providers/language-provider'
import { errorMessage } from '@/lib/api/errors'
import {
  FileCheck, Plus, Users, Sparkles, Calendar, ArrowRight, Settings2,
  Clock, CheckCircle2, Search, Trash2, RotateCcw, Archive, Inbox,
  ChevronRight, BookOpen, Layers, Zap, AlertCircle, X, Send, Eye, LoaderCircle,
} from 'lucide-react'
import { CreateAssignmentWizardModal } from '../components/CreateAssignmentWizardModal'

type ViewMode = 'active' | 'trash'

// ─── Main Page ───────────────────────────────────────────────────────────────
export default function LecturerAssignmentsPage({ defaultCreate = false }: { defaultCreate?: boolean }) {
  const searchParams = useSearchParams()
  const filterClassId = searchParams?.get('classId') ?? null

  const [assignments, setAssignments] = React.useState<any[]>([])
  const [trashAssignments, setTrashAssignments] = React.useState<any[]>([])
  const [trashLoaded, setTrashLoaded] = React.useState(false)
  const [trashLoading, setTrashLoading] = React.useState(false)
  const [classes, setClasses] = React.useState<any[]>([])
  const [loading, setLoading] = React.useState(true)
  const [loadError, setLoadError] = React.useState<string | null>(null)
  const [search, setSearch] = React.useState('')
  const [viewMode, setViewMode] = React.useState<ViewMode>('active')
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set())
  const [movingToTrash, setMovingToTrash] = React.useState(false)
  const movingRef = React.useRef(false)
  const dataVersion = React.useRef(0)
  const activeLoadId = React.useRef(0)
  const trashLoadId = React.useRef(0)
  const [pendingAction, setPendingAction] = React.useState<'trash' | 'restore' | 'delete' | null>(null)
  const [actionError, setActionError] = React.useState<string | null>(null)
  const [actionMessage, setActionMessage] = React.useState<string | null>(null)
  const [trashError, setTrashError] = React.useState<string | null>(null)
  const { t } = useLanguage()

  const [createModal, setCreateModal] = React.useState(
    defaultCreate || searchParams?.get('create') === 'true' || searchParams?.get('upload') === 'true'
  )

  const loadAssignments = React.useCallback(async (fresh = false) => {
    const version = dataVersion.current, requestId = ++activeLoadId.current
    try {
      const [assigns, cls] = await Promise.all([
        assignmentsApi.getAssignments(undefined, fresh),
        classesApi.getClasses(1, 1000),
      ])
      if (version !== dataVersion.current || requestId !== activeLoadId.current) return
      setAssignments(assigns || [])
      setClasses(cls || [])
      setLoadError(null)
    } catch (err) {
      if (version !== dataVersion.current || requestId !== activeLoadId.current) return
      setLoadError(errorMessage(err))
    } finally { setLoading(false) }
  }, [])

  const loadTrash = React.useCallback(async () => {
    const version = dataVersion.current, requestId = ++trashLoadId.current
    setTrashLoading(true)
    try {
      const trash = await assignmentsApi.getTrashAssignments()
      if (version !== dataVersion.current || requestId !== trashLoadId.current) return
      setTrashAssignments(trash || [])
      setTrashLoaded(true)
      setTrashError(null)
    } catch (err) {
      if (version !== dataVersion.current || requestId !== trashLoadId.current) return
      setTrashError(errorMessage(err))
    } finally { if (requestId === trashLoadId.current) setTrashLoading(false) }
  }, [])

  React.useEffect(() => {
    try {
      if (typeof peekClientApiCache === 'function') {
        const cachedA = peekClientApiCache<any[]>('/assignments')
        const cachedC = peekClientApiCache<any[]>('/classes?page=1&limit=1000')
        if (cachedA) {
          setAssignments(cachedA)
          setLoading(false)
        }
        if (cachedC && cachedC.length > 0) {
          setClasses(cachedC)
        }
      }
    } catch {}

    void loadAssignments()
    void loadTrash()
  }, [loadAssignments, loadTrash])

  React.useEffect(() => {
    if (viewMode === 'trash') void loadTrash()
  }, [viewMode, loadTrash])

  async function softDelete(id: string) {
    if (movingRef.current) return
    if (!confirm(t('lecturer.assignments.confirm_trash', 'Chuyển bài tập này vào thùng rác?'))) return
    await moveToTrash([id])
  }

  async function performAction(ids: string[], action: 'trash' | 'restore' | 'delete') {
    if (movingRef.current || !ids.length) return
    movingRef.current = true
    dataVersion.current++
    setMovingToTrash(true)
    setPendingAction(action)
    setActionError(null)
    setActionMessage(null)
    const sourceRows = action === 'trash' ? assignments : trashAssignments
    try {
      const results = await Promise.allSettled(ids.map(async id => {
        if (action === 'trash') await assignmentsApi.deleteAssignment(id)
        else if (action === 'restore') await assignmentsApi.restoreAssignment(id)
        else await assignmentsApi.hardDeleteAssignment(id)
        dataVersion.current++
        const row = sourceRows.find(item => item.id === id)
        if (action === 'trash') {
          setAssignments(previous => previous.filter(item => item.id !== id))
          if (row) setTrashAssignments(previous => [{ ...row, status: 'deleted', isDeleted: true }, ...previous.filter(item => item.id !== id)])
        } else {
          setTrashAssignments(previous => previous.filter(item => item.id !== id))
          if (action === 'restore' && row) setAssignments(previous => [...previous.filter(item => item.id !== id), { ...row, status: String(row.trashPreviousStatus || 'published').toLowerCase(), isDeleted: false }])
          if (action === 'delete') setAssignments(previous => previous.filter(item => item.id !== id))
        }
        setSelectedIds(previous => new Set([...previous].filter(selected => selected !== id)))
      }))
      const successful = results.filter(result => result.status === 'fulfilled').length
      const failed = results.filter(result => result.status === 'rejected')
      if (successful) setActionMessage(action === 'trash'
        ? 'Đã chuyển ' + successful + ' bài tập vào thùng rác. Bạn có thể khôi phục trong tab Thùng rác.'
        : action === 'restore' ? 'Đã khôi phục ' + successful + ' bài tập.' : 'Đã xóa vĩnh viễn ' + successful + ' bài tập.')
      if (failed.length) setActionError(failed.length + (action === 'trash' ? ' bài tập chưa chuyển được: ' : ' bài tập chưa xử lý được: ') + errorMessage(failed[0].reason))
      await Promise.all([loadAssignments(true), loadTrash()])
    } finally {
      movingRef.current = false
      setMovingToTrash(false)
      setPendingAction(null)
    }
  }

  async function moveToTrash(ids: string[]) { await performAction(ids, 'trash') }
  async function restore(id: string) { await performAction([id], 'restore') }
  async function hardDelete(id: string) {
    if (movingRef.current || !confirm(t('lecturer.assignments.confirm_hard_delete', 'Bạn có chắc chắn muốn xóa vĩnh viễn bài tập này? Thao tác này không thể hoàn tác!'))) return
    await performAction([id], 'delete')
  }
  async function bulkDelete() {
    if (!selectedIds.size || movingRef.current || !confirm(t('lecturer.assignments.confirm_bulk_trash', 'Chuyển ' + selectedIds.size + ' bài tập vào thùng rác?', { count: selectedIds.size }))) return
    await performAction([...selectedIds], 'trash')
  }
  async function bulkRestore() { await performAction([...selectedIds], 'restore') }
  async function bulkHardDelete() {
    if (!selectedIds.size || movingRef.current || !confirm(t('lecturer.assignments.confirm_bulk_hard_delete', 'Xóa vĩnh viễn ' + selectedIds.size + ' bài tập đã chọn? Dữ liệu không thể khôi phục!', { count: selectedIds.size }))) return
    await performAction([...selectedIds], 'delete')
  }

  function toggleSelect(id: string) {
    if (movingRef.current) return
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const activeList = assignments.filter(a => a.status !== 'deleted' && a.status !== 'Deleted' && !a.isDeleted)
  const currentList = viewMode === 'trash' ? trashAssignments : activeList

  const filtered = currentList.filter(a => {
    const titleStr = a.title || a.metadata?.title || ''
    const subjectStr = a.subjectCode || a.subjectName || a.metadata?.subject || ''
    const matchSearch = !search ||
      titleStr.toLowerCase().includes(search.toLowerCase()) ||
      subjectStr.toLowerCase().includes(search.toLowerCase())

    const matchClass = !filterClassId ||
      a.classId === filterClassId ||
      (Array.isArray(a.classIds) && a.classIds.includes(filterClassId)) ||
      (Array.isArray(a.classes) && a.classes.some((c: any) => typeof c === 'string' ? c === filterClassId : c?.id === filterClassId)) ||
      (Array.isArray(a.metadata?.classes) && a.metadata.classes.some((c: any) => typeof c === 'string' ? c === filterClassId : c?.id === filterClassId))

    return matchSearch && matchClass
  })

  const trashCount = trashAssignments.length

  return (
    <DashboardLayout
      navItems={LECTURER_NAV}
      title="AITA Lecturer"
      roleLabel={t('profile.role_lecturer', 'Giảng viên')}
      requiredRole="lecturer"
      headerTitle={t('lecturer.assignments.title', 'Quản lý Bài tập & Đề thi')}
      headerSubtitle={t('lecturer.assignments.subtitle', 'Tạo bài tập, cấu hình rubric AI, giám sát tiến độ nộp bài')}
    >
      <div className="space-y-6">
        <ErrorNotice message={loadError} onRetry={() => { void loadAssignments(); void loadTrash(); }} />
        <ErrorNotice message={actionError || trashError} onRetry={() => { void loadAssignments(true); void loadTrash(); }} />
        {actionMessage && <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">{actionMessage}</p>}
        {pendingAction && <p role="status" className="flex items-center gap-2 text-sm text-orange-600"><LoaderCircle className="h-4 w-4 animate-spin" />{pendingAction === 'delete' ? 'Đang xóa vĩnh viễn…' : pendingAction === 'restore' ? 'Đang khôi phục…' : 'Đang chuyển vào thùng rác…'}</p>}

        {/* Executive KPI Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="relative overflow-hidden p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-orange-50/80 via-white to-amber-50/40 dark:from-slate-900 dark:via-slate-900/90 dark:to-orange-950/20 border border-orange-100/90 dark:border-orange-900/30 shadow-xs hover:shadow-md transition-all group">
            <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-gradient-to-tr from-orange-400/15 via-amber-300/15 to-transparent rounded-full blur-2xl group-hover:from-orange-400/25 group-hover:via-amber-300/25 transition-all pointer-events-none" />
            <div className="flex items-start justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                {t('lecturer.assignments.stat_total', 'Tổng bài tập')}
              </span>
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-orange-500 via-amber-500 to-orange-400 text-white flex items-center justify-center shadow-md shadow-orange-500/25">
                <FileCheck className="w-5 h-5 text-white" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">{activeList.length}</span>
              <span className="text-xs font-semibold text-slate-500">đề</span>
            </div>
            <p className="mt-1 text-[11px] font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-orange-400" />
              <span>Đang hoạt động</span>
            </p>
          </div>

          <div className="relative overflow-hidden p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-orange-50/80 via-white to-amber-50/40 dark:from-slate-900 dark:via-slate-900/90 dark:to-orange-950/20 border border-orange-100/90 dark:border-orange-900/30 shadow-xs hover:shadow-md transition-all group">
            <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-gradient-to-tr from-orange-400/15 via-amber-300/15 to-transparent rounded-full blur-2xl group-hover:from-orange-400/25 group-hover:via-amber-300/25 transition-all pointer-events-none" />
            <div className="flex items-start justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                {t('lecturer.assignments.stat_published', 'Đã giao sinh viên')}
              </span>
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-orange-500 via-amber-500 to-orange-400 text-white flex items-center justify-center shadow-md shadow-orange-500/25">
                <Send className="w-5 h-5 text-white" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                {activeList.filter(a => a.status === 'published').length}
              </span>
              <span className="text-xs font-semibold text-slate-500">bài tập</span>
            </div>
            <p className="mt-1 text-[11px] font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-orange-400" />
              <span>Sinh viên đã nhận đề</span>
            </p>
          </div>

          <div className="relative overflow-hidden p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-orange-50/80 via-white to-amber-50/40 dark:from-slate-900 dark:via-slate-900/90 dark:to-orange-950/20 border border-orange-100/90 dark:border-orange-900/30 shadow-xs hover:shadow-md transition-all group">
            <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-gradient-to-tr from-orange-400/15 via-amber-300/15 to-transparent rounded-full blur-2xl group-hover:from-orange-400/25 group-hover:via-amber-300/25 transition-all pointer-events-none" />
            <div className="flex items-start justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                {t('lecturer.assignments.stat_draft', 'Bản nháp')}
              </span>
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-orange-500 via-amber-500 to-orange-400 text-white flex items-center justify-center shadow-md shadow-orange-500/25">
                <Clock className="w-5 h-5 text-white" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                {activeList.filter(a => a.status !== 'published').length}
              </span>
              <span className="text-xs font-semibold text-slate-500">bản thảo</span>
            </div>
            <p className="mt-1 text-[11px] font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-orange-400" />
              <span>Chờ hoàn thiện Rubric</span>
            </p>
          </div>

          <div className="relative overflow-hidden p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-orange-50/80 via-white to-amber-50/40 dark:from-slate-900 dark:via-slate-900/90 dark:to-orange-950/20 border border-orange-100/90 dark:border-orange-900/30 shadow-xs hover:shadow-md transition-all group">
            <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-gradient-to-tr from-orange-400/15 via-amber-300/15 to-transparent rounded-full blur-2xl group-hover:from-orange-400/25 group-hover:via-amber-300/25 transition-all pointer-events-none" />
            <div className="flex items-start justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                {t('lecturer.assignments.stat_trash', 'Thùng rác')}
              </span>
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-orange-500 via-amber-500 to-orange-400 text-white flex items-center justify-center shadow-md shadow-orange-500/25">
                <Trash2 className="w-5 h-5 text-white" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span data-testid="assignment-trash-count" className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">{trashLoaded ? trashCount : '—'}</span>
              <span className="text-xs font-semibold text-slate-500">mục</span>
            </div>
            <p className="mt-1 text-[11px] font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-orange-400" />
              <span>Có thể khôi phục lại</span>
            </p>
          </div>
        </div>

        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="inline-flex flex-wrap p-1.5 bg-gradient-to-br from-orange-50/80 via-white to-amber-50/40 dark:from-slate-900 dark:via-slate-900/90 dark:to-orange-950/20 rounded-2xl border border-orange-100/90 dark:border-orange-900/30 shadow-xs gap-1">
              <button
                type="button"
                onClick={() => { setViewMode('active'); setSelectedIds(new Set()); void loadAssignments(); }}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                  viewMode === 'active'
                    ? 'bg-gradient-to-r from-orange-500 via-amber-500 to-orange-500 text-white shadow-md shadow-orange-500/20'
                    : 'text-slate-600 hover:text-orange-600 dark:text-slate-300 dark:hover:text-white hover:bg-orange-50/60'
                }`}
              >
                <Inbox className="w-3.5 h-3.5 inline" />
                <span>{t('lecturer.assignments.tab_active', 'Đang hoạt động')}</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold ${viewMode === 'active' ? 'bg-white/20 text-white' : 'bg-orange-100/80 text-orange-700'}`}>
                  {activeList.length}
                </span>
              </button>
              <button
                type="button"
                onClick={() => { setViewMode('trash'); setSelectedIds(new Set()); }}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                  viewMode === 'trash'
                    ? 'bg-gradient-to-r from-rose-500 to-rose-600 text-white shadow-md shadow-rose-500/20'
                    : 'text-slate-600 hover:text-rose-600 dark:text-slate-300 dark:hover:text-white hover:bg-rose-50/60'
                }`}
              >
                <Trash2 className="w-3.5 h-3.5 inline" />
                <span>{t('lecturer.assignments.tab_trash', 'Thùng rác')}</span>
                {trashCount > 0 && (
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold ${viewMode === 'trash' ? 'bg-white/20 text-white' : 'bg-rose-100/80 text-rose-700'}`}>
                    {trashCount}
                  </span>
                )}
              </button>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {selectedIds.size > 0 && viewMode === 'active' && (
              <Button variant="danger" size="sm" disabled={movingToTrash} aria-busy={movingToTrash} onClick={bulkDelete} className="gap-1.5 text-xs rounded-2xl h-10 px-4">
                {movingToTrash ? <LoaderCircle className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />} {movingToTrash ? 'Đang chuyển…' : t('ui.delete', 'Xóa')} ({selectedIds.size})
              </Button>
            )}
            {selectedIds.size > 0 && viewMode === 'trash' && (
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" disabled={movingToTrash} aria-busy={movingToTrash} onClick={bulkRestore} className="gap-1.5 text-xs text-emerald-600 border-emerald-300 hover:bg-emerald-50 rounded-2xl h-10 px-4">
                  <RotateCcw className="w-3.5 h-3.5" /> {t('lecturer.assignments.restore', 'Khôi phục')} ({selectedIds.size})
                </Button>
                <Button variant="danger" size="sm" disabled={movingToTrash} aria-busy={movingToTrash} onClick={bulkHardDelete} className="gap-1.5 text-xs rounded-2xl h-10 px-4">
                  <Trash2 className="w-3.5 h-3.5" /> {t('lecturer.assignments.hard_delete', 'Xóa vĩnh viễn')} ({selectedIds.size})
                </Button>
              </div>
            )}
            {viewMode === 'active' && (
              <div className="flex items-center gap-2.5">
                <Link href="/lecturer/grading/assignments/upload">
                  <button
                    type="button"
                    className="border border-orange-200/80 dark:border-orange-900/40 bg-gradient-to-br from-orange-50/60 via-white to-amber-50/30 dark:from-slate-900 dark:to-slate-800 text-orange-700 dark:text-orange-300 hover:border-orange-300 rounded-2xl h-10 px-4 font-bold text-xs shadow-xs flex items-center gap-1.5 cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-orange-500" />
                    <span>{t('lecturer.assignments.ai_generate', 'Tạo đề AI')}</span>
                  </button>
                </Link>
                <button
                  type="button"
                  onClick={() => setCreateModal(true)}
                  className="bg-gradient-to-r from-orange-500 via-amber-500 to-orange-500 hover:from-orange-600 hover:via-amber-600 hover:to-orange-600 shadow-orange-500/25 rounded-2xl h-10 px-5 text-white font-bold text-xs gap-1.5 shadow-md active:scale-95 transition-all flex items-center cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>{t('lecturer.assignments.create_new', 'Tạo bài tập mới')}</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Search */}
        <div className="p-4 sm:p-5 rounded-2xl shadow-xs bg-gradient-to-br from-orange-50/80 via-white to-amber-50/40 dark:from-slate-900 dark:via-slate-900/90 dark:to-orange-950/20 border border-orange-100/90 dark:border-orange-900/30">
          <div className="max-w-md">
            <Input
              type="text"
              placeholder={viewMode === 'trash' ? t('lecturer.assignments.search_trash', 'Tìm bài tập trong thùng rác...') : t('lecturer.assignments.search_placeholder', 'Tìm theo tên bài tập, mã môn...')}
              icon={<Search className="w-4 h-4 text-orange-500" />}
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="border-orange-200/80 focus:ring-2 focus:ring-orange-400/25 focus:border-orange-400 rounded-xl"
            />
          </div>
        </div>

        {/* Grid */}
        {(viewMode === 'active' && loading && assignments.length === 0) || (viewMode === 'trash' && trashLoading && !trashLoaded) ? (
          <CardGridSkeleton count={6} />
        ) : viewMode === 'trash' && trashError && filtered.length === 0 ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-8 text-center text-sm text-rose-700">
            Không tải được danh sách thùng rác. Dữ liệu chưa được xác định; vui lòng bấm Thử lại ở thông báo phía trên.
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4 border border-dashed border-slate-200 dark:border-slate-800 rounded-3xl bg-white/50 dark:bg-slate-900/50">
            {viewMode === 'trash' ? <Trash2 className="w-10 h-10 text-slate-300" /> : <FileCheck className="w-10 h-10 text-slate-300" />}
            <p className="text-sm text-slate-400">{viewMode === 'trash' ? t('lecturer.assignments.trash_empty', 'Thùng rác trống.') : t('lecturer.assignments.no_assignments', 'Chưa có bài tập nào.')}</p>
            {viewMode === 'active' && (
              <Button variant="primary" size="sm" onClick={() => setCreateModal(true)} className="gap-1.5 text-xs">
                <Plus className="w-4 h-4" /> {t('lecturer.assignments.create_first', 'Tạo bài tập đầu tiên')}
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {filtered.map((assign: any) => {
              const displayTitle = assign.title || assign.metadata?.title || t('lecturer.assignments.untitled', 'Bài tập không tên')
              const displaySubject = assign.subjectCode || assign.subjectName || assign.metadata?.subject || t('lecturer.assignments.subject_fallback', 'Môn')
              const displayDesc = assign.description || assign.metadata?.description || ''
              const dueVal = assign.due || assign.dueAt || assign.metadata?.dueDate || (typeof assign.dueDate === 'string' ? assign.dueDate : null)
              const isOverdue = dueVal ? new Date(dueVal) < new Date() : false
              const isSelected = selectedIds.has(assign.id)
              return (
                <div
                  key={assign.id}
                  className={`group relative p-5 bg-white dark:bg-slate-900 rounded-3xl border-2 transition-all cursor-pointer ${
                    isSelected ? 'border-orange-500 ring-2 ring-orange-500/20' : 'border-slate-200/60 dark:border-slate-800 hover:border-orange-500/40 hover:shadow-lg'
                  }`}
                  onClick={() => toggleSelect(assign.id)}
                >
                  {/* Selection indicator */}
                  {isSelected && (
                    <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-orange-500 flex items-center justify-center">
                      <CheckCircle2 className="w-3 h-3 text-white" />
                    </div>
                  )}

                  <div className="space-y-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="orange" className="font-mono text-[10px]">{displaySubject}</Badge>
                      <Badge variant={assign.status === 'published' ? 'success' : 'default'} className="text-[10px]">
                        {viewMode === 'trash' ? t('lecturer.assignments.tab_trash', 'Thùng rác') : assign.status === 'published' ? t('lecturer.assignments.status_published', 'Đã giao') : t('lecturer.assignments.status_draft', 'Bản nháp')}
                      </Badge>
                    </div>
                    <h3 className="font-bold text-sm text-slate-900 dark:text-white leading-tight group-hover:text-orange-500 transition-colors line-clamp-2">
                      {displayTitle}
                    </h3>
                    {displayDesc && (
                      <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">{displayDesc}</p>
                    )}
                    <div className={`flex items-center gap-1.5 text-xs ${isOverdue ? 'text-rose-500' : 'text-slate-400'}`}>
                      <Calendar className="w-3.5 h-3.5" />
                      {dueVal ? formatDate(dueVal) : t('lecturer.assignments.no_due', 'Không có hạn')}
                      {isOverdue && <span className="font-semibold">· {t('lecturer.assignments.overdue', 'Quá hạn')}</span>}
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2" onClick={e => e.stopPropagation()}>
                    {viewMode === 'active' ? (
                      <>
                        <Link href={`/lecturer/assignments/${assign.id}`} className="flex-1">
                          <Button variant="primary" size="sm" className="w-full text-xs gap-1.5">
                            <Settings2 className="w-3.5 h-3.5" /> Workspace
                          </Button>
                        </Link>
                        <button
                          disabled={movingToTrash}
                          aria-busy={movingToTrash}
                          aria-label={`Chuyển ${displayTitle} vào thùng rác`}
                          onClick={() => softDelete(assign.id)}
                          className="p-2 rounded-xl text-slate-300 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors"
                          title={t('lecturer.assignments.delete_tooltip', 'Xóa vào thùng rác')}
                        >
                          {movingToTrash ? <LoaderCircle className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                        </button>
                      </>
                    ) : (
                      <div className="flex items-center justify-between w-full gap-2">
                        <Button variant="outline" size="sm" disabled={movingToTrash} aria-busy={movingToTrash} onClick={() => restore(assign.id)} className="text-xs gap-1.5 flex-1 text-emerald-600 border-emerald-300 hover:bg-emerald-50">
                          <RotateCcw className="w-3.5 h-3.5" /> {t('lecturer.assignments.restore', 'Khôi phục')}
                        </Button>
                        <Button variant="danger" size="sm" disabled={movingToTrash} aria-busy={movingToTrash} onClick={() => hardDelete(assign.id)} className="text-xs gap-1.5 flex-1">
                          <Trash2 className="w-3.5 h-3.5" /> {t('lecturer.assignments.hard_delete', 'Xóa vĩnh viễn')}
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Wizard Modal */}
      <CreateAssignmentWizardModal
        isOpen={createModal}
        onClose={() => setCreateModal(false)}
        classes={classes}
        onSuccess={() => { setLoading(true); loadAssignments() }}
      />
    </DashboardLayout>
  )
}
