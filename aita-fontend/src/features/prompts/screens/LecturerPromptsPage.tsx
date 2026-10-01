'use client'

import { useEffect, useState } from 'react'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { LECTURER_NAV } from '@/config/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Modal } from '@/components/ui/modal'
import { ErrorNotice } from '@/components/ui/feedback'
import { promptsApi, type PromptTemplate } from '@/lib/api/modules/prompts'
import { classesApi } from '@/lib/api/modules/classes'
import { aiApi } from '@/lib/api/modules/ai'
import { errorMessage } from '@/lib/api/errors'
import { useAuth } from '@/providers/auth-provider'
import { useLanguage } from '@/providers/language-provider'

interface SubjectOption { id: string; code: string; name: string }
const blank = { name: '', category: '', templateContent: '' }
export default function LecturerPromptsPage() {
  const { isAuthenticated, role } = useAuth()
  const { t } = useLanguage()
  const [subjects, setSubjects] = useState<SubjectOption[]>([])
  const [subjectId, setSubjectId] = useState('')
  const [prompts, setPrompts] = useState<PromptTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [revision, setRevision] = useState(0)
  const [modal, setModal] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState(blank)
  const [busy, setBusy] = useState(false)
  useEffect(() => {
    if (!isAuthenticated || role !== 'lecturer') return
    let active = true
    async function load() {
      try {
        const options = new Map<string, SubjectOption>()
        for (let page = 1; ; page++) {
          const rows = await classesApi.getClasses(page, 50)
          if (!active) return
          rows.forEach(row => { if (row.subject && typeof row.subject === 'object') options.set(row.subject.id, row.subject) })
          if (rows.length < 50) break
        }
        if (active) { setSubjects([...options.values()]); setLoading(false) }
      } catch (cause) { if (active) { setError(errorMessage(cause)); setLoading(false) } }
    }
    void load()
    return () => { active = false }
  }, [isAuthenticated, role, revision])
  useEffect(() => {
    if (!subjectId) return
    let active = true
    promptsApi.getPromptTemplates(subjectId).then(rows => { if (active) { setPrompts(rows); setError(null); setLoading(false) } }).catch(cause => { if (active) { setError(errorMessage(cause)); setLoading(false) } })
    return () => { active = false }
  }, [subjectId, revision])
  function open(prompt?: PromptTemplate) {
    setEditingId(prompt?.id ?? null)
    setForm(prompt ? { name: prompt.name, category: prompt.category ?? '', templateContent: prompt.templateContent } : blank)
    setFormError(null); setModal(true)
  }
  async function save(event: React.FormEvent) {
    event.preventDefault()
    if (busy) return
    setBusy(true); setFormError(null)
    try {
      const payload = { ...form, subjectId }
      if (editingId) await promptsApi.updatePromptTemplate(editingId, payload)
      else await promptsApi.createPromptTemplate(payload)
      setModal(false); setLoading(true); setRevision(value => value + 1)
    } catch (cause) { setFormError(errorMessage(cause)) }
    finally { setBusy(false) }
  }
  async function remove(prompt: PromptTemplate) {
    if (!window.confirm(`Xóa prompt “${prompt.name}”?`)) return
    setBusy(true)
    try { await promptsApi.deletePromptTemplate(prompt.id); setLoading(true); setRevision(value => value + 1) }
    catch (cause) { setError(errorMessage(cause)) }
    finally { setBusy(false) }
  }
  async function generate(refine: boolean) {
    setBusy(true); setFormError(null)
    try {
      const result = refine ? await aiApi.refinePrompt({ content: form.templateContent }) : await aiApi.generatePrompt({ name: form.name, category: form.category, subjectCode: subjects.find(subject => subject.id === subjectId)?.code })
      setForm(previous => ({ ...previous, templateContent: result.prompt }))
    } catch (cause) { setFormError(errorMessage(cause)) }
    finally { setBusy(false) }
  }
  return <DashboardLayout navItems={LECTURER_NAV} title="AITA Lecturer" roleLabel={t('profile.role_lecturer', 'Giảng viên')} requiredRole="lecturer" headerTitle={t('lecturer.prompts.title', 'Thư viện prompt')} headerSubtitle={t('lecturer.prompts.subtitle', 'Quản lý chỉ dẫn AI theo môn được phân công')}>
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4"><label className="space-y-2"><span className="block">{t('lecturer.prompts.subject_label', 'Môn học')}</span><select className="rounded-xl border bg-white p-3 dark:bg-slate-900" value={subjectId} onChange={e => { setSubjectId(e.target.value); setPrompts([]); setError(null); setLoading(!!e.target.value) }}><option value="">{t('lecturer.prompts.select_subject', 'Chọn môn học')}</option>{subjects.map(subject => <option key={subject.id} value={subject.id}>{subject.code} — {subject.name}</option>)}</select></label><Button disabled={!subjectId || busy} onClick={() => open()}>{t('lecturer.prompts.create_btn', 'Tạo prompt')}</Button></div>
      <ErrorNotice message={error} onRetry={() => setRevision(value => value + 1)} />
      {loading ? <p role="status">{t('lecturer.prompts.loading', 'Đang tải…')}</p> : !error && !subjectId ? <p>{subjects.length ? t('lecturer.prompts.select_to_view', 'Chọn môn để xem các prompt đã lưu.') : t('lecturer.prompts.no_subjects_assigned', 'Chưa có môn học được phân công.')}</p> : !error && !prompts.length && <p>{t('lecturer.prompts.empty', 'Môn này chưa có prompt.')}</p>}
      {!loading && !error && prompts.map(prompt => <article key={prompt.id} className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900"><h2 className="font-bold">{prompt.name}</h2><p className="text-sm text-slate-500">{prompt.category} · {prompt.usageCount} {t('lecturer.prompts.usage_count', 'lượt sử dụng')}</p><p className="line-clamp-5 whitespace-pre-wrap text-sm">{prompt.templateContent}</p><div className="flex gap-2"><Button variant="outline" disabled={busy} onClick={() => open(prompt)}>{t('ui.edit', 'Chỉnh sửa')}</Button><Button variant="ghost" disabled={busy} onClick={() => void remove(prompt)}>{t('ui.delete', 'Xóa')}</Button></div></article>)}
    </div>
    <Modal isOpen={modal} onClose={() => { if (!busy) setModal(false) }} title={editingId ? t('lecturer.prompts.modal_edit', 'Chỉnh sửa prompt') : t('lecturer.prompts.modal_create', 'Tạo prompt')} maxWidth="3xl">
      <form onSubmit={save} className="space-y-4"><ErrorNotice message={formError} />
        <label className="block space-y-2"><span>{t('lecturer.prompts.name_label', 'Tên prompt')}</span><Input required disabled={busy} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></label>
        <label className="block space-y-2"><span>{t('lecturer.prompts.category_label', 'Phân loại')}</span><Input disabled={busy} value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} /></label>
        <div className="flex gap-2"><Button type="button" variant="outline" disabled={busy || !form.name.trim()} onClick={() => void generate(false)}>{t('lecturer.prompts.ai_generate_btn', 'Tạo nội dung bằng AI')}</Button><Button type="button" variant="outline" disabled={busy || !form.templateContent.trim()} onClick={() => void generate(true)}>{t('lecturer.prompts.ai_refine_btn', 'Cải thiện nội dung')}</Button></div>
        <label className="block space-y-2"><span>{t('lecturer.prompts.content_label', 'Nội dung')}</span><textarea required disabled={busy} rows={12} className="w-full rounded-xl border bg-white p-3 text-sm dark:bg-slate-900" value={form.templateContent} onChange={e => setForm({ ...form, templateContent: e.target.value })} /></label>
        <Button type="submit" isLoading={busy}>{t('lecturer.prompts.save_btn', 'Lưu prompt')}</Button>
      </form>
    </Modal>
  </DashboardLayout>
}
