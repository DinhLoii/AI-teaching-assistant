'use client'

import * as React from 'react'
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
  Bot,
  Check,
  X,
  ArrowRight,
  FileArchive,
  Activity,
  Database,
  Cpu,
  Save,
  Code2,
  Copy,
  CheckCheck,
  RotateCcw,
  BookOpen,
  User,
  Calendar,
  Download,
  FileText,
  ChevronRight,
  Zap,
  LayoutGrid,
  History,
  AlertCircle,
  MessageSquare,
  GitBranch,
  GitCommit,
  ShieldCheck,
} from 'lucide-react'
import { useLanguage } from '@/providers/language-provider'
import { VsCodeExplorerViewer } from './VsCodeExplorerViewer'

// ──────────────────────────────────────────────────────────────────────────────
// Circular Score Gauge Component
// ──────────────────────────────────────────────────────────────────────────────

function ScoreCircleGauge({ score, maxScore = 10 }: { score: number; maxScore?: number }) {
  const percentage = Math.min(100, Math.max(0, (score / maxScore) * 100))
  const radius = 42
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference - (percentage / 100) * circumference
  const isHigh = score >= 8.0
  const strokeColor = isHigh ? '#10b981' : score >= 5 ? '#FA7014' : '#FF000B'

  return (
    <div className="relative flex items-center justify-center w-24 h-24 sm:w-28 sm:h-28 shrink-0">
      <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
        {/* Track */}
        <circle
          cx="50"
          cy="50"
          r={radius}
          className="stroke-slate-100 dark:stroke-slate-800"
          strokeWidth="7"
          fill="transparent"
        />
        {/* Progress Arc */}
        <circle
          cx="50"
          cy="50"
          r={radius}
          stroke={strokeColor}
          strokeWidth="7"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          fill="transparent"
          className="transition-all duration-1000 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
          {score.toFixed(1)}
        </span>
        <span className="text-[11px] text-slate-400 font-semibold -mt-1">
          /{maxScore}
        </span>
      </div>
    </div>
  )
}

// ──────────────────────────────────────────────────────────────────────────────
// Evidence Sub-Components: HTTP Timeline, SQL Testcases, I/O Tests
// ──────────────────────────────────────────────────────────────────────────────

export function HttpTimelineViewer({ steps }: { steps: any[] }) {
  const [expanded, setExpanded] = React.useState<Record<number, boolean>>({})
  if (!steps || steps.length === 0) return null

  const toggle = (idx: number) => {
    setExpanded(prev => ({ ...prev, [idx]: !prev[idx] }))
  }

  const passedCount = steps.filter(s => s.status >= 200 && s.status < 300).length

  return (
    <div className="space-y-3 pt-2">
      <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
        <h5 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
          <Activity className="w-3.5 h-3.5 text-blue-500" />
          <span>HTTP API Probes ({steps.length})</span>
        </h5>
        <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
          {passedCount}/{steps.length} Passed
        </span>
      </div>

      <div className="space-y-1.5">
        {steps.map((step, idx) => {
          const isSuccess = step.status >= 200 && step.status < 300
          const isExp = !!expanded[idx]
          const method = String(step.method || 'GET').toUpperCase()

          return (
            <div key={idx} className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 text-xs space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 truncate">
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold font-mono bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300">
                    {method}
                  </span>
                  <span className="font-mono text-[11px] truncate text-slate-700 dark:text-slate-300">{step.url}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={`text-[11px] font-bold font-mono ${isSuccess ? 'text-emerald-600' : 'text-[#FF000B]'}`}>
                    Status {step.status}
                  </span>
                  <button onClick={() => toggle(idx)} className="text-slate-400 hover:text-slate-700">
                    {isExp ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  </button>
                </div>
              </div>

              {isExp && step.responseBody && (
                <pre className="p-2 bg-slate-950 text-slate-200 rounded text-[10px] font-mono overflow-auto max-h-28">
                  {typeof step.responseBody === 'string' ? step.responseBody : JSON.stringify(step.responseBody, null, 2)}
                </pre>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export function SqlTestCaseViewer({ testCases }: { testCases: any[] }) {
  if (!testCases || testCases.length === 0) return null
  return (
    <div className="space-y-2 pt-2">
      <div className="flex items-center gap-1.5 pb-2 border-b border-slate-100 dark:border-slate-800 text-xs font-bold text-slate-900 dark:text-white">
        <Database className="w-3.5 h-3.5 text-emerald-500" />
        <span>SQL Database Sandbox ({testCases.length})</span>
      </div>
      {testCases.map((tc, idx) => (
        <div key={idx} className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 text-xs flex items-center justify-between">
          <span className="font-medium text-slate-700 dark:text-slate-300">{tc.title || `SQL Test #${idx + 1}`}</span>
          <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
            <Check className="w-3 h-3" />
            <span>Passed</span>
          </span>
        </div>
      ))}
    </div>
  )
}

export function IoTestCaseViewer({ testCases }: { testCases: any[] }) {
  if (!testCases || testCases.length === 0) return null
  return (
    <div className="space-y-2 pt-2">
      <div className="flex items-center gap-1.5 pb-2 border-b border-slate-100 dark:border-slate-800 text-xs font-bold text-slate-900 dark:text-white">
        <Cpu className="w-3.5 h-3.5 text-orange-500" />
        <span>Unit Tests I/O ({testCases.length})</span>
      </div>
      {testCases.map((tc, idx) => (
        <div key={idx} className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 text-xs flex items-center justify-between">
          <span className="font-medium text-slate-700 dark:text-slate-300">{tc.name || `Case #${idx + 1}`}</span>
          <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
            <Check className="w-3 h-3" />
            <span>Pass ({tc.runtimeMs || 100}ms)</span>
          </span>
        </div>
      ))}
    </div>
  )
}

// ──────────────────────────────────────────────────────────────────────────────
// Main Evaluation Report Viewer: Matches User Mockup Exact Design & Layout
// ──────────────────────────────────────────────────────────────────────────────

export interface EvaluationReportViewerProps {
  submission: any
  onResubmit?: () => void
  onGetHint?: (ruleId?: any, ruleTitle?: any) => void | Promise<any>
  isLecturer?: boolean
  onUpdateRuleScore?: (updatedRuleScores: any[], newTotalScore: number) => void
  onOpenAppeal?: () => void
}

export function EvaluationReportViewer({
  submission,
  onResubmit,
  onGetHint,
  isLecturer = false,
  onUpdateRuleScore,
  onOpenAppeal,
}: EvaluationReportViewerProps) {
  const { t, language } = useLanguage()
  const isVi = language === 'vi'

  const [activeTab, setActiveTab] = React.useState<'overview' | 'rubric' | 'testcases' | 'review' | 'git' | 'history'>('overview')
  const [copiedKey, setCopiedKey] = React.useState<string | null>(null)
  const [codeQualityView, setCodeQualityView] = React.useState<'code' | 'criteria'>('code')

  const reportData = submission?.reportData || (typeof submission?.ReportData === 'string' ? JSON.parse(submission.ReportData) : submission?.ReportData) || null
  const scoreNum = Number(submission?.score ?? submission?.finalScore ?? submission?.totalScore ?? reportData?.totalScore ?? 9.5)
  const maxScore = Number(reportData?.maxPossibleScore ?? 10)
  const isHigh = scoreNum >= 8.0

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
    : (mappedRuleScores.length > 0 ? mappedRuleScores : [
        {
          ruleId: 'REQ-01',
          title: 'Triển khai Kiến trúc MVVM & State Management với Jetpack Compose',
          weight: 3.0,
          earnedScore: 3.0,
          passed: true,
          reason: 'Sử dụng StateFlow và remember/derivedStateOf đúng chuẩn reactivity trong Jetpack Compose.',
          details: 'ViewModel lưu giữ UI State an toàn trước configuration changes. Tách bạch hoàn toàn giữa UI composable và Repository logic.',
        },
        {
          ruleId: 'REQ-02',
          title: 'Tích hợp Room Database, DAO & Coroutine Flow',
          weight: 3.5,
          earnedScore: 3.5,
          passed: true,
          reason: 'Room Entity định nghĩa đúng khóa chính, Dao sử dụng Flow cho real-time updates.',
          details: 'Cấu hình RoomDatabase singleton với fallbackToDestructiveMigration an toàn. Các câu truy vấn SELECT và INSERT thực thi bất đồng bộ qua Coroutines.',
        },
        {
          ruleId: 'REQ-03',
          title: 'Xây dựng UI Jetpack Compose mượt mà và Modular Composables',
          weight: 2.0,
          earnedScore: 2.0,
          passed: true,
          reason: 'Giao diện Material3 chuẩn chỉ, responsive trên nhiều kích thước màn hình.',
          details: 'Các composable TaskItem, TaskList, TaskDetailScreen được module hóa rõ ràng, dễ bảo trì và mở rộng.',
        },
        {
          ruleId: 'REQ-04',
          title: 'Tối ưu hóa Code Quality & Xử lý ngoại lệ toàn diện',
          weight: 1.5,
          earnedScore: 1.0,
          passed: false,
          reason: 'Một số hàm xử lý mạng còn lặp code và chưa bọc try-catch đối với database I/O.',
          details: 'Cần bổ sung Custom Exception Handler và gom nhóm các hàm mapping dữ liệu vào Extension Functions.',
        },
      ])

  const [editableEvaluations, setEditableEvaluations] = React.useState<any[]>(rawEvaluations)
  const [hasEdits, setHasEdits] = React.useState(false)

  React.useEffect(() => {
    setEditableEvaluations(rawEvaluations)
    setHasEdits(false)
  }, [submission])

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

  const handleSaveEdits = () => {
    if (!onUpdateRuleScore) return
    const newTotal = editableEvaluations.reduce((sum, r) => sum + Number(r.earnedScore || 0), 0)
    onUpdateRuleScore(editableEvaluations, Math.min(maxScore, newTotal))
    setHasEdits(false)
  }

  const copyCode = (text: string, key: string) => {
    navigator.clipboard.writeText(text)
    setCopiedKey(key)
    setTimeout(() => setCopiedKey(null), 2000)
  }

  const subjectCode = submission?.subjectCode || 'PRM392'
  const subjectName = submission?.subjectName || 'Mobile Programming'
  const lecturerName = submission?.lecturerName || 'Nguyễn Văn Giảng'
  const assignmentTitle = submission?.assignmentTitle || submission?.assignment || 'Assignment 1: Android Jetpack Compose & Room Database'
  const filename = submission?.filename || 'app-submission.zip'
  const fileSize = submission?.fileSize || '1.8 MB'

  // User's actual submitted source code or extracted code
  const userSourceCode: string =
    submission?.sourceCode ||
    submission?.content ||
    submission?.code ||
    submission?.source_code ||
    reportData?.sourceCode ||
    reportData?.code ||
    (rawEvaluations.find((r: any) => r.evidence?.snippets?.[0]?.codeSnippet)?.evidence?.snippets?.[0]?.codeSnippet) ||
    `// File: TaskRepository.kt
package com.fpt.aita.todoapp.data.repository

import com.fpt.aita.todoapp.data.local.TaskDao
import com.fpt.aita.todoapp.data.model.Task
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

class TaskRepositoryImpl(
    private val taskDao: TaskDao
) : TaskRepository {
    override fun getAllTasks(): Flow<List<Task>> = taskDao.getTasksFlow()

    override suspend fun insertTask(task: Task) = withContext(Dispatchers.IO) {
        taskDao.insertTask(task)
    }

    override suspend fun updateTask(task: Task) = withContext(Dispatchers.IO) {
        taskDao.updateTask(task)
    }

    override suspend fun deleteTask(task: Task) = withContext(Dispatchers.IO) {
        taskDao.deleteTask(task)
    }
}`

  const userCodeFilename: string =
    submission?.filename ||
    submission?.fileName ||
    submission?.fileUrl?.split('/')?.pop()?.split('?')?.[0] ||
    'TaskRepository.kt'

  // Code quality checklist matching the image
  const codeQualityChecklist = submission?.codeQualityChecklist || [
    { title: 'Cấu trúc dự án rõ ràng, tuân thủ Clean Architecture', passed: true, type: 'pass' },
    { title: 'Sử dụng đúng Jetpack Compose và Room Database', passed: true, type: 'pass' },
    { title: 'Logic xử lý dữ liệu chính xác', passed: true, type: 'pass' },
    { title: 'Có một số đoạn code trùng lặp (code duplication)', passed: false, type: 'warn' },
    { title: 'Đặt tên biến và hàm có thể rõ ràng hơn', passed: true, type: 'pass' },
  ]

  const strengths = submission?.strengths || [
    'Triển khai đúng kiến trúc MVVM, tách tầng Repository rõ ràng',
    'Sử dụng Room Database hiệu quả, query bất đồng bộ trên Dispatchers.IO',
    'Giao diện người dùng mượt mà với Jetpack Compose & StateFlow',
    'Code chạy ổn định trong Sandbox, vượt qua 100% Unit Testcases',
  ]

  const improvements = submission?.improvements || [
    '[CẦN XEM LẠI] Bổ sung xử lý ngoại lệ (Exception Handling) trong TaskRepository.kt, tránh nuốt lỗi âm thầm',
    '[QUAN TRỌNG] Kiểm soát Coroutine Scope: Dùng viewModelScope thay vì GlobalScope để tránh rò rỉ bộ nhớ (Memory Leak)',
    '[TỐI ƯU HÓA] Loại bỏ trùng lặp code (Code Duplication) trong các hàm lọc danh sách giữa ViewModel và Helper',
  ]

  const pipelineSteps = submission?.pipelineSteps || [
    { title: 'Nộp bài', subtitle: '13:42 13/10', completed: true },
    { title: 'Trích xuất artifact', subtitle: 'Đã hoàn tất', completed: true },
    { title: 'Docker Sandbox', subtitle: 'Đã hoàn tất', completed: true },
    { title: 'AI Code Review', subtitle: 'Đã hoàn tất', completed: true },
    { title: 'Trả kết quả', subtitle: '16:32 01/10', completed: true },
  ]

  // Evidences
  const allHttpSteps = reportData?.httpSteps || reportData?.probeSteps || []
  const allSqlCases = reportData?.sqlTestCases || []
  const allIoCases = reportData?.ioTestCases || []

  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
      
      {/* ══════════════════════════════════════════════════════════════════════
          LEFT MAIN COLUMN (xl:col-span-8):
          1. Top Card: Assignment Details, Score Gauge, 3 Sub-Metrics, 5-Step Pipeline
          2. Navigation Tabs
          3. Tab Content
         ══════════════════════════════════════════════════════════════════════ */}
      <div className="xl:col-span-8 space-y-6">

        {/* ── TOP CARD: TIÊU ĐỀ, ĐIỂM SỐ & TIẾN TRÌNH PIPELINE (CHUẨN ẢNH) ── */}
        <div className="rounded-lg bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-5 sm:p-6 md:p-7 shadow-xs space-y-6">
          
          {/* Header row: Subject Tag + Status Badge */}
          <div className="flex items-center justify-between gap-3">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
              <span>{subjectCode}</span>
            </span>

            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400 select-none">
              <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 stroke-[2.5]" />
              <span>{isVi ? 'Đã chấm' : 'Graded'}</span>
            </span>
          </div>

          {/* Title & Metadata Row */}
          <div className="space-y-2">
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white leading-snug">
              {assignmentTitle}
            </h2>

            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-slate-500 dark:text-slate-400">
              <div className="flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5 text-slate-400" />
                <span>{subjectName}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-slate-400" />
                <span>GV: {lecturerName}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <span>18:24 13/10/2026</span>
              </div>
            </div>
          </div>

          {/* Score Gauge & 3 Sub-Metrics */}
          <div className="pt-2 flex flex-col md:flex-row items-center gap-5 sm:gap-6 border-t border-slate-100 dark:border-slate-800">
            {/* Circular Gauge */}
            <div className="flex items-center gap-4 shrink-0">
              <ScoreCircleGauge score={scoreNum} maxScore={maxScore} />
              
              <div className="space-y-1">
                <span className="text-xs font-bold text-slate-900 dark:text-white block">
                  {isVi ? 'Tổng điểm' : 'Total Score'}
                </span>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400">
                  <span>⭐</span>
                  <span>{isVi ? 'Xuất sắc' : 'Excellent'}</span>
                </span>
                <p className="text-xs text-slate-500 dark:text-slate-400 pt-0.5">
                  {isVi ? 'Bạn đã hoàn thành tốt bài tập này!' : 'Great job on this assignment!'}
                </p>
              </div>
            </div>

            {/* 3 Metric Cards */}
            <div className="grid grid-cols-3 gap-3 flex-1 w-full text-left">
              {/* Test cases */}
              <div className="p-3 sm:p-3.5 rounded-xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 space-y-1">
                <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                  <Clock className="w-3.5 h-3.5 text-emerald-500" />
                  <span className="truncate">Test cases</span>
                </div>
                <div className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                  10/10
                </div>
                <span className="text-[11px] text-slate-500 dark:text-slate-400 block font-medium">
                  (100%)
                </span>
              </div>

              {/* Code Quality */}
              <div className="p-3 sm:p-3.5 rounded-xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 space-y-1">
                <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                  <Code2 className="w-3.5 h-3.5 text-blue-500" />
                  <span className="truncate">Code Quality</span>
                </div>
                <div className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                  8.8/10
                </div>
                <span className="text-[11px] text-blue-600 dark:text-blue-400 block font-bold">
                  (Tốt)
                </span>
              </div>

              {/* Compilation */}
              <div className="p-3 sm:p-3.5 rounded-xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 space-y-1">
                <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                  <Zap className="w-3.5 h-3.5 text-emerald-500" />
                  <span className="truncate">Compilation</span>
                </div>
                <div className="text-base sm:text-lg font-black text-emerald-600 dark:text-emerald-400">
                  Pass
                </div>
                <span className="text-[11px] text-slate-500 dark:text-slate-400 block font-medium">
                  (Thành công)
                </span>
              </div>
            </div>
          </div>

          {/* 5-Step Pipeline */}
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 overflow-x-auto">
            <div className="flex items-center justify-between min-w-[580px] gap-2">
              {pipelineSteps.map((step: any, sIdx: number) => {
                const isLast = sIdx === pipelineSteps.length - 1

                return (
                  <React.Fragment key={sIdx}>
                    <div className="flex items-center gap-2.5 shrink-0">
                      <div className="w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center text-xs font-bold shadow-xs">
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                      </div>
                      <div>
                        <span className="block text-xs font-bold text-slate-900 dark:text-white leading-tight">
                          {step.title}
                        </span>
                        <span className="block text-[11px] text-slate-400">
                          {step.subtitle}
                        </span>
                      </div>
                    </div>

                    {!isLast && (
                      <div className="flex-1 flex items-center justify-center px-1">
                        <div className="h-[2px] w-full bg-emerald-400/40 rounded-full" />
                        <ChevronRight className="w-3.5 h-3.5 text-emerald-500 -ml-1 shrink-0" />
                      </div>
                    )}
                  </React.Fragment>
                )
              })}
            </div>
          </div>

        </div>

        {/* ── NAVIGATION TABS (CHUẨN THEO ẢNH: TỔNG QUAN, CHI TIẾT ĐÁNH GIÁ, TEST CASES, CODE REVIEW, LỊCH SỬ NỘP BÀI) ── */}
        <div className="flex items-center gap-6 sm:gap-8 overflow-x-auto text-xs shrink-0 border-b border-slate-200 dark:border-slate-800 pt-2">
          <button
            type="button"
            onClick={() => setActiveTab('overview')}
            className={`relative pb-3 font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-2 ${
              activeTab === 'overview'
                ? 'text-slate-900 dark:text-white'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <LayoutGrid className="w-4 h-4 text-[#FA7014]" />
            <span>{isVi ? 'Tổng quan' : 'Overview'}</span>
            {activeTab === 'overview' && (
              <span className="absolute bottom-0 left-0 right-0 h-[2.5px] rounded-full bg-[#FA7014] shadow-[0_0_8px_rgba(250, 112, 20,0.4)]" />
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('rubric')}
            className={`relative pb-3 font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-2 ${
              activeTab === 'rubric'
                ? 'text-slate-900 dark:text-white'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Award className="w-4 h-4" />
            <span>{isVi ? 'Chi tiết đánh giá' : 'Evaluation Details'}</span>
            {activeTab === 'rubric' && (
              <span className="absolute bottom-0 left-0 right-0 h-[2.5px] rounded-full bg-[#FA7014] shadow-[0_0_8px_rgba(250, 112, 20,0.4)]" />
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('testcases')}
            className={`relative pb-3 font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-2 ${
              activeTab === 'testcases'
                ? 'text-slate-900 dark:text-white'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Activity className="w-4 h-4" />
            <span>Test cases</span>
            {activeTab === 'testcases' && (
              <span className="absolute bottom-0 left-0 right-0 h-[2.5px] rounded-full bg-[#FA7014] shadow-[0_0_8px_rgba(250, 112, 20,0.4)]" />
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('review')}
            className={`relative pb-3 font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-2 ${
              activeTab === 'review'
                ? 'text-slate-900 dark:text-white'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Code2 className="w-4 h-4" />
            <span>Code Review</span>
            {activeTab === 'review' && (
              <span className="absolute bottom-0 left-0 right-0 h-[2.5px] rounded-full bg-[#FA7014] shadow-[0_0_8px_rgba(250, 112, 20,0.4)]" />
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('git')}
            className={`relative pb-3 font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-2 ${
              activeTab === 'git'
                ? 'text-slate-900 dark:text-white'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <GitBranch className="w-4 h-4 text-emerald-500" />
            <span>{isVi ? 'Phân tích Git & Đóng góp' : 'Git & Anti-Free-Riding'}</span>
            {activeTab === 'git' && (
              <span className="absolute bottom-0 left-0 right-0 h-[2.5px] rounded-full bg-[#FA7014] shadow-[0_0_8px_rgba(250, 112, 20,0.4)]" />
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('history')}
            className={`relative pb-3 font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-2 ${
              activeTab === 'history'
                ? 'text-slate-900 dark:text-white'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <History className="w-4 h-4" />
            <span>{isVi ? 'Lịch sử nộp bài' : 'Submission Log'}</span>
            {activeTab === 'history' && (
              <span className="absolute bottom-0 left-0 right-0 h-[2.5px] rounded-full bg-[#FA7014] shadow-[0_0_8px_rgba(250, 112, 20,0.4)]" />
            )}
          </button>
        </div>

        {/* ── TAB 1: TỔNG QUAN (KHỚP 100% THEO ẢNH NGƯỜI DÙNG) ── */}
        {activeTab === 'overview' && (
          <div className="space-y-4">
            <div className="space-y-0.5">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {isVi ? 'Phân tích kết quả' : 'Result Analysis'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {isVi
                  ? 'Đánh giá chi tiết từ AI về chất lượng mã nguồn và mức độ hoàn thành bài tập.'
                  : 'Detailed AI assessment on code quality and requirements fulfillment.'}
              </p>
            </div>

            {/* 2 Sub-Cards: Left (Chất lượng mã nguồn) & Right (Điểm mạnh & Đề xuất cải thiện) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-stretch">
              
              {/* Left Sub-Card: Chất lượng mã nguồn & Hiển thị Code của User */}
              <div className="rounded-lg bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-5 shadow-xs space-y-4 flex flex-col justify-between">
                <div className="space-y-3.5">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-2">
                      <Code2 className="w-4 h-4 text-blue-500" />
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                        {isVi ? 'Chất lượng mã nguồn' : 'Source Code Quality'}
                      </h4>
                    </div>

                    <div className="flex items-center gap-2.5">
                      {/* Sub-tabs: Mã nguồn vs Tiêu chí */}
                      <div className="flex items-center p-0.5 bg-slate-100 dark:bg-slate-800 rounded-lg text-[11px] font-semibold">
                        <button
                          type="button"
                          onClick={() => setCodeQualityView('code')}
                          className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer flex items-center gap-1.5 ${
                            codeQualityView === 'code'
                              ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs font-bold'
                              : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                          }`}
                        >
                          <FileCode className="w-3 h-3" />
                          <span>{isVi ? 'Mã nguồn' : 'Code'}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setCodeQualityView('criteria')}
                          className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer flex items-center gap-1.5 ${
                            codeQualityView === 'criteria'
                              ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs font-bold'
                              : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                          }`}
                        >
                          <CheckCircle2 className="w-3 h-3" />
                          <span>{isVi ? 'Tiêu chí' : 'Criteria'}</span>
                        </button>
                      </div>

                      <span className="text-sm font-black text-slate-900 dark:text-white shrink-0">
                        8.8<span className="text-xs text-slate-400 font-normal">/10</span>
                      </span>
                    </div>
                  </div>

                  <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-500 rounded-full w-[88%]" />
                  </div>

                  {codeQualityView === 'code' ? (
                    <div className="space-y-2.5">
                      {/* VS Code Explorer & Error Highlighter */}
                      <VsCodeExplorerViewer
                        archiveName={filename}
                        sourceCode={userSourceCode}
                        filename={userCodeFilename}
                        height="h-[360px]"
                      />

                      <div className="flex items-center justify-between pt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                        <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-semibold">
                          <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                          {isVi ? 'Đã kiểm tra Clean Architecture & Room DB' : 'Clean Architecture & Room DB Verified'}
                        </span>
                        <button
                          type="button"
                          onClick={() => setCodeQualityView('criteria')}
                          className="text-blue-500 hover:underline cursor-pointer font-medium"
                        >
                          {isVi ? 'Xem 5 tiêu chí chi tiết →' : 'View 5 criteria →'}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2.5 pt-1 text-xs text-slate-700 dark:text-slate-300">
                      {codeQualityChecklist.map((item: any, idx: number) => {
                        const isWarn = item.type === 'warn'

                        return (
                          <div key={idx} className="flex items-start gap-2.5 leading-relaxed">
                            {isWarn ? (
                              <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                            ) : (
                              <div className="w-4 h-4 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                                <Check className="w-3 h-3 stroke-[3]" />
                              </div>
                            )}
                            <span className={isWarn ? 'text-slate-600 dark:text-slate-300' : 'text-slate-800 dark:text-slate-200'}>
                              {item.title}
                            </span>
                          </div>
                        )
                      })}

                      <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                        <button
                          type="button"
                          onClick={() => setCodeQualityView('code')}
                          className="text-xs text-blue-500 hover:underline cursor-pointer flex items-center gap-1 font-semibold"
                        >
                          <Code2 className="w-3.5 h-3.5" />
                          <span>{isVi ? '← Trở về xem mã nguồn bài nộp' : '← Back to source code'}</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Right Sub-Card: Điểm mạnh (Xanh) & Đề xuất cải thiện (Màu Đỏ/Cam #FF000B) */}
              <div className="rounded-lg bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-5 shadow-xs space-y-4 flex flex-col justify-between">
                {/* Block 1: Điểm mạnh */}
                <div className="space-y-2.5">
                  <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold text-sm">
                    <FileCode className="w-4 h-4" />
                    <span>{isVi ? 'Điểm mạnh' : 'Strengths'}</span>
                  </div>

                  <div className="space-y-2 text-xs text-slate-700 dark:text-slate-300">
                    {strengths.map((str: string, sIdx: number) => (
                      <div key={sIdx} className="flex items-start gap-2 leading-relaxed">
                        <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5 stroke-[2.5]" />
                        <span>{str}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Block 2: Đề xuất cải thiện (Dùng màu đỏ #FF000B chuẩn) */}
                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2.5">
                  <div className="flex items-center gap-2 text-[#FF000B] font-bold text-sm">
                    <AlertCircle className="w-4 h-4 text-[#FF000B]" />
                    <span>{isVi ? 'Đề xuất cải thiện' : 'Actionable Improvements'}</span>
                  </div>

                  <div className="space-y-2 text-xs text-slate-700 dark:text-slate-300">
                    {improvements.map((imp: string, iIdx: number) => {
                      const isCritical = imp.includes('[CẦN XEM LẠI]') || imp.includes('[QUAN TRỌNG]')
                      return (
                        <div key={iIdx} className="flex items-start gap-2 leading-relaxed">
                          <span className="text-[#FF000B] font-black text-xs shrink-0 mt-0.5">•</span>
                          <span className={`text-xs ${isCritical ? 'font-semibold text-slate-900 dark:text-white' : 'text-slate-800 dark:text-slate-200'}`}>
                            {imp}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                </div>

              </div>
            </div>
          </div>
        )}

        {/* ── TAB 2: CHI TIẾT ĐÁNH GIÁ (BAREM RUBRIC) ── */}
        {activeTab === 'rubric' && (
          <div className="space-y-3.5">
            {editableEvaluations.map((rule: any, idx: number) => {
              const ruleId = rule.ruleId || `REQ-0${idx + 1}`
              const isPass = rule.passed === true
              const earned = Number(rule.earnedScore ?? (isPass ? rule.weight : 0))
              const weight = Number(rule.weight ?? 0)
              const snippet = rule.evidence?.snippets?.[0]

              return (
                <div
                  key={idx}
                  className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-4 sm:p-5 space-y-3 shadow-xs"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-extrabold uppercase text-slate-900 dark:text-white tracking-wider">
                          {ruleId}
                        </span>
                        <span className={`inline-flex items-center gap-1 text-xs font-bold ${
                          isPass ? 'text-emerald-600 dark:text-emerald-400' : 'text-[#FF000B]'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${isPass ? 'bg-emerald-500' : 'bg-[#FF000B]'}`} />
                          <span>{isPass ? (isVi ? 'Đạt tiêu chí' : 'Passed') : (isVi ? 'Chưa đạt' : 'Needs Work')}</span>
                        </span>
                      </div>
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                        {rule.title}
                      </h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {rule.reason || rule.details}
                      </p>
                    </div>

                    <div className="text-right shrink-0">
                      {isLecturer ? (
                        <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
                          <input
                            type="number"
                            step="0.25"
                            min="0"
                            max={weight}
                            value={earned}
                            onChange={(e) => handleScoreChange(ruleId, parseFloat(e.target.value) || 0)}
                            className="w-14 px-1.5 py-0.5 text-center font-bold text-xs rounded bg-white dark:bg-slate-900 text-slate-900 dark:text-white border-none focus:outline-none"
                          />
                          <span className="text-xs text-slate-500 pr-1">/ {weight} đ</span>
                        </div>
                      ) : (
                        <span className={`text-sm font-extrabold ${isPass ? 'text-emerald-600 dark:text-emerald-400' : 'text-[#FF000B]'}`}>
                          +{earned.toFixed(1)} / {weight.toFixed(1)} đ
                        </span>
                      )}
                    </div>
                  </div>

                  {snippet && (
                    <div className="rounded-lg bg-slate-950 p-3 text-xs font-mono text-slate-200 overflow-x-auto space-y-1">
                      <div className="flex items-center justify-between text-[11px] text-slate-400 pb-1 border-b border-slate-800">
                        <span>{snippet.filePath}</span>
                        <button
                          type="button"
                          onClick={() => copyCode(snippet.codeSnippet, ruleId)}
                          className="hover:text-white flex items-center gap-1 cursor-pointer"
                        >
                          {copiedKey === ruleId ? <CheckCheck className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                          <span>{copiedKey === ruleId ? 'Copied' : 'Copy'}</span>
                        </button>
                      </div>
                      <pre className="text-[11px] pt-1">{snippet.codeSnippet}</pre>
                    </div>
                  )}

                  {!isPass && onGetHint && !isLecturer && (
                    <div className="pt-1 flex justify-end">
                      <button
                        type="button"
                        onClick={() => onGetHint(ruleId, rule.title)}
                        className="text-xs font-semibold text-[#FA7014] hover:underline flex items-center gap-1"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>{isVi ? 'Xem gợi ý từ AI Tutor' : 'Get AI Hint'}</span>
                      </button>
                    </div>
                  )}
                </div>
              )
            })}

            {isLecturer && hasEdits && onUpdateRuleScore && (
              <div className="pt-2 flex justify-end">
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleSaveEdits}
                  className="bg-gradient-to-r from-orange-500 via-amber-500 to-orange-400 hover:from-orange-600 hover:via-amber-500 hover:to-orange-500 text-white text-xs font-bold shadow-md shadow-orange-500/20"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{isVi ? 'Lưu điểm điều chỉnh' : 'Save Adjustments'}</span>
                </Button>
              </div>
            )}
          </div>
        )}

        {/* ── TAB 3: TEST CASES ── */}
        {activeTab === 'testcases' && (
          <div className="rounded-lg bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-5 space-y-4 shadow-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                Kiểm thử Unit Testcases & Khả năng tương thích
              </h4>
              <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                10/10 Testcases Passed (100%)
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              {[
                'Test Room DB Insert Task',
                'Test Room DB Flow Queries',
                'Test ViewModel State Loading',
                'Test ViewModel State Success',
                'Test Compose Item Rendering',
                'Test Navigation Arguments',
                'Test Lifecycle Configuration Change',
                'Test Null Safety Parser',
                'Test Memory Leak Detection',
                'Test UI Thread Responsiveness',
              ].map((tcName, idx) => (
                <div key={idx} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 flex items-center justify-between">
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{tcName}</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                    <Check className="w-3.5 h-3.5" />
                    <span>Pass</span>
                  </span>
                </div>
              ))}
            </div>

            {allHttpSteps.length > 0 && <HttpTimelineViewer steps={allHttpSteps} />}
            {allSqlCases.length > 0 && <SqlTestCaseViewer testCases={allSqlCases} />}
            {allIoCases.length > 0 && <IoTestCaseViewer testCases={allIoCases} />}
          </div>
        )}

        {/* ── TAB 4: CODE REVIEW (ĐƠN GIẢN, 1 KHUNG DUY NHẤT, KHÔNG MÀU MÈ) ── */}
        {activeTab === 'review' && (
          <div className="rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 sm:p-6 shadow-xs space-y-5">
            {/* Tiêu đề nhận xét */}
            <div className="pb-3 border-b border-slate-100 dark:border-slate-800">
              <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                {isVi ? 'Nhận xét chi tiết từ AI Teaching Assistant' : 'AI Teaching Assistant Feedback'}
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {isVi ? 'Tổng kết kết quả phân tích mã nguồn, các điểm bị trừ điểm và khuyến nghị cải thiện.' : 'Code review summary, deducted points, and recommendations.'}
              </p>
            </div>

            {/* Nội dung nhận xét dạng gạch ý từng câu, in đậm chỗ bị trừ điểm & code sai */}
            <div className="space-y-4 text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-sans">
              {/* Phần lỗi & bị trừ điểm */}
              <div className="space-y-2">
                <p className="font-bold text-slate-900 dark:text-white text-xs">
                  {isVi ? 'Các lỗi bị trừ điểm & đoạn mã sai cần xem lại:' : 'Deductions & Code Issues:'}
                </p>
                <ul className="space-y-2.5 pl-4 list-disc marker:text-slate-400">
                  <li>
                    <strong>Bị trừ 0.5 điểm tại file TaskRepository.kt (hàm getTaskById):</strong> Đoạn code <strong>try-catch bắt Exception chung và âm thầm return null</strong> khi truy vấn database thất bại. Đoạn code sai: <code>catch (e: Exception) &#123; return null &#125;</code>. <strong>Cách sửa:</strong> Bắt cụ thể <strong>SQLException</strong> hoặc ném ra <strong>DomainException</strong> để ViewModel xử lý và thông báo lỗi rõ ràng lên giao diện.
                  </li>
                  <li>
                    <strong>Bị trừ 0.5 điểm tại file TaskViewModel.kt (hàm loadTasks):</strong> Sử dụng <strong>GlobalScope.launch</strong> thay vì <strong>viewModelScope.launch</strong>. Đoạn code này <strong>không tự hủy theo vòng đời</strong> của màn hình, dẫn đến nguy cơ <strong>rò rỉ bộ nhớ (Memory Leak)</strong> khi chuyển màn hình liên tục.
                  </li>
                  <li>
                    <strong>Cần xem lại trùng lặp mã nguồn (Code Duplication):</strong> Đoạn logic kiểm tra điều kiện lọc trạng thái trong <strong>TaskViewModel.kt</strong> và <strong>FilterHelper.kt</strong> bị <strong>trùng lặp hoàn toàn</strong>. <strong>Khuyến nghị:</strong> Gom thành <strong>một hàm tiện ích dùng chung duy nhất</strong> để code ngắn gọn và dễ bảo trì.
                  </li>
                </ul>
              </div>

              {/* Phần điểm làm tốt */}
              <div className="space-y-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <p className="font-bold text-slate-900 dark:text-white text-xs">
                  {isVi ? 'Nhận xét các phần đạt yêu cầu:' : 'Satisfied Criteria & Best Practices:'}
                </p>
                <ul className="space-y-2 pl-4 list-disc marker:text-slate-400">
                  <li>
                    <strong>Kiến trúc phân tầng MVVM (+3.0 điểm):</strong> Tổ chức dự án rõ ràng, <strong>tách biệt hoàn toàn giữa View và Model</strong>; View không gọi trực tiếp Database mà thông qua Repository đúng quy chuẩn.
                  </li>
                  <li>
                    <strong>Triển khai Room Database (+3.0 điểm):</strong> Khai báo Entity và DAO chính xác, <strong>hỗ trợ Reactive Flow</strong> đầy đủ, truy vấn dữ liệu bất đồng bộ mượt mà trên <strong>Dispatchers.IO</strong>.
                  </li>
                  <li>
                    <strong>Quản lý trạng thái Jetpack Compose (+2.5 điểm):</strong> Đã chuyển đổi sang <strong>StateFlow</strong> và sử dụng <strong>collectAsStateWithLifecycle()</strong> đúng chuẩn hiện đại, giao diện hiển thị ổn định.
                  </li>
                  <li>
                    <strong>Đạt 10/10 Test Cases tự động (+1.0 điểm):</strong> Toàn bộ các kịch bản kiểm thử biên dịch và runtime trong Docker Sandbox đều <strong>vượt qua thành công với mã thoát EXIT: 0</strong>.
                  </li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* ── TAB: GIT & ĐÓNG GÓP (ANTI-FREE-RIDING & COMMIT AUDIT THEO RBL GUIDE) ── */}
        {activeTab === 'git' && (
          <div className="space-y-5">
            {/* Header Repo & Commit Verification */}
            <div className="rounded-lg bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-5 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
                    <GitBranch className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                      Xác thực Mã nguồn qua Git API & Thẩm định Nỗ lực Cá nhân
                    </h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Chuẩn RBL Đại học FPT: Đối chiếu Commit Hash, phân tích LOC và loại bỏ tình trạng &quot;free-riding&quot;
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200/50">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>SHA-256 Verified</span>
                  </span>
                </div>
              </div>

              {/* Repo Quick Meta */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 space-y-0.5">
                  <span className="text-[11px] text-slate-400 block font-medium">Nhánh chính (Branch)</span>
                  <span className="font-mono font-bold text-slate-800 dark:text-slate-200">main</span>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 space-y-0.5">
                  <span className="text-[11px] text-slate-400 block font-medium">Tổng số Commits</span>
                  <span className="font-mono font-bold text-slate-800 dark:text-slate-200">28 commits</span>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 space-y-0.5">
                  <span className="text-[11px] text-slate-400 block font-medium">Dòng mã thêm/bớt</span>
                  <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">+3,420</span>
                  <span className="font-mono text-slate-400 text-[10px]"> / </span>
                  <span className="font-mono font-bold text-rose-500">-480</span>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 space-y-0.5">
                  <span className="text-[11px] text-slate-400 block font-medium">Commit SHA (Cuối)</span>
                  <span className="font-mono font-bold text-blue-600 dark:text-blue-400 truncate block">a7f9c2d...</span>
                </div>
              </div>
            </div>

            {/* Anti-Free-Riding Team Contribution Table */}
            <div className="rounded-lg bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                    Minh bạch hóa đóng góp thành viên (Anti-Free-Riding Audit)
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Phân bổ tỷ lệ đóng góp dựa trên số lượng commit, LOC và độ phức tạp mã nguồn
                  </p>
                </div>
                <span className="text-xs font-semibold text-slate-400">Nhóm 4 thành viên</span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 font-semibold">
                      <th className="pb-2.5">Thành viên</th>
                      <th className="pb-2.5">Phân hệ phụ trách (Full-stack)</th>
                      <th className="pb-2.5 text-center">Commits</th>
                      <th className="pb-2.5 text-center">LOC (+/-)</th>
                      <th className="pb-2.5 text-center">Tỷ lệ đóng góp</th>
                      <th className="pb-2.5 text-right">Đánh giá nỗ lực</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {[
                      {
                        name: 'Nguyễn Văn Quý (Trưởng nhóm)',
                        code: 'HE170123',
                        role: 'Architecture & Room Database',
                        commits: 11,
                        loc: '+1,450 / -180',
                        pct: 38,
                        status: 'EXCELLENT',
                      },
                      {
                        name: 'Trần Minh Hoàng',
                        code: 'HE170245',
                        role: 'Jetpack Compose UI & State',
                        commits: 8,
                        loc: '+980 / -120',
                        pct: 28,
                        status: 'GOOD',
                      },
                      {
                        name: 'Lê Thu Trang',
                        code: 'HE170388',
                        role: 'Repository & Coroutine Flow',
                        commits: 6,
                        loc: '+670 / -90',
                        pct: 22,
                        status: 'GOOD',
                      },
                      {
                        name: 'Đặng Tuấn Anh',
                        code: 'HE170512',
                        role: 'Unit Tests & Error Handling',
                        commits: 3,
                        loc: '+320 / -90',
                        pct: 12,
                        status: 'PASS',
                      },
                    ].map((m, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors">
                        <td className="py-3">
                          <div className="font-bold text-slate-900 dark:text-white">{m.name}</div>
                          <div className="font-mono text-[10px] text-slate-400">{m.code}</div>
                        </td>
                        <td className="py-3 text-slate-700 dark:text-slate-300 font-medium">
                          {m.role}
                        </td>
                        <td className="py-3 text-center font-mono font-bold text-slate-800 dark:text-slate-200">
                          {m.commits}
                        </td>
                        <td className="py-3 text-center font-mono text-[11px]">
                          <span className="text-emerald-600 font-semibold">{m.loc.split('/')[0]}</span>
                          <span className="text-slate-400"> / </span>
                          <span className="text-rose-500">{m.loc.split('/')[1]}</span>
                        </td>
                        <td className="py-3 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <div className="w-16 h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-emerald-500 rounded-full"
                                style={{ width: `${m.pct}%` }}
                              />
                            </div>
                            <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                              {m.pct}%
                            </span>
                          </div>
                        </td>
                        <td className="py-3 text-right">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                            m.status === 'EXCELLENT'
                              ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400'
                              : m.status === 'GOOD'
                              ? 'bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400'
                              : 'bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400'
                          }`}>
                            <Check className="w-3 h-3" />
                            <span>{m.status === 'EXCELLENT' ? 'Xuất sắc' : m.status === 'GOOD' ? 'Tích cực' : 'Đạt yêu cầu'}</span>
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* AI Contract Transparency (Khế ước sử dụng AI) */}
            <div className="rounded-lg bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-5 shadow-xs space-y-3">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
                <Bot className="w-4 h-4 text-orange-500" />
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                  Nhật ký sử dụng AI & Khế ước minh bạch (AI Contract Logs)
                </h4>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Theo quy định RBL, sinh viên lưu trữ danh sách Prompt đã dùng để chứng minh năng lực kiểm soát mã nguồn:
              </p>
              <div className="space-y-2 text-xs">
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 space-y-1">
                  <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500">
                    <span>Prompt #01: Tối ưu Room DAO Flow queries</span>
                    <span className="font-mono text-slate-400">11/10/2026 - Claude 3.5 Sonnet</span>
                  </div>
                  <p className="text-slate-700 dark:text-slate-300 font-mono text-[11px] bg-white dark:bg-slate-900 p-2 rounded-lg border border-slate-200/60 dark:border-slate-800">
                    &quot;Hãy giải thích sự khác biệt giữa collect và collectAsStateWithLifecycle trong Jetpack Compose và đề xuất cách bọc Flow an toàn trong Room Database.&quot;
                  </p>
                  <span className="text-[10px] text-emerald-600 font-bold block pt-0.5">
                    ✓ Đã giải trình logic và tùy biến code phù hợp kiến trúc bài nộp.
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── TAB 5: LỊCH SỬ NỘP BÀI ── */}
        {activeTab === 'history' && (
          <div className="rounded-lg bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-5 space-y-3 shadow-xs text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <span className="font-bold text-slate-900 dark:text-white">Lần nộp #1 (Chính thức)</span>
              <span className="text-emerald-600 dark:text-emerald-400 font-bold">9.5 / 10 điểm</span>
            </div>
            <p className="text-slate-500">Nộp vào lúc 13:42 13/10/2026 • File: app-submission.zip (1.8 MB)</p>
          </div>
        )}

      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          RIGHT SIDEBAR COLUMN (xl:col-span-4):
          1. Card: Thông tin nộp bài (File, Thời gian, Lần nộp, Trạng thái)
          2. Card: Phúc khảo điểm (đơn giản, nhỏ gọn)
         ══════════════════════════════════════════════════════════════════════ */}
      <div className="xl:col-span-4 space-y-5">
        
        {/* ── CARD 1: THÔNG TIN NỘP BÀI (CHUẨN THEO ẢNH) ── */}
        <div className="rounded-lg bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-5 shadow-xs space-y-4">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-slate-500" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              {isVi ? 'Thông tin nộp bài' : 'Submission Details'}
            </h3>
          </div>

          <div className="space-y-3 text-xs">
            {/* File nộp */}
            <div className="flex items-center justify-between gap-2">
              <span className="text-slate-500 dark:text-slate-400">{isVi ? 'File nộp' : 'File'}</span>
              
              <div className="flex items-center justify-between gap-3 p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 flex-1 max-w-[210px]">
                <div className="flex items-center gap-1.5 min-w-0">
                  <FileCode className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                  <div className="truncate">
                    <span className="block font-medium text-slate-800 dark:text-slate-200 truncate text-[11px]">
                      {filename}
                    </span>
                    <span className="block text-[10px] text-slate-400">
                      {fileSize}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  className="p-1 text-blue-600 dark:text-blue-400 hover:text-blue-700 cursor-pointer shrink-0"
                  title="Tải xuống bài làm"
                >
                  <Download className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Thời gian nộp */}
            <div className="flex items-center justify-between">
              <span className="text-slate-500 dark:text-slate-400">{isVi ? 'Thời gian nộp' : 'Submitted At'}</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200 font-mono">
                13:42 13/10/2026
              </span>
            </div>

            {/* Thời gian chấm */}
            <div className="flex items-center justify-between">
              <span className="text-slate-500 dark:text-slate-400">{isVi ? 'Thời gian chấm' : 'Graded At'}</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200 font-mono">
                16:32 01/10/2026
              </span>
            </div>

            {/* Lần nộp */}
            <div className="flex items-center justify-between">
              <span className="text-slate-500 dark:text-slate-400">{isVi ? 'Lần nộp' : 'Attempt'}</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">
                {submission?.attemptNumber || 1} / {submission?.maxAttempts || 3}
              </span>
            </div>

            {/* Trạng thái */}
            <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-800">
              <span className="text-slate-500 dark:text-slate-400">{isVi ? 'Trạng thái' : 'Status'}</span>
              <span className="inline-flex items-center gap-1.5 font-bold text-emerald-600 dark:text-emerald-400">
                <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 stroke-[2.5]" />
                <span>{isVi ? 'Đã chấm' : 'Graded'}</span>
              </span>
            </div>
          </div>
        </div>

        {/* ── CARD 2: PHÚC KHẢO ĐIỂM (ĐƠN GIẢN, NHỎ GỌN) ── */}
        <div className="rounded-lg bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-4 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-[#FA7014]" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                {isVi ? 'Phúc khảo điểm' : 'Grade Appeal'}
              </h3>
            </div>
            {submission?.studentFeedback && (
              <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400">
                {isVi ? 'Đã gửi' : 'Submitted'}
              </span>
            )}
          </div>

          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            {submission?.studentFeedback
              ? (isVi ? `Đơn đã gửi: "${submission.studentFeedback}"` : `Submitted: "${submission.studentFeedback}"`)
              : (isVi ? 'Gửi yêu cầu nếu bạn cần giảng viên xem xét lại kết quả chấm bài.' : 'Submit an appeal if you need your score reviewed.')}
          </p>

          <button
            type="button"
            onClick={() => onOpenAppeal?.()}
            className="w-full py-2 px-3 rounded-xl bg-gradient-to-r from-orange-500 via-amber-500 to-orange-400 hover:from-orange-600 hover:via-amber-500 hover:to-orange-500 text-white text-xs font-bold transition-all shadow-md shadow-orange-500/20 flex items-center justify-center gap-1.5 cursor-pointer active:scale-[0.99]"
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>
              {submission?.studentFeedback
                ? (isVi ? 'Cập nhật đơn phúc khảo' : 'Update Appeal')
                : (isVi ? 'Gửi đơn phúc khảo' : 'Submit Grade Appeal')}
            </span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

      </div>

    </div>
  )
}
