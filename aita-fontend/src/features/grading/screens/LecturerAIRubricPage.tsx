'use client'

import React from 'react'
import Link from 'next/link'
import { Sparkles, Save, ArrowLeft, Loader2, FileCheck2, Plus, Trash2, Download, Copy, Check } from 'lucide-react'
import { rubricApi } from '@/lib/api/modules/rubric'
import { assignmentsApi } from '@/lib/api/modules/assignments'
import type { AssignmentRow } from '@/lib/api/contracts'

export interface RubricCriterion {
  name: string
  maxPoints: number
  description?: string
}

export function LecturerAIRubricPage() {
  const [assignments, setAssignments] = React.useState<AssignmentRow[]>([])
  const [selectedAssignmentId, setSelectedAssignmentId] = React.useState<string>('')
  const [form, setForm] = React.useState({
    topic: '',
    difficulty: 'medium',
    totalScore: 10,
    fileRef: null as File | null,
  })
  const [generating, setGenerating] = React.useState(false)
  const [saving, setSaving] = React.useState(false)
  const [criteria, setCriteria] = React.useState<RubricCriterion[]>([])
  const [rawText, setRawText] = React.useState<string>('')
  const [copied, setCopied] = React.useState(false)
  const [saveSuccess, setSaveSuccess] = React.useState(false)

  React.useEffect(() => {
    assignmentsApi.getAssignments()
      .then(res => {
        if (Array.isArray(res)) setAssignments(res)
      })
      .catch(() => {})
  }, [])

  function handleSelectAssignment(id: string) {
    setSelectedAssignmentId(id)
    const found = assignments.find(a => String(a.id) === id)
    if (found) {
      setForm(prev => ({
        ...prev,
        topic: found.title || prev.topic,
        totalScore: found.maxScore || 10,
      }))
    }
  }

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault()
    if (!form.topic.trim()) return
    setGenerating(true)
    setSaveSuccess(false)
    try {
      const body = new FormData()
      body.append('topic', form.topic)
      body.append('difficulty', form.difficulty)
      body.append('totalScore', String(form.totalScore))
      if (form.fileRef) body.append('file', form.fileRef)

      const res = await rubricApi.generateRubricAI(body)
      let parsedCriteria: RubricCriterion[] = []
      let raw = ''

      if (res && typeof res === 'object') {
        if (Array.isArray(res.criteria)) {
          parsedCriteria = res.criteria
        } else if (Array.isArray(res)) {
          parsedCriteria = res
        }
      }
      if (parsedCriteria.length === 0) {
        raw = typeof res === 'string' ? res : JSON.stringify(res, null, 2)
      }
      setCriteria(parsedCriteria)
      setRawText(raw)
    } catch (err: any) {
      alert(err?.message || 'Không thể tạo rubric từ AI. Vui lòng thử lại.')
    } finally {
      setGenerating(false)
    }
  }

  async function handleSave() {
    if (!selectedAssignmentId) {
      alert('Vui lòng chọn bài tập để lưu Rubric này vào hệ thống.')
      return
    }
    setSaving(true)
    setSaveSuccess(false)
    try {
      await rubricApi.saveExamRubric(selectedAssignmentId, {
        criteria,
        total: form.totalScore,
      })
      setSaveSuccess(true)
    } catch (err: any) {
      alert(err?.message || 'Lỗi khi lưu rubric.')
    } finally {
      setSaving(false)
    }
  }

  function handleCopy() {
    const json = JSON.stringify({ criteria, totalScore: form.totalScore }, null, 2)
    navigator.clipboard.writeText(json)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function handleExportJson() {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify({ criteria, totalScore: form.totalScore }, null, 2))
    const dlAnchorElem = document.createElement('a')
    dlAnchorElem.setAttribute('href', dataStr)
    dlAnchorElem.setAttribute('download', `rubric-${form.topic.replace(/\s+/g, '_') || 'ai'}.json`)
    dlAnchorElem.click()
  }

  const calculatedTotal = criteria.reduce((sum, c) => sum + (Number(c.maxPoints) || 0), 0)

  return (
    <div className="space-y-6 max-w-6xl mx-auto p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b pb-4">
        <div className="flex items-center gap-3">
          <Link
            href="/lecturer/grading/assignments"
            className="p-2 border rounded-lg hover:bg-muted text-muted-foreground transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-orange-500 dark:text-orange-400" />
              <h1 className="text-xl font-bold tracking-tight">AI Rubric Generator</h1>
            </div>
            <p className="text-xs text-muted-foreground">
              Tạo tiêu chí chấm điểm tự động bằng mô hình AI từ mô tả đề bài và tài liệu đính kèm
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {criteria.length > 0 && (
            <>
              <button
                type="button"
                onClick={handleCopy}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border rounded-xl hover:bg-orange-50/60 transition-colors"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-orange-600" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? 'Đã sao chép' : 'Sao chép JSON'}
              </button>
              <button
                type="button"
                onClick={handleExportJson}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border rounded-xl hover:bg-orange-50/60 transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                Tải file .json
              </button>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Form */}
        <div className="lg:col-span-1 space-y-5">
          <div className="relative overflow-hidden border border-orange-100/90 dark:border-orange-900/30 rounded-2xl p-5 bg-gradient-to-br from-orange-50/80 via-white to-amber-50/40 dark:from-slate-900 dark:via-slate-900/90 dark:to-orange-950/20 shadow-xs space-y-4">
            <div className="flex items-center gap-2 text-orange-600 dark:text-orange-400 font-semibold text-sm border-b border-orange-100/80 pb-2">
              <FileCheck2 className="w-4 h-4" />
              <span>Cấu hình đề bài & AI</span>
            </div>

            <form onSubmit={handleGenerate} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                  Gán vào bài tập (Tùy chọn)
                </label>
                <select
                  value={selectedAssignmentId}
                  onChange={e => handleSelectAssignment(e.target.value)}
                  className="w-full text-sm border border-orange-100/90 rounded-xl px-3 py-2 bg-white dark:bg-slate-900 focus:outline-none focus:border-orange-400"
                >
                  <option value="">-- Tạo tự do (chưa gán) --</option>
                  {assignments.map(a => (
                    <option key={a.id} value={String(a.id)}>
                      {a.title} ({a.subjectCode || 'No Code'})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                  Chủ đề / Đề bài *
                </label>
                <textarea
                  rows={4}
                  required
                  placeholder="Ví dụ: Xây dựng RESTful API quản lý sinh viên với NestJS, Prisma, PostgreSQL..."
                  value={form.topic}
                  onChange={e => setForm(prev => ({ ...prev, topic: e.target.value }))}
                  className="w-full text-sm border border-orange-100/90 rounded-xl p-2.5 bg-white dark:bg-slate-900 focus:outline-none focus:border-orange-400 resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                    Độ khó
                  </label>
                  <select
                    value={form.difficulty}
                    onChange={e => setForm(prev => ({ ...prev, difficulty: e.target.value }))}
                    className="w-full text-sm border border-orange-100/90 rounded-xl px-2.5 py-1.5 bg-white dark:bg-slate-900 focus:outline-none focus:border-orange-400"
                  >
                    <option value="easy">Cơ bản (Easy)</option>
                    <option value="medium">Trung bình (Medium)</option>
                    <option value="hard">Nâng cao (Hard)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                    Thang điểm
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={form.totalScore}
                    onChange={e => setForm(prev => ({ ...prev, totalScore: Number(e.target.value) || 10 }))}
                    className="w-full text-sm border border-orange-100/90 rounded-xl px-2.5 py-1.5 bg-white dark:bg-slate-900 focus:outline-none focus:border-orange-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                  Tài liệu đính kèm (.pdf, .docx, .txt)
                </label>
                <input
                  type="file"
                  accept=".pdf,.docx,.txt"
                  onChange={e => setForm(prev => ({ ...prev, fileRef: e.target.files?.[0] || null }))}
                  className="w-full text-xs text-muted-foreground file:mr-2 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-medium file:bg-orange-50 file:text-orange-700 hover:file:bg-orange-100"
                />
              </div>

              <button
                type="submit"
                disabled={generating || !form.topic.trim()}
                className="w-full py-2.5 px-4 bg-gradient-to-r from-orange-500 via-amber-500 to-orange-400 hover:from-orange-600 hover:via-amber-500 hover:to-orange-500 disabled:opacity-50 text-white font-bold text-sm rounded-xl flex items-center justify-center gap-2 transition-all shadow-md shadow-orange-500/20"
              >
                {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                {generating ? 'AI đang phân tích...' : 'Sinh tiêu chí Rubric với AI'}
              </button>
            </form>
          </div>
        </div>

        {/* Right Output & Editor */}
        <div className="lg:col-span-2 space-y-4">
          <div className="border border-orange-100/90 dark:border-orange-900/30 rounded-2xl p-5 bg-white dark:bg-slate-900 shadow-xs min-h-[460px] flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b pb-3 border-orange-100/80">
                <div>
                  <h2 className="font-semibold text-sm">Bảng tiêu chí Rubric</h2>
                  <p className="text-xs text-muted-foreground">
                    Tổng điểm tiêu chí: <span className={`font-bold ${calculatedTotal === form.totalScore ? 'text-orange-600 font-mono' : 'text-amber-600 font-mono'}`}>{calculatedTotal}</span> / {form.totalScore}
                  </p>
                </div>
                {criteria.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setCriteria(prev => [...prev, { name: '', maxPoints: 1, description: '' }])}
                    className="inline-flex items-center gap-1 text-xs text-orange-600 hover:text-orange-700 font-semibold"
                  >
                    <Plus className="w-3.5 h-3.5" /> Thêm tiêu chí
                  </button>
                )}
              </div>

              {criteria.length === 0 && !rawText && !generating && (
                <div className="py-20 text-center text-muted-foreground">
                  <Sparkles className="w-10 h-10 mx-auto mb-3 opacity-30 text-orange-500" />
                  <p className="text-sm font-medium">Chưa có rubric nào được sinh</p>
                  <p className="text-xs text-muted-foreground max-w-sm mx-auto mt-1">
                    Nhập thông tin đề bài bên trái và bấm &quot;Sinh tiêu chí Rubric với AI&quot; để tạo bộ tiêu chí chấm điểm tự động.
                  </p>
                </div>
              )}

              {generating && (
                <div className="py-24 text-center">
                  <Loader2 className="w-8 h-8 mx-auto mb-3 animate-spin text-orange-500" />
                  <p className="text-sm font-medium">AI đang xử lý yêu cầu...</p>
                  <p className="text-xs text-muted-foreground mt-1">Đang phân tích cấu trúc, độ khó và phân bổ điểm theo ma trận đánh giá</p>
                </div>
              )}

              {criteria.length > 0 && (
                <div className="space-y-3">
                  {criteria.map((c, idx) => (
                    <div key={idx} className="border border-orange-100/80 dark:border-slate-800 rounded-xl p-3 bg-orange-50/20 dark:bg-slate-800/30 space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-500 w-6">#{idx + 1}</span>
                        <input
                          type="text"
                          placeholder="Tên tiêu chí (ví dụ: Tính năng Authentication, Viết Unit Test...)"
                          value={c.name}
                          onChange={e => {
                            const val = e.target.value
                            setCriteria(prev => prev.map((item, i) => i === idx ? { ...item, name: val } : item))
                          }}
                          className="flex-1 text-sm font-medium border border-orange-100/90 rounded-xl px-2.5 py-1 bg-white dark:bg-slate-900 focus:outline-none focus:border-orange-400"
                        />
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            min={0.25}
                            step={0.25}
                            value={c.maxPoints}
                            onChange={e => {
                              const val = Number(e.target.value) || 0
                              setCriteria(prev => prev.map((item, i) => i === idx ? { ...item, maxPoints: val } : item))
                            }}
                            className="w-16 text-sm text-right border border-orange-100/90 rounded-xl px-2 py-1 bg-white dark:bg-slate-900 font-mono focus:outline-none focus:border-orange-400"
                          />
                          <span className="text-xs text-muted-foreground">đ</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setCriteria(prev => prev.filter((_, i) => i !== idx))}
                          className="p-1 text-muted-foreground hover:text-rose-500 rounded"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      <input
                        type="text"
                        placeholder="Mô tả chi tiết yêu cầu đạt điểm tối đa..."
                        value={c.description || ''}
                        onChange={e => {
                          const val = e.target.value
                          setCriteria(prev => prev.map((item, i) => i === idx ? { ...item, description: val } : item))
                        }}
                        className="w-full text-xs text-muted-foreground border border-orange-100/90 rounded-xl px-2.5 py-1 bg-white dark:bg-slate-900 focus:outline-none focus:border-orange-400"
                      />
                    </div>
                  ))}
                </div>
              )}

              {rawText && criteria.length === 0 && (
                <pre className="p-4 bg-muted/40 rounded-xl text-xs font-mono whitespace-pre-wrap overflow-x-auto border max-h-96">
                  {rawText}
                </pre>
              )}
            </div>

            {criteria.length > 0 && (
              <div className="pt-4 border-t mt-4 flex flex-wrap items-center justify-between gap-3 border-orange-100/80">
                <div>
                  {saveSuccess && (
                    <span className="text-xs font-medium text-emerald-600 flex items-center gap-1">
                      <Check className="w-3.5 h-3.5" /> Đã lưu rubric vào bài tập thành công!
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  disabled={saving || !selectedAssignmentId}
                  onClick={handleSave}
                  className="px-4 py-2 bg-gradient-to-r from-orange-500 via-amber-500 to-orange-400 hover:from-orange-600 hover:via-amber-500 hover:to-orange-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl inline-flex items-center gap-1.5 shadow-md shadow-orange-500/20 transition-all"
                >
                  {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  {saving ? 'Đang lưu...' : 'Lưu vào bài tập đã chọn'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default LecturerAIRubricPage
