'use client'

import * as React from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { STUDENT_NAV } from '@/config/navigation'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Modal } from '@/components/ui/modal'
import { EvaluationReportViewer } from '@/features/submissions/components/EvaluationReportViewer'
import { assignmentsApi } from '@/lib/api/modules/assignments'
import { submissionsApi } from '@/lib/api/modules/submissions'
import { studentPortalApi } from '@/lib/api/modules/student-portal'
import { formatDate } from '@/lib/utils'
import {
  UploadCloud,
  FileArchive,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ArrowLeft,
  FileText,
  Sparkles,
  Download,
  Database,
  Award,
  Layers,
  FileCode,
  Loader2,
  RefreshCw,
  Eye,
  RotateCcw,
  MessageSquare,
  ShieldCheck,
  Calendar,
  Send,
  AlertCircle,
} from 'lucide-react'
import { useLanguage } from '@/providers/language-provider'
import { ApiError } from '@/lib/api/client'
import { ErrorNotice } from '@/components/ui/feedback'

export default function StudentAssignmentDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { t, language } = useLanguage()
  const assignmentId = String(params?.id ?? '')

  const [assignment, setAssignment] = React.useState<any>(null)
  const [submission, setSubmission] = React.useState<any>(null)
  const [loading, setLoading] = React.useState(true)
  const [uploading, setUploading] = React.useState(false)
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null)
  const [dragActive, setDragActive] = React.useState(false)
  const [noteContent, setNoteContent] = React.useState('')
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null)
  const [successMsg, setSuccessMsg] = React.useState<string | null>(null)

  // Polling state for AI Grading
  const [isGradingWait, setIsGradingWait] = React.useState(false)
  const [gradingSeconds, setGradingSeconds] = React.useState(0)
  const [showUploadForm, setShowUploadForm] = React.useState(false)
  const pollingRef = React.useRef<NodeJS.Timeout | null>(null)

  // Active view tab when graded: 'report' | 'spec'
  const [viewTab, setViewTab] = React.useState<'report' | 'spec'>('report')

  // Real-time Countdown State
  const [countdownText, setCountdownText] = React.useState<string>('')
  const [deadlineStatus, setDeadlineStatus] = React.useState<'ON_TIME' | 'LATE_ALLOWED' | 'EXPIRED'>('ON_TIME')

  // AI Hint Modal
  const [hintModal, setHintModal] = React.useState<{ open: boolean; title: string; hint: string }>({
    open: false,
    title: '',
    hint: '',
  })
  const [hintLoading, setHintLoading] = React.useState(false)

  // Student Appeal / Feedback Modal (G6.6)
  const [appealModal, setAppealModal] = React.useState(false)
  const [appealReason, setAppealReason] = React.useState('')
  const [submittingAppeal, setSubmittingAppeal] = React.useState(false)

  // Fetch assignment & existing submission
  const loadData = React.useCallback(async () => {
    try {
      const [assignSummary, gradingDetail, history] = await Promise.all([
        assignmentsApi.getAssignment(assignmentId),
        assignmentsApi.getGradingAssignment(assignmentId).catch(error => {
          console.warn('Optional grading details could not be loaded, using assignment summary instead:', error)
          return null
        }),
        submissionsApi.getSubmissions({ assignmentId: assignmentId }),
      ])

      const summary = assignSummary as any
      const grading = gradingDetail as any

      const allowLate = summary?.allowLateSubmission !== undefined
        ? Boolean(summary.allowLateSubmission)
        : grading?.metadata?.allowLateSubmission !== undefined
        ? Boolean(grading.metadata.allowLateSubmission)
        : (summary?.latePenaltyType && summary?.latePenaltyType !== 'NONE' && summary?.latePenaltyType !== 'NONE_LOCKED')

      const extractText = (val: any, fallback = ''): string => {
        if (!val) return fallback
        if (typeof val === 'string') return val
        if (typeof val === 'object') {
          if (typeof val.description === 'string') return val.description
          if (typeof val.content === 'string') return val.content
          if (typeof val.text === 'string') return val.text
          if (typeof val.title === 'string') return val.title
          if (typeof val.name === 'string') return val.name
          return fallback
        }
        return String(val)
      }

      const mergedAssignment = {
        id: assignmentId,
        title: extractText(grading?.metadata?.title, extractText(summary?.title, 'Assignment')),
        description: extractText(grading?.metadata?.description, extractText(summary?.description, '')),
        content: extractText(grading?.metadata?.content, extractText(summary?.content, '')),
        subjectCode: extractText(grading?.metadata?.subject, extractText(summary?.subjectCode, extractText(summary?.subjectName?.split(' - ')[0], ''))),
        type: extractText(grading?.metadata?.assignmentType, extractText(grading?.metadata?.category, extractText(summary?.type, 'Workshop'))),
        due: summary?.due || summary?.dueDate || summary?.dueAt || grading?.metadata?.dueDate || grading?.stats?.dueDate,
        latePenaltyType: summary?.latePenaltyType || 'NONE',
        latePenaltyValue: summary?.latePenaltyValue || 0,
        lateSubmitHours: summary?.lateSubmitHours !== undefined ? Number(summary.lateSubmitHours) : null,
        allowLateSubmission: allowLate,
        rubricRules: grading?.rubric?.rules || summary?.aiRubrics || summary?.rubrics || [],
        sqlSetupScript: grading?.sqlSetupScript || null,
        attachments: summary?.attachments || [],
        lecturer: summary?.lecturer || null,
      }

      setAssignment(mergedAssignment)
      setErrorMsg(null)

      if (history && history.length > 0) {
        setSubmission([...history].sort((a, b) => new Date(b.submittedAt ?? 0).getTime() - new Date(a.submittedAt ?? 0).getTime())[0])
      }
    } catch (err: any) {
      console.error('Failed to load assignment:', err)
      setErrorMsg(err?.message || t('student.assignment.load_error', 'Không thể tải thông tin bài tập'))
    } finally {
      setLoading(false)
    }
  }, [assignmentId, t])

  React.useEffect(() => {
    loadData()
  }, [loadData])

  // Cleanup polling on unmount
  React.useEffect(() => {
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current)
    }
  }, [])

  // Live Countdown & Late Policy calculation (G6.4)
  React.useEffect(() => {
    if (!assignment?.due) return

    const formatRemaining = (days: number, hours: number, minutes: number, seconds: number) => {
      if (days > 0) {
        return language === 'en'
          ? `${days}d ${hours}h ${minutes}m`
          : `${days} ${t('time.days', 'ngày')} ${hours} ${t('time.hours', 'giờ')} ${minutes} ${t('time.mins', 'phút')}`
      }
      return `${hours}h ${minutes}m ${seconds}s`
    }

    const updateCountdown = () => {
      const now = Date.now()
      // If student has individual extension override
      const effectiveDue = submission?.extendedDueDate
        ? new Date(submission.extendedDueDate).getTime()
        : new Date(assignment.due).getTime()

      const allowLate = assignment.allowLateSubmission !== undefined
        ? Boolean(assignment.allowLateSubmission)
        : (assignment.latePenaltyType && assignment.latePenaltyType !== 'NONE' && assignment.latePenaltyType !== 'NONE_LOCKED')

      let hardCutoff = effectiveDue
      if (allowLate) {
        if (assignment.lateSubmitHours && Number(assignment.lateSubmitHours) > 0) {
          hardCutoff = effectiveDue + Number(assignment.lateSubmitHours) * 60 * 60 * 1000
        } else {
          // If no specific late hours configured, backend accepts late submissions without arbitrary 7/14 day cutoff
          hardCutoff = Infinity
        }
      }

      if (now < effectiveDue) {
        // Before deadline
        setDeadlineStatus('ON_TIME')
        const diff = effectiveDue - now
        const days = Math.floor(diff / (1000 * 60 * 60 * 24))
        const hours = Math.floor((diff / (1000 * 60 * 60)) % 24)
        const minutes = Math.floor((diff / (1000 * 60)) % 60)
        const seconds = Math.floor((diff / 1000) % 60)
        setCountdownText(formatRemaining(days, hours, minutes, seconds))
      } else if (allowLate && now < hardCutoff) {
        // In late grace period
        setDeadlineStatus('LATE_ALLOWED')
        if (hardCutoff === Infinity) {
          setCountdownText(t('student.assignment.late_open_deduct', 'Đang mở nộp trễ (áp dụng giảm trừ điểm)'))
        } else {
          const diff = hardCutoff - now
          const days = Math.floor(diff / (1000 * 60 * 60 * 24))
          const hours = Math.floor((diff / (1000 * 60 * 60)) % 24)
          const minutes = Math.floor((diff / (1000 * 60)) % 60)
          const seconds = Math.floor((diff / 1000) % 60)
          setCountdownText(formatRemaining(days, hours, minutes, seconds))
        }
      } else {
        // Completely expired
        setDeadlineStatus('EXPIRED')
        setCountdownText(allowLate ? t('student.assignment.late_closed', 'Đã đóng nhận bài (hết thời gian nộp trễ)') : t('student.assignment.overdue_no_late', 'Đã quá hạn (Không chấp nhận nộp trễ)'))
      }
    }

    updateCountdown()
    const timer = setInterval(updateCountdown, 1000)
    return () => clearInterval(timer)
  }, [assignment?.due, assignment?.lateSubmitHours, assignment?.allowLateSubmission, submission?.extendedDueDate, language, t])

  // Check if current submission is graded
  const isSubmissionGraded = Boolean(
    submission &&
    (
      String(submission.gradingStatus || '').toLowerCase() === 'graded' ||
      submission.score != null ||
      submission.totalScore != null ||
      submission.reportData != null
    )
  )

  const isPublished = Boolean(
    submission &&
    (
      submission.isPublished === true ||
      String(submission.reviewStatus || '').toUpperCase() === 'PUBLISHED'
    )
  )

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelected(e.dataTransfer.files[0])
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelected(e.target.files[0])
    }
  }

  const handleFileSelected = (file: File) => {
    setErrorMsg(null)
    setSuccessMsg(null)
    if (!file.name.toLowerCase().endsWith('.zip')) {
      setErrorMsg(t('student.assignment.zip_only_error', 'Vui lòng chỉ tải lên file nén định dạng .zip!'))
      return
    }
    if (file.size > 100 * 1024 * 1024) {
      setErrorMsg(t('student.assignment.file_too_large', 'Dung lượng file vượt quá giới hạn 100MB!'))
      return
    }
    setSelectedFile(file)
  }

  // Polling logic right after submission (G6.5)
  const startGradingPolling = React.useCallback((initialSubId: string) => {
    if (!initialSubId || initialSubId === 'undefined' || initialSubId === 'null') {
      return
    }
    setIsGradingWait(true)
    setGradingSeconds(0)

    let elapsed = 0
    let checking = false
    if (pollingRef.current) clearInterval(pollingRef.current)

    pollingRef.current = setInterval(async () => {
      elapsed += 1
      setGradingSeconds(elapsed)

      // Query every 2-3 seconds
      if (elapsed % (elapsed > 60 ? 8 : 2) === 0 && !checking) {
        checking = true
        try {
          const latest = await submissionsApi.getSubmissionDetail(initialSubId)
          if (latest) {
            setSubmission(latest)
            const status = String(latest.gradingStatus || '').toLowerCase()
            if (status === 'failed' || status === 'error') {
              if (pollingRef.current) clearInterval(pollingRef.current)
              setIsGradingWait(false)
              setErrorMsg(t('student.assignment.test_error', 'Hệ thống gặp sự cố khi chạy kiểm thử tự động. Vui lòng nộp lại bài hoặc liên hệ giảng viên để được chấm lại.'))
              return
            }

            const graded = status === 'graded' || status === 'completed' || latest.score != null || latest.totalScore != null || latest.reportData != null

            if (graded) {
              if (pollingRef.current) clearInterval(pollingRef.current)
              setSubmission(latest)
              setIsGradingWait(false)
              setShowUploadForm(false)
              const pub = latest.isPublished === true || String(latest.reviewStatus || '').toUpperCase() === 'PUBLISHED'
              if (pub) {
                setViewTab('report')
                setSuccessMsg(t('student.assignment.published_success', '🎉 Giảng viên đã công bố kết quả đánh giá bài làm của bạn!'))
              } else {
                setViewTab('spec')
                setSuccessMsg(t('student.assignment.graded_success', 'Bài làm đã được chấm điểm xong và chuyển tới Giảng viên để duyệt và công bố điểm chính thức.'))
              }
              return
            }
          }
        } catch (e) {
          console.warn('Polling check error:', e)
        } finally {
          checking = false
        }
      }
    }, 1000)
  }, [t])

  React.useEffect(() => {
    if (submission && !isSubmissionGraded && !isGradingWait) {
      const status = String(submission.gradingStatus || '').toLowerCase()
      if (status === 'queued' || status === 'grading' || status === 'in_progress') {
        const subId = submission.id || (submission as any).submissionId || (submission as any).Id
        if (subId && subId !== 'undefined' && subId !== 'null') {
          startGradingPolling(subId)
        }
      }
    }
  }, [submission, isSubmissionGraded, isGradingWait, startGradingPolling])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedFile) {
      setErrorMsg(t('student.assignment.select_zip_warning', 'Vui lòng chọn file .zip bài làm trước khi nộp.'))
      return
    }

    if (deadlineStatus === 'EXPIRED' && !submission?.isReopened) {
      setErrorMsg(t('student.assignment.expired_warning', 'Đã hết hạn nộp bài. Bài làm không được chấp nhận nữa trừ khi có gia hạn riêng từ giảng viên.'))
      return
    }

    setUploading(true)
    setErrorMsg(null)
    setSuccessMsg(null)

    try {
      const res = await submissionsApi.submitAssignment(selectedFile, noteContent, assignmentId)
      setSelectedFile(null)
      setNoteContent('')
      setUploading(false)
      setShowUploadForm(false)

      // Start automatic polling for instant AI evaluation
      const subId = (res as any)?.submissionId || (res as any)?.id || (res as any)?.Id || (res as any)?.data?.id || (res as any)?.data?.submissionId
      if (subId && subId !== 'undefined' && subId !== 'null') {
        startGradingPolling(subId)
      } else {
        loadData()
      }
    } catch (err: any) {
      setErrorMsg(err?.message || t('student.assignment.submit_error', 'Lỗi khi nộp bài. Vui lòng thử lại.'))
      setUploading(false)
    }
  }

  // AI Hint Handler
  const handleGetHint = async (ruleScoreId: string, ruleTitle: string) => {
    if (!submission?.id) return
    setHintLoading(true)
    setHintModal({ open: true, title: ruleTitle, hint: t('student.result.hint_loading', 'Đang kết nối AI Teaching Assistant để phân tích mã nguồn và chuẩn bị hướng dẫn...') })
    try {
      const hintRes = await studentPortalApi.getStudentAiHint(submission.id, ruleScoreId)
      const content = hintRes?.hint || hintRes?.feedback || hintRes?.message || t('student.result.hint_default', 'Hãy kiểm tra lại cấu trúc mã nguồn, quy chuẩn MVC và xử lý ngoại lệ theo yêu cầu đề bài.')
      setHintModal({ open: true, title: ruleTitle, hint: content })
    } catch (err: any) {
      setHintModal({
        open: true,
        title: ruleTitle,
        hint: err?.message || t('student.result.hint_error', 'Không thể tạo gợi ý lúc này. Vui lòng thử lại sau.'),
      })
    } finally {
      setHintLoading(false)
    }
  }

  // Student Appeal Submit Handler (G6.6)
  const handleSubmitAppeal = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!submission?.id || !appealReason.trim()) return

    setSubmittingAppeal(true)
    try {
      await submissionsApi.submitFeedback(submission.id, appealReason.trim())
      alert(t('student.assignment.appeal_success', 'Đã gửi yêu cầu phúc khảo/phản hồi đến Giảng viên thành công!'))
      setAppealModal(false)
      setSubmission((prev: any) => ({ ...prev, studentFeedback: appealReason.trim() }))
    } catch (err) {
      alert(err instanceof Error ? err.message : String(err))
    } finally {
      setSubmittingAppeal(false)
    }
  }

  const isHtmlContent = (text?: string) => {
    if (!text) return false
    return /<\/?[a-z][\s\S]*>/i.test(text)
  }

  if (loading) {
    return (
      <DashboardLayout
        navItems={STUDENT_NAV}
        title="AITA Student"
        roleLabel={t('profile.role_student', 'Sinh viên')}
        requiredRole="student"
      >
        <div className="p-16 flex flex-col items-center justify-center space-y-4 text-center">
          <div className="w-12 h-12 rounded-2xl bg-orange-500/10 text-orange-500 flex items-center justify-center animate-spin">
            <Loader2 className="w-6 h-6" />
          </div>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
            {t('ui.loading_assignment_rubric', 'Đang tải thông tin bài tập & Barem chấm điểm...')}
          </p>
        </div>
      </DashboardLayout>
    )
  }

  const detailedContent = (typeof assignment?.content === 'string' && assignment.content.trim())
    ? assignment.content
    : (typeof assignment?.description === 'string' && assignment.description.trim())
    ? assignment.description
    : (typeof (assignment?.description as any)?.description === 'string' ? (assignment.description as any).description : '')
  const rubricRules = assignment?.rubricRules || []

  if (!assignment) {
    return (
      <DashboardLayout navItems={STUDENT_NAV} title="AITA Student" roleLabel={t('profile.role_student', 'Sinh viên')} requiredRole="student">
        <ErrorNotice message={errorMsg || t('student.assignment.not_found', 'Không tìm thấy bài tập.')} onRetry={() => void loadData()} />
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout
      navItems={STUDENT_NAV}
      title="AITA Student"
      roleLabel={t('profile.role_student', 'Sinh viên')}
      requiredRole="student"
      headerTitle={t('student.assignment.header_title', 'Chi tiết Bài tập & Nộp bài')}
      headerSubtitle={assignment?.title || 'Assignment'}
    >
      <div className="space-y-8" translate="no" spellCheck={false}>
        {/* Back Link & Quick Actions */}
        <div className="flex items-center justify-between">
          <Link
            href="/student"
            className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            {t('student.assignment.back_btn', 'Quay lại Bàn học tập')}
          </Link>

          {isPublished && !isGradingWait && (
            <div className="flex items-center gap-2">
              <Button
                variant={viewTab === 'report' ? 'primary' : 'outline'}
                size="sm"
                onClick={() => setViewTab('report')}
                className="text-xs gap-1.5"
              >
                <Award className="w-3.5 h-3.5" />
                <span>{t('student.assignment.ai_result', 'Kết quả chấm bài AI')}</span>
              </Button>
              <Button
                variant={viewTab === 'spec' ? 'primary' : 'outline'}
                size="sm"
                onClick={() => setViewTab('spec')}
                className="text-xs gap-1.5"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>{t('student.assignment.spec_rubric', 'Đề bài & Barem Rubric')}</span>
              </Button>
            </div>
          )}
        </div>

        {/* Header Banner */}
        <div className="rounded-3xl p-6 md:p-8 bg-gradient-to-r from-orange-50 via-amber-50/60 to-blue-50/70 dark:bg-gradient-to-r dark:from-orange-950/40 dark:via-slate-900/90 dark:to-blue-950/30 border border-orange-200/80 dark:border-orange-500/20 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-xs dark:shadow-xl transition-colors">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="orange">{assignment?.subjectCode || 'CNTT'}</Badge>
              <Badge variant="default">{assignment?.type || 'Workshop'}</Badge>

              {/* Status Badge (G6.5) */}
              {submission ? (
                <Badge
                  variant={
                    isPublished
                      ? 'success'
                      : isGradingWait
                      ? 'warning'
                      : 'blue'
                  }
                >
                  {isGradingWait
                    ? t('student.assignment.grading', 'AI đang phân tích...')
                    : isPublished
                    ? t('student.assignment.published', 'Đã công bố điểm')
                    : t('student.assignment.waiting_approval', 'Đã nộp bài • Chờ duyệt')}
                </Badge>
              ) : (
                <Badge variant={deadlineStatus === 'EXPIRED' ? 'danger' : 'outline'}>
                  {deadlineStatus === 'EXPIRED' ? t('student.assignment.status_overdue', 'Đã hết hạn nộp') : t('student.assignment.status_pending', 'Chưa nộp bài')}
                </Badge>
              )}

              {/* Individual Extension Badge (G6.4) */}
              {(submission?.isReopened || submission?.extendedDueDate) && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
                  <Calendar className="w-3 h-3 text-purple-500" />
                  {t('student.assignment.extended_until', 'Được gia hạn riêng đến')} {formatDate(submission.extendedDueDate)}
                </span>
              )}
            </div>

            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              {assignment?.title}
            </h2>

            {/* Countdown & Deadline Info Banner */}
            <div className="flex flex-wrap items-center gap-4 text-xs pt-1">
              <span className="flex items-center gap-1.5 font-medium text-slate-700 dark:text-slate-300">
                <Clock className="w-4 h-4 text-orange-500" />
                {t('student.assignment.deadline', 'Hạn chót')}: <strong>{formatDate(assignment?.due)}</strong>
              </span>

              {/* Live countdown pill */}
              <span className={`px-2.5 py-0.5 rounded-full font-mono font-bold text-xs ${
                deadlineStatus === 'ON_TIME'
                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                  : deadlineStatus === 'LATE_ALLOWED'
                  ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                  : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'
              }`}>
                {deadlineStatus === 'ON_TIME' && `⏳ ${t('ui.remaining', 'Còn lại')}: ${countdownText}`}
                {deadlineStatus === 'LATE_ALLOWED' && `⚠️ ${t('student.assignment.late_window', 'Khung giờ nộp trễ hạn')} (${t('ui.remaining_short', 'còn')} ${countdownText})`}
                {deadlineStatus === 'EXPIRED' && `🛑 ${t('student.assignment.submission_closed', 'Đã hết thời gian nộp')}`}
              </span>

              {assignment?.lecturer && (
                <span className="text-slate-500 dark:text-slate-400">
                  • {t('student.assignment.lecturer', 'Giảng viên')}: <strong className="text-slate-700 dark:text-slate-200">{assignment.lecturer}</strong>
                </span>
              )}
            </div>
          </div>

          {/* Quick status pill on banner */}
          {submission && (
            <div className="flex items-center gap-3 bg-white/80 dark:bg-slate-900/80 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm shrink-0">
              {isPublished ? (
                <div className="text-center pr-3 border-r border-slate-200 dark:border-slate-800">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">{t('student.assignment.score', 'Điểm số')}</span>
                  <span className="text-3xl font-black text-orange-600 dark:text-orange-400 font-mono">
                    {Number(submission.score ?? submission.finalScore ?? 0).toFixed(1)}
                    <span className="text-xs font-normal text-slate-400">/10</span>
                  </span>
                </div>
              ) : (
                <div className="text-left pr-3 border-r border-slate-200 dark:border-slate-800">
                  <span className="text-[10px] uppercase font-bold text-amber-500 block">{t('student.assignment.status', 'Trạng thái')}</span>
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1 mt-0.5">
                    <Clock className="w-3.5 h-3.5 text-amber-500" />
                    {t('student.assignment.waiting_approval', 'Chờ duyệt điểm')}
                  </span>
                </div>
              )}
              <div className="space-y-1">
                {deadlineStatus !== 'EXPIRED' && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setShowUploadForm(!showUploadForm)}
                    className="text-xs gap-1.5 border-orange-500/30 text-orange-600 dark:text-orange-400"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>{showUploadForm ? t('student.assignment.close_form', 'Đóng form') : t('student.assignment.resubmit', 'Nộp lại bài')}</span>
                  </Button>
                )}

                {isPublished && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setAppealModal(true)}
                    className="text-xs gap-1 text-slate-500 hover:text-orange-500"
                  >
                    <MessageSquare className="w-3 h-3" />
                    <span>{t('student.assignment.appeal_btn', 'Phúc khảo')}</span>
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Late Penalty Warning Notice */}
        {deadlineStatus === 'LATE_ALLOWED' && (
          <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center gap-3 text-xs md:text-sm text-amber-800 dark:text-amber-300">
            <AlertTriangle className="w-5 h-5 shrink-0 text-amber-500" />
            <div>
              <strong>{t('student.assignment.late_policy_active', 'Chính sách nộp muộn đang áp dụng:')}</strong>{' '}
              {assignment?.latePenaltyType === 'FIXED_POINTS'
                ? t('student.assignment.late_deduct_points', 'Bài nộp trong khung giờ này sẽ bị trừ cố định {{points}} điểm.').replace('{{points}}', String(assignment.latePenaltyValue))
                : assignment?.latePenaltyType === 'PERCENT'
                ? t('student.assignment.late_deduct_percent', 'Bài nộp trong khung giờ này sẽ bị trừ {{percent}}% tổng điểm đạt được.').replace('{{percent}}', String(assignment.latePenaltyValue))
                : t('student.assignment.late_grace_period', 'Bài nộp đang trong khung giờ ân hạn nộp muộn.')}{' '}
              {t('student.assignment.late_cutoff_warning', 'Hệ thống sẽ khoá nộp bài hoàn toàn khi hết hạn cutoff ({{time}}).').replace('{{time}}', countdownText)}
            </div>
          </div>
        )}

        {/* Hard cutoff expired notice */}
        {deadlineStatus === 'EXPIRED' && !submission?.isReopened && (
          <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/40 flex items-center gap-3 text-xs md:text-sm text-rose-700 dark:text-rose-300">
            <AlertCircle className="w-5 h-5 shrink-0 text-rose-500" />
            <div>
              <strong>{t('student.assignment.cutoff_expired_title', 'Đã hết hạn nộp bài:')}</strong> {t('student.assignment.cutoff_expired_desc', 'Thời hạn nộp chính thức và thời gian nộp muộn cho phép đã kết thúc. Bạn không thể tải lên tệp bài làm mới trừ khi được Giảng viên cấp quyền gia hạn riêng.')}
            </div>
          </div>
        )}

        {/* Notification alerts */}
        {errorMsg && (
          <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 text-rose-600 dark:text-rose-300 text-xs md:text-sm flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 shrink-0 text-rose-500" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 text-emerald-600 dark:text-emerald-300 text-xs md:text-sm flex items-center gap-3 animate-in fade-in-50 duration-300">
            <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-500" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Student Appeal Status Banner if submitted */}
        {submission?.studentFeedback && (
          <div className="p-4 rounded-2xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-between gap-4 text-xs">
            <div className="flex items-center gap-2.5">
              <MessageSquare className="w-4 h-4 text-blue-500 shrink-0" />
              <div>
                <span className="font-bold text-blue-700 dark:text-blue-300">
                  {t('student.assignment.appeal_submitted_banner', 'Đơn phúc khảo của bạn đã được gửi tới Giảng viên:')}
                </span>{' '}
                <span className="text-slate-600 dark:text-slate-300 italic">&ldquo;{submission.studentFeedback}&rdquo;</span>
              </div>
            </div>
            <Badge variant="blue" className="shrink-0 text-[10px]">{t('student.assignment.appeal_pending_badge', 'Đang chờ giảng viên xử lý')}</Badge>
          </div>
        )}

        {/* 1. LIVE AI GRADING PULSE CARD (G6.5) */}
        {isGradingWait && (
          <Card className="p-6 md:p-8 border-orange-500/40 bg-gradient-to-br from-orange-50/70 via-slate-50 to-amber-50/50 dark:from-orange-950/30 dark:via-slate-900/90 dark:to-slate-950 shadow-xl overflow-hidden relative">
            <div className="absolute top-0 right-0 -mr-16 -mt-16 w-56 h-56 bg-orange-500/10 rounded-full blur-2xl pointer-events-none" />
            <div className="flex flex-col md:flex-row items-center justify-between gap-6 relative z-10">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-orange-500 to-amber-400 flex items-center justify-center text-white shadow-lg shadow-orange-500/30 animate-pulse">
                    <Sparkles className="w-7 h-7" />
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center text-white ring-2 ring-white dark:ring-slate-900">
                    <Loader2 className="w-3 h-3 animate-spin" />
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">
                      {t('student.assignment.ai_analyzing', 'AI Rubric Engine đang phân tích bài nộp của bạn...')}
                    </h3>
                    <span className="px-2 py-0.5 rounded-full bg-orange-500/10 text-orange-600 dark:text-orange-400 font-mono text-xs font-bold">
                      {gradingSeconds}s
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400 max-w-xl leading-relaxed">
                    {gradingSeconds > 30
                      ? t('student.assignment.grading_wait_queue', 'Hệ thống đang kiểm thử chi tiết mã nguồn trong hàng đợi. Bạn có thể yên tâm rời trang, điểm số và kết quả sẽ được lưu trữ tự động.')
                      : t('student.assignment.ai_desc', 'Hệ thống đang quét cấu trúc thư mục, kiểm tra các tầng kiến trúc (Controller, Service, DAO), phân tích mã nguồn và chạy các test suite tự động.')}
                  </p>
                </div>
              </div>

              {/* Step indicator badges */}
              <div className="flex flex-col gap-2 shrink-0 text-xs w-full md:w-auto">
                <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-medium">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{t('student.assignment.step1', '1. Nhận tệp mã nguồn .zip thành công')}</span>
                </div>
                <div className="flex items-center gap-2 text-orange-600 dark:text-orange-400 font-bold animate-pulse">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>{t('student.assignment.step2', '2. Đang phân tích Barem Rubric & Code vi phạm...')}</span>
                </div>
                <div className="flex items-center gap-2 text-slate-400 dark:text-slate-500">
                  <span className="w-4 h-4 rounded-full border border-slate-300 dark:border-slate-700 flex items-center justify-center text-[10px]">3</span>
                  <span>{t('student.assignment.step3', '3. Tổng hợp điểm số & sinh báo cáo chi tiết')}</span>
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* 2. RE-SUBMIT FORM (G6.4) */}
        {(showUploadForm || (!isSubmissionGraded && !isGradingWait) || Boolean(submission?.isReopened) || Boolean((assignment as any)?.isReopened)) && (deadlineStatus !== 'EXPIRED' || Boolean(submission?.isReopened) || Boolean((assignment as any)?.isReopened)) && (
          <Card className="p-6 md:p-8 border-orange-500/30 bg-white dark:bg-slate-900 shadow-md">
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-200 dark:border-slate-800">
              <div>
                <h3 className="text-base md:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <UploadCloud className="w-5 h-5 text-orange-500 dark:text-orange-400" />
                  {isSubmissionGraded
                    ? `${t('student.assignment.resubmit', 'Nộp lại bài làm')} (Attempt #${(submission?.attemptNumber || 1) + 1})`
                    : t('student.assignment.submit_zip', 'Nộp bài làm (.zip)')}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 pt-0.5">
                  {t('student.assignment.submit_note', 'Đóng gói toàn bộ source code của bạn thành 1 file nén duy nhất định dạng .zip (tối đa 100MB). Khi nộp lại, lần nộp mới sẽ thay thế kết quả trước.')}
                </p>
              </div>

              {isSubmissionGraded && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowUploadForm(false)}
                  className="text-xs text-slate-500 hover:text-slate-700 dark:text-slate-400"
                >
                  {t('student.assignment.close_form', 'Đóng form')}
                </Button>
              )}
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Dropzone */}
              <div
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-2xl p-6 md:p-8 text-center transition-all cursor-pointer relative ${
                  dragActive
                    ? 'border-orange-500 bg-orange-500/10 scale-[1.01]'
                    : selectedFile
                    ? 'border-emerald-500/50 bg-emerald-500/5'
                    : 'border-slate-300 dark:border-slate-800 hover:border-orange-500/50 bg-slate-50/50 dark:bg-slate-950/40'
                }`}
                onClick={() => document.getElementById('zipFileInput')?.click()}
              >
                <input
                  id="zipFileInput"
                  type="file"
                  accept=".zip"
                  onChange={handleFileChange}
                  className="hidden"
                />

                {selectedFile ? (
                  <div className="space-y-2">
                    <FileArchive className="w-12 h-12 text-emerald-500 dark:text-emerald-400 mx-auto" />
                    <p className="text-sm font-bold text-slate-900 dark:text-white truncate max-w-sm mx-auto">
                      {selectedFile.name}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB • {t('student.assignment.ready_submit', 'Sẵn sàng nộp')}
                    </p>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        setSelectedFile(null)
                      }}
                      className="text-xs text-rose-500 hover:underline pt-1 font-medium"
                    >
                      {t('student.assignment.choose_other', 'Chọn file khác')}
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <UploadCloud className="w-12 h-12 text-orange-500 dark:text-orange-400 mx-auto" />
                    <p className="text-sm font-semibold text-slate-800 dark:text-white">
                      {t('student.assignment.drag_drop', 'Kéo thả file .zip vào đây')}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {t('student.assignment.or_click', 'hoặc click để duyệt file trên máy tính của bạn')}
                    </p>
                  </div>
                )}
              </div>

              {/* Optional Note */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  {t('student.assignment.extra_note', 'Ghi chú thêm (Tài khoản test, database credentials...)')}
                </label>
                <textarea
                  rows={2}
                  placeholder={t('student.assignment.note_placeholder', 'Ghi chú về tài khoản test, database...')}
                  value={noteContent}
                  onChange={(e) => setNoteContent(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/80 px-3 py-2 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-orange-500"
                />
              </div>

              <div className="flex justify-end pt-2">
                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  className="w-full md:w-auto px-8 shadow-lg shadow-orange-500/20 bg-orange-500 hover:bg-orange-600 text-white"
                  isLoading={uploading}
                  disabled={!selectedFile}
                >
                  <UploadCloud className="w-4 h-4 shrink-0" />
                  <span>{t('student.assignment.confirm_submit', 'Xác nhận nộp bài')}</span>
                </Button>
              </div>
            </form>
          </Card>
        )}

        {/* 3. MAIN CONTENT: IF PUBLISHED, SHOW EVALUATION REPORT DIRECTLY (G6.6) */}
        {isPublished && viewTab === 'report' ? (
          <div className="space-y-6">
            <EvaluationReportViewer
              submission={submission}
              onResubmit={deadlineStatus !== 'EXPIRED' ? () => setShowUploadForm(true) : undefined}
              onGetHint={handleGetHint}
            />
          </div>
        ) : (
          /* 4. SPECIFICATION & RUBRIC RULES */
          <div>
            {/* If submission exists but not published yet, show reassuring pending review banner */}
            {submission && !isPublished && !isGradingWait && (
              <Card className="p-6 md:p-8 bg-gradient-to-br from-amber-500/5 via-orange-500/5 to-slate-900/10 border border-amber-500/30 rounded-3xl mb-6">
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                  <div className="flex items-start md:items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0">
                      <Clock className="w-6 h-6" />
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h3 className="text-base md:text-lg font-bold text-slate-900 dark:text-white">
                          {t('student.assignment.received_success', 'Bài nộp của bạn đã được tiếp nhận thành công')}
                        </h3>
                        <Badge variant="orange" className="text-[10px]">{t('student.assignment.waiting_score', 'Chờ công bố điểm')}</Badge>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-400 max-w-2xl leading-relaxed">
                        {t('student.assignment.received_desc', 'Hệ thống đã nhận tệp bài làm và chuyển cho Giảng viên. Giảng viên đang xem xét, đánh giá bài làm và sẽ công bố điểm số cùng kết quả phân tích chi tiết sau.')}
                      </p>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 pt-1 font-mono">
                        {t('student.assignment.file_label', 'Tệp')}: <strong className="text-slate-700 dark:text-slate-300">{submission.filename || 'source.zip'}</strong> • {t('student.assignment.submit_time', 'Nộp lúc')}: {formatDate(submission.submittedAt)} • {t('student.assignment.attempt_num', 'Lần nộp')} #{submission.attemptNumber || 1}
                      </div>
                    </div>
                  </div>

                  {deadlineStatus !== 'EXPIRED' && (
                    <div className="shrink-0 flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setShowUploadForm(!showUploadForm)}
                        className="text-xs gap-1.5"
                      >
                        <RotateCcw className="w-3.5 h-3.5 text-orange-500" />
                        <span>{showUploadForm ? t('student.assignment.close_form', 'Đóng form') : t('student.assignment.resubmit_another', 'Nộp lại bài khác')}</span>
                      </Button>
                    </div>
                  )}
                </div>
              </Card>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Left Column: Requirements & Assignment Info */}
              <div className="lg:col-span-2 space-y-6">
                {/* Detailed Assignment Specification */}
                <Card className="p-6 md:p-8">
                  <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-200 dark:border-slate-800">
                    <h3 className="text-base md:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <FileText className="w-5 h-5 text-orange-500 dark:text-orange-400" />
                      {t('student.assignment.spec_req', 'Mô tả đề bài & Yêu cầu kỹ thuật')}
                    </h3>
                    <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                      {t('student.assignment.spec_note', 'Nội dung chi tiết từ Giảng viên')}
                    </span>
                  </div>

                  {/* Render Full Assignment Content as Rich HTML or Markdown */}
                  {isHtmlContent(detailedContent) ? (
                    <div
                      className="prose prose-slate dark:prose-invert max-w-none text-sm text-slate-700 dark:text-slate-300 leading-relaxed assignment-specification [&_h2]:text-lg [&_h2]:font-bold [&_h2]:text-slate-900 dark:[&_h2]:text-white [&_h3]:text-base [&_h3]:font-bold [&_h3]:text-slate-900 dark:[&_h3]:text-white [&_h4]:text-sm [&_h4]:font-bold [&_h4]:text-orange-600 dark:[&_h4]:text-orange-400 [&_ul]:list-disc [&_ul]:pl-5 [&_li]:mt-1.5 [&_p]:my-2.5 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded-md [&_code]:bg-orange-500/10 [&_code]:text-orange-600 dark:[&_code]:text-orange-400"
                      dangerouslySetInnerHTML={{ __html: detailedContent }}
                    />
                  ) : (
                    <div className="prose max-w-none text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                      {typeof detailedContent === 'string' && detailedContent.trim()
                        ? detailedContent
                        : t('student.assignment.spec_empty', 'Vui lòng hoàn thành toàn bộ yêu cầu theo đề bài đính kèm và đóng gói file .zip trước khi nộp.')}
                    </div>
                  )}

                  {/* Attachment Download Area if available (G6.4) */}
                  {(assignment?.attachments?.length > 0 || assignment?.sqlSetupScript) && (
                    <div className="mt-6 pt-5 border-t border-slate-200 dark:border-slate-800 space-y-3">
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                        <Download className="w-4 h-4 text-orange-500" />
                        {t('student.assignment.attachments', 'Tài liệu & Tệp đính kèm bài tập')}
                      </h4>
                      <div className="flex flex-wrap gap-3">
                        {assignment.attachments?.map((att: any, idx: number) => (
                          <a
                            key={att.id || idx}
                            href={att.fileUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-xs font-medium text-slate-800 dark:text-slate-200 transition-colors border border-slate-200 dark:border-slate-700"
                          >
                            <FileCode className="w-4 h-4 text-orange-500" />
                            <span>{att.fileName || t('student.assignment.doc_default', 'Tài liệu đề bài')}</span>
                            <Download className="w-3.5 h-3.5 opacity-60 ml-1" />
                          </a>
                        ))}

                        {assignment.sqlSetupScript && (
                          <button
                            type="button"
                            onClick={() => {
                              const blob = new Blob([assignment.sqlSetupScript], { type: 'text/plain;charset=utf-8' })
                              const url = URL.createObjectURL(blob)
                              const a = document.createElement('a')
                              a.href = url
                              a.download = `${assignment.title.replace(/[^a-zA-Z0-9]/g, '_')}_Setup.sql`
                              a.click()
                              URL.revokeObjectURL(url)
                            }}
                            className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-orange-50 hover:bg-orange-100 dark:bg-orange-500/10 dark:hover:bg-orange-500/20 text-xs font-medium text-orange-700 dark:text-orange-300 transition-colors border border-orange-200 dark:border-orange-500/30"
                          >
                            <Database className="w-4 h-4 text-orange-500" />
                            <span>{t('student.assignment.download_sql', 'Tải SQL Setup Script (.sql)')}</span>
                            <Download className="w-3.5 h-3.5 opacity-60 ml-1" />
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </Card>

                {/* Rubric Preview */}
                <Card className="p-6 md:p-8">
                  <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-200 dark:border-slate-800">
                    <h3 className="text-base md:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-orange-500 dark:text-orange-400" />
                      {t('student.assignment.rubric_title', 'Tiêu chí chấm điểm (Barem Rubric AI)')}
                    </h3>
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      {t('student.assignment.total_score', 'Tổng điểm')}: <strong className="text-orange-600 dark:text-orange-400 font-bold">10.0 {t('student.assignment.points', 'điểm')}</strong>
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-4 leading-relaxed">
                    {t('student.assignment.rubric_desc', 'Hệ thống AI sẽ tự động phân tích mã nguồn, kiểm tra kiến trúc và chạy bộ kiểm thử tự động theo các tiêu chí dưới đây:')}
                  </p>

                  {rubricRules && rubricRules.length > 0 ? (
                    <div className="space-y-3">
                      {rubricRules.map((rule: any, idx: number) => {
                        const ruleScore = Number(rule.weight ?? rule.maxPoints ?? 0)

                        let ruleTitle = `${t('student.assignment.criterion', 'Tiêu chí')} ${idx + 1}`
                        if (typeof rule.title === 'string' && rule.title.trim()) ruleTitle = rule.title.trim()
                        else if (typeof rule.name === 'string' && rule.name.trim()) ruleTitle = rule.name.trim()
                        else if (typeof rule.description === 'string' && rule.description.trim()) ruleTitle = rule.description.trim()
                        else if (typeof rule.description?.description === 'string' && rule.description.description.trim()) ruleTitle = rule.description.description.trim()
                        else if (typeof rule.criteria === 'string' && rule.criteria.trim()) ruleTitle = rule.criteria.trim()

                        let ruleDesc = ''
                        if (typeof rule.description === 'string' && rule.description.trim()) ruleDesc = rule.description.trim()
                        else if (typeof rule.description?.description === 'string' && rule.description.description.trim()) ruleDesc = rule.description.description.trim()
                        else if (typeof rule.criteria === 'string' && rule.criteria.trim()) ruleDesc = rule.criteria.trim()

                        const contextHint = rule.contextHint || `PART ${String.fromCharCode(65 + idx)}`

                        return (
                          <div
                            key={rule.id || idx}
                            className="p-4 rounded-2xl bg-slate-50/90 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800/80 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs transition-colors hover:border-orange-500/30"
                          >
                            <div className="space-y-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="px-2 py-0.5 rounded-md bg-orange-100 dark:bg-orange-500/20 text-orange-700 dark:text-orange-300 font-bold text-[11px] font-mono">
                                  {contextHint}
                                </span>
                                <span className="font-bold text-slate-900 dark:text-white text-sm">
                                  {ruleTitle}
                                </span>
                              </div>
                              {ruleDesc && ruleDesc !== ruleTitle && (
                                <p className="text-slate-600 dark:text-slate-400 text-xs leading-relaxed pt-0.5">
                                  {ruleDesc}
                                </p>
                              )}
                              {Array.isArray(rule.criteria) && rule.criteria.length > 0 && (
                                <ul className="mt-2 space-y-1 pl-3 border-l-2 border-orange-200 dark:border-orange-900/50">
                                  {rule.criteria.map((c: any, cIdx: number) => {
                                    const cDesc = typeof c === 'string'
                                      ? c
                                      : (typeof c?.description === 'string'
                                        ? c.description
                                        : (typeof c?.name === 'string'
                                          ? c.name
                                          : (typeof c?.title === 'string'
                                            ? c.title
                                            : '')));
                                    const cScore = typeof c === 'object' && c?.maxPoints !== undefined ? Number(c.maxPoints) : null;
                                    if (!cDesc) return null;
                                    return (
                                      <li key={c?.id || cIdx} className="text-[11px] text-slate-600 dark:text-slate-400">
                                        • {cDesc} {cScore !== null ? `(${cScore}đ)` : ''}
                                      </li>
                                    );
                                  })}
                                </ul>
                              )}
                            </div>

                            <div className="text-right shrink-0">
                              <span className="font-bold font-mono text-sm text-orange-600 dark:text-orange-400">
                                {ruleScore.toFixed(1)} {t('student.assignment.pts_short', 'đ')}
                              </span>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 italic">
                      {t('student.assignment.rubric_empty', 'Tiêu chí chấm điểm chi tiết đang được đồng bộ từ giảng viên.')}
                    </p>
                  )}
                </Card>
              </div>

              {/* Right Column: Policies & Quick Summary */}
              <div className="space-y-6">
                {/* Assignment Rules & Policies Card */}
                <Card className="p-6 space-y-4">
                  <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-emerald-500" />
                    {t('student.assignment.rules_title', 'Quy định làm bài & Nộp bài')}
                  </h3>

                  <div className="space-y-3 text-xs text-slate-600 dark:text-slate-300">
                    <div className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-orange-500 mt-1.5 shrink-0" />
                      <span>{t('student.assignment.rule_zip_only', 'Chỉ chấp nhận tệp nén duy nhất có định dạng .ZIP (tối đa 100MB).')}</span>
                    </div>

                    <div className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-orange-500 mt-1.5 shrink-0" />
                      <span>
                        {t('student.assignment.rule_late_policy', 'Chính sách nộp muộn:')}{' '}
                        {assignment?.latePenaltyType === 'FIXED_POINTS'
                          ? t('student.assignment.late_policy_fixed', 'Cho phép nộp trễ tối đa {{hours}}h (trừ {{points}}đ).').replace('{{hours}}', String(assignment.lateSubmitHours || 24)).replace('{{points}}', String(assignment.latePenaltyValue))
                          : assignment?.latePenaltyType === 'PERCENT'
                          ? t('student.assignment.late_policy_percent', 'Cho phép nộp trễ tối đa {{hours}}h (trừ {{percent}}% điểm).').replace('{{hours}}', String(assignment.lateSubmitHours || 24)).replace('{{percent}}', String(assignment.latePenaltyValue))
                          : t('student.assignment.late_policy_none', 'Không áp dụng phạt nộp muộn.')}
                      </span>
                    </div>

                    <div className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-orange-500 mt-1.5 shrink-0" />
                      <span>{t('student.assignment.rule_plagiarism', 'Hệ thống áp dụng thuật toán kiểm tra đạo văn (Plagiarism Detection) giữa các bài nộp.')}</span>
                    </div>

                    <div className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-orange-500 mt-1.5 shrink-0" />
                      <span>{t('student.assignment.rule_resubmit', 'Bạn có thể nộp lại nhiều lần trước khi hết hạn; phiên bản nộp sau sẽ được chấm và cập nhật điểm.')}</span>
                    </div>
                  </div>
                </Card>

                {/* Submission status quick recap */}
                {submission && (
                  <Card className="p-6 space-y-3">
                    <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                      <Award className="w-4 h-4 text-orange-500" />
                      {t('student.assignment.current_sub_info', 'Thông tin bài nộp hiện tại')}
                    </h3>

                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                        <span className="text-slate-400">{t('student.assignment.attempt_num', 'Lần nộp')}:</span>
                        <span className="font-bold font-mono">Attempt #{submission.attemptNumber || 1}</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                        <span className="text-slate-400">{t('student.assignment.submit_time', 'Thời gian nộp')}:</span>
                        <span className="font-mono">{formatDate(submission.submittedAt)}</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                        <span className="text-slate-400">{t('student.assignment.file_label', 'Tệp bài làm')}:</span>
                        <span className="font-mono truncate max-w-[150px]">{submission.filename || 'source.zip'}</span>
                      </div>
                      <div className="flex justify-between py-1">
                        <span className="text-slate-400">{t('student.assignment.publish_status', 'Trạng thái công bố')}:</span>
                        <span className="font-bold text-emerald-600 dark:text-emerald-400">
                          {isPublished ? t('student.assignment.published', 'Đã công bố điểm') : t('student.assignment.waiting_approval', 'Chờ giảng viên duyệt')}
                        </span>
                      </div>
                    </div>
                  </Card>
                )}
              </div>
            </div>
          </div>
        )}

        {/* AI Hint Modal */}
        <Modal
          isOpen={hintModal.open}
          onClose={() => setHintModal({ open: false, title: '', hint: '' })}
          title={`${t('student.assignment.hint_title_prefix', 'Gợi ý cải thiện code')}: ${hintModal.title}`}
          description={t('student.assignment.hint_desc', 'Phân tích định hướng từ AI Teaching Assistant giúp bạn sửa lỗi và nâng cao điểm số')}
        >
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-orange-50/80 dark:bg-orange-500/10 border border-orange-200 dark:border-orange-500/20 text-slate-800 dark:text-slate-200 text-sm leading-relaxed whitespace-pre-wrap">
              {hintLoading ? (
                <div className="flex items-center gap-3 py-4 text-orange-600 dark:text-orange-400 font-medium">
                  <Sparkles className="w-5 h-5 animate-spin" />
                  <span>{t('student.assignment.hint_loading', 'AI đang phân tích mã nguồn và soạn gợi ý sửa lỗi...')}</span>
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
              >
                {t('student.assignment.got_it', 'Đã hiểu')}
              </Button>
            </div>
          </div>
        </Modal>

        {/* Student Appeal / Feedback Modal (G6.6) */}
        <Modal
          isOpen={appealModal}
          onClose={() => setAppealModal(false)}
          title={t('student.assignment.appeal_modal_title', 'Gửi đơn phúc khảo / Phản hồi điểm')}
          description={`${t('student.assignment.assignment_label', 'Bài tập')}: ${assignment?.title} • ${t('student.assignment.current_score', 'Điểm hiện tại')}: ${submission?.score ?? 0}/10`}
        >
          <form onSubmit={handleSubmitAppeal} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                {t('student.assignment.appeal_reason_label', 'Nội dung yêu cầu phúc khảo & Giải trình lý do')}
              </label>
              <textarea
                rows={4}
                required
                placeholder={t('student.assignment.appeal_placeholder', 'Trình bày rõ tiêu chí nào bạn thấy chấm chưa chính xác, giải thích cấu trúc code hoặc cung cấp bằng chứng để giảng viên xem xét...')}
                value={appealReason}
                onChange={(e) => setAppealReason(e.target.value)}
                className="w-full text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-3 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-orange-500"
              />
            </div>

            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
              {t('student.assignment.appeal_disclaimer', 'Lưu ý: Đơn phúc khảo sẽ được gửi trực tiếp đến hộp thư của Giảng viên phụ trách môn học. Giảng viên sẽ xem lại báo cáo chi tiết và có thể điều chỉnh điểm nếu hợp lệ.')}
            </p>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="ghost"
                size="sm"
                type="button"
                onClick={() => setAppealModal(false)}
              >
                {t('common.cancel', 'Hủy bỏ')}
              </Button>
              <Button
                variant="primary"
                size="sm"
                type="submit"
                isLoading={submittingAppeal}
                className="bg-orange-500 hover:bg-orange-600 text-white"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{t('student.assignment.appeal_submit_btn', 'Gửi đơn phúc khảo')}</span>
              </Button>
            </div>
          </form>
        </Modal>
      </div>
    </DashboardLayout>
  )
}
