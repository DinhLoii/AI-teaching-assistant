'use client'

import * as React from 'react'
import { useParams, usePathname } from 'next/navigation'
import Link from 'next/link'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { LECTURER_NAV } from '@/config/navigation'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Modal } from '@/components/ui/modal'
import { assignmentsApi } from '@/lib/api/modules/assignments'
import { rubricApi } from '@/lib/api/modules/rubric'
import { gradingApi } from '@/lib/api/modules/grading'
import { useLanguage } from '@/providers/language-provider'
import LecturerSubmissionsPage from '@/features/submissions/screens/LecturerSubmissionsPage'
import {
  ArrowLeft, Settings, Users, ShieldAlert, Sparkles, Loader2,
  Save, Plus, Trash2, AlertCircle, Clock, Zap, BarChart2,
  FileCode, CheckCircle, RefreshCw, ChevronDown, CheckCircle2,
  Sliders, Filter, AlertTriangle, Database, Send
} from 'lucide-react'
import type { AssignmentRow } from '@/lib/api/contracts'

function toLocalDatetimeInputString(isoOrDateStr?: string | null): string {
  if (!isoOrDateStr) return ''
  const d = new Date(isoOrDateStr)
  if (isNaN(d.getTime())) return ''
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const date = String(d.getDate()).padStart(2, '0')
  const hours = String(d.getHours()).padStart(2, '0')
  const minutes = String(d.getMinutes()).padStart(2, '0')
  return `${year}-${month}-${date}T${hours}:${minutes}`
}

// ──────────────────────────────────────────────────────────────────────────────
// Settings Tab
// ──────────────────────────────────────────────────────────────────────────────
function SettingsTab({ assignment, assignmentId, onUpdateAssignment }: { assignment: AssignmentRow | null; assignmentId: string; onUpdateAssignment?: (updated: Partial<AssignmentRow>) => void }) {
  const { t } = useLanguage()
  const [form, setForm] = React.useState({
    title: '',
    description: '',
    status: 'draft',
    dueAt: '',
    maxScore: 10,
    strategy: 'CONTINUOUS_QUEUE',
    latePolicyOption: 'NONE_LOCKED',
    latePenaltyValue: 0,
    lateSubmitHours: 24,
  })
  const [saving, setSaving] = React.useState(false)
  const [saved, setSaved] = React.useState(false)
  const [saveError, setSaveError] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (!assignment) return
    const rawDue = (typeof (assignment as any).due === 'string' && (assignment as any).due) ||
      (typeof (assignment as any).dueDate === 'string' && (assignment as any).dueDate) ||
      (typeof (assignment as any).dueAt === 'string' ? (assignment as any).dueAt : '') || '';

    const allowLate = (assignment as any).allowLateSubmission ?? true;
    let lateOption = 'NONE_LOCKED';
    const penaltyType = (assignment as any).latePenaltyType || 'NONE';
    if (!allowLate) {
      lateOption = 'NONE_LOCKED';
    } else if (penaltyType === 'DAILY_POINTS') {
      lateOption = 'DAILY_POINTS';
    } else if (penaltyType === 'DAILY_PERCENT' || penaltyType === 'PERCENTAGE') {
      lateOption = 'DAILY_PERCENT';
    } else if (penaltyType === 'FLAT_POINTS' || penaltyType === 'FIXED') {
      lateOption = 'FLAT_POINTS';
    } else {
      lateOption = 'NONE_FREE';
    }

    setForm({
      title: assignment.title || '',
      description: assignment.description || '',
      status: assignment.status || 'draft',
      dueAt: toLocalDatetimeInputString(rawDue),
      maxScore: assignment.maxScore || (assignment as any).totalPoints || 10,
      strategy: (assignment as any).gradingStrategy || (assignment as any).strategy || 'CONTINUOUS_QUEUE',
      latePolicyOption: lateOption,
      latePenaltyValue: (assignment as any).latePenaltyValue || 0,
      lateSubmitHours: (assignment as any).lateSubmitHours || 24,
    })
  }, [assignment])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setSaveError(null)
    try {
      const isLocked = form.latePolicyOption === 'NONE_LOCKED';
      const allowLateSubmission = !isLocked;
      let latePenaltyType = 'NONE';
      if (form.latePolicyOption === 'DAILY_POINTS') latePenaltyType = 'DAILY_POINTS';
      else if (form.latePolicyOption === 'DAILY_PERCENT') latePenaltyType = 'DAILY_PERCENT';
      else if (form.latePolicyOption === 'FLAT_POINTS') latePenaltyType = 'FLAT_POINTS';

      const isoDue = form.dueAt ? new Date(form.dueAt).toISOString() : undefined;
      const payload = {
        title: form.title,
        description: form.description,
        status: form.status,
        dueAt: isoDue,
        dueDate: isoDue,
        maxScore: Number(form.maxScore),
        totalPoints: Number(form.maxScore),
        strategy: form.strategy,
        gradingStrategy: form.strategy,
        latePenaltyType,
        latePenaltyValue: Number(form.latePenaltyValue) || 0,
        lateSubmitHours: Number(form.lateSubmitHours) || 24,
        allowLateSubmission,
      };

      const results = await Promise.allSettled([
        assignmentsApi.updateAssignment(assignmentId, payload),
        gradingApi.updateAssignment(assignmentId, payload),
      ])
      const examResult = results[0]
      const gradingResult = results[1]

      if (examResult.status === 'fulfilled' && gradingResult.status === 'fulfilled') {
        onUpdateAssignment?.({ ...assignment, ...payload, status: form.status })
        setSaved(true)
        setTimeout(() => setSaved(false), 3000)
      } else if (examResult.status === 'rejected' && gradingResult.status === 'rejected') {
        const err1 = (examResult.reason as any)?.message || t('lecturer.workspace.settings.save_exam_err', 'Lỗi lưu thông tin bài tập')
        const err2 = (gradingResult.reason as any)?.message || t('lecturer.workspace.settings.save_grading_err', 'Lỗi lưu cấu hình chấm điểm')
        throw new Error(`${t('lecturer.workspace.settings.save_failed_total', 'Lưu cấu hình thất bại hoàn toàn')}: ${err1}; ${err2}`)
      } else if (examResult.status === 'rejected') {
        const err1 = (examResult.reason as any)?.message || t('lecturer.workspace.settings.save_error', 'Error saving configuration.')
        const warn = t('lecturer.workspace.settings.save_partial_exam_err', `Partial save warning: ${err1}`).replace('{{err}}', err1)
        setSaveError(warn)
        alert(warn)
      } else if (gradingResult.status === 'rejected') {
        const err2 = (gradingResult.reason as any)?.message || t('lecturer.workspace.settings.save_error', 'Error saving configuration.')
        const warn = t('lecturer.workspace.settings.save_partial_grading_err', `Partial save warning: ${err2}`).replace('{{err}}', err2)
        setSaveError(warn)
        alert(warn)
      }

    } catch (err: any) {
      const msg = err?.message || t('lecturer.workspace.settings.save_error', 'Error saving configuration.')
      setSaveError(msg)
      alert(msg)
    } finally { setSaving(false) }
  }

  return (
    <form onSubmit={handleSave} className="space-y-6 max-w-3xl">
      {/* Basic info */}
      <div className="p-6 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-5">
        <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Settings className="w-4 h-4 text-orange-500" /> {t('lecturer.workspace.settings.assignment_info', 'Assignment Information')}
        </h3>
        <div className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="block space-y-1.5">
              <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">{t('lecturer.workspace.settings.title_label', 'Assignment Title')}</span>
              <input
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                value={form.title}
                onChange={e => setForm({ ...form, title: e.target.value })}
                required
              />
            </label>
            <label className="block space-y-1.5">
              <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">{t('lecturer.workspace.settings.status_label', 'Trạng thái phát hành')}</span>
              <select
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                value={form.status}
                onChange={e => setForm({ ...form, status: e.target.value })}
              >
                <option value="published">🚀 {t('lecturer.workspace.settings.status_published_opt', 'Đã giao (Sinh viên thấy và nộp bài)')}</option>
                <option value="draft">📝 {t('lecturer.workspace.settings.status_draft_opt', 'Bản nháp (Chỉ giảng viên nhìn thấy)')}</option>
              </select>
            </label>
          </div>
          <label className="block space-y-1.5">
            <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">{t('lecturer.workspace.settings.desc_label', 'Description / Problem Statement')}</span>
            <textarea
              rows={4}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none"
              value={form.description}
              onChange={e => setForm({ ...form, description: e.target.value })}
            />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block space-y-1.5">
              <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">{t('lecturer.workspace.settings.due_label', 'Due Date')}</span>
              <input
                type="datetime-local"
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                value={form.dueAt}
                onChange={e => setForm({ ...form, dueAt: e.target.value })}
              />
            </label>
            <label className="block space-y-1.5">
              <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">{t('lecturer.workspace.settings.max_score', 'Max Score')}</span>
              <input
                type="number" min={1} max={100}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                value={form.maxScore}
                onChange={e => setForm({ ...form, maxScore: Number(e.target.value) || 10 })}
              />
            </label>
          </div>
        </div>
      </div>

      {/* Grading Strategy */}
      <div className="p-6 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-4">
        <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Zap className="w-4 h-4 text-blue-500" /> {t('lecturer.workspace.settings.grading_strategy', 'Grading Strategy')}
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[
            { value: 'CONTINUOUS_QUEUE', label: t('lecturer.workspace.settings.strategy_continuous', 'Continuous Grading'), desc: t('lecturer.workspace.settings.strategy_continuous_desc', 'Grade immediately when student submits (real-time).') },
            { value: 'BATCH_POST_DEADLINE', label: t('lecturer.workspace.settings.strategy_batch', 'Batch Grading after Deadline'), desc: t('lecturer.workspace.settings.strategy_batch_desc', 'Wait until deadline then grade all at once.') },
          ].map(opt => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setForm({ ...form, strategy: opt.value })}
              className={`p-4 rounded-2xl border-2 text-left transition-all ${
                form.strategy === opt.value
                  ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/20'
                  : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'
              }`}
            >
              <p className={`font-bold text-sm ${form.strategy === opt.value ? 'text-blue-700 dark:text-blue-400' : 'text-slate-700 dark:text-slate-300'}`}>{opt.label}</p>
              <p className="text-xs text-slate-500 mt-1">{opt.desc}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Late Policy */}
      <div className="p-6 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-4">
        <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Clock className="w-4 h-4 text-amber-500" /> {t('lecturer.workspace.settings.late_policy', 'Late Submission Policy')}
        </h3>
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { value: 'NONE_LOCKED', label: t('lecturer.workspace.settings.late_none_locked', 'Not accepted (locked)'), desc: t('lecturer.workspace.settings.late_none_locked_desc', 'Locked after deadline.') },
              { value: 'DAILY_POINTS', label: t('lecturer.workspace.settings.late_daily_points', 'Deduct points per day'), desc: t('lecturer.workspace.settings.late_daily_points_desc', 'Deduct N points per day late.') },
              { value: 'DAILY_PERCENT', label: t('lecturer.workspace.settings.late_daily_percent', 'Deduct percentage per day'), desc: t('lecturer.workspace.settings.late_daily_percent_desc', 'Deduct N% per day late.') },
              { value: 'FLAT_POINTS', label: t('lecturer.workspace.settings.late_flat_points', 'Flat point deduction'), desc: t('lecturer.workspace.settings.late_flat_points_desc', 'Deduct N fixed points when late.') },
              { value: 'NONE_FREE', label: t('lecturer.workspace.settings.late_none_free', 'No penalty'), desc: t('lecturer.workspace.settings.late_none_free_desc', 'Allow late submissions for free.') },
            ].map(opt => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setForm({ ...form, latePolicyOption: opt.value })}
                className={`p-3 rounded-2xl border-2 text-left transition-all ${
                  form.latePolicyOption === opt.value
                    ? 'border-amber-500 bg-amber-50/50 dark:bg-amber-950/20'
                    : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'
                }`}
              >
                <p className={`font-bold text-xs ${form.latePolicyOption === opt.value ? 'text-amber-700 dark:text-amber-400' : 'text-slate-600 dark:text-slate-300'}`}>{opt.label}</p>
                <p className="text-[10px] text-slate-400 mt-0.5">{opt.desc}</p>
              </button>
            ))}
          </div>

          {form.latePolicyOption !== 'NONE_LOCKED' && form.latePolicyOption !== 'NONE_FREE' && (
            <div className="grid grid-cols-2 gap-3 pt-2">
              <label className="block space-y-1.5">
                <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                  {t('lecturer.workspace.settings.penalty_value_label', 'Penalty / day').replace('{{type}}', form.latePolicyOption === 'DAILY_PERCENT' ? t('lecturer.workspace.settings.penalty_percent', '(%)') : t('lecturer.workspace.settings.penalty_points', '(points)'))}
                </span>
                <input
                  type="number" min={0} max={form.latePolicyOption === 'DAILY_PERCENT' ? 100 : form.maxScore}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                  value={form.latePenaltyValue}
                  onChange={e => setForm({ ...form, latePenaltyValue: Number(e.target.value) || 0 })}
                />
              </label>
              <label className="block space-y-1.5">
                <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">{t('lecturer.workspace.settings.max_late_hours', 'Maximum late submission hours')}</span>
                <input
                  type="number" min={1}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                  value={form.lateSubmitHours}
                  onChange={e => setForm({ ...form, lateSubmitHours: Number(e.target.value) || 24 })}
                />
              </label>
            </div>
          )}
        </div>
      </div>

      {/* Save */}
      <div className="flex items-center gap-3">
        <Button type="submit" variant="primary" isLoading={saving} className="gap-2">
          <Save className="w-4 h-4" /> {t('lecturer.workspace.settings.save_config', 'Save configuration')}
        </Button>
        {saved && (
          <div className="flex items-center gap-1.5 text-green-600 text-sm font-semibold animate-in fade-in duration-300">
            <CheckCircle className="w-4 h-4" /> {t('lecturer.workspace.settings.saved', 'Saved!')}
          </div>
        )}
        {saveError && (
          <div className="flex items-center gap-1.5 text-red-600 text-xs font-semibold">
            <AlertCircle className="w-4 h-4" /> {saveError}
          </div>
        )}
      </div>
    </form>
  )
}

// ──────────────────────────────────────────────────────────────────────────────
// AI Rubric Generator Tab
// ──────────────────────────────────────────────────────────────────────────────
interface RubricCriterion { name: string; maxPoints: number; description: string }
interface RubricResult { criteria: RubricCriterion[]; total: number; raw?: string }

function getScoringBadge(strategy: string, t: (key: string, fallback: string) => string) {
  switch (strategy) {
    case 'SqlExecutionProbe':
      return { text: t('lecturer.workspace.rubric.strategy_db', 'Database (SQL)'), color: 'text-sky-700 bg-sky-50 border-sky-200 dark:text-sky-300 dark:bg-sky-500/10 dark:border-sky-500/20' }
    case 'HTTPProbe':
      return { text: 'REST API', color: 'text-blue-700 bg-blue-50 border-blue-200 dark:text-blue-300 dark:bg-blue-500/10 dark:border-blue-500/20' }
    case 'StdInOutProbe':
      return { text: 'I/O Test Cases', color: 'text-emerald-700 bg-emerald-50 border-emerald-200 dark:text-emerald-300 dark:bg-emerald-500/10 dark:border-emerald-500/20' }
    case 'AIVision':
      return { text: t('lecturer.workspace.rubric.strategy_ui', 'UI / AI Vision'), color: 'text-purple-700 bg-purple-50 border-purple-200 dark:text-purple-300 dark:bg-purple-500/10 dark:border-purple-500/20' }
    case 'AICodeReview':
      return { text: 'AI Code Review', color: 'text-indigo-700 bg-indigo-50 border-indigo-200 dark:text-indigo-300 dark:bg-indigo-500/10 dark:border-indigo-500/20' }
    case 'AiTextAnalysis':
      return { text: t('lecturer.workspace.rubric.strategy_text', 'AI Text Analysis'), color: 'text-cyan-700 bg-cyan-50 border-cyan-200 dark:text-cyan-300 dark:bg-cyan-500/10 dark:border-cyan-500/20' }
    case 'UniversalStatic':
      return { text: t('lecturer.workspace.rubric.strategy_ast', 'Static Analysis (AST)'), color: 'text-amber-700 bg-amber-50 border-amber-200 dark:text-amber-300 dark:bg-amber-500/10 dark:border-amber-500/20' }
    case 'Manual':
      return { text: t('lecturer.workspace.rubric.strategy_manual', 'Manual Grading'), color: 'text-slate-700 bg-slate-100 border-slate-200 dark:text-slate-300 dark:bg-slate-800 dark:border-slate-700' }
    default:
      return { text: strategy || t('lecturer.workspace.rubric.strategy_auto', 'Automatic'), color: 'text-slate-700 bg-slate-100 border-slate-200 dark:text-slate-300 dark:bg-slate-800 dark:border-slate-700' }
  }
}

function AIRubricTab({ assignment, assignmentId, onUpdateAssignment }: { assignment: AssignmentRow | null; assignmentId: string; onUpdateAssignment?: (a: any) => void }) {
  const { t } = useLanguage()
  const [publishedRubric, setPublishedRubric] = React.useState<any>(null)
  const [loadingPublished, setLoadingPublished] = React.useState(false)
  const [showGenerator, setShowGenerator] = React.useState(false)

  const [form, setForm] = React.useState({
    topic: '',
    difficulty: 'medium',
    totalScore: 10,
    fileRef: null as File | null,
  })
  const [generating, setGenerating] = React.useState(false)
  const [result, setResult] = React.useState<RubricResult | null>(null)
  const [saving, setSaving] = React.useState(false)
  const [saved, setSaved] = React.useState(false)
  const [editRows, setEditRows] = React.useState<RubricCriterion[]>([])

  // Load published rubric
  React.useEffect(() => {
    let active = true
    const rubricObj = (assignment as any)?.rubric
    const rubricsList = (assignment as any)?.rubrics
    
    // Check if there are valid rules
    let rules: any[] | null = null
    if (rubricObj?.rules && Array.isArray(rubricObj.rules) && rubricObj.rules.length > 0) {
      rules = rubricObj.rules
    } else if (rubricsList && Array.isArray(rubricsList) && rubricsList.length > 0) {
      rules = rubricsList
    }

    if (rules && rules.length > 0) {
      setPublishedRubric({
        rules,
        totalWeight: rubricObj?.totalWeight || assignment?.maxScore || (assignment as any)?.totalPoints || 10,
        passThreshold: (assignment as any)?.passThreshold ?? rubricObj?.passThreshold ?? 0.7,
      })
      return
    }

    if (assignmentId) {
      setLoadingPublished(true)
      gradingApi.getAssignment(assignmentId)
        .then((res: any) => {
          if (!active) return
          if (res?.rubric?.rules && Array.isArray(res.rubric.rules) && res.rubric.rules.length > 0) {
            setPublishedRubric(res.rubric)
          } else if (res?.rubrics && Array.isArray(res.rubrics) && res.rubrics.length > 0) {
            setPublishedRubric({
              rules: res.rubrics,
              totalWeight: res.maxScore || (assignment as any)?.totalPoints || 10,
              passThreshold: res.passThreshold ?? 0.7,
            })
          }
        })
        .catch(() => {})
        .finally(() => {
          if (active) setLoadingPublished(false)
        })
    }
    return () => { active = false }
  }, [assignment, assignmentId])

  React.useEffect(() => {
    if (!assignment) return
    setForm(prev => ({ ...prev, topic: assignment.title || '', totalScore: assignment.maxScore || (assignment as any).totalPoints || 10 }))
  }, [assignment])

  React.useEffect(() => {
    if (result?.criteria && Array.isArray(result.criteria)) {
      const totalScore = Number(form.totalScore || 10)
      const count = result.criteria.length || 1
      const defaultScore = Math.max(1, Math.round(totalScore / count))

      setEditRows(result.criteria.map(c => {
        const rawScore = c.maxPoints ?? (c as any).maxScore ?? (c as any).points ?? (c as any).score
        return {
          name: c.name || (c as any).title || '',
          maxPoints: rawScore !== undefined && rawScore !== null && !isNaN(Number(rawScore)) ? Number(rawScore) : defaultScore,
          description: c.description || ''
        }
      }))
    }
  }, [result, form.totalScore])

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault()
    if (!form.topic.trim()) return
    setGenerating(true)
    setResult(null)
    try {
      const body = new FormData()
      body.append('topic', form.topic)
      body.append('difficulty', form.difficulty)
      body.append('totalScore', String(form.totalScore))
      if (form.fileRef) body.append('file', form.fileRef)
      const res = await rubricApi.generateRubricAI(body)
      let parsed: RubricResult | null = null
      if (res && typeof res === 'object') {
        if (Array.isArray(res.criteria)) {
          parsed = { criteria: res.criteria, total: res.total || form.totalScore }
        } else if (Array.isArray(res)) {
          parsed = { criteria: res, total: form.totalScore }
        }
      }
      if (!parsed) {
        parsed = { criteria: [], total: form.totalScore, raw: typeof res === 'string' ? res : JSON.stringify(res, null, 2) }
      }
      setResult(parsed)
    } catch (err: any) {
      alert(err?.message || t('lecturer.workspace.rubric.ai_no_response', 'AI did not respond, please try again later.'))
    } finally { setGenerating(false) }
  }

  async function handleSave() {
    if (!result && editRows.length === 0) return
    setSaving(true)
    try {
      const criteria = editRows.map(r => ({
        name: r.name,
        description: r.description || r.name || '',
        maxPoints: Number(r.maxPoints) || 0
      }))
      const totalScore = Number(form.totalScore || 10)
      await rubricApi.saveExamRubric(assignmentId, {
        criteria,
        total: totalScore,
        maxPoints: totalScore
      })
      setSaved(true)
      // Refresh local published rubric representation
      const newRules = criteria.map((c, i) => ({
        id: `r_${i + 1}`,
        title: c.name,
        name: c.name,
        description: c.description,
        weight: c.maxPoints,
        maxPoints: c.maxPoints,
        scoringStrategy: 'Manual'
      }))
      setPublishedRubric({
        rules: newRules,
        totalWeight: totalScore,
        passThreshold: 0.7
      })
      setShowGenerator(false)
      onUpdateAssignment?.({
        ...assignment,
        rubrics: newRules,
        rubric: {
          rules: newRules,
          totalWeight: totalScore,
          passThreshold: 0.7
        }
      })
      setTimeout(() => setSaved(false), 3000)
    } catch (err: any) {
      alert(err?.message || t('lecturer.workspace.rubric.save_error', 'Error saving rubric.'))
    } finally { setSaving(false) }
  }

  function addRow() { setEditRows(prev => [...prev, { name: '', maxPoints: 0, description: '' }]) }
  function removeRow(i: number) { setEditRows(prev => prev.filter((_, idx) => idx !== i)) }
  function updateRow(i: number, key: keyof RubricCriterion, val: string | number) {
    setEditRows(prev => prev.map((r, idx) => idx === i ? { ...r, [key]: val } : r))
  }
  const totalPoints = editRows.reduce((sum, r) => sum + (Number(r.maxPoints) || 0), 0)

  const hasPublishedRules = Boolean(publishedRubric?.rules && publishedRubric.rules.length > 0)
  const passThresholdVal = publishedRubric?.passThreshold !== undefined 
    ? Math.round(Number(publishedRubric.passThreshold) * 100) 
    : 70

  // 1. Published Rubric View (default when rules exist and user hasn't explicitly clicked Generator)
  if (hasPublishedRules && !showGenerator) {
    return (
      <div className="space-y-6 max-w-5xl animate-in fade-in duration-200">
        {/* Header Card */}
        <div className="p-6 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-orange-50 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400 flex items-center justify-center shrink-0 border border-orange-200/50 dark:border-orange-800/50">
              <BarChart2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>{t('lecturer.workspace.rubric.published_label', 'Rubric Published')}</span>
                <Badge variant="success" className="text-[10px]">{t('lecturer.workspace.rubric.active_badge', 'Active')}</Badge>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-3">
                <span>{t('lecturer.workspace.rubric.pass_threshold', `Pass threshold: ${passThresholdVal}%`).replace('{{value}}', String(passThresholdVal))}</span>
                <span>•</span>
                <span>{t('lecturer.workspace.rubric.total_weight', `Total weight: ${publishedRubric.totalWeight || assignment?.maxScore || 10} points`).replace('{{value}}', String(publishedRubric.totalWeight || assignment?.maxScore || 10))}</span>
              </p>
            </div>
          </div>

          <Button
            size="sm"
            onClick={() => {
              if (publishedRubric?.rules?.length && editRows.length === 0) {
                setEditRows(publishedRubric.rules.map((r: any) => ({
                  name: r.title || r.name || '',
                  maxPoints: Number(r.weight ?? r.maxPoints ?? 0),
                  description: r.description || ''
                })))
              }
              setShowGenerator(true)
            }}
            className="gap-2 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white text-xs shadow-sm"
          >
            <Sparkles className="w-3.5 h-3.5" />
            {t('lecturer.workspace.rubric.create_with_ai', 'Recreate / Create Rubric with AI')}
          </Button>
        </div>

        {/* Rules Table */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-1.5 h-5 bg-orange-500 rounded-full" />
              <h4 className="font-bold text-sm text-slate-900 dark:text-white">{t('lecturer.workspace.rubric.criteria_list', `Evaluation Criteria List (${publishedRubric.rules.length})`).replace('{{count}}', String(publishedRubric.rules.length))}</h4>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-orange-50 dark:bg-orange-950/40 text-orange-700 dark:text-orange-300 border border-orange-200 dark:border-orange-800/60">
              {t('lecturer.workspace.rubric.total_score', `Total score: ${publishedRubric.totalWeight || assignment?.maxScore || 10}`).replace('{{value}}', String(publishedRubric.totalWeight || assignment?.maxScore || 10))}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  <th className="px-6 py-3.5">{t('lecturer.workspace.rubric.col_criteria', 'Criteria & Requirements')}</th>
                  <th className="px-4 py-3.5 text-center whitespace-nowrap">{t('lecturer.workspace.rubric.col_method', 'Grading Method')}</th>
                  <th className="px-6 py-3.5 text-right whitespace-nowrap">{t('lecturer.workspace.rubric.col_max_score', 'Max Score')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {publishedRubric.rules.map((rule: any, idx: number) => {
                  const badge = getScoringBadge(rule.scoringStrategy, t)
                  const title = rule.title || rule.name || t('lecturer.workspace.rubric.criteria_fallback', `Criterion ${idx + 1}`).replace('{{idx}}', String(idx + 1))
                  const desc = rule.description || ''
                  const testCases = rule.requiredEvidence?.[0]?.stdInOutProbe?.testCases

                  return (
                    <tr key={rule.id || idx} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors">
                      <td className="px-6 py-4 align-top space-y-2">
                        <div className="font-bold text-sm text-slate-900 dark:text-white">{title}</div>
                        {desc && <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">{desc}</p>}

                        {/* Test Cases for StdInOut */}
                        {testCases && Array.isArray(testCases) && testCases.length > 0 && (
                          <div className="mt-3 p-3 bg-slate-50 dark:bg-slate-950/60 rounded-xl border border-slate-200/60 dark:border-slate-800 space-y-1.5">
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{t('lecturer.workspace.rubric.sample_test_cases', 'Sample test cases:')}</span>
                            <div className="space-y-1">
                              {testCases.slice(0, 3).map((tc: any, i: number) => (
                                <div key={i} className="text-[11px] font-mono grid grid-cols-2 gap-2 bg-white dark:bg-slate-900 p-1.5 rounded border border-slate-200/40 dark:border-slate-800/60">
                                  <div><span className="text-slate-400">IN:</span> {tc.input}</div>
                                  <div><span className="text-emerald-500">OUT:</span> {tc.expectedOutput}</div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Sub criteria */}
                        {rule.criteria && Array.isArray(rule.criteria) && rule.criteria.length > 0 && (
                          <ul className="mt-2 space-y-1 pl-3 border-l-2 border-orange-200 dark:border-orange-900/50">
                            {rule.criteria.map((c: any, i: number) => (
                              <li key={i} className="text-[11px] text-slate-600 dark:text-slate-400">
                                • {typeof c === 'string' ? c : (c.description || c.title || JSON.stringify(c))} ({c.maxPoints || 0}{t('lecturer.workspace.rubric.points_suffix', 'pts')})
                              </li>
                            ))}
                          </ul>
                        )}
                      </td>

                      <td className="px-4 py-4 text-center align-top whitespace-nowrap">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-[11px] font-bold border shadow-2xs ${badge.color}`}>
                          {badge.text}
                        </span>
                      </td>

                      <td className="px-6 py-4 text-right align-top whitespace-nowrap font-bold text-sm text-emerald-600 dark:text-emerald-400">
                        {rule.weight ?? rule.maxPoints ?? 0} {t('lecturer.workspace.rubric.points_suffix', 'pts')}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    )
  }

  // 2. AI Rubric Generator & Editor View
  return (
    <div className="space-y-6 max-w-5xl">
      {hasPublishedRules && (
        <div className="flex items-center justify-between p-4 bg-orange-50/60 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800/40 rounded-2xl">
          <div className="flex items-center gap-2 text-xs text-orange-800 dark:text-orange-300">
            <BarChart2 className="w-4 h-4 text-orange-500" />
            <span>{t('lecturer.workspace.rubric.has_published_notice', `This assignment already has a published Rubric (${publishedRubric.rules.length} criteria).`).replace('{{count}}', String(publishedRubric.rules.length))}</span>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowGenerator(false)}
            className="text-xs"
          >
            {t('lecturer.workspace.rubric.back_to_published', 'Back to Published Rubric')}
          </Button>
        </div>
      )}

      <div className="grid lg:grid-cols-5 gap-6">
        {/* Left: Form */}
        <div className="lg:col-span-2">
          <form onSubmit={handleGenerate} className="p-6 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-4">
            <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-violet-500" /> AI Rubric Generator
            </h3>
            <label className="block space-y-1.5">
              <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">{t('lecturer.workspace.rubric.topic_label', 'Topic / assignment title')}</span>
              <input
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                placeholder={t('lecturer.workspace.rubric.topic_placeholder', 'E.g.: Python programming assignment...')}
                value={form.topic}
                onChange={e => setForm({ ...form, topic: e.target.value })}
                required
              />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="block space-y-1.5">
                <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">{t('lecturer.workspace.rubric.difficulty_label', 'Difficulty')}</span>
                <select
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                  value={form.difficulty}
                  onChange={e => setForm({ ...form, difficulty: e.target.value })}
                >
                  <option value="easy">{t('lecturer.workspace.rubric.difficulty_easy', 'Easy')}</option>
                  <option value="medium">{t('lecturer.workspace.rubric.difficulty_medium', 'Medium')}</option>
                  <option value="hard">{t('lecturer.workspace.rubric.difficulty_hard', 'Hard')}</option>
                </select>
              </label>
              <label className="block space-y-1.5">
                <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">{t('lecturer.workspace.rubric.total_score_label', 'Total Score')}</span>
                <input
                  type="number" min={1} max={100}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                  value={form.totalScore}
                  onChange={e => setForm({ ...form, totalScore: Number(e.target.value) || 10 })}
                />
              </label>
            </div>
            <label className="block space-y-1.5">
              <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">{t('lecturer.workspace.rubric.reference_label', 'Reference materials (optional)')}</span>
              <input
                type="file"
                accept=".pdf,.doc,.docx,.txt"
                className="block w-full text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-violet-50 file:text-violet-700 hover:file:bg-violet-100 dark:file:bg-violet-950 dark:file:text-violet-300"
                onChange={e => setForm({ ...form, fileRef: e.target.files?.[0] || null })}
              />
            </label>
            <Button type="submit" className="w-full gap-2 bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 text-white shadow-lg shadow-violet-200/40 dark:shadow-violet-900/30" isLoading={generating}>
              {!generating && <Sparkles className="w-4 h-4" />}
              {generating ? t('lecturer.workspace.rubric.generating', 'AI is generating rubric...') : t('lecturer.workspace.rubric.generate_btn', 'Generate rubric with AI')}
            </Button>
          </form>
        </div>

        {/* Right: Result editor */}
        <div className="lg:col-span-3">
          <div className="p-6 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 h-full min-h-[400px] flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <BarChart2 className="w-4 h-4 text-orange-500" /> Rubric
                {editRows.length > 0 && (
                  <span className={`text-xs px-2 py-0.5 rounded-full ${Math.abs(totalPoints - form.totalScore) < 0.1 ? 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400' : 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400'}`}>
                    {totalPoints}/{form.totalScore} {t('lecturer.workspace.rubric.points_suffix', 'pts')}
                  </span>
                )}
              </h3>
              {editRows.length > 0 && (
                <div className="flex items-center gap-2">
                  <button onClick={addRow} className="p-1.5 rounded-lg text-slate-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-colors">
                    <Plus className="w-4 h-4" />
                  </button>
                  <Button size="sm" onClick={handleSave} isLoading={saving} className="gap-1.5 text-xs bg-violet-500 hover:bg-violet-600 text-white">
                    <Save className="w-3.5 h-3.5" /> {t('lecturer.workspace.rubric.save_rubric', 'Save Rubric')}
                  </Button>
                </div>
              )}
            </div>

            {!result && !generating && (
              <div className="flex-1 flex flex-col items-center justify-center text-slate-300 dark:text-slate-600 gap-3">
                <Sparkles className="w-12 h-12 opacity-40" />
                <p className="text-sm">{t('lecturer.workspace.rubric.empty_prompt', 'Enter information and click "Generate rubric" to begin.')}</p>
              </div>
            )}

            {generating && (
              <div className="flex-1 flex flex-col items-center justify-center text-violet-500 gap-3">
                <Loader2 className="w-12 h-12 animate-spin" />
                <p className="text-sm font-medium animate-pulse">{t('lecturer.workspace.rubric.ai_analyzing', 'AI is analyzing and generating grading criteria...')}</p>
              </div>
            )}

            {result && !generating && (
              <div className="flex-1 flex flex-col space-y-3 overflow-y-auto">
                {result.raw && (
                  <pre className="text-xs text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800 p-4 rounded-2xl whitespace-pre-wrap overflow-auto max-h-80 font-mono border border-slate-200 dark:border-slate-700">{result.raw}</pre>
                )}

                {editRows.length > 0 && (
                  <div className="space-y-2">
                    {editRows.map((row, i) => (
                      <div key={i} className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 space-y-2">
                        <div className="flex items-center gap-2">
                          <input
                            className="flex-1 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-violet-500"
                            placeholder={t('lecturer.workspace.rubric.criteria_name_placeholder', 'Criterion name...')}
                            value={row.name ?? ''}
                            onChange={e => updateRow(i, 'name', e.target.value)}
                          />
                          <input
                            type="number" min={0}
                            className="w-16 px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold text-orange-600 dark:text-orange-400 focus:outline-none focus:ring-1 focus:ring-violet-500 text-center"
                            value={row.maxPoints ?? 0}
                            onChange={e => updateRow(i, 'maxPoints', Number(e.target.value) || 0)}
                          />
                          <span className="text-xs text-slate-400">{t('lecturer.workspace.rubric.points_suffix', 'pts')}</span>
                          <button onClick={() => removeRow(i)} className="p-1 rounded-lg text-slate-300 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <textarea
                          rows={2}
                          className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-600 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-violet-500 resize-none"
                          placeholder={t('lecturer.workspace.rubric.criteria_desc_placeholder', 'Criterion description...')}
                          value={row.description ?? ''}
                          onChange={e => updateRow(i, 'description', e.target.value)}
                        />
                      </div>
                    ))}
                    <button onClick={addRow} className="w-full py-2.5 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700 text-xs text-slate-400 hover:text-blue-500 hover:border-blue-300 flex items-center justify-center gap-1.5 transition-colors">
                      <Plus className="w-3.5 h-3.5" /> {t('lecturer.workspace.rubric.add_criteria', 'Add criterion')}
                    </button>
                  </div>
                )}

                {saved && (
                  <div className="flex items-center gap-2 text-green-600 text-sm font-semibold animate-in fade-in duration-300">
                    <CheckCircle className="w-4 h-4" /> {t('lecturer.workspace.rubric.save_success', 'Rubric has been saved successfully!')}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ──────────────────────────────────────────────────────────────────────────────
// Plagiarism Tab (Full Implementation G5.6)
// ──────────────────────────────────────────────────────────────────────────────
function PlagiarismTab({ assignmentId }: { assignmentId: string }) {
  const { t } = useLanguage()
  const [threshold, setThreshold] = React.useState(70)
  const [scanning, setScanning] = React.useState(false)
  const [scanResult, setScanResult] = React.useState<any>(null)
  const [error, setError] = React.useState<string | null>(null)

  // Penalty modal
  const [penaltyModal, setPenaltyModal] = React.useState<{
    open: boolean
    selectedSubmissions: string[]
    penaltyType: 'NONE' | 'FLAT_POINTS' | 'PERCENT' | 'ZERO_SCORE'
    penaltyValue: number
    reason: string
  }>({
    open: false,
    selectedSubmissions: [],
    penaltyType: 'PERCENT',
    penaltyValue: 50,
    reason: t('lecturer.workspace.plagiarism.duplicate_reason', 'Trùng lặp mã nguồn với bài thi khác'),
  })
  const [applyingPenalty, setApplyingPenalty] = React.useState(false)

  const handleScan = async () => {
    setScanning(true)
    setError(null)
    try {
      const res = await gradingApi.detectDuplicateSubmissions(assignmentId, threshold)
      setScanResult(res)
    } catch (err: any) {
      setError(err?.message || t('lecturer.workspace.plagiarism.scan_error', 'Không thể quét trùng lặp mã nguồn.'))
    } finally {
      setScanning(false)
    }
  }

  const handleOpenPenalty = (submissionIds: string[]) => {
    setPenaltyModal({
      open: true,
      selectedSubmissions: submissionIds,
      penaltyType: 'PERCENT',
      penaltyValue: 50,
      reason: t('lecturer.workspace.plagiarism.ast_reason', 'Trùng lặp mã nguồn theo thuật toán AST/Token similarity'),
    })
  }

  const handleApplyPenalty = async (e: React.FormEvent) => {
    e.preventDefault()
    if (penaltyModal.selectedSubmissions.length === 0) {
      alert(t('lecturer.workspace.plagiarism.select_warning', 'Vui lòng chọn ít nhất một bài nộp để áp dụng hình phạt.'))
      return
    }

    setApplyingPenalty(true)
    try {
      const res = await gradingApi.applyDuplicatePenalty({
        assignmentId,
        submissionIds: penaltyModal.selectedSubmissions,
        penaltyType: penaltyModal.penaltyType,
        penaltyValue: penaltyModal.penaltyValue,
        reason: penaltyModal.reason,
      })
      const count = res?.updatedCount || penaltyModal.selectedSubmissions.length
      alert(t('lecturer.workspace.plagiarism.penalty_success', `Đã áp dụng hình phạt thành công cho ${count} bài nộp!`).replace('{{count}}', String(count)))
      setPenaltyModal(prev => ({ ...prev, open: false }))
      await handleScan()
    } catch (err: any) {
      alert(err?.message || t('lecturer.workspace.plagiarism.penalty_error', 'Lỗi khi áp dụng hình phạt.'))
    } finally {
      setApplyingPenalty(false)
    }
  }

  const clusters = scanResult?.clusters || []
  const checkedCount = scanResult?.checkedCount ?? 0

  return (
    <div className="space-y-6">
      {/* Header Controls */}
      <div className="p-6 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-rose-500" />
              <span>{t('lecturer.workspace.plagiarism.title', 'Phát hiện sao chép & Trùng lặp mã nguồn (Plagiarism Detection)')}</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {t('lecturer.workspace.plagiarism.desc', 'Phân tích cấu trúc AST, Token Similarity và băm mã nguồn để tìm các cụm bài làm tương đồng cao.')}
            </p>
          </div>

          <Button
            variant="primary"
            size="sm"
            onClick={handleScan}
            isLoading={scanning}
            className="text-xs gap-1.5 bg-rose-600 hover:bg-rose-700 text-white shrink-0 shadow-md shadow-rose-600/20"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>{t('lecturer.workspace.plagiarism.scan_btn', 'Quét bài trùng lặp')}</span>
          </Button>
        </div>

        {/* Threshold Slider */}
        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-0.5">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5 text-orange-500" />
              {t('lecturer.workspace.plagiarism.threshold_label', 'Ngưỡng tương đồng phát hiện (Similarity Threshold):')}
            </span>
            <span className="text-[11px] text-slate-400">
              {t('lecturer.workspace.plagiarism.threshold_desc', `Chỉ các cặp bài có độ giống nhau từ ${threshold}% trở lên sẽ được phân cụm cảnh báo.`).replace('{{value}}', String(threshold))}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <input
              type="range"
              min={50}
              max={100}
              step={5}
              value={threshold}
              onChange={(e) => setThreshold(Number(e.target.value))}
              className="w-36 h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-orange-500"
            />
            <span className="font-mono font-black text-sm text-orange-600 dark:text-orange-400 w-12 text-right">
              {threshold}%
            </span>
          </div>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/40 text-xs text-rose-600 dark:text-rose-400">
            {error}
          </div>
        )}
      </div>

      {/* Results view */}
      {scanResult && (
        <div className="space-y-4">
          {/* Summary Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">{t('lecturer.workspace.plagiarism.stat_checked', 'Bài đã kiểm tra')}</span>
              <span className="text-2xl font-black text-slate-900 dark:text-white font-mono">{checkedCount}</span>
            </div>
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">{t('lecturer.workspace.plagiarism.stat_clusters', 'Nhóm trùng lặp')}</span>
              <span className="text-2xl font-black text-rose-500 font-mono">{clusters.length}</span>
            </div>
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">{t('lecturer.workspace.plagiarism.stat_threshold', 'Ngưỡng áp dụng')}</span>
              <span className="text-2xl font-black text-orange-500 font-mono">{scanResult.threshold || threshold}%</span>
            </div>
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">{t('lecturer.workspace.plagiarism.stat_penalized', 'Đã xử lý phạt')}</span>
              <span className="text-2xl font-black text-emerald-500 font-mono">{scanResult.resolvedClustersCount || 0}</span>
            </div>
          </div>

          {/* Clusters List */}
          {clusters.length === 0 ? (
            <div className="p-8 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 text-xs text-slate-500">
              <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2 opacity-80" />
              {t('lecturer.workspace.plagiarism.no_clusters', `Tuyệt vời! Không phát hiện nhóm bài nào có độ tương đồng vượt quá ${threshold}%.`).replace('{{value}}', String(threshold))}
            </div>
          ) : (
            <div className="space-y-4">
              {clusters.map((cluster: any, cIdx: number) => {
                const subIds = (cluster.submissions || []).map((s: any) => s.submissionId)

                return (
                  <div
                    key={cIdx}
                    className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-900/40 shadow-xs space-y-4"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
                      <div className="flex items-center gap-2.5">
                        <span className="w-7 h-7 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center font-bold text-xs">
                          #{cIdx + 1}
                        </span>
                        <div>
                          <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                            {t('lecturer.workspace.plagiarism.cluster_title', `Nhóm trùng lặp gồm ${cluster.count} bài làm`).replace('{{count}}', String(cluster.count))}
                          </h4>
                          <span className="text-xs text-rose-500 font-mono font-bold">
                            {t('lecturer.workspace.plagiarism.max_similarity', `Độ giống nhau cao nhất: ${Math.round(cluster.maxSimilarity * 100)}%`).replace('{{value}}', String(Math.round(cluster.maxSimilarity * 100)))}
                            {cluster.allIdentical && t('lecturer.workspace.plagiarism.all_identical', ' (100% Giống hoàn toàn)')}
                          </span>
                        </div>
                      </div>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleOpenPenalty(subIds)}
                        className="text-xs gap-1.5 text-rose-600 border-rose-300 hover:bg-rose-50 dark:border-rose-900/40"
                      >
                        <ShieldAlert className="w-3.5 h-3.5" />
                        <span>{t('lecturer.workspace.plagiarism.penalize_group', 'Xử lý phạt nhóm này')}</span>
                      </Button>
                    </div>

                    {/* Submissions in cluster */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                      {(cluster.submissions || []).map((sub: any, sIdx: number) => (
                        <div
                          key={sIdx}
                          className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60 text-xs space-y-1"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-slate-900 dark:text-white truncate">
                              {sub.studentName || t('lecturer.workspace.plagiarism.student_fallback', 'Sinh viên')}
                            </span>
                            {sub.isPenalized && (
                              <span className="px-1.5 py-0.5 rounded text-[10px] bg-rose-500/10 text-rose-600 border border-rose-500/20 font-bold">
                                {t('lecturer.workspace.plagiarism.penalized_badge', 'Đã phạt')}
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-400 font-mono">
                            MSSV: {sub.studentCode || 'HE170000'}
                          </div>
                          <div className="text-[11px] text-rose-500 font-mono font-bold">
                            {t('lecturer.workspace.plagiarism.similarity_label', `Tương đồng: ${Math.round((sub.topSimilarity || 0) * 100)}%`).replace('{{value}}', String(Math.round((sub.topSimilarity || 0) * 100)))}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Pair breakdown */}
                    {cluster.pairs && cluster.pairs.length > 0 && (
                      <div className="pt-2 text-xs space-y-1.5">
                        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                          {t('lecturer.workspace.plagiarism.detailed_comparison', 'Đối sánh chi tiết từng cặp bài:')}
                        </span>
                        <div className="space-y-1 font-mono text-[11px] text-slate-600 dark:text-slate-300">
                          {cluster.pairs.map((p: any, pIdx: number) => (
                            <div key={pIdx} className="flex items-center justify-between p-2 rounded-xl bg-slate-100 dark:bg-slate-800/30">
                              <span>{p.studentNameA || 'SV A'} ↔ {p.studentNameB || 'SV B'}</span>
                              <span className="font-bold text-rose-500">{Math.round(p.similarity * 100)}% match</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Penalty Modal */}
      <Modal
        isOpen={penaltyModal.open}
        onClose={() => setPenaltyModal(prev => ({ ...prev, open: false }))}
        title={t('lecturer.workspace.plagiarism.penalty_modal_title', 'Áp dụng hình phạt cho bài làm trùng lặp')}
        description={t('lecturer.workspace.plagiarism.penalty_modal_desc', `Đang chọn ${penaltyModal.selectedSubmissions.length} bài nộp vi phạm`).replace('{{count}}', String(penaltyModal.selectedSubmissions.length))}
      >
        <form onSubmit={handleApplyPenalty} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              {t('lecturer.workspace.plagiarism.penalty_mode_label', 'Hình thức xử phạt (Penalty Mode)')}
            </label>
            <select
              value={penaltyModal.penaltyType}
              onChange={(e) => setPenaltyModal({ ...penaltyModal, penaltyType: e.target.value as any })}
              className="w-full text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-2.5 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-orange-500"
            >
              <option value="PERCENT">{t('lecturer.workspace.plagiarism.penalty_percent', 'Trừ theo tỷ lệ phần trăm (Percent)')}</option>
              <option value="FLAT_POINTS">{t('lecturer.workspace.plagiarism.penalty_flat', 'Trừ số điểm cố định (Flat Points)')}</option>
              <option value="ZERO_SCORE">{t('lecturer.workspace.plagiarism.penalty_zero', 'Đánh 0 điểm bài làm (Zero Score)')}</option>
              <option value="NONE">{t('lecturer.workspace.plagiarism.penalty_none', 'Không phạt / Hủy hình phạt (None)')}</option>
            </select>
          </div>

          {penaltyModal.penaltyType === 'PERCENT' && (
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">{t('lecturer.workspace.plagiarism.deduct_percent_label', 'Tỷ lệ trừ %')}</label>
              <input
                type="number"
                min={0}
                max={100}
                value={penaltyModal.penaltyValue}
                onChange={(e) => setPenaltyModal({ ...penaltyModal, penaltyValue: parseFloat(e.target.value) || 0 })}
                className="w-full text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-2.5 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-orange-500"
              />
            </div>
          )}

          {penaltyModal.penaltyType === 'FLAT_POINTS' && (
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">{t('lecturer.workspace.plagiarism.deduct_points_label', 'Số điểm trừ')}</label>
              <input
                type="number"
                step="0.5"
                min={0}
                max={10}
                value={penaltyModal.penaltyValue}
                onChange={(e) => setPenaltyModal({ ...penaltyModal, penaltyValue: parseFloat(e.target.value) || 0 })}
                className="w-full text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-2.5 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-orange-500"
              />
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">{t('lecturer.workspace.plagiarism.reason_label', 'Lý do xử phạt')}</label>
            <textarea
              rows={3}
              value={penaltyModal.reason}
              onChange={(e) => setPenaltyModal({ ...penaltyModal, reason: e.target.value })}
              className="w-full text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-2.5 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-orange-500"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="ghost"
              size="sm"
              type="button"
              onClick={() => setPenaltyModal(prev => ({ ...prev, open: false }))}
            >
              {t('common.cancel', 'Hủy bỏ')}
            </Button>
            <Button
              variant="danger"
              size="sm"
              type="submit"
              isLoading={applyingPenalty}
            >
              {t('lecturer.workspace.plagiarism.confirm_penalty', 'Xác nhận áp dụng phạt')}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

// ──────────────────────────────────────────────────────────────────────────────
// Main Workspace
// ──────────────────────────────────────────────────────────────────────────────
export default function LecturerAssignmentWorkspacePage() {
  const { t } = useLanguage()
  const params = useParams()
  const pathname = usePathname()
  const assignmentId = String(params?.id ?? '')

  const isRubricRoute = pathname?.endsWith('/rubric')
  const [activeTab, setActiveTab] = React.useState(isRubricRoute ? 'rubric' : 'submissions')
  const [assignment, setAssignment] = React.useState<AssignmentRow | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [uploadingAnswerKey, setUploadingAnswerKey] = React.useState(false)
  const [togglingPublish, setTogglingPublish] = React.useState(false)

  React.useEffect(() => {
    if (pathname?.endsWith('/rubric')) {
      setActiveTab('rubric')
    }
  }, [pathname])

  React.useEffect(() => {
    assignmentsApi.getAssignment(assignmentId)
      .then(setAssignment)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [assignmentId])

  const handleTogglePublish = async () => {
    if (!assignment || !assignmentId) return
    const isCurrentlyPublished = assignment.status === 'published' || assignment.status === 'Published'
    if (isCurrentlyPublished) {
      const ok = window.confirm(
        t('lecturer.workspace.confirm_revert_draft', 'Bạn có chắc chắn muốn chuyển bài tập này về Bản nháp? Sinh viên cùng môn/lớp sẽ tạm thời không nhìn thấy và không nộp được bài nữa.')
      )
      if (!ok) return
    }
    setTogglingPublish(true)
    try {
      const nextStatus = isCurrentlyPublished ? 'draft' : 'published'
      await assignmentsApi.updateAssignment(assignmentId, { status: nextStatus })
      setAssignment(prev => prev ? { ...prev, status: nextStatus } : prev)
      if (nextStatus === 'published') {
        alert(t('lecturer.workspace.publish_success_alert', '🎉 Đã giao bài tập thành công! Sinh viên cùng môn/lớp hiện đã có thể nhìn thấy và nộp bài.'))
      } else {
        alert(t('lecturer.workspace.unpublish_success_alert', 'Đã chuyển bài tập về bản nháp. Sinh viên sẽ không thấy bài tập này nữa.'))
      }
    } catch (err: any) {
      alert(err?.message || t('lecturer.workspace.status_update_error', 'Không thể cập nhật trạng thái bài tập.'))
    } finally {
      setTogglingPublish(false)
    }
  }

  const handleAnswerKeyUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !assignmentId) return
    setUploadingAnswerKey(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await gradingApi.updateAnswerKey(assignmentId, fd)
      alert(t('lecturer.workspace.sql_update_success', 'Cập nhật SQL Answer Key thành công!') + (res?.testCaseCount ? ` (${res.testCaseCount} test cases)` : ''))
      const refreshed = await assignmentsApi.getAssignment(assignmentId)
      setAssignment(refreshed)
    } catch (err: any) {
      alert(err?.message || t('lecturer.workspace.sql_update_err', 'Lỗi khi cập nhật SQL Answer Key'))
    } finally {
      setUploadingAnswerKey(false)
      e.target.value = ''
    }
  }

  const tabs = [
    { id: 'submissions', label: t('lecturer.workspace.tab_submissions', 'Bài nộp & Chấm điểm'), icon: Users },
    { id: 'settings', label: t('lecturer.workspace.tab_settings', 'Cấu hình'), icon: Settings },
    { id: 'rubric', label: t('lecturer.workspace.tab_rubric', 'AI Rubric'), icon: Sparkles },
    { id: 'plagiarism', label: t('lecturer.workspace.tab_plagiarism', 'Đạo văn'), icon: ShieldAlert },
  ]

  return (
    <DashboardLayout
      navItems={LECTURER_NAV}
      title="AITA Lecturer"
      roleLabel={t('profile.role_lecturer', 'Giảng viên')}
      requiredRole="lecturer"
      headerTitle={t('lecturer.workspace.header_title', 'Workspace Chấm Điểm')}
      headerSubtitle={loading ? t('lecturer.workspace.header_loading', 'Đang tải...') : (assignment?.title || 'Assignment Workspace')}
    >
      <div className="space-y-6">
        {/* Back link */}
        <Link href="/lecturer/grading/assignments" className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors">
          <ArrowLeft className="w-4 h-4" /> {t('lecturer.workspace.back_to_list', 'Quay lại danh sách bài tập')}
        </Link>

        {/* Header summary */}
        <div className="rounded-3xl p-5 sm:p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="orange">{assignment?.subjectName || assignment?.subjectId || t('lecturer.workspace.subject_fallback', 'Môn học')}</Badge>
                <span className="text-xs text-slate-400 font-mono">#{assignmentId.substring(0, 8)}</span>
                {assignment?.status && (
                  <Badge variant={assignment.status === 'published' ? 'success' : 'default'} className="text-[10px]">
                    {assignment.status === 'published' ? t('lecturer.workspace.status_published', 'Đã giao') : t('lecturer.workspace.status_draft', 'Bản nháp')}
                  </Badge>
                )}
              </div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                {loading ? <span className="inline-block w-48 h-5 bg-slate-200 dark:bg-slate-700 rounded-lg animate-pulse" /> : (assignment?.title || 'Assignment')}
              </h2>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              {/* Publish / Revert Button */}
              {assignment && (
                <Button
                  size="sm"
                  variant={assignment.status === 'published' ? 'outline' : 'primary'}
                  isLoading={togglingPublish}
                  onClick={handleTogglePublish}
                  className={`text-xs font-semibold rounded-2xl h-9 px-3.5 ${
                    assignment.status !== 'published'
                      ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm shadow-emerald-600/20 border-transparent'
                      : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  {assignment.status === 'published' ? (
                    <>
                      <Clock className="w-3.5 h-3.5 mr-1.5 text-slate-400" />
                      {t('lecturer.workspace.revert_draft_btn', 'Chuyển về bản nháp')}
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5 mr-1.5 text-white" />
                      {t('lecturer.workspace.publish_now_btn', 'Giao bài cho sinh viên')}
                    </>
                  )}
                </Button>
              )}

              {/* SQL Answer key button */}
              <label className="cursor-pointer inline-flex items-center gap-2 px-3.5 py-2 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 rounded-2xl text-xs font-semibold hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition-colors shadow-xs h-9">
                {uploadingAnswerKey ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Database className="w-3.5 h-3.5" />}
                <span>{uploadingAnswerKey ? t('lecturer.workspace.uploading_sql', 'Đang cập nhật SQL...') : t('lecturer.workspace.upload_sql_btn', 'Cập nhật SQL Answer Key')}</span>
                <input
                  type="file"
                  accept=".sql,.txt"
                  className="hidden"
                  disabled={uploadingAnswerKey}
                  onChange={handleAnswerKeyUpload}
                />
              </label>

              <div className="flex gap-4 text-center shrink-0">
                {assignment?.maxScore !== undefined && (
                  <div>
                    <p className="text-lg font-extrabold text-orange-500">{assignment.maxScore}</p>
                    <p className="text-[10px] text-slate-400">{t('lecturer.workspace.max_score_label', 'Điểm tối đa')}</p>
                  </div>
                )}
                {assignment?.dueAt && !isNaN(new Date(assignment.dueAt).getTime()) && (
                  <div>
                    <p className="text-sm font-bold text-slate-900 dark:text-white">{new Date(assignment.dueAt).toLocaleDateString('vi-VN')}</p>
                    <p className="text-[10px] text-slate-400">{t('lecturer.workspace.due_date_label', 'Hạn nộp')}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Draft Notice Banner */}
        {assignment && assignment.status !== 'published' && (
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-2xl text-amber-900 dark:text-amber-200 text-xs">
            <div className="flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
              <span>
                <strong>{t('lecturer.workspace.draft_banner_title', 'Bài tập đang ở trạng thái Bản nháp (Draft).')}</strong>{' '}
                {t('lecturer.workspace.draft_banner_desc', 'Sinh viên trong lớp chưa nhìn thấy bài tập này. Nhấn "Giao bài cho sinh viên" để mở bài và thông báo tới sinh viên.')}
              </span>
            </div>
            <Button
              size="sm"
              isLoading={togglingPublish}
              onClick={handleTogglePublish}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs shrink-0 rounded-xl px-3 py-1.5 shadow-sm"
            >
              <Send className="w-3.5 h-3.5 mr-1.5" />
              {t('lecturer.workspace.publish_now_btn', 'Giao bài ngay')}
            </Button>
          </div>
        )}

        {/* Tabs */}
        <div className="flex items-center gap-1.5 p-1.5 bg-slate-100 dark:bg-slate-900/50 rounded-2xl overflow-x-auto border border-slate-200 dark:border-slate-800">
          {tabs.map(tab => {
            const Icon = tab.icon
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                  isActive
                    ? 'bg-white dark:bg-slate-800 text-orange-600 dark:text-orange-400 shadow-sm border border-slate-200/50 dark:border-slate-700/50'
                    : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-800/50'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-orange-500' : 'text-slate-400'}`} />
                {tab.label}
              </button>
            )
          })}
        </div>

        {/* Tab content */}
        <div>
          {activeTab === 'submissions' && <LecturerSubmissionsPage />}
          {activeTab === 'settings' && <SettingsTab assignment={assignment} assignmentId={assignmentId} onUpdateAssignment={(updated) => setAssignment(prev => prev ? { ...prev, ...updated } : prev)} />}
          {activeTab === 'rubric' && <AIRubricTab assignment={assignment} assignmentId={assignmentId} onUpdateAssignment={(updated) => setAssignment(prev => prev ? { ...prev, ...updated } : prev)} />}
          {activeTab === 'plagiarism' && <PlagiarismTab assignmentId={assignmentId} />}
        </div>
      </div>
    </DashboardLayout>
  )
}
