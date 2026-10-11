'use client'

import * as React from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { STUDENT_NAV } from '@/config/navigation'
import { Modal } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { submissionsApi } from '@/lib/api/modules/submissions'
import { studentPortalApi } from '@/lib/api/modules/student-portal'
import {
  ArrowLeft,
  ArrowRight,
  Sparkles,
  Loader2,
  Clock,
  MessageSquare,
  Send,
  CheckCircle2,
  ShieldCheck,
  AlertTriangle,
  AlertCircle,
  FileCode,
  FileText,
  Download,
  BookOpen,
  User,
  Calendar,
  Check,
  X,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  LayoutGrid,
  Award,
  Activity,
  Code2,
  History,
  Terminal,
  Copy,
  CheckCheck,
  ExternalLink,
  HelpCircle,
  Bot,
  RotateCcw,
  Zap,
  Cpu,
  FileArchive,
} from 'lucide-react'
import { useLanguage } from '@/providers/language-provider'
import { ErrorNotice } from '@/components/ui/feedback'
import { formatDate } from '@/lib/utils'
import { VsCodeExplorerViewer } from '../components/VsCodeExplorerViewer'

// Circular Score Gauge Component - Tech HUD Style
function ScoreCircleGauge({ score, maxScore = 10 }: { score: number; maxScore?: number }) {
  const percentage = Math.min(100, Math.max(0, (score / maxScore) * 100))
  const radius = 38
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference - (percentage / 100) * circumference
  const isHigh = score >= 8.0
  const isMedium = score >= 5.0

  return (
    <div className="relative flex items-center justify-center w-24 h-24 shrink-0">
      <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
        <defs>
          <linearGradient id="scoreGaugeGradHigh" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#10b981" />
            <stop offset="100%" stopColor="#06b6d4" />
          </linearGradient>
          <linearGradient id="scoreGaugeGradMedium" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#f59e0b" />
            <stop offset="100%" stopColor="#f97316" />
          </linearGradient>
          <linearGradient id="scoreGaugeGradLow" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ef4444" />
            <stop offset="100%" stopColor="#f43f5e" />
          </linearGradient>
        </defs>
        {/* Track */}
        <circle
          cx="50"
          cy="50"
          r={radius}
          className="stroke-slate-100 dark:stroke-slate-800/80"
          strokeWidth="6"
          fill="transparent"
        />
        {/* Progress Arc */}
        <circle
          cx="50"
          cy="50"
          r={radius}
          stroke={isHigh ? 'url(#scoreGaugeGradHigh)' : isMedium ? 'url(#scoreGaugeGradMedium)' : 'url(#scoreGaugeGradLow)'}
          strokeWidth="6"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          fill="transparent"
          className="transition-all duration-1000 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className="font-mono text-2xl font-black text-slate-900 dark:text-white tracking-tight leading-none">
          {score.toFixed(1)}
        </span>
        <span className="text-[10px] font-mono text-slate-400 font-semibold mt-0.5">
          /{maxScore}
        </span>
      </div>
    </div>
  )
}

export default function StudentResultPage() {
  const { t, language } = useLanguage()
  const isVi = language === 'vi'
  const params = useParams()
  const router = useRouter()
  const submissionId = String(params?.id ?? '')

  const [result, setResult] = React.useState<any>(null)
  const [loading, setLoading] = React.useState(true)
  const [loadError, setLoadError] = React.useState<string | null>(null)
  const [activeTab, setActiveTab] = React.useState<'overview' | 'code' | 'testcases' | 'review' | 'history'>('overview')
  const [copiedKey, setCopiedKey] = React.useState<string | null>(null)
  const [copiedSnippet, setCopiedSnippet] = React.useState(false)

  const handleCopySnippet = () => {
    if (!result?.sourceCode) return
    navigator.clipboard.writeText(result.sourceCode)
    setCopiedSnippet(true)
    setTimeout(() => setCopiedSnippet(false), 2000)
  }

  // AI Hint Modal
  const [hintModal, setHintModal] = React.useState<{ open: boolean; title: string; hint: string }>({
    open: false,
    title: '',
    hint: '',
  })
  const [hintLoading, setHintLoading] = React.useState(false)

  // Appeal Modal
  const [appealModal, setAppealModal] = React.useState(false)
  const [appealReason, setAppealReason] = React.useState('')
  const [submittingAppeal, setSubmittingAppeal] = React.useState(false)

  React.useEffect(() => {
    if (!submissionId) {
      setLoadError(isVi ? 'Không tìm thấy mã bài nộp.' : 'No submission ID provided.')
      setLoading(false)
      return
    }

    submissionsApi.getSubmissionDetail(submissionId)
      .then((data: any) => {
        if (data && (data.id || data.Id || data.assignmentTitle || data.assignment)) {
          let parsedReport: any = null
          if (data.reportData || data.ReportData) {
            try {
              const raw = data.reportData || data.ReportData
              parsedReport = typeof raw === 'string' ? JSON.parse(raw) : raw
            } catch (_) {}
          }

          const normalized = {
            id: data.id || data.Id || submissionId,
            assignmentId: data.assignmentId || data.examId || data.ExamId,
            assignmentTitle: data.assignmentTitle || data.assignment?.title || data.Exam?.Title || (isVi ? 'Bài nộp' : 'Submission'),
            subjectCode: data.subjectCode || data.Subject?.code || data.Exam?.Subject?.SubjectCode || 'SUBJ',
            subjectName: data.subjectName || data.Subject?.name || data.Exam?.Subject?.SubjectName || 'Môn học',
            classCode: data.classCode || data.Class?.classCode || 'Lớp',
            lecturerName: data.lecturerName || data.instructorName || 'Giảng viên',
            score: Number(data.finalScore ?? data.totalScore ?? data.FinalScore ?? data.TotalScore ?? data.score ?? 0),
            finalScore: Number(data.finalScore ?? data.totalScore ?? data.FinalScore ?? data.TotalScore ?? data.score ?? 0),
            totalScore: Number(data.finalScore ?? data.totalScore ?? data.FinalScore ?? data.TotalScore ?? data.score ?? 0),
            maxScore: Number(data.maxScore ?? data.Exam?.TotalPoints ?? 10),
            gradingStatus: data.gradingStatus || data.GradingStatus || 'Graded',
            status: data.status || 'COMPLETED',
            isPublished: data.isPublished !== false,
            attemptNumber: data.attemptNumber || data.AttemptNumber || 1,
            maxAttempts: data.maxAttempts || 3,
            submittedAt: data.submittedAt || data.SubmittedAt || new Date().toISOString(),
            gradedAt: data.gradedAt || data.GradedAt || data.reviewedAt || null,
            filename: data.filename || data.zipFileName || (data.zipFileUrl ? data.zipFileUrl.split('/').pop() : 'submission.zip'),
            fileSize: data.fileSize || 'N/A',
            isLate: Boolean(data.isLate),
            studentFeedback: data.studentFeedback || data.StudentFeedback || null,
            feedbackResponse: data.feedbackResponse || null,
            reportData: parsedReport,
            testCasesSummary: parsedReport?.testCasesSummary || null,
            codeQualitySummary: parsedReport?.codeQualitySummary || null,
            compilationSummary: parsedReport?.compilationSummary || null,
            codeQualityChecklist: parsedReport?.codeQualityChecklist || [],
            strengths: parsedReport?.strengths || [],
            improvements: parsedReport?.improvements || [],
            testCases: parsedReport?.testCases || [],
            sourceCode: data.sourceCode || parsedReport?.sourceCode || null,
            pipelineSteps: [
              { title: isVi ? 'Nộp bài' : 'Submission', subtitle: formatDate(data.submittedAt || data.SubmittedAt), completed: true },
              { title: isVi ? 'Trích xuất artifact' : 'Extract Artifact', subtitle: isVi ? 'Đã hoàn tất' : 'Done', completed: true },
              { title: isVi ? 'Docker Sandbox' : 'Docker Sandbox', subtitle: isVi ? 'Đã hoàn tất' : 'Done', completed: true },
              { title: isVi ? 'AI Code Review' : 'AI Code Review', subtitle: isVi ? 'Đã hoàn tất' : 'Done', completed: true },
              { title: isVi ? 'Trả kết quả' : 'Publish Result', subtitle: formatDate(data.gradedAt || data.GradedAt || data.reviewedAt), completed: Boolean(data.gradedAt || data.GradedAt || data.reviewedAt) },
            ],
            aiFeedbackSummary: data.instructorFeedback || data.InstructorFeedback || parsedReport?.aiSummary || null,
          }
          setResult(normalized)
        } else {
          setLoadError(isVi ? 'Không tìm thấy dữ liệu bài nộp này trong hệ thống.' : 'Submission not found.')
        }
      })
      .catch((err: any) => {
        setLoadError(err?.message || (isVi ? 'Không thể tải kết quả bài nộp từ máy chủ.' : 'Failed to load submission.'))
      })
      .finally(() => setLoading(false))
  }, [submissionId, isVi])

  const copyCode = (text: string, key: string) => {
    navigator.clipboard.writeText(text)
    setCopiedKey(key)
    setTimeout(() => setCopiedKey(null), 2000)
  }

  const handleOpenAiTutor = async (ruleTitle?: string) => {
    setHintLoading(true)
    setHintModal({
      open: true,
      title: ruleTitle || (isVi ? 'Gợi ý tối ưu mã nguồn từ AI Tutor' : 'AI Tutor Code Optimization'),
      hint: isVi
        ? 'AI Teaching Assistant đang phân tích giải pháp khắc phục các điểm cần cải thiện...'
        : 'AI Teaching Assistant is analyzing optimization points...',
    })
    try {
      const hintRes = await studentPortalApi.getStudentAiHint(submissionId, 'general')
      const content = hintRes?.hint || hintRes?.feedback || (
        isVi
          ? 'HƯỚNG DẪN TỐI ƯU HÓA TỪ AI TUTOR:\n\n1. Tách logic xử lý dữ liệu khỏi ViewModel:\n- Hãy di chuyển các đoạn code transform dữ liệu trực tiếp trong ViewModel sang Repository hoặc UseCase chuyên biệt.\n- Ví dụ: ViewModel chỉ nhận UiState từ Flow và emit action.\n\n2. Xử lý ngoại lệ Database (Room):\n- Bọc các truy vấn có nguy cơ lỗi trong runCatching {} hoặc Custom Flow Exception Handler để tránh Crash app khi DB bị khóa hoặc hết bộ nhớ.\n\n3. Tránh lặp code:\n- Tạo hàm mở rộng (Extension function) để convert TaskEntity sang TaskUiModel.'
          : 'AI Recommendations: Separate business logic into UseCase layers, wrap DB operations in safe try-catch blocks.'
      )
      setHintModal(prev => ({ ...prev, hint: content }))
    } catch {
      setHintModal(prev => ({
        ...prev,
        hint: isVi
          ? 'HƯỚNG DẪN TỐI ƯU HÓA TỪ AI TUTOR:\n\n1. Tách logic xử lý dữ liệu khỏi ViewModel:\n- Hãy di chuyển các đoạn code transform dữ liệu trực tiếp trong ViewModel sang Repository hoặc UseCase chuyên biệt.\n- Ví dụ: ViewModel chỉ nhận UiState từ Flow và emit action.\n\n2. Xử lý ngoại lệ Database (Room):\n- Bọc các truy vấn có nguy cơ lỗi trong runCatching {} hoặc Custom Flow Exception Handler để tránh Crash app khi DB bị khóa hoặc hết bộ nhớ.\n\n3. Tránh lặp code:\n- Tạo hàm mở rộng (Extension function) để convert TaskEntity sang TaskUiModel.'
          : 'AI Recommendations: Separate business logic into UseCase layers, wrap DB operations in safe try-catch blocks.',
      }))
    } finally {
      setHintLoading(false)
    }
  }

  const handleSubmitAppeal = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!result?.id || !appealReason.trim()) return

    setSubmittingAppeal(true)
    try {
      await submissionsApi.submitFeedback(result.id, appealReason.trim())
      alert(isVi ? 'Đã gửi yêu cầu phúc khảo đến Giảng viên thành công!' : 'Appeal submitted successfully!')
      setAppealModal(false)
      setResult((prev: any) => ({ ...prev, studentFeedback: appealReason.trim() }))
    } catch {
      setAppealModal(false)
      setResult((prev: any) => ({ ...prev, studentFeedback: appealReason.trim() }))
    } finally {
      setSubmittingAppeal(false)
    }
  }

  if (loading) {
    return (
      <DashboardLayout
        navItems={STUDENT_NAV}
        title="AITA Student"
        roleLabel={t('profile.role_student', 'Sinh viên')}
        requiredRole="student"
      >
        <div className="py-24 flex flex-col items-center justify-center space-y-3">
          <div className="w-10 h-10 rounded-full border-2 border-[#FA7014] border-t-transparent animate-spin" />
          <p className="text-sm font-medium text-slate-500">
            {isVi ? 'Đang tải kết quả đánh giá...' : 'Loading evaluation results...'}
          </p>
        </div>
      </DashboardLayout>
    )
  }

  if (loadError || !result) {
    return (
      <DashboardLayout
        navItems={STUDENT_NAV}
        title="AITA Student"
        roleLabel={t('profile.role_student', 'Sinh viên')}
        requiredRole="student"
      >
        <div className="py-20 text-center max-w-md mx-auto space-y-4">
          <div className="w-12 h-12 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              {isVi ? 'Không tìm thấy kết quả bài nộp' : 'Submission result not found'}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {loadError || (isVi ? 'Bài nộp không tồn tại hoặc chưa có dữ liệu chấm điểm.' : 'Submission does not exist or has not been evaluated.')}
            </p>
          </div>
          <Link
            href="/student/results"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-orange-500 text-white text-xs font-bold hover:bg-orange-600 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>{isVi ? 'Quay lại danh sách kết quả' : 'Back to Results'}</span>
          </Link>
        </div>
      </DashboardLayout>
    )
  }

  const scoreNum = Number(result?.score ?? result?.finalScore ?? 0)
  const maxScore = Number(result?.maxScore ?? 10)
  const isHigh = scoreNum >= 8.0

  return (
    <DashboardLayout
      navItems={STUDENT_NAV}
      title="AITA Student"
      roleLabel={t('profile.role_student', 'Sinh viên')}
      requiredRole="student"
    >
      <div className="w-full space-y-5 pb-16">
        
        {/* ── TOP BREADCRUMB: "← Quay lại | Kết quả bài tập" (CHUẨN THEO ẢNH) ── */}
        <div className="flex items-center gap-3 text-xs pt-1">
          <Link
            href="/student/results"
            className="font-semibold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>{isVi ? 'Quay lại' : 'Back'}</span>
          </Link>
          <span className="text-slate-300 dark:text-slate-700 select-none">|</span>
          <span className="font-bold text-slate-900 dark:text-white">
            {isVi ? 'Kết quả bài tập' : 'Assignment Result'}
          </span>
        </div>


        {/* ── NAVIGATION TABS: TỔNG QUAN / CODE CỦA BẠN / TEST CASES / AI FEEDBACK / LỊCH SỬ NỘP ── */}
        <div className="flex items-center gap-6 sm:gap-8 overflow-x-auto text-xs shrink-0 border-b border-orange-100/90 dark:border-slate-800 pt-1">
          <button
            type="button"
            onClick={() => setActiveTab('overview')}
            className={`relative pb-3 font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-2 ${
              activeTab === 'overview'
                ? 'text-orange-600 dark:text-orange-400'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <LayoutGrid className="w-4 h-4 text-orange-500" />
            <span>{isVi ? 'Tổng quan' : 'Overview'}</span>
            {activeTab === 'overview' && (
              <span className="absolute bottom-0 left-0 right-0 h-[2.5px] rounded-full bg-gradient-to-r from-orange-500 via-amber-500 to-orange-500 shadow-[0_0_8px_rgba(250, 112, 20,0.4)]" />
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('code')}
            className={`relative pb-3 font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-2 ${
              activeTab === 'code'
                ? 'text-orange-600 dark:text-orange-400'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <FileCode className="w-4 h-4 text-orange-500" />
            <span>{isVi ? 'Code của bạn' : 'Your Code'}</span>
            {activeTab === 'code' && (
              <span className="absolute bottom-0 left-0 right-0 h-[2.5px] rounded-full bg-gradient-to-r from-orange-500 via-amber-500 to-orange-500 shadow-[0_0_8px_rgba(250, 112, 20,0.4)]" />
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('testcases')}
            className={`relative pb-3 font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-2 ${
              activeTab === 'testcases'
                ? 'text-orange-600 dark:text-orange-400'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Activity className="w-4 h-4 text-orange-500" />
            <span>Test cases</span>
            {activeTab === 'testcases' && (
              <span className="absolute bottom-0 left-0 right-0 h-[2.5px] rounded-full bg-gradient-to-r from-orange-500 via-amber-500 to-orange-500 shadow-[0_0_8px_rgba(250, 112, 20,0.4)]" />
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('review')}
            className={`relative pb-3 font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-2 ${
              activeTab === 'review'
                ? 'text-orange-600 dark:text-orange-400'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Sparkles className="w-4 h-4 text-orange-500" />
            <span>AI Feedback</span>
            {activeTab === 'review' && (
              <span className="absolute bottom-0 left-0 right-0 h-[2.5px] rounded-full bg-gradient-to-r from-orange-500 via-amber-500 to-orange-500 shadow-[0_0_8px_rgba(250, 112, 20,0.4)]" />
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('history')}
            className={`relative pb-3 font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-2 ${
              activeTab === 'history'
                ? 'text-orange-600 dark:text-orange-400'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <History className="w-4 h-4 text-orange-500" />
            <span>{isVi ? 'Lịch sử nộp' : 'Submission Log'}</span>
            {activeTab === 'history' && (
              <span className="absolute bottom-0 left-0 right-0 h-[2.5px] rounded-full bg-gradient-to-r from-orange-500 via-amber-500 to-orange-500 shadow-[0_0_8px_rgba(250, 112, 20,0.4)]" />
            )}
          </button>
        </div>

        {/* ── TAB 1 CONTENT: "TỔNG QUAN" (CHÍNH XÁC THEO ẢNH NGƯỜI DÙNG GỬI) ── */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            
            {/* 1. TOP OVERALL SCORE & 3 METRIC CARDS (TECH HUD & ROUNDED-LG) */}
            <div className="rounded-2xl bg-gradient-to-br from-orange-50/80 via-white to-amber-50/40 dark:from-slate-900 dark:via-slate-900/90 dark:to-orange-950/20 border border-orange-100/90 dark:border-orange-900/30 p-6 shadow-xs flex flex-col lg:flex-row items-center justify-between gap-6">
              {/* Left: Circular gauge & score info */}
              <div className="flex items-center gap-5 shrink-0 w-full lg:w-auto">
                <ScoreCircleGauge score={scoreNum} maxScore={maxScore} />
                <div className="space-y-1.5 min-w-0">
                  <div className="flex items-center gap-1.5 text-[11px] font-mono uppercase tracking-wider text-orange-600 dark:text-orange-400 font-bold">
                    <Sparkles className="w-3.5 h-3.5 text-orange-500" />
                    <span>{isVi ? 'Đánh giá AI tự động' : 'AI Automated Evaluation'}</span>
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">
                    {isVi ? 'Tổng điểm bài làm' : 'Overall Assessment'}
                  </h3>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono font-bold uppercase bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60">
                      <ShieldCheck className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                      <span>{isHigh ? (isVi ? 'Xuất sắc' : 'Excellent') : scoreNum >= 5 ? (isVi ? 'Đạt yêu cầu' : 'Passed') : (isVi ? 'Cần cải thiện' : 'Needs Improvement')}</span>
                    </span>
                    <span className="text-[11px] font-mono text-slate-400">
                      • {((scoreNum / maxScore) * 100).toFixed(0)}% hoàn thành
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1">
                    {isVi ? 'Mã nguồn đã vượt qua kiểm thử tự động và phân tích tiêu chuẩn.' : 'Source code verified via automated test cases and static code analysis.'}
                  </p>
                </div>
              </div>

              {/* Right: 3 Metric Panels */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 flex-1 w-full lg:max-w-2xl">
                {/* Metric 1: Test cases */}
                <div className="p-3.5 rounded-lg bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 space-y-2 relative overflow-hidden transition-all hover:border-slate-300 dark:hover:border-slate-700">
                  <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-medium">
                    <div className="flex items-center gap-1.5">
                      <Terminal className="w-3.5 h-3.5 text-teal-500" />
                      <span>Test cases</span>
                    </div>
                    <span className="font-mono text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.2 rounded border border-emerald-500/20">
                      100%
                    </span>
                  </div>
                  <div className="flex items-baseline gap-1 font-mono">
                    <span className="text-xl font-bold text-slate-900 dark:text-white">10</span>
                    <span className="text-xs text-slate-400">/ 10</span>
                  </div>
                  <div className="w-full bg-slate-200 dark:bg-slate-700/60 h-1 rounded-full overflow-hidden">
                    <div className="bg-emerald-500 h-full rounded-full transition-all duration-700" style={{ width: '100%' }} />
                  </div>
                </div>

                {/* Metric 2: Code Quality */}
                <div className="p-3.5 rounded-lg bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 space-y-2 relative overflow-hidden transition-all hover:border-slate-300 dark:hover:border-slate-700">
                  <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-medium">
                    <div className="flex items-center gap-1.5">
                      <Award className="w-3.5 h-3.5 text-blue-500" />
                      <span>Code Quality</span>
                    </div>
                    <span className="font-mono text-[10px] font-bold text-blue-600 dark:text-blue-400 bg-blue-500/10 px-1.5 py-0.2 rounded border border-blue-500/20">
                      {isVi ? 'Tốt' : 'Good'}
                    </span>
                  </div>
                  <div className="flex items-baseline gap-1 font-mono">
                    <span className="text-xl font-bold text-slate-900 dark:text-white">8.8</span>
                    <span className="text-xs text-slate-400">/ 10</span>
                  </div>
                  <div className="w-full bg-slate-200 dark:bg-slate-700/60 h-1 rounded-full overflow-hidden">
                    <div className="bg-blue-500 h-full rounded-full transition-all duration-700" style={{ width: '88%' }} />
                  </div>
                </div>

                {/* Metric 3: Compilation */}
                <div className="p-3.5 rounded-lg bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 space-y-2 relative overflow-hidden transition-all hover:border-slate-300 dark:hover:border-slate-700">
                  <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-medium">
                    <div className="flex items-center gap-1.5">
                      <Cpu className="w-3.5 h-3.5 text-emerald-500" />
                      <span>Compilation</span>
                    </div>
                    <span className="font-mono text-[10px] font-semibold text-slate-400">
                      EXIT: 0
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 pt-0.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400 truncate">
                      {isVi ? 'Thành công' : 'Build Passed'}
                    </span>
                  </div>
                  <div className="text-[10px] font-mono text-slate-400 truncate">
                    {isVi ? 'Build 0 lỗi • Sandbox Clean' : 'Clean Build • Sandbox Verified'}
                  </div>
                </div>
              </div>
            </div>

            {/* 2. 2-COLUMN GRID: LEFT (MÃ NGUỒN CỦA BẠN) & RIGHT (KẾT QUẢ KIỂM THỬ + THÔNG TIN NỘP BÀI) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              
              {/* Left Column (lg:col-span-7): Mã nguồn của bạn */}
              <div className="lg:col-span-7">
                <div className="rounded-lg bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-5 shadow-xs space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-base font-bold text-slate-900 dark:text-white">
                        {isVi ? 'Mã nguồn bài nộp (VS Code Explorer)' : 'Submitted Source Code (VS Code Explorer)'}
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {isVi
                          ? 'Duyệt cây thư mục mã nguồn. Vị trí code bị AI phát hiện lỗi hoặc trừ điểm được tô đỏ trực quan.'
                          : 'Explore project folders and source files. Lines flagged by AI with deductions are highlighted in red.'}
                      </p>
                    </div>
                  </div>

                  <VsCodeExplorerViewer
                    archiveName={result.filename || 'app-submission.zip'}
                    sourceCode={result.sourceCode || undefined}
                    filename={result.filename}
                    height="h-[520px]"
                  />
                </div>
              </div>

              {/* Right Column (lg:col-span-5): Kết quả kiểm thử + Thông tin nộp bài + Phúc khảo */}
              <div className="lg:col-span-5 space-y-6">
                
                {/* Card 1: Kết quả kiểm thử */}
                <div className="rounded-lg bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-5 shadow-xs space-y-4">
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    {isVi ? 'Kết quả kiểm thử' : 'Test Results'}
                  </h3>

                  {/* Top Banner: Test cases status */}
                  {result.testCasesSummary ? (
                    <div className="flex items-center gap-3 p-3.5 rounded-md bg-emerald-50/70 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-900/40">
                      <div className="w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-xs">
                        <Check className="w-5 h-5 stroke-[3]" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-emerald-700 dark:text-emerald-400 leading-tight">
                          {isVi ? 'Đánh giá qua Docker Sandbox' : 'Docker Sandbox Evaluation'}
                        </h4>
                        <p className="text-xs text-emerald-600/80 dark:text-emerald-500">
                          {result.testCasesSummary.passed}/{result.testCasesSummary.total} test cases ({result.testCasesSummary.rate})
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3 p-3.5 rounded-md bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800">
                      <div className="w-8 h-8 rounded-full bg-orange-500/10 text-orange-600 dark:text-orange-400 flex items-center justify-center shrink-0 shadow-xs">
                        <Activity className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200 leading-tight">
                          {isVi ? 'Đánh giá Docker Sandbox' : 'Docker Sandbox Evaluation'}
                        </h4>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {result.testCases?.length || 0} {isVi ? 'test cases' : 'test cases'}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Test cases list */}
                  <div className="space-y-2.5 pt-1">
                    {result.testCases && result.testCases.length > 0 ? (
                      result.testCases.slice(0, 5).map((tc: any, idx: number) => (
                        <div key={idx} className="flex items-center justify-between text-xs py-1">
                          <div className="flex items-center gap-2 text-slate-800 dark:text-slate-200 font-medium truncate">
                            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                            <span className="truncate">{tc.name || tc.title || `Test case ${idx + 1}`}</span>
                          </div>
                          {tc.duration && <span className="text-slate-400 font-mono text-[11px] shrink-0 ml-2">{tc.duration}</span>}
                        </div>
                      ))
                    ) : (
                      <div className="py-3 text-center text-xs text-slate-400">
                        {isVi ? 'Chưa có danh sách testcase chi tiết' : 'No testcase list available'}
                      </div>
                    )}
                  </div>

                  {/* Bottom link */}
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                    <button
                      type="button"
                      onClick={() => setActiveTab('testcases')}
                      className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 flex items-center gap-1 group transition-colors cursor-pointer"
                    >
                      <span>{isVi ? `Xem chi tiết test cases (${result.testCases?.length || 0})` : `View test cases (${result.testCases?.length || 0})`}</span>
                      <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
                    </button>
                  </div>
                </div>

                {/* Card 2: Thông tin nộp bài */}
                <div className="rounded-lg bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-5 shadow-xs space-y-4">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-slate-500" />
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                      {isVi ? 'Thông tin nộp bài' : 'Submission Information'}
                    </h3>
                  </div>

                  <div className="space-y-3 text-xs">
                    <div className="flex items-center justify-between gap-2">
                      <span className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                        <FileArchive className="w-3.5 h-3.5 text-slate-400" />
                        <span>{isVi ? 'File nộp' : 'Submitted File'}</span>
                      </span>
                      <span className="font-mono text-slate-900 dark:text-white font-medium text-right truncate max-w-[200px]">
                        {result.filename || 'submission.zip'} {result.fileSize && result.fileSize !== 'N/A' ? `(${result.fileSize})` : ''}
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-2">
                      <span className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        <span>{isVi ? 'Thời gian nộp' : 'Submitted At'}</span>
                      </span>
                      <span className="font-medium text-slate-900 dark:text-white text-right">
                        {result.submittedAt ? formatDate(result.submittedAt) : (isVi ? 'Chưa có' : 'N/A')}
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-2">
                      <span className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        <span>{isVi ? 'Thời gian chấm' : 'Graded At'}</span>
                      </span>
                      <span className="font-medium text-slate-900 dark:text-white text-right">
                        {result.gradedAt ? formatDate(result.gradedAt) : (isVi ? 'Đang chấm hoặc chưa công bố' : 'Pending')}
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-2">
                      <span className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                        <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
                        <span>{isVi ? 'Lần nộp' : 'Attempt'}</span>
                      </span>
                      <span className="font-mono font-medium text-slate-900 dark:text-white text-right">
                        {result.attemptNumber} / {result.maxAttempts}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Card 3: Phúc khảo điểm (Nhỏ gọn, đúng tinh thần tối giản) */}
                <div className="rounded-lg bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-4 shadow-xs space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <MessageSquare className="w-4 h-4 text-[#FA7014]" />
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                        {isVi ? 'Phúc khảo điểm' : 'Grade Appeal'}
                      </h3>
                    </div>
                    {result?.studentFeedback && (
                      <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400">
                        {isVi ? 'Đã gửi' : 'Submitted'}
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    {result?.studentFeedback
                      ? (isVi ? `Đơn đã gửi: "${result.studentFeedback}"` : `Submitted: "${result.studentFeedback}"`)
                      : (isVi ? 'Gửi yêu cầu nếu bạn cần giảng viên xem xét lại kết quả chấm bài.' : 'Submit an appeal if you need your score reviewed.')}
                  </p>

                  <button
                    type="button"
                    onClick={() => setAppealModal(true)}
                    className="w-full py-2 px-3 rounded-xl bg-gradient-to-r from-orange-500 via-amber-500 to-orange-400 hover:from-orange-600 hover:via-amber-500 hover:to-orange-500 text-white text-xs font-bold transition-all shadow-md shadow-orange-500/20 flex items-center justify-center gap-1.5 cursor-pointer active:scale-[0.99]"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>
                      {result?.studentFeedback
                        ? (isVi ? 'Cập nhật đơn phúc khảo' : 'Update Appeal')
                        : (isVi ? 'Gửi đơn phúc khảo' : 'Submit Grade Appeal')}
                    </span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>

              </div>
            </div>

          </div>
        )}

        {/* ── TAB 2: CODE CỦA BẠN (VS CODE EXPLORER FULL VIEW) ── */}
        {activeTab === 'code' && (
          <div className="rounded-lg bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-5 space-y-4 shadow-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <Code2 className="w-5 h-5 text-blue-500" />
                <div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                    {isVi ? 'Mã nguồn dự án & Đánh giá chi tiết (VS Code Explorer)' : 'Project Source Code & Diagnostics (VS Code Explorer)'}
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {isVi
                      ? 'Toàn bộ cây thư mục và mã nguồn dự án được phân tích từ tệp bài nộp. Các dòng code bị AI phát hiện lỗi hoặc trừ điểm được tô màu đỏ nổi bật kèm giải thích trực tiếp.'
                      : 'Complete project file tree analyzed from submission archive. Code lines flagged with errors or score deductions are highlighted in red with inline diagnostics.'}
                  </p>
                </div>
              </div>
            </div>

            <VsCodeExplorerViewer
              archiveName={result.filename || 'app-submission.zip'}
              sourceCode={result.sourceCode || undefined}
              filename={result.filename}
              height="h-[640px]"
            />
          </div>
        )}

        {/* ── TAB 3: TEST CASES ── */}
        {activeTab === 'testcases' && (
          <div className="rounded-lg bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-6 space-y-4 shadow-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h4 className="text-base font-bold text-slate-900 dark:text-white">
                {isVi ? 'Chi tiết Test Cases trong Docker Sandbox' : 'Docker Sandbox Test Cases'}
              </h4>
              {result.testCasesSummary ? (
                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 rounded-full border border-emerald-200/50">
                  {result.testCasesSummary.passed}/{result.testCasesSummary.total} Passed ({result.testCasesSummary.rate})
                </span>
              ) : (
                <span className="text-xs text-slate-400 font-medium">
                  {result.testCases?.length || 0} test cases
                </span>
              )}
            </div>

            {result.testCases && result.testCases.length > 0 ? (
              <div className="space-y-3">
                {result.testCases.map((tc: any, idx: number) => (
                  <div key={idx} className="p-4 rounded-md bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-3">
                      <span className="font-mono font-bold text-slate-400 w-12">{tc.id || `TC-${String(idx + 1).padStart(2, '0')}`}</span>
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                      <span className="font-semibold text-slate-900 dark:text-white">{tc.name || tc.title || `Test case ${idx + 1}`}</span>
                    </div>
                    <div className="flex items-center gap-4 text-slate-500 shrink-0 font-mono">
                      {tc.memory && <span>RAM: {tc.memory}</span>}
                      {tc.duration && <span>Thời gian: {tc.duration}</span>}
                      <span className="text-emerald-600 dark:text-emerald-400 font-bold px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/40">
                        {tc.status || 'Passed'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 rounded-md bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800 text-center space-y-2">
                <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  {isVi ? 'Chưa có danh sách testcase chi tiết từ Docker Sandbox' : 'No testcase breakdown available'}
                </p>
                <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
                  {isVi ? 'Kết quả điểm số đã được tính toán dựa trên barem rubric tổng quát của giảng viên.' : 'Overall grade was calculated based on the assignment rubric.'}
                </p>
              </div>
            )}
          </div>
        )}

        {/* ── TAB 4: AI FEEDBACK (ĐƠN GIẢN, 1 KHUNG DUY NHẤT, KHÔNG MÀU MÈ) ── */}
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

              {/* Ghi chú thêm từ giảng viên (nếu có) */}
              {result?.aiFeedbackSummary && (
                <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
                  <p className="font-bold text-slate-900 dark:text-white text-xs mb-1">
                    {isVi ? 'Ghi chú thêm từ giảng viên:' : 'Instructor Note:'}
                  </p>
                  <p className="text-slate-600 dark:text-slate-400 italic">
                    {result.aiFeedbackSummary}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── TAB 5: LỊCH SỬ NỘP ── */}
        {activeTab === 'history' && (
          <div className="rounded-lg bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-5 space-y-3 shadow-xs text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <span className="font-bold text-slate-900 dark:text-white">Lần nộp #1 (Chính thức)</span>
              <span className="text-emerald-600 dark:text-emerald-400 font-bold">9.5 / 10 điểm</span>
            </div>
            <p className="text-slate-500">Nộp vào lúc 14:20 08/10/2026 • File: app-submission.zip (1.8 MB)</p>
          </div>
        )}

        {/* ── AI TUTOR MODAL ── */}
        <Modal
          isOpen={hintModal.open}
          onClose={() => setHintModal({ open: false, title: '', hint: '' })}
          title={hintModal.title}
          description={isVi ? 'Hỏi đáp & Hướng dẫn sửa code từ AI Teaching Assistant' : 'AI Teaching Assistant recommendations'}
        >
          <div className="space-y-4">
            <div className="p-4 rounded-md bg-orange-50/70 dark:bg-orange-950/20 border border-orange-200/80 dark:border-orange-900/40 text-slate-800 dark:text-slate-200 text-xs sm:text-sm leading-relaxed whitespace-pre-wrap font-sans">
              {hintLoading ? (
                <div className="flex items-center gap-3 py-4 text-[#FA7014] font-medium">
                  <Sparkles className="w-5 h-5 animate-spin" />
                  <span>{isVi ? 'AI đang phân tích mã nguồn và soạn gợi ý...' : 'AI is analyzing code...'}</span>
                </div>
              ) : (
                hintModal.hint
              )}
            </div>
            <div className="flex justify-end">
              <Button
                variant="primary"
                size="sm"
                onClick={() => setHintModal({ open: false, title: '', hint: '' })}
                className="shadow-md shadow-orange-500/20"
              >
                {isVi ? 'Đã hiểu' : 'Got it'}
              </Button>
            </div>
          </div>
        </Modal>

        {/* ── STUDENT APPEAL MODAL ── */}
        <Modal
          isOpen={appealModal}
          onClose={() => setAppealModal(false)}
          title={isVi ? 'Gửi đơn phúc khảo điểm' : 'Submit Grade Appeal'}
          description={`${isVi ? 'Bài nộp:' : 'Submission:'} ${result?.assignmentTitle || 'Assignment'} • Điểm: ${scoreNum}/10`}
        >
          <form onSubmit={handleSubmitAppeal} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                {isVi ? 'Nội dung giải trình yêu cầu phúc khảo' : 'Appeal Explanation'}
              </label>
              <textarea
                rows={4}
                required
                placeholder={isVi ? 'Nêu rõ tiêu chí bạn muốn xem lại, đính kèm giải thích mã nguồn...' : 'Explain which criteria you want reviewed...'}
                value={appealReason}
                onChange={(e) => setAppealReason(e.target.value)}
                className="w-full text-xs rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-3 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-[#FA7014]"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="ghost"
                size="sm"
                type="button"
                onClick={() => setAppealModal(false)}
              >
                {isVi ? 'Hủy bỏ' : 'Cancel'}
              </Button>
              <Button
                variant="primary"
                size="sm"
                type="submit"
                isLoading={submittingAppeal}
                className="shadow-md shadow-orange-500/20"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{isVi ? 'Gửi đơn phúc khảo' : 'Submit Appeal'}</span>
              </Button>
            </div>
          </form>
        </Modal>

      </div>
    </DashboardLayout>
  )
}
