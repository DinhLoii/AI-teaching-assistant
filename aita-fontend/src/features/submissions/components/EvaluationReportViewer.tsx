'use client'

import * as React from 'react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Award,
  Sparkles,
  FileCode,
  ChevronDown,
  ChevronUp,
  Clock,
  Terminal,
  ExternalLink,
  Bot,
  Lightbulb,
  Check,
  X,
  ArrowRight,
  FileArchive,
  Activity,
  Server,
  Database,
  Table,
  Cpu,
  Edit2,
  Save,
  RotateCcw,
} from 'lucide-react'
import { useLanguage } from '@/providers/language-provider'

// ──────────────────────────────────────────────────────────────────────────────
// Evidence Sub-Components: HTTP Timeline, SQL Testcases, I/O Tests, Code Snippet
// ──────────────────────────────────────────────────────────────────────────────

export function HttpTimelineViewer({ steps }: { steps: any[] }) {
  const [expanded, setExpanded] = React.useState<Record<number, boolean>>({})

  if (!steps || steps.length === 0) return null

  const toggle = (idx: number) => {
    setExpanded(prev => ({ ...prev, [idx]: !prev[idx] }))
  }

  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-900/90 text-slate-100 p-4 space-y-3">
      <div className="flex items-center justify-between pb-2 border-b border-slate-800">
        <div className="flex items-center gap-2 text-xs font-bold text-blue-400">
          <Activity className="w-4 h-4 text-blue-400" />
          <span>HTTP API Probe Timeline ({steps.length} requests)</span>
        </div>
        <span className="text-[11px] font-mono text-slate-400">
          Passed: {steps.filter(s => s.status >= 200 && s.status < 300).length} / {steps.length}
        </span>
      </div>

      <div className="space-y-2.5">
        {steps.map((step, idx) => {
          const isSuccess = step.status >= 200 && step.status < 300
          const isExp = !!expanded[idx]
          const method = String(step.method || 'GET').toUpperCase()

          const methodBadge =
            method === 'GET' ? 'bg-blue-500/20 text-blue-300 border-blue-500/30' :
            method === 'POST' ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' :
            method === 'PUT' ? 'bg-amber-500/20 text-amber-300 border-amber-500/30' :
            method === 'DELETE' ? 'bg-rose-500/20 text-rose-300 border-rose-500/30' :
            'bg-slate-500/20 text-slate-300 border-slate-500/30'

          return (
            <div key={idx} className="rounded-xl border border-slate-800 bg-slate-950/60 p-3 space-y-2">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2 min-w-0">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${methodBadge}`}>
                    {method}
                  </span>
                  <span className="font-mono text-xs text-slate-200 truncate max-w-xs md:max-w-md" title={step.url}>
                    {step.url}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 rounded text-xs font-mono font-bold border ${
                    isSuccess
                      ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                      : 'bg-rose-500/20 text-rose-400 border-rose-500/30'
                  }`}>
                    {step.status || 500}
                  </span>
                  <button
                    onClick={() => toggle(idx)}
                    className="text-xs text-slate-400 hover:text-slate-200 p-1"
                  >
                    {isExp ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              {/* Expand details: Assertions & Body */}
              {isExp && (
                <div className="pt-2 border-t border-slate-800/80 space-y-2 text-xs font-mono">
                  {step.assertions && step.assertions.length > 0 && (
                    <div className="space-y-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">JSON Assertions:</span>
                      {step.assertions.map((a: any, aIdx: number) => (
                        <div
                          key={aIdx}
                          className={`p-2 rounded border text-[11px] flex items-start gap-1.5 ${
                            a.passed
                              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
                              : 'bg-rose-500/10 border-rose-500/20 text-rose-300'
                          }`}
                        >
                          <span className="shrink-0">{a.passed ? '✓' : '✗'}</span>
                          <div className="min-w-0">
                            <div>{a.assertion || a.name || 'Assertion'}</div>
                            {!a.passed && a.actual !== undefined && (
                              <div className="text-[10px] text-slate-400 mt-0.5">
                                Actual: {JSON.stringify(a.actual)}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {step.responseBody && (
                    <div className="space-y-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Response Payload:</span>
                      <pre className="p-2.5 rounded bg-slate-900 border border-slate-800 text-[11px] text-slate-300 max-h-36 overflow-auto">
                        {typeof step.responseBody === 'string' ? step.responseBody : JSON.stringify(step.responseBody, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export function SqlTestCaseViewer({ testCases }: { testCases: any[] }) {
  const [expanded, setExpanded] = React.useState<Record<number, boolean>>({})

  if (!testCases || testCases.length === 0) return null

  const toggle = (idx: number) => {
    setExpanded(prev => ({ ...prev, [idx]: !prev[idx] }))
  }

  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-900/90 text-slate-100 p-4 space-y-3">
      <div className="flex items-center justify-between pb-2 border-b border-slate-800">
        <div className="flex items-center gap-2 text-xs font-bold text-emerald-400">
          <Database className="w-4 h-4 text-emerald-400" />
          <span>SQL Sandbox Execution Evidence ({testCases.length} cases)</span>
        </div>
        <span className="text-[11px] font-mono text-slate-400">
          Passed: {testCases.filter(c => c.passed).length} / {testCases.length}
        </span>
      </div>

      <div className="space-y-2.5">
        {testCases.map((tc, idx) => {
          const isExp = !!expanded[idx]
          const isPass = tc.passed === true

          return (
            <div
              key={idx}
              className={`rounded-xl border p-3 space-y-2 ${
                isPass
                  ? 'border-emerald-500/20 bg-emerald-950/20'
                  : 'border-rose-500/20 bg-rose-950/20'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className={`w-5 h-5 rounded flex items-center justify-center text-xs font-bold ${
                    isPass ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'
                  }`}>
                    {isPass ? '✓' : '✗'}
                  </span>
                  <span className="font-semibold text-xs text-slate-200 truncate">
                    {tc.title || tc.caseId || `SQL Query #${idx + 1}`}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                    isPass ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'
                  }`}>
                    {isPass ? 'PASSED' : 'FAILED'}
                  </span>
                  <button
                    onClick={() => toggle(idx)}
                    className="text-xs text-slate-400 hover:text-slate-200 p-1"
                  >
                    {isExp ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              {/* Query Diff / Error preview */}
              {tc.diffSummary && (
                <p className="text-xs text-amber-300/90 font-mono">
                  {tc.diffSummary}
                </p>
              )}
              {tc.errorMessage && (
                <p className="text-xs text-rose-300 font-mono bg-rose-950/40 p-2 rounded border border-rose-900/50">
                  {tc.errorMessage}
                </p>
              )}

              {/* Table comparisons when expanded */}
              {isExp && (
                <div className="pt-2 border-t border-slate-800 space-y-3 text-xs">
                  {tc.actualColumns && tc.actualRows && (
                    <div className="space-y-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                        <Table className="w-3 h-3 text-emerald-400" />
                        Student Actual Output ({tc.actualRows.length} rows):
                      </span>
                      <div className="overflow-x-auto rounded border border-slate-800 bg-slate-950">
                        <table className="w-full text-left font-mono text-[11px]">
                          <thead className="bg-slate-900 border-b border-slate-800 text-slate-400">
                            <tr>
                              {tc.actualColumns.map((col: string, cIdx: number) => (
                                <th key={cIdx} className="p-1.5 px-2 font-bold">{col}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-800/60 text-slate-300">
                            {tc.actualRows.slice(0, 5).map((row: any[], rIdx: number) => (
                              <tr key={rIdx}>
                                {row.map((cell: any, cIdx: number) => (
                                  <td key={cIdx} className="p-1.5 px-2">{String(cell)}</td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        {tc.actualRows.length > 5 && (
                          <div className="p-1 text-center text-[10px] text-slate-500 bg-slate-900">
                            ... and {tc.actualRows.length - 5} more rows
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {tc.expectedColumns && tc.expectedRows && (
                    <div className="space-y-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                        <Table className="w-3 h-3 text-blue-400" />
                        Expected Key Output ({tc.expectedRows.length} rows):
                      </span>
                      <div className="overflow-x-auto rounded border border-slate-800 bg-slate-950">
                        <table className="w-full text-left font-mono text-[11px]">
                          <thead className="bg-slate-900 border-b border-slate-800 text-slate-400">
                            <tr>
                              {tc.expectedColumns.map((col: string, cIdx: number) => (
                                <th key={cIdx} className="p-1.5 px-2 font-bold">{col}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-800/60 text-slate-300">
                            {tc.expectedRows.slice(0, 5).map((row: any[], rIdx: number) => (
                              <tr key={rIdx}>
                                {row.map((cell: any, cIdx: number) => (
                                  <td key={cIdx} className="p-1.5 px-2">{String(cell)}</td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export function IoTestCaseViewer({ testCases }: { testCases: any[] }) {
  if (!testCases || testCases.length === 0) return null

  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-900/90 text-slate-100 p-4 space-y-3">
      <div className="flex items-center justify-between pb-2 border-b border-slate-800">
        <div className="flex items-center gap-2 text-xs font-bold text-purple-400">
          <Cpu className="w-4 h-4 text-purple-400" />
          <span>I/O Unit Test Cases ({testCases.length})</span>
        </div>
        <span className="text-[11px] font-mono text-slate-400">
          Passed: {testCases.filter(c => c.passed).length} / {testCases.length}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {testCases.map((tc, idx) => {
          const isPass = tc.passed === true
          return (
            <div
              key={idx}
              className={`p-3 rounded-xl border text-xs font-mono space-y-2 ${
                isPass
                  ? 'border-emerald-500/20 bg-emerald-950/20 text-emerald-300'
                  : 'border-rose-500/20 bg-rose-950/20 text-rose-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-bold flex items-center gap-1.5">
                  <span>{isPass ? '✓' : '✗'}</span>
                  <span>{tc.name || `Case #${idx + 1}`}</span>
                </span>
                {tc.runtimeMs && <span className="text-[10px] text-slate-400">{tc.runtimeMs}ms</span>}
              </div>
              {tc.input && (
                <div>
                  <span className="text-[10px] text-slate-400 block">Input:</span>
                  <pre className="bg-slate-950 p-1.5 rounded border border-slate-800 text-[11px] text-slate-300 overflow-x-auto">
                    {tc.input}
                  </pre>
                </div>
              )}
              {tc.actualOutput && (
                <div>
                  <span className="text-[10px] text-slate-400 block">Output:</span>
                  <pre className="bg-slate-950 p-1.5 rounded border border-slate-800 text-[11px] text-slate-300 overflow-x-auto">
                    {tc.actualOutput}
                  </pre>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ──────────────────────────────────────────────────────────────────────────────
// Main Evaluation Report Viewer
// ──────────────────────────────────────────────────────────────────────────────

interface EvaluationReportViewerProps {
  submission: any
  onResubmit?: () => void
  onGetHint?: (ruleId: string, ruleTitle: string) => void
  isLecturer?: boolean
  onUpdateRuleScore?: (updatedRuleScores: any[], newTotalScore: number) => void
}

export function EvaluationReportViewer({
  submission,
  onResubmit,
  onGetHint,
  isLecturer = false,
  onUpdateRuleScore,
}: EvaluationReportViewerProps) {
  const [activeTab, setActiveTab] = React.useState<'rubric' | 'evidence' | 'feedback'>('rubric')
  const [expandedRules, setExpandedRules] = React.useState<Record<string, boolean>>({})
  const { t } = useLanguage()

  const reportData = submission?.reportData || (typeof submission?.ReportData === 'string' ? JSON.parse(submission.ReportData) : submission?.ReportData) || null
  const initialScore = Number(submission?.score ?? submission?.finalScore ?? submission?.totalScore ?? reportData?.totalScore ?? 0)
  const maxScore = Number(reportData?.maxPossibleScore ?? 10)
  const isPassed = initialScore >= 5.0

  const passedRules = (reportData?.passedRules || []).map((r: any) => ({ ...r, passed: true }))
  const failedRules = (reportData?.failedRules || []).map((r: any) => ({ ...r, passed: false }))

  const ruleScores = submission?.ruleScores || []
  const mappedRuleScores = ruleScores.map((r: any) => ({
    ruleId: r.id || r.ruleId,
    title: r.ruleName || r.name || r.title,
    description: r.description,
    weight: r.maxScore || 3,
    earnedScore: r.score ?? 0,
    passed: (r.passed !== undefined ? r.passed : (r.score > 0)),
    details: r.explanation || r.feedback,
    evidence: r.evidence
  }))

  const rawEvaluations = (passedRules.length > 0 || failedRules.length > 0)
    ? [...passedRules, ...failedRules]
    : mappedRuleScores

  // Editable rule scores for lecturer
  const [editableEvaluations, setEditableEvaluations] = React.useState<any[]>(rawEvaluations)
  const [hasEdits, setHasEdits] = React.useState(false)

  React.useEffect(() => {
    setEditableEvaluations(rawEvaluations)
    setHasEdits(false)
  }, [submission])

  // Aggregate evidences across report level AND individual rule level
  const ruleEvidences = [...(reportData?.passedRules || []), ...(reportData?.failedRules || []), ...(submission?.ruleScores || [])]
    .map((r: any) => r?.evidence)
    .filter(Boolean)

  const allHttpSteps = [
    ...(reportData?.httpSteps || reportData?.probeSteps || []),
    ...ruleEvidences.flatMap((e: any) => e?.httpSteps || e?.probeSteps || [])
  ]
  const allSqlCases = [
    ...(reportData?.sqlTestCases || []),
    ...ruleEvidences.flatMap((e: any) => e?.sqlTestCases || [])
  ]
  const allIoCases = [
    ...(reportData?.ioTestCases || []),
    ...ruleEvidences.flatMap((e: any) => e?.ioTestCases || [])
  ]
  const allImages = [
    ...(reportData?.extractedImages || reportData?.screenshots || []),
    ...ruleEvidences.flatMap((e: any) => e?.extractedImages || e?.screenshots || (e?.screenshotBase64 ? [{ src: e.screenshotBase64, title: 'Ảnh chụp màn hình' }] : []))
  ]

  // Check evidence availability
  const hasEvidence = allHttpSteps.length > 0 || allSqlCases.length > 0 || allIoCases.length > 0 || allImages.length > 0

  const toggleRule = (ruleId: string) => {
    setExpandedRules(prev => ({
      ...prev,
      [ruleId]: !prev[ruleId]
    }))
  }

  React.useEffect(() => {
    const initial: Record<string, boolean> = {}
    failedRules.forEach((r: any) => {
      if (r.ruleId) initial[r.ruleId] = true
    })
    setExpandedRules(initial)
  }, [reportData])

  const handleScoreChange = (ruleId: string, val: number) => {
    setEditableEvaluations(prev =>
      prev.map(r => {
        if (r.ruleId === ruleId) {
          const earned = Math.max(0, Math.min(Number(r.weight || 10), val))
          return { ...r, earnedScore: earned, passed: earned > 0 }
        }
        return r
      })
    )
    setHasEdits(true)
  }

  const handleReasonChange = (ruleId: string, text: string) => {
    setEditableEvaluations(prev =>
      prev.map(r => {
        if (r.ruleId === ruleId) {
          return { ...r, lecturerNote: text }
        }
        return r
      })
    )
    setHasEdits(true)
  }

  const handleSaveEdits = () => {
    if (!onUpdateRuleScore) return
    const newTotal = editableEvaluations.reduce((sum, r) => sum + Number(r.earnedScore || 0), 0)
    onUpdateRuleScore(editableEvaluations, Math.min(maxScore, newTotal))
    setHasEdits(false)
  }

  return (
    <div className="space-y-6 animate-in fade-in-50 duration-500">
      {/* 1. Score Summary Banner */}
      <div className="relative overflow-hidden rounded-3xl p-6 md:p-8 bg-gradient-to-br from-slate-900 via-slate-950 to-orange-950/40 border border-slate-800 text-white shadow-2xl">
        <div className="absolute top-0 right-0 -mt-12 -mr-12 w-64 h-64 bg-orange-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-3 flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-bold whitespace-nowrap shadow-sm">
                <Sparkles className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                {t('student.assignment.analyzed_by_ai', 'Đã phân tích & chấm điểm bởi Rubric AI Engine')}
              </span>
              <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-slate-800/90 text-slate-300 text-xs font-mono whitespace-nowrap border border-slate-700/50">
                {t('student.assignment.attempt', 'Attempt')} #{submission?.attemptNumber || 1}
              </span>
              {submission?.isPublished && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-bold border border-emerald-500/30">
                  <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                  Đã công bố
                </span>
              )}
            </div>
            <h3 className="text-xl md:text-2xl lg:text-3xl font-black tracking-tight text-white flex items-center gap-2">
              {t('student.assignment.detailed_result', 'Kết quả đánh giá bài làm chi tiết')}
            </h3>
            <p className="text-xs md:text-sm text-slate-300/90 max-w-2xl leading-relaxed">
              {t('student.assignment.detailed_result_desc', 'Hệ thống đã phân tích toàn bộ mã nguồn, cấu trúc các lớp (MVC/Clean Architecture), kiểm tra cơ sở dữ liệu và đánh giá từng tiêu chí kỹ thuật.')}
            </p>
            {onResubmit && (
              <div className="pt-1">
                <Button
                  onClick={onResubmit}
                  variant="outline"
                  size="sm"
                  className="bg-white/10 hover:bg-white/20 border-white/20 text-white text-xs gap-2"
                >
                  <FileArchive className="w-3.5 h-3.5 text-orange-400" />
                  <span>{t('student.assignment.resubmit_improve', 'Nộp lại bài tập để cải thiện điểm số')}</span>
                </Button>
              </div>
            )}
          </div>

          {/* Big Score Card */}
          <div className="flex items-center gap-5 bg-slate-900/90 backdrop-blur-md p-5 md:p-6 rounded-2xl border border-slate-800 shrink-0 shadow-xl">
            <div className="text-center pr-5 border-r border-slate-800">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                {t('student.assignment.total_ai_score', 'Tổng Điểm')}
              </span>
              <div className="text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-orange-400 via-amber-300 to-emerald-400 font-mono tracking-tight">
                {Number(initialScore).toFixed(1)}
                <span className="text-sm font-medium text-slate-500">/{maxScore}</span>
              </div>
            </div>
            <div className="space-y-1.5 text-xs">
              <div className="flex items-center gap-1.5">
                <span className="text-slate-400">{t('student.assignment.status', 'Trạng thái')}:</span>
                <span className={`font-bold px-2 py-0.5 rounded text-[11px] ${
                  isPassed
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                }`}>
                  {isPassed ? t('student.assignment.passed', 'Đạt yêu cầu') : t('student.assignment.failed', 'Chưa đạt (Cần sửa)')}
                </span>
              </div>
              <div className="text-slate-400 text-[11px]">
                {t('student.assignment.criteria_passed', 'Tiêu chí đạt')}: <strong className="text-emerald-400">{passedRules.length}</strong> / {editableEvaluations.length || 3}
              </div>
              <div className="text-slate-400 text-[11px]">
                {t('student.assignment.criteria_failed', 'Tiêu chí cần sửa')}: <strong className="text-amber-400">{failedRules.length}</strong>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Navigation Tabs */}
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('rubric')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'rubric'
                ? 'bg-orange-500 text-white shadow-md shadow-orange-500/20'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Award className="w-4 h-4" />
            <span>Barem Rubric ({editableEvaluations.length})</span>
          </button>

          {hasEvidence && (
            <button
              onClick={() => setActiveTab('evidence')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'evidence'
                  ? 'bg-orange-500 text-white shadow-md shadow-orange-500/20'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <Activity className="w-4 h-4" />
              <span>Bằng chứng kiểm thử (HTTP / SQL / I/O)</span>
            </button>
          )}

          <button
            onClick={() => setActiveTab('feedback')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'feedback'
                ? 'bg-orange-500 text-white shadow-md shadow-orange-500/20'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Bot className="w-4 h-4" />
            <span>Nhận xét Tech Lead AI</span>
          </button>
        </div>

        {isLecturer && hasEdits && onUpdateRuleScore && (
          <Button
            variant="primary"
            size="sm"
            onClick={handleSaveEdits}
            className="text-xs gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Lưu thay đổi điểm Barem</span>
          </Button>
        )}
      </div>

      {/* 3. Tab: Barem Rubric */}
      {activeTab === 'rubric' && (
        <div className="space-y-4">
          {editableEvaluations.length > 0 ? (
            editableEvaluations.map((evalRule: any, idx: number) => {
              const ruleId = evalRule.ruleId || `REQ-0${idx + 1}`
              const isPass = evalRule.passed === true
              const earned = Number(evalRule.earnedScore ?? (isPass ? evalRule.weight : 0))
              const weight = Number(evalRule.weight ?? 0)
              const isExpanded = !!expandedRules[ruleId]
              const snippets = evalRule.evidence?.snippets || (evalRule.evidence?.codeSnippet ? [evalRule.evidence] : [])

              return (
                <div
                  key={ruleId}
                  className={`rounded-2xl border transition-all overflow-hidden ${
                    isPass
                      ? 'border-emerald-200 dark:border-emerald-500/20 bg-emerald-50/30 dark:bg-emerald-950/10'
                      : 'border-amber-200 dark:border-amber-500/20 bg-amber-50/30 dark:bg-amber-950/10'
                  }`}
                >
                  {/* Header Row */}
                  <div
                    onClick={() => toggleRule(ruleId)}
                    className="p-4 md:p-5 flex items-start md:items-center justify-between gap-4 cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 transition-colors select-none"
                  >
                    <div className="flex items-start md:items-center gap-3.5 flex-1 min-w-0">
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 font-bold ${
                        isPass
                          ? 'bg-emerald-500 text-white shadow-sm'
                          : 'bg-amber-500 text-white shadow-sm'
                      }`}>
                        {isPass ? <Check className="w-4 h-4 stroke-[3]" /> : <X className="w-4 h-4 stroke-[3]" />}
                      </div>

                      <div className="space-y-0.5 flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono text-xs font-bold text-slate-500 dark:text-slate-400">
                            {ruleId}
                          </span>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase ${
                            isPass
                              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300'
                              : 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300'
                          }`}>
                            {isPass ? t('student.assignment.criteria_ok', 'ĐẠT TIÊU CHÍ') : t('student.assignment.criteria_ng', 'CHƯA ĐẠT (CẦN SỬA)')}
                          </span>
                        </div>
                        <h4 className="font-bold text-sm md:text-base text-slate-900 dark:text-white truncate">
                          {typeof evalRule.title === 'string'
                            ? evalRule.title
                            : (typeof evalRule.description === 'string'
                              ? evalRule.description
                              : (typeof evalRule.description?.description === 'string'
                                ? evalRule.description.description
                                : ruleId))}
                        </h4>
                        {evalRule.reason && (
                          <p className="text-xs text-amber-600 dark:text-amber-400 font-medium">
                            Lý do: {evalRule.reason}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Score & Toggle */}
                    <div className="flex items-center gap-3 shrink-0" onClick={e => isLecturer && e.stopPropagation()}>
                      {isLecturer ? (
                        <div className="flex items-center gap-1.5 bg-white dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-800">
                          <input
                            type="number"
                            step="0.25"
                            min="0"
                            max={weight}
                            value={earned}
                            onChange={(e) => handleScoreChange(ruleId, parseFloat(e.target.value) || 0)}
                            className="w-16 px-2 py-1 text-center font-mono font-bold text-sm rounded bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:border-orange-500"
                          />
                          <span className="text-xs text-slate-400 font-normal pr-2">/ {weight} đ</span>
                        </div>
                      ) : (
                        <div className="text-right">
                          <div className={`font-mono text-sm md:text-base font-extrabold ${
                            isPass ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'
                          }`}>
                            +{earned.toFixed(2)}
                            <span className="text-xs text-slate-400 font-normal"> / {weight.toFixed(1)} {t('student.assignment.points', 'điểm')}</span>
                          </div>
                        </div>
                      )}
                      <div className="w-6 h-6 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500">
                        {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      </div>
                    </div>
                  </div>

                  {/* Accordion Body: Details & Evidence Code */}
                  {isExpanded && (
                    <div className="px-5 pb-5 pt-1 space-y-4 border-t border-slate-200/60 dark:border-slate-800/60 bg-white/60 dark:bg-slate-900/60">
                      {/* AI Diagnostic */}
                      <div className="space-y-1.5 pt-3">
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block">
                          {t('student.assignment.ai_analysis', 'Phân tích đánh giá từ AI:')}
                        </span>
                        <div className="text-xs md:text-sm text-slate-600 dark:text-slate-300 leading-relaxed bg-slate-50 dark:bg-slate-950/80 p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800 space-y-2">
                          {evalRule.reason && (
                            <p className="text-amber-600 dark:text-amber-400 font-semibold">
                              Lý do: {evalRule.reason}
                            </p>
                          )}
                          <p>
                            {typeof evalRule.details === 'string'
                              ? evalRule.details
                              : (typeof evalRule.description === 'string'
                                ? evalRule.description
                                : (typeof evalRule.description?.description === 'string'
                                  ? evalRule.description.description
                                  : t('student.assignment.no_detail', 'Chưa có phân tích chi tiết.')))}
                          </p>
                        </div>
                      </div>

                      {/* Lecturer custom note if lecturer */}
                      {isLecturer && (
                        <div className="space-y-1.5">
                          <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                            <Edit2 className="w-3.5 h-3.5 text-orange-500" />
                            Ghi chú điều chỉnh của giảng viên cho tiêu chí này:
                          </span>
                          <textarea
                            rows={2}
                            value={evalRule.lecturerNote || ''}
                            onChange={(e) => handleReasonChange(ruleId, e.target.value)}
                            placeholder="Nhập lý do điều chỉnh điểm hoặc hướng dẫn cụ thể..."
                            className="w-full text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-2.5 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-orange-500"
                          />
                        </div>
                      )}

                      {/* Evidence Snippets */}
                      {snippets.length > 0 && (
                        <div className="space-y-3">
                          <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                            <FileCode className="w-4 h-4 text-orange-500" />
                            {t('student.assignment.evidence', 'Đoạn mã được kiểm tra & Bằng chứng vi phạm:')}
                          </span>

                          {snippets.map((snip: any, sIdx: number) => (
                            <div key={sIdx} className="rounded-xl overflow-hidden border border-slate-800 bg-[#0d1117] shadow-md text-xs font-mono">
                              <div className="px-3.5 py-2 bg-[#161b22] border-b border-slate-800 flex items-center justify-between text-slate-400">
                                <span className="flex items-center gap-2 truncate text-slate-300">
                                  <Terminal className="w-3.5 h-3.5 text-orange-400" />
                                  {snip.filePath || t('student.assignment.source_evidence', 'Source Code Evidence')}
                                </span>
                                {snip.explanation && (
                                  <span className="text-[10px] text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20 shrink-0">
                                    {t('student.assignment.issue_detected', 'Vấn đề phát hiện')}
                                  </span>
                                )}
                              </div>

                              {snip.codeSnippet && (
                                <div className="p-3 max-h-48 overflow-y-auto overflow-x-auto text-slate-200 leading-relaxed scrollbar-thin">
                                  <pre className="text-xs font-mono">{snip.codeSnippet}</pre>
                                </div>
                              )}

                              {snip.explanation && (
                                <div className="p-2.5 bg-[#161b22]/80 border-t border-slate-800 text-[11px] text-amber-300/90 font-sans flex items-start gap-2">
                                  <Lightbulb className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                                  <span>{snip.explanation}</span>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Action hint button for student */}
                      {!isPass && onGetHint && !isLecturer && (
                        <div className="pt-1 flex items-center justify-end">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onGetHint(ruleId, evalRule.title || ruleId)}
                            className="text-xs gap-1.5 border-orange-300 dark:border-orange-500/30 text-orange-600 dark:text-orange-400"
                          >
                            <Lightbulb className="w-3.5 h-3.5 text-orange-500" />
                            <span>{t('student.assignment.hint_btn', 'Gợi ý cách khắc phục lỗi này')}</span>
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })
          ) : (
            <div className="p-8 text-center bg-slate-50 dark:bg-slate-900/40 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 text-xs text-slate-500">
              {t('student.assignment.data_preparing', 'Đang hoàn thiện dữ liệu phân tích từng tiêu chí Barem Rubric.')}
            </div>
          )}
        </div>
      )}

      {/* 4. Tab: Technical Evidences (HTTP / SQL / IO) */}
      {activeTab === 'evidence' && (
        <div className="space-y-6">
          {/* Summary of Rule Reasons & Evidence */}
          {[...failedRules, ...passedRules].some((r: any) => r.reason) && (
            <div className="rounded-2xl p-4 bg-slate-900 border border-slate-800 space-y-3">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                Lý do chấm & Bằng chứng theo tiêu chí
              </span>
              <div className="space-y-2">
                {[...failedRules, ...passedRules].filter((r: any) => r.reason).map((fr: any, idx: number) => (
                  <div key={idx} className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 text-xs flex flex-col gap-1.5">
                    <div className="flex items-center justify-between font-semibold text-slate-200">
                      <span>{fr.title || fr.ruleId}</span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        fr.passed ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'
                      }`}>
                        {fr.passed ? 'PASSED' : 'FAILED'} ({fr.earnedScore ?? 0}/{fr.weight ?? 10} đ)
                      </span>
                    </div>
                    <p className="text-slate-300 text-xs leading-relaxed">
                      <strong className="text-amber-400 font-medium">Lý do: </strong>{fr.reason}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {allImages.length > 0 && (
            <div className="rounded-2xl p-4 bg-slate-900 border border-slate-800 space-y-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                <FileCode className="w-4 h-4 text-orange-400" />
                Hình ảnh & Ảnh chụp màn hình kiểm thử ({allImages.length})
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {allImages.map((img: any, idx: number) => (
                  <div key={idx} className="rounded-xl overflow-hidden border border-slate-800 bg-black/40 p-2">
                    <img
                      src={img.src || img.url || (typeof img === 'string' ? img : '')}
                      alt={img.title || `Screenshot ${idx + 1}`}
                      className="w-full h-auto rounded object-contain max-h-60"
                    />
                    {img.title && <p className="text-[11px] text-slate-400 mt-1 text-center">{img.title}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {allHttpSteps.length > 0 && <HttpTimelineViewer steps={allHttpSteps} />}
          {allSqlCases.length > 0 && <SqlTestCaseViewer testCases={allSqlCases} />}
          {allIoCases.length > 0 && <IoTestCaseViewer testCases={allIoCases} />}
        </div>
      )}

      {/* 5. Tab: Overall Feedback */}
      {activeTab === 'feedback' && (
        <div className="p-6 md:p-8 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="w-10 h-10 rounded-xl bg-orange-500/10 text-orange-600 dark:text-orange-400 flex items-center justify-center font-bold">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-base text-slate-900 dark:text-white">
                {t('student.assignment.tech_lead_title', 'Đánh giá tổng quan từ Tech Lead AI')}
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {t('student.assignment.tech_lead_desc', 'Nhận xét chuyên sâu về thiết kế mã nguồn, cấu trúc dữ liệu và khả năng mở rộng')}
              </p>
            </div>
          </div>

          <div className="prose prose-slate dark:prose-invert max-w-none text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
            {reportData?.overallFeedback || submission?.aiFeedback || t('student.assignment.tech_lead_pending', 'Hệ thống đang hoàn tất nhận xét tổng quan cho bài làm này.')}
          </div>
        </div>
      )}
    </div>
  )
}
