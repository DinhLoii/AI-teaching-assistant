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
import { formatDate } from '@/lib/utils'
import { useLanguage } from '@/providers/language-provider'
import { errorMessage } from '@/lib/api/errors'
import {
  FileCheck, Plus, Users, Sparkles, Calendar, ArrowRight, Settings2,
  Clock, CheckCircle2, Search, Trash2, RotateCcw, Archive, Inbox,
  ChevronRight, BookOpen, Layers, Zap, AlertCircle, X, Send, Eye,
} from 'lucide-react'

type ViewMode = 'active' | 'trash'
type WizardStep = 'info' | 'rubric' | 'confirm'

// ─── Wizard Create Modal ────────────────────────────────────────────────────
interface WizardProps {
  isOpen: boolean
  onClose: () => void
  classes: any[]
  onSuccess: () => void
}

function CreateWizard({ isOpen, onClose, classes, onSuccess }: WizardProps) {
  const { t } = useLanguage()
  const [step, setStep] = React.useState<WizardStep>('info')
  const [creating, setCreating] = React.useState(false)
  const [form, setForm] = React.useState({
    title: '',
    classId: '',
    dueDate: '',
    description: '',
    maxScore: 10,
    strategy: 'CONTINUOUS_QUEUE',
    latePolicyOption: 'NONE_LOCKED',
    latePenaltyValue: 0,
    lateSubmitHours: 24,
    publishImmediately: true,
  })

  const selectedClass = classes.find(c => c.id === form.classId)

  function handleClose() { setStep('info'); setCreating(false); onClose() }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (step === 'info') { setStep('rubric'); return }
    if (step === 'rubric') { setStep('confirm'); return }
    // step === 'confirm' → create
    if (!form.classId) { alert(t('lecturer.wizard.select_class_err', 'Vui lòng chọn lớp học.')); setStep('info'); return }
    setCreating(true)
    try {
      const isLocked = form.latePolicyOption === 'NONE_LOCKED'
      const allowLateSubmission = !isLocked
      let latePenaltyType = 'NONE'
      if (form.latePolicyOption === 'DAILY_POINTS') latePenaltyType = 'DAILY_POINTS'
      else if (form.latePolicyOption === 'DAILY_PERCENT') latePenaltyType = 'DAILY_PERCENT'
      else if (form.latePolicyOption === 'FLAT_POINTS') latePenaltyType = 'FLAT_POINTS'

      const isoDue = form.dueDate ? new Date(form.dueDate).toISOString() : undefined
      const status = form.publishImmediately ? 'published' : 'draft'

      await assignmentsApi.createAssignment({
        title: form.title,
        description: form.description,
        subjectId: selectedClass?.subject?.id || '',
        classId: form.classId,
        status,
        sendNotification: form.publishImmediately,
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
      })
      handleClose()
      if (form.publishImmediately) {
        alert(t('lecturer.wizard.create_publish_success', `🎉 Đã tạo và giao bài tập "${form.title}" thành công cho lớp ${selectedClass?.classCode || selectedClass?.code}! Sinh viên đã có thể xem đề và nộp bài.`))
      } else {
        alert(t('lecturer.wizard.create_draft_success', `Đã lưu bài tập "${form.title}" ở trạng thái Bản nháp. Bạn có thể vào Workspace để cấu hình thêm và bấm Giao bài sau.`))
      }
      onSuccess()
    } catch (err: any) {
      alert(err?.message || t('lecturer.wizard.create_err', 'Lỗi khi tạo bài tập.'))
    } finally { setCreating(false) }
  }

  const steps: { id: WizardStep; label: string }[] = [
    { id: 'info', label: t('lecturer.wizard.step_info', 'Thông tin') },
    { id: 'rubric', label: t('lecturer.wizard.step_rubric', 'Cấu hình') },
    { id: 'confirm', label: t('lecturer.wizard.step_confirm', 'Xác nhận') },
  ]
  const stepIdx = steps.findIndex(s => s.id === step)

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={t('lecturer.wizard.title', 'Tạo bài tập mới')} maxWidth="5xl">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-7">
      {/* Step indicator */}
      <div className="flex items-center gap-2 mb-6">
        {steps.map((s, i) => (
          <React.Fragment key={s.id}>
            <div className={`flex items-center gap-2 text-xs font-bold transition-colors ${i <= stepIdx ? 'text-orange-600 dark:text-orange-400' : 'text-slate-400'}`}>
              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-colors ${i < stepIdx ? 'bg-orange-500 border-orange-500 text-white' : i === stepIdx ? 'border-orange-500 text-orange-500' : 'border-slate-300 text-slate-400'}`}>
                {i < stepIdx ? '✓' : i + 1}
              </span>
              {s.label}
            </div>
            {i < steps.length - 1 && <div className={`flex-1 h-0.5 rounded-full transition-colors ${i < stepIdx ? 'bg-orange-500' : 'bg-slate-200 dark:bg-slate-700'}`} />}
          </React.Fragment>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Step 1: Info */}
        {step === 'info' && (
          <>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">{t('lecturer.wizard.assignment_title', 'Tiêu đề bài tập *')}</label>
              <input
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                placeholder={t('lecturer.wizard.title_placeholder', 'VD: Assignment 1 - Xây dựng REST API Spring Boot...')}
                value={form.title}
                onChange={e => setForm({ ...form, title: e.target.value })}
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">{t('lecturer.wizard.class', 'Lớp học *')}</label>
                <select
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                  value={form.classId}
                  onChange={e => setForm({ ...form, classId: e.target.value })}
                  required
                >
                  <option value="">{t('lecturer.wizard.select_class', '-- Chọn lớp --')}</option>
                  {classes.map(c => (
                    <option key={c.id} value={c.id}>{c.classCode || c.code} ({c.subject?.code})</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">{t('lecturer.wizard.due_date', 'Hạn nộp')}</label>
                <input
                  type="datetime-local"
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                  value={form.dueDate}
                  onChange={e => setForm({ ...form, dueDate: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">{t('lecturer.wizard.description', 'Mô tả / Đề bài *')}</label>
              <textarea
                rows={5}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none"
                placeholder={t('lecturer.wizard.desc_placeholder', 'Nhập mô tả bài tập, yêu cầu kỹ thuật, cách nộp bài...')}
                value={form.description}
                onChange={e => setForm({ ...form, description: e.target.value })}
                required
              />
            </div>
          </>
        )}

        {/* Step 2: Strategy + Late Policy */}
        {step === 'rubric' && (
          <>
            <div className="space-y-3">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5"><Zap className="w-3.5 h-3.5 text-blue-500" /> {t('lecturer.wizard.strategy', 'Chiến lược chấm điểm')}</label>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { value: 'CONTINUOUS_QUEUE', label: t('lecturer.wizard.strat_continuous', 'Chấm liên tục'), desc: t('lecturer.wizard.strat_continuous_desc', 'Chấm ngay khi nộp.') },
                  { value: 'BATCH_POST_DEADLINE', label: t('lecturer.wizard.strat_batch', 'Chấm hàng loạt'), desc: t('lecturer.wizard.strat_batch_desc', 'Chấm sau khi hết hạn.') },
                ].map(opt => (
                  <button key={opt.value} type="button" onClick={() => setForm({ ...form, strategy: opt.value })}
                    className={`p-3 rounded-2xl border-2 text-left transition-all ${form.strategy === opt.value ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/20' : 'border-slate-200 dark:border-slate-700'}`}>
                    <p className={`font-bold text-xs ${form.strategy === opt.value ? 'text-blue-700 dark:text-blue-400' : 'text-slate-700 dark:text-slate-300'}`}>{opt.label}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">{opt.desc}</p>
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-3">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5"><Clock className="w-3.5 h-3.5 text-amber-500" /> {t('lecturer.wizard.late_policy', 'Chính sách nộp trễ')}</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {[
                  { value: 'NONE_LOCKED', label: t('lecturer.wizard.late_locked', 'Không chấp nhận') },
                  { value: 'DAILY_POINTS', label: t('lecturer.wizard.late_daily_pts', 'Trừ điểm / ngày') },
                  { value: 'DAILY_PERCENT', label: t('lecturer.wizard.late_daily_pct', 'Trừ % / ngày') },
                  { value: 'FLAT_POINTS', label: t('lecturer.wizard.late_flat', 'Trừ điểm cố định') },
                  { value: 'NONE_FREE', label: t('lecturer.wizard.late_free', 'Không phạt') },
                ].map(opt => (
                  <button key={opt.value} type="button" onClick={() => setForm({ ...form, latePolicyOption: opt.value })}
                    className={`p-2.5 rounded-xl border-2 text-center text-xs font-bold transition-all ${form.latePolicyOption === opt.value ? 'border-amber-500 bg-amber-50/50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400' : 'border-slate-200 dark:border-slate-700 text-slate-500'}`}>
                    {opt.label}
                  </button>
                ))}
              </div>
              {form.latePolicyOption !== 'NONE_LOCKED' && form.latePolicyOption !== 'NONE_FREE' && (
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                      {t('lecturer.wizard.penalty_amount', 'Mức phạt')} {form.latePolicyOption === 'DAILY_PERCENT' ? '(%)' : '(điểm)'}
                    </label>
                    <input
                      type="number" min={0}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                      value={form.latePenaltyValue}
                      onChange={e => setForm({ ...form, latePenaltyValue: Number(e.target.value) || 0 })}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                      {t('lecturer.wizard.max_late_hours', 'Trễ tối đa (giờ)')}
                    </label>
                    <input
                      type="number" min={1}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                      value={form.lateSubmitHours}
                      onChange={e => setForm({ ...form, lateSubmitHours: Number(e.target.value) || 24 })}
                    />
                  </div>
                </div>
              )}
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">{t('lecturer.wizard.max_score', 'Điểm tối đa')}</label>
              <input
                type="number" min={1} max={100}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                value={form.maxScore}
                onChange={e => setForm({ ...form, maxScore: Number(e.target.value) || 10 })}
              />
            </div>
            <div className="p-3 rounded-2xl bg-violet-50 dark:bg-violet-950/20 border border-violet-200 dark:border-violet-900 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-violet-500 shrink-0" />
              <p className="text-xs text-violet-700 dark:text-violet-400">{t('lecturer.wizard.ai_rubric_note', 'AI Rubric Generator sẽ có thể được cấu hình trong Workspace sau khi tạo bài tập.')}</p>
            </div>
          </>
        )}

        {/* Step 3: Confirm */}
        {step === 'confirm' && (
          <div className="space-y-4">
            <div className="p-5 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-3">
              <h4 className="font-bold text-slate-900 dark:text-white text-sm">{t('lecturer.wizard.confirm_info', 'Xác nhận thông tin')}</h4>
              <div className="grid grid-cols-2 gap-y-2 text-xs">
                <span className="text-slate-500">{t('lecturer.wizard.title_label', 'Tiêu đề:')}</span>
                <span className="font-semibold text-slate-900 dark:text-white">{form.title}</span>
                <span className="text-slate-500">{t('lecturer.wizard.class_label', 'Lớp học:')}</span>
                <span className="font-semibold text-slate-900 dark:text-white">{selectedClass?.classCode || selectedClass?.code || '—'} ({selectedClass?.subject?.code})</span>
                <span className="text-slate-500">{t('lecturer.wizard.due_label', 'Hạn nộp:')}</span>
                <span className="font-semibold text-slate-900 dark:text-white">{form.dueDate ? new Date(form.dueDate).toLocaleString() : t('student.assignment.no_limit', 'Không giới hạn')}</span>
                <span className="text-slate-500">{t('lecturer.wizard.max_score_label', 'Điểm tối đa:')}</span>
                <span className="font-semibold text-orange-500">{form.maxScore} {t('student.assignment.points', 'điểm')}</span>
                <span className="text-slate-500">{t('lecturer.wizard.strategy_label', 'Chiến lược:')}</span>
                <span className="font-semibold text-slate-900 dark:text-white">{form.strategy === 'CONTINUOUS_QUEUE' ? t('lecturer.wizard.strat_continuous', 'Chấm liên tục') : t('lecturer.wizard.strat_batch', 'Chấm hàng loạt')}</span>
                <span className="text-slate-500">{t('lecturer.wizard.late_label', 'Nộp trễ:')}</span>
                <span className="font-semibold text-slate-900 dark:text-white">{form.latePolicyOption === 'NONE_LOCKED' ? t('lecturer.wizard.late_locked', 'Không chấp nhận') : form.latePolicyOption === 'DAILY_POINTS' ? t('lecturer.wizard.late_flat', 'Trừ điểm cố định') : form.latePolicyOption === 'DAILY_PERCENT' ? t('lecturer.wizard.late_daily_pct', 'Trừ theo %') : t('lecturer.wizard.late_free', 'Cho phép')}</span>
              </div>
            </div>
            {/* Status selection */}
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 space-y-3">
              <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <Send className="w-4 h-4 text-orange-500" />
                {t('lecturer.wizard.publish_mode_label', 'Chế độ giao bài')}
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setForm({ ...form, publishImmediately: true })}
                  className={`p-3.5 rounded-2xl border-2 text-left transition-all flex flex-col justify-between ${
                    form.publishImmediately
                      ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20 shadow-xs'
                      : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      {t('lecturer.wizard.publish_now', 'Giao bài ngay (Khuyên dùng)')}
                    </span>
                    <Badge variant="success" className="text-[10px]">{t('lecturer.workspace.status_published', 'Đã giao')}</Badge>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
                    {t('lecturer.wizard.publish_now_desc', 'Sinh viên trong lớp sẽ nhìn thấy bài tập ngay lập tức và nhận được thông báo.')}
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setForm({ ...form, publishImmediately: false })}
                  className={`p-3.5 rounded-2xl border-2 text-left transition-all flex flex-col justify-between ${
                    !form.publishImmediately
                      ? 'border-amber-500 bg-amber-50/50 dark:bg-amber-950/20 shadow-xs'
                      : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
                      <Clock className="w-4 h-4 text-amber-500" />
                      {t('lecturer.wizard.save_draft', 'Lưu bản nháp')}
                    </span>
                    <Badge variant="default" className="text-[10px]">{t('lecturer.workspace.status_draft', 'Bản nháp')}</Badge>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
                    {t('lecturer.wizard.save_draft_desc', 'Chỉ giảng viên thấy đề bài. Sinh viên chưa nhìn thấy cho tới khi bấm Giao bài trong Workspace.')}
                  </p>
                </button>
              </div>
            </div>

            {form.publishImmediately ? (
              <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900 flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div className="text-xs text-emerald-800 dark:text-emerald-300 space-y-0.5">
                  <p className="font-bold">{t('lecturer.wizard.notice_publish_title', 'Sinh viên sẽ thấy bài tập ngay:')}</p>
                  <p className="text-[11px] opacity-90 leading-relaxed">
                    {t('lecturer.wizard.notice_publish_desc', 'Bài tập sẽ được công bố trực tiếp cho sinh viên lớp đã chọn. Sinh viên có thể vào môn học để xem đề bài và nộp bài.')}
                  </p>
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                <div className="text-xs text-amber-800 dark:text-amber-300 space-y-0.5">
                  <p className="font-bold">{t('lecturer.wizard.notice_draft_title', 'Chế độ Bản nháp:')}</p>
                  <p className="text-[11px] opacity-90 leading-relaxed">
                    {t('lecturer.wizard.draft_notice', 'Bài tập sẽ được tạo ở trạng thái Bản nháp. Sinh viên tạm thời chưa nhìn thấy cho đến khi bạn bấm Giao bài trong Workspace.')}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="flex items-center justify-between pt-3 border-t border-slate-200 dark:border-slate-800">
          <div>
            {step !== 'info' && (
              <Button type="button" variant="ghost" size="sm" onClick={() => setStep(step === 'confirm' ? 'rubric' : 'info')}>
                {t('lecturer.wizard.back_btn', '← Quay lại')}
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="outline" size="sm" onClick={handleClose}>{t('ui.cancel', 'Hủy')}</Button>
            <Button type="submit" variant="primary" size="sm" isLoading={creating} className="gap-1.5">
              {step === 'confirm' ? t('lecturer.wizard.create_btn', 'Tạo bài tập') : t('lecturer.wizard.next_btn', 'Tiếp theo →')}
            </Button>
          </div>
        </div>
      </form>
        </div>

        {/* Right column: Live Assignment Card Preview */}
        <div className="lg:col-span-5 sticky top-2 space-y-3">
          <div className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
            <Eye className="w-3.5 h-3.5 text-orange-500" />
            Xem trước bài tập (Live Preview)
          </div>

          <div className="rounded-2xl border-2 border-dashed border-orange-200 dark:border-orange-900/40 p-4 bg-orange-50/20 dark:bg-slate-900/40 flex flex-col justify-between">
            <div className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm border border-slate-200 dark:border-slate-700 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="w-8 h-8 rounded-lg bg-orange-50 dark:bg-orange-950/30 flex items-center justify-center text-orange-600 dark:text-orange-400">
                    <BookOpen className="w-4 h-4" />
                  </span>
                  <div>
                    <p className="text-xs font-bold text-slate-900 dark:text-white">
                      {selectedClass ? `${selectedClass.classCode || selectedClass.code} (${selectedClass.subject?.code || ''})` : 'Chưa chọn lớp'}
                    </p>
                    <p className="text-[10px] text-slate-400">
                      {selectedClass?.subject?.name || 'Môn học liên kết'}
                    </p>
                  </div>
                </div>
                <Badge variant={form.publishImmediately ? 'success' : 'default'} className="text-[10px]">
                  {form.publishImmediately ? 'Đã giao' : 'Bản nháp'}
                </Badge>
              </div>

              <div>
                <h4 className="font-bold text-sm text-slate-900 dark:text-white line-clamp-2">
                  {form.title || 'Tiêu đề bài tập sẽ hiển thị ở đây...'}
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-3">
                  {form.description || 'Nội dung mô tả yêu cầu bài tập và hướng dẫn nộp bài...'}
                </p>
              </div>

              <div className="pt-2 border-t border-slate-100 dark:border-slate-700/60 grid grid-cols-2 gap-2 text-[11px]">
                <div>
                  <span className="text-slate-400 block text-[10px]">Hạn nộp bài</span>
                  <span className="font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1 mt-0.5">
                    <Calendar className="w-3 h-3 text-orange-500" />
                    {form.dueDate ? new Date(form.dueDate).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' }) : 'Không giới hạn'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Điểm tối đa</span>
                  <span className="font-bold text-orange-600 dark:text-orange-400 flex items-center gap-1 mt-0.5">
                    <Zap className="w-3 h-3" />
                    {form.maxScore || 10} điểm
                  </span>
                </div>
              </div>

              <div className="rounded-lg bg-slate-50 dark:bg-slate-750 p-2 text-[10px] space-y-1 text-slate-500 dark:text-slate-400">
                <div className="flex justify-between">
                  <span>Chiến lược chấm:</span>
                  <span className="font-semibold text-slate-700 dark:text-slate-300">
                    {form.strategy === 'CONTINUOUS_QUEUE' ? 'Chấm liên tục' : 'Chấm hàng loạt'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Chính sách nộp trễ:</span>
                  <span className="font-semibold text-slate-700 dark:text-slate-300">
                    {form.latePolicyOption === 'NONE_LOCKED' ? 'Khóa nộp' : form.latePolicyOption === 'NONE_FREE' ? 'Miễn phạt' : `Phạt ${form.latePenaltyValue} (${form.lateSubmitHours}h)`}
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-3 text-[11px] text-center text-slate-400 flex items-center justify-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-orange-500" />
              <span>Xem trước giao diện thẻ bài tập sinh viên nhìn thấy</span>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  )
}

// ─── Main Page ───────────────────────────────────────────────────────────────
export default function LecturerAssignmentsPage({ defaultCreate = false }: { defaultCreate?: boolean }) {
  const searchParams = useSearchParams()
  const filterClassId = searchParams?.get('classId') ?? null

  const [assignments, setAssignments] = React.useState<any[]>([])
  const [trashAssignments, setTrashAssignments] = React.useState<any[]>([])
  const [classes, setClasses] = React.useState<any[]>([])
  const [loading, setLoading] = React.useState(true)
  const [loadError, setLoadError] = React.useState<string | null>(null)
  const [search, setSearch] = React.useState('')
  const [viewMode, setViewMode] = React.useState<ViewMode>('active')
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set())
  const { t } = useLanguage()

  const [createModal, setCreateModal] = React.useState(
    defaultCreate || searchParams?.get('create') === 'true' || searchParams?.get('upload') === 'true'
  )

  const loadAssignments = React.useCallback(async () => {
    try {
      const [assigns, cls] = await Promise.all([
        assignmentsApi.getAssignments(),
        classesApi.getClasses(1, 1000),
      ])
      setAssignments(assigns || [])
      setClasses(cls || [])
      setLoadError(null)
    } catch (err) {
      setLoadError(errorMessage(err))
    } finally { setLoading(false) }
  }, [])

  const loadTrash = React.useCallback(async () => {
    try {
      const trash = await assignmentsApi.getTrashAssignments()
      setTrashAssignments(trash || [])
    } catch {
      setTrashAssignments([])
    }
  }, [])

  React.useEffect(() => {
    loadAssignments()
    loadTrash()
  }, [loadAssignments, loadTrash])

  async function softDelete(id: string) {
    if (!confirm(t('lecturer.assignments.confirm_trash', 'Chuyển bài tập này vào thùng rác?'))) return
    try {
      await assignmentsApi.deleteAssignment(id)
      await loadAssignments()
      await loadTrash()
    } catch (err: any) { alert(err?.message || t('admin.classes.delete_error', 'Lỗi khi xóa bài tập.')) }
  }

  async function restore(id: string) {
    try {
      await assignmentsApi.restoreAssignment(id)
      await loadTrash()
      await loadAssignments()
    } catch (err: any) { alert(err?.message || t('lecturer.assignments.restore_error', 'Lỗi khi khôi phục bài tập.')) }
  }

  async function hardDelete(id: string) {
    if (!confirm(t('lecturer.assignments.confirm_hard_delete', 'Bạn có chắc chắn muốn xóa vĩnh viễn bài tập này? Thao tác này không thể hoàn tác!'))) return
    try {
      await assignmentsApi.hardDeleteAssignment(id)
      await loadTrash()
    } catch (err: any) { alert(err?.message || t('lecturer.assignments.hard_delete_error', 'Lỗi khi xóa vĩnh viễn.')) }
  }

  async function bulkDelete() {
    if (selectedIds.size === 0) return
    if (!confirm(t('lecturer.assignments.confirm_bulk_trash', `Chuyển ${selectedIds.size} bài tập vào thùng rác?`, { count: selectedIds.size }))) return
    try {
      await Promise.all([...selectedIds].map(id => assignmentsApi.deleteAssignment(id)))
      setSelectedIds(new Set())
      await loadAssignments()
      await loadTrash()
    } catch (err: any) {
      alert(err?.message || t('admin.classes.delete_error', 'Có lỗi khi xóa bài tập.'))
      await loadAssignments()
      await loadTrash()
    }
  }

  async function bulkRestore() {
    if (selectedIds.size === 0) return
    try {
      await assignmentsApi.bulkRestoreAssignments([...selectedIds])
      setSelectedIds(new Set())
      await loadTrash()
      await loadAssignments()
    } catch (err: any) { alert(err?.message || t('lecturer.assignments.restore_error', 'Lỗi khi khôi phục hàng loạt.')) }
  }

  async function bulkHardDelete() {
    if (selectedIds.size === 0) return
    if (!confirm(t('lecturer.assignments.confirm_bulk_hard_delete', `Xóa vĩnh viễn ${selectedIds.size} bài tập đã chọn? Dữ liệu không thể khôi phục!`, { count: selectedIds.size }))) return
    try {
      await assignmentsApi.bulkHardDeleteAssignments([...selectedIds])
      setSelectedIds(new Set())
      await loadTrash()
    } catch (err: any) { alert(err?.message || t('lecturer.assignments.hard_delete_error', 'Lỗi khi xóa vĩnh viễn hàng loạt.')) }
  }

  function toggleSelect(id: string) {
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
              <span className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">{trashCount}</span>
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
                onClick={() => { setViewMode('trash'); setSelectedIds(new Set()); void loadTrash(); }}
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
              <Button variant="danger" size="sm" onClick={bulkDelete} className="gap-1.5 text-xs rounded-2xl h-10 px-4">
                <Trash2 className="w-3.5 h-3.5" /> {t('ui.delete', 'Xóa')} ({selectedIds.size})
              </Button>
            )}
            {selectedIds.size > 0 && viewMode === 'trash' && (
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={bulkRestore} className="gap-1.5 text-xs text-emerald-600 border-emerald-300 hover:bg-emerald-50 rounded-2xl h-10 px-4">
                  <RotateCcw className="w-3.5 h-3.5" /> {t('lecturer.assignments.restore', 'Khôi phục')} ({selectedIds.size})
                </Button>
                <Button variant="danger" size="sm" onClick={bulkHardDelete} className="gap-1.5 text-xs rounded-2xl h-10 px-4">
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
        {loading ? (
          <div className="p-12 text-center text-sm text-slate-400">{t('lecturer.assignments.loading', 'Đang tải bài tập...')}</div>
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
                          onClick={() => softDelete(assign.id)}
                          className="p-2 rounded-xl text-slate-300 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors"
                          title={t('lecturer.assignments.delete_tooltip', 'Xóa vào thùng rác')}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </>
                    ) : (
                      <div className="flex items-center justify-between w-full gap-2">
                        <Button variant="outline" size="sm" onClick={() => restore(assign.id)} className="text-xs gap-1.5 flex-1 text-emerald-600 border-emerald-300 hover:bg-emerald-50">
                          <RotateCcw className="w-3.5 h-3.5" /> {t('lecturer.assignments.restore', 'Khôi phục')}
                        </Button>
                        <Button variant="danger" size="sm" onClick={() => hardDelete(assign.id)} className="text-xs gap-1.5 flex-1">
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
      <CreateWizard
        isOpen={createModal}
        onClose={() => setCreateModal(false)}
        classes={classes}
        onSuccess={() => { setLoading(true); loadAssignments() }}
      />
    </DashboardLayout>
  )
}
