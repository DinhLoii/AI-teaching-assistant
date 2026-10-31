'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Award, BookOpen, CalendarDays, CheckCircle2, ChevronRight, Download, FileCheck, History, RefreshCw, Search, Send, Settings2, ShieldCheck, Users } from 'lucide-react'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { ADMIN_NAV } from '@/config/navigation'
import { Button } from '@/components/ui/button'
import { Modal } from '@/components/ui/modal'
import { errorMessage } from '@/lib/api/errors'
import { gradebookApi } from '@/lib/api/modules/gradebook'
import type { Gradebook, GradebookCell, GradebookChange, GradebookExam, GradebookHistory, GradebookSemester, GradebookStudent } from '@/lib/api/modules/gradebook'

const field = 'w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/15 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 disabled:opacity-60'
const panel = 'rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900'
const formatScore = (score: number | null) => score == null ? '—' : score.toLocaleString('vi-VN', { maximumFractionDigits: 2 })
const formatDate = (date: string | null) => date ? new Date(date).toLocaleString('vi-VN') : '—'
const editable = (g: GradebookCell, e?: GradebookExam) => g.status.toLowerCase() === 'graded' && !!g.submissionId && !!g.revision && e?.maxScore != null && e.maxScore > 0
const ready = (g: GradebookCell, e?: GradebookExam) => editable(g, e) && g.score != null && g.score >= 0 && g.score <= e!.maxScore!
function statusText(g: GradebookCell) {
  if (!g.submissionId) return 'Chưa nộp'
  if (g.status.toLowerCase() === 'graded' && g.score != null) return g.published ? 'Đã công bố' : 'Bản nháp'
  if (['error', 'failed'].includes(g.status.toLowerCase())) return 'Lỗi chấm'
  return 'Chờ chấm'
}

type Detail = { student: GradebookStudent; exam: GradebookExam; cell: GradebookCell }

export default function AdminGradebookPage() {
  const [catalog, setCatalog] = useState<GradebookSemester[]>([])
  const [catalogLoading, setCatalogLoading] = useState(true)
  const [catalogError, setCatalogError] = useState('')
  const [semesterId, setSemesterId] = useState('')
  const [classCode, setClassCode] = useState('')
  const [courseId, setCourseId] = useState('')
  const [data, setData] = useState<Gradebook | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [refresh, setRefresh] = useState(0)
  const [catalogRefresh, setCatalogRefresh] = useState(0)
  const [search, setSearch] = useState('')
  const [examId, setExamId] = useState('')
  const [status, setStatus] = useState('all')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [detail, setDetail] = useState<Detail | null>(null)
  const [score, setScore] = useState('')
  const [feedback, setFeedback] = useState('')
  const [published, setPublished] = useState(false)
  const [reason, setReason] = useState('')
  const [saving, setSaving] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [modalError, setModalError] = useState('')
  const [history, setHistory] = useState<GradebookHistory[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const [historyError, setHistoryError] = useState('')
  const [bulk, setBulk] = useState<{ published: boolean; changes: GradebookChange[] } | null>(null)
  const [weightsOpen, setWeightsOpen] = useState(false)
  const [weights, setWeights] = useState<Record<string, string>>({})

  useEffect(() => {
    const controller = new AbortController()
    const query = new URLSearchParams(window.location.search)
    setCatalogLoading(true); setCatalogError('')
    gradebookApi.catalog(controller.signal).then(items => {
      setCatalog(items)
      const requested = items.flatMap(s => s.classes).find(c => c.id === query.get('classId'))
      const semester = items.find(s => s.classes.some(c => c.id === requested?.id)) || items.find(s => s.id === query.get('semesterId')) || items.find(s => s.active) || items[0]
      setSemesterId(semester?.id || '')
      setClassCode(requested?.code || '')
      setCourseId(requested?.id || '')
    }).catch(cause => { if (!controller.signal.aborted) setCatalogError(errorMessage(cause)) })
      .finally(() => { if (!controller.signal.aborted) setCatalogLoading(false) })
    return () => controller.abort()
  }, [catalogRefresh])

  const semester = catalog.find(s => s.id === semesterId)
  const classCodes = [...new Set(semester?.classes.map(c => c.code) || [])].sort()
  const courses = semester?.classes.filter(c => c.code === classCode) || []
  const course = courses.find(c => c.id === courseId)

  useEffect(() => {
    const controller = new AbortController()
    if (catalogLoading) return () => controller.abort()
    setData(null); setError(''); setSelected(new Set())
    const query = new URLSearchParams()
    if (semesterId) query.set('semesterId', semesterId)
    if (courseId) query.set('classId', courseId)
    window.history.replaceState(null, '', `${window.location.pathname}${query.size ? `?${query}` : ''}`)
    if (!courseId) { setLoading(false); return () => controller.abort() }
    setLoading(true)
    gradebookApi.get(courseId, controller.signal).then(setData)
      .catch(cause => { if (!controller.signal.aborted) setError(errorMessage(cause)) })
      .finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [courseId, semesterId, refresh, catalogLoading])

  useEffect(() => { setSearch(''); setStatus('all'); setExamId(''); setSuccess('') }, [courseId])

  useEffect(() => {
    setHistory([]); setHistoryError('')
    if (!detail?.cell.submissionId || !courseId) return
    const controller = new AbortController()
    setHistoryLoading(true)
    gradebookApi.history(courseId, detail.cell.submissionId, controller.signal).then(setHistory)
      .catch(cause => { if (!controller.signal.aborted) setHistoryError(errorMessage(cause)) })
      .finally(() => { if (!controller.signal.aborted) setHistoryLoading(false) })
    return () => controller.abort()
  }, [detail, courseId])

  const exams = useMemo(() => data?.exams.filter(e => !examId || e.id === examId) || [], [data, examId])
  const rows = useMemo(() => (data?.rows || []).filter(row => {
    if (search && !`${row.code || ''} ${row.name || ''} ${row.email || ''}`.toLocaleLowerCase('vi').includes(search.toLocaleLowerCase('vi'))) return false
    const cells = row.grades.filter(g => !examId || g.examId === examId)
    if (status === 'missing') return cells.some(g => !g.submissionId)
    if (status === 'pending') return cells.some(g => g.submissionId && g.score == null)
    if (status === 'draft') return cells.some(g => g.score != null && !g.published)
    if (status === 'published') return cells.length > 0 && cells.every(g => g.score != null && g.published)
    return true
  }), [data, search, examId, status])

  const totals = data?.rows.map(r => r.total).filter((n): n is number => n != null) || []
  const cells = data?.rows.flatMap(r => r.grades) || []
  const validWeights = !!data?.exams.length && data.exams.every(e => e.maxScore != null && e.maxScore > 0 && e.weight != null && e.weight >= 0) && Math.abs(data.weightTotal - 100) < 0.001
  const visibleSelected = rows.filter(r => selected.has(r.id))

  function openDetail(student: GradebookStudent, exam: GradebookExam, cell: GradebookCell) {
    setDetail({ student, exam, cell }); setScore(cell.score == null ? '' : String(cell.score))
    setFeedback(cell.feedback); setPublished(cell.published); setReason(''); setModalError('')
  }

  async function save(changes: GradebookChange[]) {
    if (saving) return
    setSaving(true); setModalError(''); setSuccess('')
    try {
      const result = await gradebookApi.update(courseId, reason.trim(), changes)
      setDetail(null); setBulk(null); setSelected(new Set())
      setSuccess(`Đã cập nhật ${result.updated} bài. Thay đổi đã được ghi vào lịch sử.`)
      setRefresh(v => v + 1)
    } catch (cause) { setModalError(errorMessage(cause)) }
    finally { setSaving(false) }
  }

  function openBulk(publish: boolean) {
    const changes = visibleSelected.flatMap(row => row.grades.filter(g => (!examId || g.examId === examId) && ready(g, data?.exams.find(e => e.id === g.examId)) && g.published !== publish)
      .map(g => ({ submissionId: g.submissionId!, revision: g.revision!, published: publish })))
    setBulk({ published: publish, changes }); setReason(''); setModalError('')
  }

  async function exportExcel() {
    if (!data || exporting) return
    setExporting(true); setError('')
    try {
      const XLSX = await import('xlsx')
      const sheet = XLSX.utils.aoa_to_sheet([
        ['BẢNG ĐIỂM HỌC PHẦN'], ['Học kỳ', data.class.semester], ['Lớp', data.class.code],
        ['Môn học', `${data.class.subjectCode} — ${data.class.subjectName}`],
        ['Xuất lúc', formatDate(new Date().toISOString())], ['Phạm vi', `${rows.length} sinh viên theo bộ lọc hiện tại`],
        ['Quy tắc', 'Điểm tổng hợp thang 10 chỉ có khi tổng trọng số 100% và đủ điểm. Bao gồm điểm nháp.'], [],
        ['MSSV', 'Họ tên', 'Email', ...exams.flatMap(e => [`${e.title} / ${e.maxScore ?? '?'} (${e.weight ?? '?'}%)`, 'Trạng thái']), 'Tổng hợp / 10', 'Tổng hợp đã công bố / 10'],
        ...rows.map(r => [r.code, r.name, r.email, ...exams.flatMap(e => { const g = r.grades.find(c => c.examId === e.id)!; return [g.score, statusText(g)] }), r.total, r.publishedTotal]),
      ])
      sheet['!cols'] = [{ wch: 16 }, { wch: 28 }, { wch: 32 }, ...exams.flatMap(() => [{ wch: 26 }, { wch: 18 }]), { wch: 22 }, { wch: 30 }]
      const workbook = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(workbook, sheet, 'Bảng điểm')
      XLSX.writeFile(workbook, `Bang-diem-${data.class.code}-${data.class.subjectCode}.xlsx`.replace(/[<>:"/\\|?*]/g, '_'))
    } catch (cause) { setError(errorMessage(cause)) }
    finally { setExporting(false) }
  }

  const editAllowed = detail && editable(detail.cell, detail.exam)
  const scoreValid = detail && score.trim() !== '' && Number.isFinite(Number(score)) && Number(score) >= 0 && Number(score) <= (detail.exam.maxScore ?? 0)

  return (
    <DashboardLayout navItems={ADMIN_NAV} title="AITA Admin" roleLabel="Quản trị viên" requiredRole="admin" headerTitle="Quản lý điểm" headerSubtitle="Theo dõi và quản lý kết quả học tập theo học kỳ">
      <div className="space-y-6">
        <section className={`${panel} relative overflow-hidden p-6 sm:p-8`}>
          <div className="absolute -right-10 -top-16 h-56 w-56 rounded-full bg-orange-500/5" aria-hidden="true" />
          <div className="relative flex flex-wrap items-start justify-between gap-4">
            <div className="max-w-2xl space-y-3">
              <span className="inline-flex items-center gap-2 rounded-full bg-orange-50 px-3 py-1 text-xs font-bold text-orange-700 dark:bg-orange-950/40 dark:text-orange-300"><ShieldCheck className="h-3.5 w-3.5" /> QUẢN LÝ ĐÀO TẠO</span>
              <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">Bảng điểm sinh viên</h1>
              <p className="text-sm leading-6 text-slate-500 dark:text-slate-400">Tập trung kết quả từng bài đánh giá, rà soát điểm nháp và công bố kết quả cho sinh viên trong từng học phần.</p>
            </div>
            <Button variant="outline" onClick={() => courseId ? setRefresh(v => v + 1) : setCatalogRefresh(v => v + 1)} disabled={loading || catalogLoading || saving}><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Làm mới</Button>
          </div>
          <div className="relative mt-7 grid gap-4 md:grid-cols-3">
            <label className="space-y-2 text-xs font-bold text-slate-500"><span className="flex items-center gap-2"><CalendarDays className="h-4 w-4" /> 01 · HỌC KỲ</span>
              <select aria-label="Học kỳ" className={field} disabled={catalogLoading || saving} value={semesterId} onChange={e => { setSemesterId(e.target.value); setClassCode(''); setCourseId(''); setSuccess('') }}>
                <option value="">Chọn học kỳ</option>{catalog.map(s => <option key={s.id} value={s.id}>{s.season} {s.code}{s.active ? ' · Đang hoạt động' : ''}</option>)}
              </select>
            </label>
            <label className="space-y-2 text-xs font-bold text-slate-500"><span className="flex items-center gap-2"><Users className="h-4 w-4" /> 02 · LỚP TRONG KỲ</span>
              <select aria-label="Lớp trong kỳ" className={field} value={classCode} disabled={!semesterId || saving} onChange={e => { setClassCode(e.target.value); setCourseId(''); setSuccess('') }}>
                <option value="">Chọn lớp học</option>{classCodes.map(code => <option key={code} value={code}>{code}</option>)}
              </select>
            </label>
            <label className="space-y-2 text-xs font-bold text-slate-500"><span className="flex items-center gap-2"><BookOpen className="h-4 w-4" /> 03 · MÔN HỌC CỦA LỚP</span>
              <select aria-label="Môn học của lớp" className={field} value={courseId} disabled={!classCode || saving} onChange={e => { setCourseId(e.target.value); setSuccess('') }}>
                <option value="">Chọn môn học</option>{courses.map(c => <option key={c.id} value={c.id}>{c.subjectCode} — {c.subjectName}</option>)}
              </select>
            </label>
          </div>
          {catalogLoading && <p className="mt-4 text-sm text-slate-500" role="status">Đang tải học kỳ và lớp học...</p>}
          {catalogError && <div role="alert" className="mt-4 text-sm text-rose-600">{catalogError} <button className="underline" onClick={() => setCatalogRefresh(v => v + 1)}>Thử lại</button></div>}
          {!catalogLoading && !catalogError && (!catalog.length || (semester && !semester.classes.length)) && <p className="mt-4 text-sm text-slate-500">{!catalog.length ? 'Hệ thống chưa có học kỳ.' : 'Học kỳ này chưa có lớp học phần. Tạo lớp và gán môn học để quản lý điểm.'}</p>}
        </section>

        {success && <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-300">{success}</div>}
        {error && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700 dark:bg-rose-950/30 dark:text-rose-300">{error} <button className="ml-2 underline" onClick={() => setRefresh(v => v + 1)}>Tải lại bảng điểm</button></div>}
        {loading && <div className={`${panel} p-16 text-center text-sm text-slate-500`} role="status"><RefreshCw className="mx-auto mb-3 h-6 w-6 animate-spin text-orange-500" />Đang tải bảng điểm học phần...</div>}
        {!courseId && !catalogLoading && <div className={`${panel} px-6 py-16 text-center`}><BookOpen className="mx-auto mb-4 h-10 w-10 text-orange-400" /><h2 className="font-bold">Chọn học phần để bắt đầu</h2><p className="mt-2 text-sm text-slate-500">Lần lượt chọn học kỳ, lớp và môn học ở phía trên.</p></div>}

        {data && data.class.id === courseId && <>
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500"><span>{data.class.semester}</span><ChevronRight className="h-3 w-3" /><span>{data.class.code}</span><ChevronRight className="h-3 w-3" /><strong className="text-orange-600">{data.class.subjectCode}</strong><span className="ml-auto">Cập nhật {formatDate(data.generatedAt)}</span></div>
          <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
            {[
              { label: 'Sinh viên trong lớp', value: data.rows.length, note: `${data.class.lecturers.join(', ') || 'Chưa phân công giảng viên'}`, icon: Users },
              { label: 'Bài đánh giá', value: data.exams.length, note: `Tổng trọng số: ${formatScore(data.weightTotal)}%`, icon: FileCheck },
              { label: 'Đã công bố', value: `${cells.filter(g => g.score != null && g.published).length}/${cells.length}`, note: `${cells.filter(g => g.score != null && !g.published).length} điểm đang ở bản nháp`, icon: CheckCircle2 },
              { label: 'Điểm tổng hợp trung bình', value: totals.length ? formatScore(totals.reduce((a, b) => a + b, 0) / totals.length) : '—', note: `${totals.length}/${data.rows.length} sinh viên đủ điểm · thang 10`, icon: Award },
            ].map(item => <div key={item.label} className={`${panel} p-5`}><div className="flex items-center justify-between gap-2"><p className="text-xs font-semibold text-slate-500">{item.label}</p><item.icon className="h-4 w-4 text-orange-500" /></div><p className="mt-4 text-2xl font-extrabold tabular-nums">{item.value}</p><p className="mt-2 text-xs leading-5 text-slate-500">{item.note}</p></div>)}
          </div>

          <section className={`${panel} overflow-hidden`}>
            <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 p-5 dark:border-slate-800">
              <div><h2 className="font-extrabold">{data.class.subjectCode} — {data.class.subjectName}</h2><p className="mt-1 text-xs text-slate-500">Nhấn vào từng ô điểm để xem chi tiết và điều chỉnh. Điểm từng bài dùng thang điểm ghi ở tiêu đề cột.</p></div>
              <div className="flex flex-wrap gap-2"><Button variant="outline" size="sm" disabled={!data.exams.length} onClick={() => { setWeights(Object.fromEntries(data.exams.map(e => [e.id, e.weight == null ? '' : String(e.weight)]))); setReason(''); setModalError(''); setWeightsOpen(true) }}><Settings2 className="h-4 w-4" /> Cấu hình trọng số</Button><Button variant="outline" size="sm" onClick={() => void exportExcel()} disabled={!rows.length || exporting} isLoading={exporting}><Download className="h-4 w-4" /> Xuất Excel</Button></div>
            </div>
            <div className="flex flex-wrap gap-3 p-5">
              <label className="relative min-w-52 flex-1"><Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" /><input aria-label="Tìm sinh viên" placeholder="Tìm MSSV, họ tên, email..." className={`${field} pl-9`} value={search} onChange={e => { setSearch(e.target.value); setSelected(new Set()) }} /></label>
              <select aria-label="Bài đánh giá" className={`${field} sm:!w-56`} value={examId} onChange={e => { setExamId(e.target.value); setSelected(new Set()) }}><option value="">Tất cả bài đánh giá</option>{data.exams.map(e => <option key={e.id} value={e.id}>{e.title}</option>)}</select>
              <select aria-label="Trạng thái điểm" className={`${field} sm:!w-48`} value={status} onChange={e => { setStatus(e.target.value); setSelected(new Set()) }}><option value="all">Tất cả trạng thái</option><option value="missing">Có bài chưa nộp</option><option value="pending">Có bài chờ / lỗi chấm</option><option value="draft">Có điểm nháp</option><option value="published">Đã công bố đủ</option></select>
            </div>
            {!validWeights && data.exams.length > 0 && <p className="mx-5 mb-4 rounded-xl bg-amber-50 p-3 text-xs leading-5 text-amber-800 dark:bg-amber-950/30 dark:text-amber-300">Chưa thể tính điểm tổng hợp: cần thang điểm hợp lệ và trọng số từng bài, tổng bằng 100%. Hiện tại: {formatScore(data.weightTotal)}%. Chọn “Cấu hình trọng số” để thiết lập cho học phần này.</p>}
            {selected.size > 0 && <div className="mx-5 mb-4 flex flex-wrap items-center gap-3 rounded-xl bg-orange-50 p-3 dark:bg-orange-950/30"><span className="mr-auto text-sm font-semibold">Đã chọn {visibleSelected.length} sinh viên</span><Button size="sm" onClick={() => openBulk(true)}><Send className="h-3.5 w-3.5" /> Công bố điểm</Button><Button size="sm" variant="outline" onClick={() => openBulk(false)}>Thu hồi công bố</Button><button className="text-xs underline" onClick={() => setSelected(new Set())}>Bỏ chọn</button></div>}
            {!data.exams.length ? <div className="p-12 text-center text-sm text-slate-500">Môn học trong lớp này chưa có bài đánh giá được giao.</div> : <div className="max-h-[640px] overflow-auto">
              <table className="w-full border-collapse text-left text-sm">
                <caption className="sr-only">Bảng điểm {data.class.subjectCode}, lớp {data.class.code}, kỳ {data.class.semester}</caption>
                <thead className="sticky top-0 z-20 bg-slate-50 dark:bg-slate-800"><tr>
                  <th className="w-10 p-4"><input type="checkbox" aria-label="Chọn tất cả sinh viên đang hiển thị" checked={rows.length > 0 && rows.every(r => selected.has(r.id))} disabled={!rows.length} onChange={e => setSelected(e.target.checked ? new Set(rows.map(r => r.id)) : new Set())} className="accent-orange-500" /></th>
                  <th scope="col" className="sticky left-0 z-10 min-w-56 bg-slate-50 p-4 dark:bg-slate-800">Sinh viên</th>
                  {exams.map(e => <th scope="col" key={e.id} className="min-w-44 max-w-64 border-l border-slate-200/60 p-4 align-top dark:border-slate-700"><span className="block text-xs font-bold">{e.title}</span><span className="mt-1 block text-[11px] font-normal text-slate-500">Thang {e.maxScore ?? '?'} · {e.weight == null ? 'Chưa có trọng số' : `${e.weight}%`}</span></th>)}
                  <th scope="col" className="min-w-40 border-l border-slate-200/60 p-4 dark:border-slate-700">Tổng hợp / 10<span className="mt-1 block text-[11px] font-normal text-slate-500">Gồm điểm nháp</span></th>
                </tr></thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {rows.map(row => <tr key={row.id} className={selected.has(row.id) ? 'bg-orange-50/40 dark:bg-orange-950/10' : ''}>
                    <td className="p-4"><input type="checkbox" aria-label={`Chọn ${row.code || row.name}`} checked={selected.has(row.id)} onChange={e => setSelected(previous => { const next = new Set(previous); if (e.target.checked) next.add(row.id); else next.delete(row.id); return next })} className="accent-orange-500" /></td>
                    <th scope="row" className="sticky left-0 z-10 bg-white p-4 dark:bg-slate-900"><p className="font-semibold">{row.name || 'Chưa có tên'}</p><p className="mt-1 font-mono text-xs font-normal text-slate-500">{row.code || 'Chưa có MSSV'}</p></th>
                    {exams.map(exam => { const cell = row.grades.find(g => g.examId === exam.id)!; return <td key={exam.id} className="border-l border-slate-100 p-2 dark:border-slate-800"><button onClick={() => openDetail(row, exam, cell)} aria-label={`Chi tiết ${row.code || row.name}, ${exam.title}`} className="w-full rounded-xl p-3 text-left transition hover:bg-orange-50 focus:outline-none focus:ring-2 focus:ring-orange-500 dark:hover:bg-slate-800"><strong className={`text-lg tabular-nums ${cell.score == null ? 'text-slate-400' : cell.published ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-900 dark:text-slate-100'}`}>{formatScore(cell.score)}</strong><span className={`mt-1 block text-[11px] ${cell.score != null && !cell.published ? 'text-amber-600 dark:text-amber-400' : 'text-slate-500'}`}>{statusText(cell)}</span></button></td> })}
                    <td className="border-l border-slate-100 p-4 dark:border-slate-800"><strong className="text-lg tabular-nums text-orange-600">{formatScore(row.total)}</strong><p className="mt-1 text-[11px] text-slate-500">Đã công bố: {formatScore(row.publishedTotal)}</p></td>
                  </tr>)}
                  {!rows.length && <tr><td colSpan={exams.length + 3} className="p-12 text-center text-slate-500">{data.rows.length ? 'Không có sinh viên phù hợp bộ lọc.' : 'Lớp chưa có sinh viên.'}</td></tr>}
                </tbody>
              </table>
            </div>}
            <div className="flex flex-wrap justify-between gap-2 border-t border-slate-100 px-5 py-4 text-xs text-slate-500 dark:border-slate-800"><span>Hiển thị {rows.length}/{data.rows.length} sinh viên</span><span>Điểm tổng hợp = Σ (điểm bài / thang điểm × trọng số) × 10</span></div>
          </section>
        </>}
        {course && <Link href={`/admin/classes/${course.id}`} className="inline-flex items-center gap-2 text-xs font-semibold text-orange-600 hover:underline"><Users className="h-4 w-4" /> Quản lý sinh viên trong lớp này</Link>}
      </div>

      <Modal isOpen={!!detail} onClose={() => { if (!saving) setDetail(null) }} title="Chi tiết điểm sinh viên" description={detail ? `${detail.student.name} · ${detail.student.code || 'Chưa có MSSV'} · ${detail.exam.title}` : ''} maxWidth="3xl">
        {detail && <div className="space-y-5">
          <div className="grid grid-cols-2 gap-3 rounded-xl bg-slate-50 p-4 text-xs dark:bg-slate-800 sm:grid-cols-4">{[['Điểm trước điều chỉnh', `${formatScore(detail.cell.score)} / ${detail.exam.maxScore ?? '?'}`], ['Điểm gốc', formatScore(detail.cell.rawScore)], ['Điểm trừ nộp muộn', formatScore(detail.cell.penalty)], ['Trạng thái', statusText(detail.cell)]].map(([label, value]) => <div key={label}><p className="text-slate-500">{label}</p><p className="mt-1 font-bold">{value}</p></div>)}</div>
          <p className="text-xs text-slate-500">Lần nộp: {detail.cell.attempt ?? '—'} · Nộp lúc: {formatDate(detail.cell.submittedAt)} · Duyệt lần cuối: {formatDate(detail.cell.reviewedAt)}</p>
          {editAllowed ? <form onSubmit={event => { event.preventDefault(); if (scoreValid) void save([{ submissionId: detail.cell.submissionId!, revision: detail.cell.revision!, finalScore: Number(score), feedback, published }]) }} className="space-y-4">
            <label className="block space-y-2 text-sm font-semibold">Điểm cuối cùng / {detail.exam.maxScore}<input aria-label="Điểm cuối cùng" type="number" min={0} max={detail.exam.maxScore!} step="0.01" required className={field} value={score} onChange={e => setScore(e.target.value)} disabled={saving} /></label>
            <p className="text-xs leading-5 text-slate-500">Điểm này đã bao gồm các điều chỉnh và điểm trừ. Điểm gốc và báo cáo chấm AI được giữ lại để đối chiếu.</p>
            <label className="block space-y-2 text-sm font-semibold">Nhận xét cho sinh viên<textarea aria-label="Nhận xét cho sinh viên" maxLength={5000} rows={3} className={field} value={feedback} onChange={e => setFeedback(e.target.value)} disabled={saving} /></label>
            <label className="block space-y-2 text-sm font-semibold">Lý do điều chỉnh <span className="text-rose-500">*</span><textarea aria-label="Lý do điều chỉnh" placeholder="Ví dụ: Điều chỉnh sau khi rà soát bài và đối chiếu barem" minLength={5} maxLength={2000} required rows={2} className={field} value={reason} onChange={e => setReason(e.target.value)} disabled={saving} /></label>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={published} onChange={e => setPublished(e.target.checked)} disabled={saving} className="accent-orange-500" /> Công bố điểm và nhận xét cho sinh viên</label>
            <p className="text-xs text-slate-500">{published ? 'Sinh viên sẽ nhận thông báo khi lưu.' : 'Điểm ở bản nháp và chưa hiển thị cho sinh viên. Nếu đã công bố, thao tác này sẽ thu hồi công bố.'}</p>
            {modalError && <p role="alert" className="text-sm text-rose-600">{modalError}</p>}
            <div className="flex justify-end gap-3"><Button type="button" variant="outline" disabled={saving} onClick={() => setDetail(null)}>Đóng</Button><Button type="submit" disabled={!scoreValid || reason.trim().length < 5 || saving} isLoading={saving}>Lưu thay đổi</Button></div>
          </form> : <p className="rounded-xl bg-amber-50 p-4 text-sm text-amber-800 dark:bg-amber-950/30 dark:text-amber-300">{!detail.cell.submissionId ? 'Sinh viên chưa nộp bài đánh giá này.' : 'Chỉ có thể điều chỉnh bài đã chấm xong, có điểm hợp lệ và thang điểm được cấu hình.'}</p>}
          {detail.cell.submissionId && <Link href={`/admin/exams/${detail.exam.id}/submissions`} className="inline-flex text-xs font-semibold text-orange-600 hover:underline">Xem bài nộp và báo cáo chấm chi tiết →</Link>}
          <div className="border-t border-slate-200 pt-5 dark:border-slate-700"><h3 className="flex items-center gap-2 text-sm font-bold"><History className="h-4 w-4 text-orange-500" /> Lịch sử quản trị điểm</h3>
            {historyLoading ? <p role="status" className="mt-3 text-xs text-slate-500">Đang tải lịch sử...</p> : historyError ? <p role="alert" className="mt-3 text-xs text-rose-600">{historyError}</p> : history.length ? <ol className="mt-4 max-h-72 space-y-3 overflow-auto">{history.map(log => <li key={log.id} className="rounded-xl border border-slate-200 p-3 text-xs dark:border-slate-700"><p className="font-bold">{log.actor} <span className="font-normal text-slate-500">· {formatDate(log.at)}</span></p><p className="mt-2">Điểm: {formatScore(log.before.score)} → {formatScore(log.after.score)} · {log.before.published ? 'Đã công bố' : 'Nháp'} → {log.after.published ? 'Đã công bố' : 'Nháp'}</p><p className="mt-1 whitespace-pre-wrap text-slate-500">Lý do: {log.after.reason}</p>{log.before.feedback !== log.after.feedback && <p className="mt-1 whitespace-pre-wrap text-slate-500">Nhận xét: {log.before.feedback || '(trống)'} → {log.after.feedback || '(trống)'}</p>}</li>)}</ol> : <p className="mt-3 text-xs text-slate-500">Chưa có điều chỉnh từ bảng điểm quản trị.</p>}
          </div>
        </div>}
      </Modal>
      <Modal isOpen={weightsOpen} onClose={() => { if (!saving) setWeightsOpen(false) }} title="Cấu hình trọng số học phần" description="Áp dụng riêng cho môn học trong lớp và kỳ đang chọn. Các lớp khác giữ nguyên trọng số.">
        {data && <form className="space-y-4" onSubmit={async event => {
          event.preventDefault(); if (saving) return; setSaving(true); setModalError('')
          try {
            await gradebookApi.weights(courseId, { reason: reason.trim(), revision: data.weightsRevision, weights: data.exams.map(e => ({ examId: e.id, weight: Number(weights[e.id]) })) })
            setWeightsOpen(false); setSuccess('Đã lưu trọng số và ghi lịch sử cấu hình.'); setRefresh(v => v + 1)
          } catch (cause) { setModalError(errorMessage(cause)) } finally { setSaving(false) }
        }}>
          <div className="max-h-72 space-y-3 overflow-auto">{data.exams.map(e => <label key={e.id} className="flex items-center gap-4 text-sm"><span className="flex-1">{e.title}<span className="mt-1 block text-xs text-slate-500">Thang điểm {e.maxScore ?? 'chưa cấu hình'}</span></span><input aria-label={`Trọng số ${e.title}`} className={`${field} !w-24`} type="number" required min={0} max={100} step="0.01" value={weights[e.id] ?? ''} disabled={saving} onChange={event => setWeights(previous => ({ ...previous, [e.id]: event.target.value }))} /><span>%</span></label>)}</div>
          <p className="text-sm font-bold">Tổng trọng số: {formatScore(Object.values(weights).reduce((sum, w) => sum + (Number(w) || 0), 0))}% / 100%</p>
          <p className="text-xs leading-5 text-slate-500">Bài có trọng số 0% không tham gia điểm tổng hợp. Thay đổi trọng số sẽ tính lại điểm tổng hợp trong bảng này và file xuất Excel.</p>
          <label className="block space-y-2 text-sm font-semibold">Lý do thay đổi<textarea aria-label="Lý do thay đổi trọng số" className={field} required minLength={5} maxLength={2000} rows={2} value={reason} disabled={saving} onChange={e => setReason(e.target.value)} /></label>
          {modalError && <p role="alert" className="text-sm text-rose-600">{modalError}</p>}
          <div className="flex justify-end gap-3"><Button type="button" variant="outline" disabled={saving} onClick={() => setWeightsOpen(false)}>Hủy</Button><Button type="submit" isLoading={saving} disabled={saving || reason.trim().length < 5 || Math.abs(Object.values(weights).reduce((sum, w) => sum + (Number(w) || 0), 0) - 100) > 0.001}>Lưu trọng số</Button></div>
        </form>}
      </Modal>
      <Modal isOpen={!!bulk} onClose={() => { if (!saving) setBulk(null) }} title={bulk?.published ? 'Công bố điểm đã chọn' : 'Thu hồi công bố điểm'} description="Thao tác áp dụng cho các bài đánh giá thuộc sinh viên và bộ lọc đang chọn.">
        {bulk && <form onSubmit={event => { event.preventDefault(); void save(bulk.changes) }} className="space-y-4">
          <div className="rounded-xl bg-slate-50 p-4 text-sm leading-6 dark:bg-slate-800"><strong>{bulk.changes.length} bài đánh giá</strong> của {visibleSelected.length} sinh viên được chọn sẽ {bulk.published ? 'được công bố' : 'chuyển về bản nháp'}. {bulk.published ? 'Sinh viên sẽ nhận thông báo và xem được điểm.' : 'Sinh viên sẽ nhận thông báo thu hồi và điểm sẽ được ẩn.'}<p className="mt-2 text-xs text-slate-500">Chỉ áp dụng bài đã chấm, có điểm hợp lệ và cần đổi trạng thái. Không thay đổi giá trị điểm.</p></div>
          {(!bulk.changes.length || bulk.changes.length > 200) && <p role="alert" className="text-sm text-amber-700">{!bulk.changes.length ? 'Không có điểm phù hợp để thay đổi trạng thái.' : 'Tối đa 200 bài mỗi lần. Hãy chọn ít sinh viên hơn hoặc lọc theo một bài đánh giá.'}</p>}
          <label className="block space-y-2 text-sm font-semibold">Lý do <textarea aria-label="Lý do công bố hoặc thu hồi" required minLength={5} maxLength={2000} rows={3} className={field} value={reason} onChange={e => setReason(e.target.value)} disabled={saving} /></label>
          {modalError && <p role="alert" className="text-sm text-rose-600">{modalError}</p>}
          <div className="flex justify-end gap-3"><Button type="button" variant="outline" disabled={saving} onClick={() => setBulk(null)}>Hủy</Button><Button type="submit" disabled={!bulk.changes.length || bulk.changes.length > 200 || reason.trim().length < 5 || saving} isLoading={saving}>Xác nhận {bulk.published ? 'công bố' : 'thu hồi'}</Button></div>
        </form>}
      </Modal>
    </DashboardLayout>
  )
}
