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
import { StudentSubmissionModal } from '@/features/assignments/components/StudentSubmissionModal'
import { AssignmentDocument } from '../components/AssignmentDocument'
import { assignmentDocumentContent } from '../document-content'
import { assignmentsApi } from '@/lib/api/modules/assignments'
import { submissionsApi } from '@/lib/api/modules/submissions'
import { gradingApi } from '@/lib/api/modules/grading'
import { studentPortalApi } from '@/lib/api/modules/student-portal'
import { normalizeSubmissionRow } from '@/lib/api/normalizers/submission'
import { clearClientApiCache } from '@/lib/api/client'
import { formatDate } from '@/lib/utils'
import {
  UploadCloud,
  FileArchive,
  Check,
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
  BookOpen,
  User,
  Code2,
  Folder,
  Terminal,
  X,
} from 'lucide-react'
import { useLanguage } from '@/providers/language-provider'
import { ApiError } from '@/lib/api/client'
import { ErrorNotice } from '@/components/ui/feedback'
function RealisticFolderIcon({ className = 'w-8 h-8' }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="aita_folder_back" x1="6" y1="9" x2="38" y2="39" gradientUnits="userSpaceOnUse">
          <stop stopColor="#F59E0B" />
          <stop offset="1" stopColor="#D97706" />
        </linearGradient>
        <linearGradient id="aita_folder_front" x1="5" y1="16" x2="43" y2="40" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FDE68A" />
          <stop offset="0.25" stopColor="#FBBF24" />
          <stop offset="1" stopColor="#F59E0B" />
        </linearGradient>
        <filter id="aita_folder_shadow" x="2" y="14" width="44" height="28" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
          <feDropShadow dx="0" dy="2" stdDeviation="1.5" floodColor="#78350F" floodOpacity="0.28" />
        </filter>
      </defs>
      {/* Thân sau thư mục có tai tab nhô lên */}
      <path
        d="M6 13C6 10.7909 7.79086 9 10 9H18.5858C19.6466 9 20.6639 9.42143 21.4142 10.1716L24.2426 13H38C40.2091 13 42 14.7909 42 17V35C42 37.2091 40.2091 39 38 39H10C7.79086 39 6 37.2091 6 35V13Z"
        fill="url(#aita_folder_back)"
      />
      {/* Tờ giấy tài liệu trắng nhô nhẹ bên trong */}
      <rect x="10" y="12" width="28" height="11" rx="2" fill="#FFFFFF" fillOpacity="0.95" />
      <line x1="14" y1="15.5" x2="26" y2="15.5" stroke="#CBD5E1" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="14" y1="18.5" x2="30" y2="18.5" stroke="#E2E8F0" strokeWidth="1.5" strokeLinecap="round" />
      {/* Nắp trước dạng nổi 3D với viền sáng highlight */}
      <g filter="url(#aita_folder_shadow)">
        <path
          d="M5 19C5 17.3431 6.34315 16 8 16H40C41.6569 16 43 17.3431 43 19V36C43 38.2091 41.2091 40 39 40H9C6.79086 40 5 38.2091 5 36V19Z"
          fill="url(#aita_folder_front)"
        />
        <path
          d="M7 17.5H41"
          stroke="#FFFBEB"
          strokeWidth="1.2"
          strokeLinecap="round"
          strokeOpacity="0.9"
        />
      </g>
    </svg>
  )
}

export default function StudentAssignmentDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { t, language } = useLanguage()
  const isVi = language === 'vi'
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
  const [studentSubmissionModal, setStudentSubmissionModal] = React.useState<{
    open: boolean
    mode: 'processing' | 'receipt' | 'uploading'
    subId: string
    file?: File | null
    noteContent?: string
    fileName: string
    fileSize?: number
    attemptNumber?: number
    submittedAt?: string | Date
  } | null>(null)
  const [isDownloadingSubmitted, setIsDownloadingSubmitted] = React.useState(false)
  const [downloadingAttachment, setDownloadingAttachment] = React.useState<string | null>(null)
  const [documentDownloadError, setDocumentDownloadError] = React.useState('')
  const pollingRef = React.useRef<NodeJS.Timeout | null>(null)

  // Active view tab: 'spec' (Đề bài & Folder) | 'report' (Báo cáo AI)
  const [viewTab, setViewTab] = React.useState<'report' | 'spec'>('spec')

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
        description: assignmentDocumentContent(summary, grading),
        content: assignmentDocumentContent(summary, grading),
        documentAnalysis: summary?.documentAnalysis || null,
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
      if (err?.status !== 401 && err?.message !== 'Unauthorized' && err?.code !== 'SESSION_EXPIRED' && !err?.message?.includes('hết hạn')) {
        console.error('Failed to load assignment:', err)
      } else {
        console.warn('Session expired or unauthorized when loading assignment.')
      }
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

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (!selectedFile) {
      setErrorMsg(t('student.assignment.select_zip_warning', 'Vui lòng chọn file .zip bài làm trước khi nộp.'))
      return
    }

    if (deadlineStatus === 'EXPIRED' && !submission?.isReopened) {
      setErrorMsg(t('student.assignment.expired_warning', 'Đã hết hạn nộp bài. Bài làm không được chấp nhận nữa trừ khi có gia hạn riêng từ giảng viên.'))
      return
    }

    const fileToUpload = selectedFile
    const note = noteContent

    // Preserve the selected file and note until the server confirms acceptance.
    setErrorMsg(null)
    setSuccessMsg(null)
    setShowUploadForm(false)

    // Open StudentSubmissionModal IMMEDIATELY at 0ms with live production upload telemetry & verification pipeline!
    setStudentSubmissionModal({
      open: true,
      mode: 'uploading',
      subId: '',
      file: fileToUpload,
      noteContent: note,
      fileName: fileToUpload.name,
      fileSize: fileToUpload.size,
      attemptNumber: (submission?.attemptNumber || 0) + 1,
      submittedAt: new Date(),
    })
  }

  // Download submitted archive for student
  const handleDownloadSubmittedFile = async () => {
    const subId = submission?.id || (submission as any)?.submissionId || (submission as any)?.Id
    if (!subId) return
    setIsDownloadingSubmitted(true)
    try {
      await gradingApi.downloadSubmission(subId, submission.filename?.replace(/\.zip$/i, '') || 'submission')
    } catch (err: any) {
      alert(err?.message || (isVi ? 'Không thể tải tệp bài làm về lúc này.' : 'Failed to download file.'))
    } finally {
      setIsDownloadingSubmitted(false)
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

  const handleUploadSuccess = React.useCallback((res: any) => {
    setSelectedFile(null)
    setNoteContent('')
    clearClientApiCache('/submissions')
    const normalized = normalizeSubmissionRow(res)
    setSubmission(normalized)
  }, [])

  const handleModalComplete = React.useCallback(() => {
    setStudentSubmissionModal(null)
    clearClientApiCache('/submissions')
    void loadData()
    setSuccessMsg(t('student.assignment.graded_success', 'Bài làm đã được hệ thống tiếp nhận an toàn và chuyển tới Giảng viên để duyệt và công bố điểm chính thức.'))
  }, [loadData, t])

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

  const handleDownloadDocument = async (attachment: any) => {
    if (!attachment?.id || downloadingAttachment) return
    setDownloadingAttachment(attachment.id); setDocumentDownloadError('')
    try {
      const blob = await assignmentsApi.getDocumentFile(attachment.id)
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a'); link.href = url
      link.download = attachment.fileName || 'De_bai'; document.body.appendChild(link); link.click(); link.remove()
      setTimeout(() => URL.revokeObjectURL(url), 1000)
    } catch (error) { setDocumentDownloadError(error instanceof Error ? error.message : 'Không tải được tệp gốc. Vui lòng thử lại.') }
    finally { setDownloadingAttachment(null) }
  }
  const handleDownloadBrief = () => { void handleDownloadDocument(assignment?.attachments?.[0]) }

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
        {/* Navigation Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <Link
            href="/student/results"
            className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>{isVi ? 'Quay lại Bảng kết quả' : 'Back to Results'}</span>
          </Link>

          {isPublished && !isGradingWait && (
            <div className="inline-flex items-center p-1 bg-gradient-to-br from-orange-50/80 via-white to-amber-50/40 dark:from-slate-900 dark:via-slate-900/90 dark:to-orange-950/20 rounded-2xl border border-orange-100/90 dark:border-orange-900/30 text-xs gap-1 shadow-xs">
              <button
                type="button"
                onClick={() => setViewTab('spec')}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                  viewTab === 'spec'
                    ? 'bg-gradient-to-r from-orange-500 via-amber-500 to-orange-400 text-white shadow-md shadow-orange-500/20'
                    : 'text-slate-600 hover:text-orange-600 dark:text-slate-300 dark:hover:text-white hover:bg-orange-50/60'
                }`}
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>{isVi ? 'Chi tiết bài & Folder' : 'Brief & Folder'}</span>
              </button>
              <button
                type="button"
                onClick={() => setViewTab('report')}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                  viewTab === 'report'
                    ? 'bg-gradient-to-r from-orange-500 via-amber-500 to-orange-400 text-white shadow-md shadow-orange-500/20'
                    : 'text-slate-600 hover:text-orange-600 dark:text-slate-300 dark:hover:text-white hover:bg-orange-50/60'
                }`}
              >
                <Award className="w-3.5 h-3.5" />
                <span>{isVi ? 'Báo cáo điểm AI' : 'AI Evaluation'}</span>
              </button>
            </div>
          )}
        </div>

        {/* Notice alerts */}
        {errorMsg && (
          <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/40 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2.5">
            <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/40 text-emerald-700 dark:text-emerald-300 text-xs flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {submission?.studentFeedback && (
          <div className="p-3.5 rounded-xl bg-orange-50/60 dark:bg-orange-950/20 border border-orange-200/80 dark:border-orange-900/40 flex items-center justify-between gap-4 text-xs">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-orange-500 shrink-0" />
              <div>
                <span className="font-semibold text-orange-800 dark:text-orange-300">{isVi ? 'Đơn phúc khảo đã gửi:' : 'Appeal submitted:'}</span>{' '}
                <span className="text-slate-600 dark:text-slate-300 italic">&ldquo;{submission.studentFeedback}&rdquo;</span>
              </div>
            </div>
            <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-300 shrink-0">
              {isVi ? 'Chờ xử lý' : 'Pending'}
            </span>
          </div>
        )}

        {isPublished && viewTab === 'report' ? (
          <div className="space-y-6">
            <EvaluationReportViewer
              submission={submission}
              onResubmit={deadlineStatus !== 'EXPIRED' ? () => setShowUploadForm(true) : undefined}
              onGetHint={handleGetHint}
            />
          </div>
        ) : (
          /* THIẾT KẾ TRONG KHUNG BO TRÒN THEO CHUẨN DESIGN SYSTEM */
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-orange-100/90 dark:border-orange-900/30 shadow-xs divide-y divide-orange-100/60 dark:divide-slate-800/80 overflow-hidden">
            {/* PHẦN 1: THÔNG TIN CHUNG BÀI TẬP & TRẠNG THÁI NỘP */}
            <div className="p-5 md:p-6 space-y-4">
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                <div className="space-y-2.5">
                  {/* Dòng thẻ thông tin & trạng thái */}
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="px-2.5 py-1 rounded-md text-xs font-bold font-mono bg-orange-50 text-orange-700 dark:bg-orange-950/60 dark:text-orange-300 border border-orange-200/80 dark:border-orange-800">
                      {assignment?.subjectCode || 'CNTT'}
                    </span>
                    <span className="px-2.5 py-1 rounded-md text-xs font-semibold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 border border-slate-200/70 dark:border-slate-700">
                      {assignment?.type || (isVi ? 'Bài tập' : 'Assignment')}
                    </span>

                    {/* Status badge */}
                    {isGradingWait ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>{isVi ? 'Đang chấm AI...' : 'AI Grading...'}</span>
                      </span>
                    ) : isPublished ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span>{isVi ? 'Đã công bố điểm' : 'Published'}: <strong>{Number(submission?.score ?? submission?.finalScore ?? 0).toFixed(1)}/10</strong></span>
                      </span>
                    ) : submission ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800/80">
                        <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 stroke-[2.5]" />
                        <span>{isVi ? 'Đã nộp bài' : 'Submitted'}</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                        <span className="w-2 h-2 rounded-full bg-amber-500" />
                        <span>{deadlineStatus === 'EXPIRED' ? (isVi ? 'Đã hết hạn nộp' : 'Overdue') : (isVi ? 'Chưa nộp bài' : 'Pending')}</span>
                      </span>
                    )}
                  </div>

                  {/* Tiêu đề bài tập */}
                  <h1 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-white tracking-tight leading-snug">
                    {assignment?.title}
                  </h1>

                  {/* Thẻ chi tiết hạn chót & giảng viên */}
                  <div className="flex flex-wrap items-center gap-2.5 pt-0.5">
                    {/* Hạn chót & Thời gian đếm ngược */}
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 text-xs">
                      <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="text-slate-500 dark:text-slate-400">{isVi ? 'Hạn chót:' : 'Due:'}</span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">{formatDate(assignment?.due)}</span>
                      {countdownText && (
                        <span className={`px-2 py-0.5 rounded text-[11px] font-mono font-medium ${
                          deadlineStatus === 'EXPIRED'
                            ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300'
                            : 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200/60 dark:border-blue-800/60'
                        }`}>
                          {deadlineStatus === 'EXPIRED' ? (isVi ? 'Đã hết hạn' : 'Expired') : `${isVi ? 'Còn' : 'Left'} ${countdownText}`}
                        </span>
                      )}
                    </div>

                    {/* Giảng viên phụ trách */}
                    {assignment?.lecturer && (
                      <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 text-xs">
                        <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="text-slate-500 dark:text-slate-400">{isVi ? 'Giảng viên:' : 'Lecturer:'}</span>
                        <span className="font-semibold text-slate-800 dark:text-slate-200">{assignment.lecturer}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Right actions */}
                <div className="flex items-center gap-2 shrink-0 flex-wrap md:self-start">
                  <button
                    type="button"
                    onClick={handleDownloadBrief}
                    disabled={!assignment.attachments?.[0]?.id || downloadingAttachment !== null}
                    title={!assignment.attachments?.length ? 'Giảng viên chưa lưu tệp đề bài gốc cho bài tập này.' : assignment.attachments[0].fileName}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white bg-slate-100 hover:bg-slate-200/80 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-xl transition-all cursor-pointer shadow-2xs"
                  >
                    {downloadingAttachment ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />}
                    <span>{downloadingAttachment ? 'Đang tải đề...' : !assignment.attachments?.length ? 'Chưa có tệp đề gốc' : (isVi ? 'Tải đề bài gốc' : 'Download original')}</span>
                  </button>

                  {deadlineStatus !== 'EXPIRED' && (
                    <button
                      type="button"
                      onClick={() => setShowUploadForm(!showUploadForm)}
                      className={`inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl transition-all cursor-pointer shadow-xs ${
                        submission
                          ? 'text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white bg-slate-100 hover:bg-slate-200/80 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'
                          : 'text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-500'
                      }`}
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>{showUploadForm ? (isVi ? 'Đóng form' : 'Close') : (submission ? (isVi ? 'Nộp lại bài' : 'Resubmit') : (isVi ? 'Nộp bài' : 'Submit'))}</span>
                    </button>
                  )}
                  {isPublished && (
                    <button
                      type="button"
                      onClick={() => setAppealModal(true)}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 transition-colors cursor-pointer"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>{isVi ? 'Phúc khảo' : 'Appeal'}</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Form nộp lại bài nếu toggle */}
              {showUploadForm && (
                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/40 space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                      {isVi ? 'Tải lên file bài làm mới (.zip)' : 'Upload new zip submission'}
                    </p>
                    <button
                      type="button"
                      onClick={() => setShowUploadForm(false)}
                      className="text-[11px] text-slate-400 hover:text-slate-600"
                    >
                      {isVi ? 'Hủy' : 'Cancel'}
                    </button>
                  </div>
                  <div
                    onDragEnter={handleDrag}
                    onDragLeave={handleDrag}
                    onDragOver={handleDrag}
                    onDrop={handleDrop}
                    onClick={() => document.getElementById('resubmitInput')?.click()}
                    className={`border-2 border-dashed rounded-lg p-5 text-center cursor-pointer transition-all ${
                      selectedFile ? 'border-emerald-500/50 bg-emerald-50/20' : 'border-slate-300 dark:border-slate-700 hover:border-blue-400'
                    }`}
                  >
                    <input id="resubmitInput" type="file" accept=".zip" onChange={handleFileChange} className="hidden" />
                    {selectedFile ? (
                      <div className="space-y-1">
                        <FileArchive className="w-8 h-8 text-emerald-500 mx-auto" />
                        <p className="text-xs font-bold text-slate-900 dark:text-white truncate max-w-sm mx-auto">{selectedFile.name}</p>
                        <p className="text-[11px] text-slate-500">{(selectedFile.size / (1024 * 1024)).toFixed(2)} MB</p>
                      </div>
                    ) : (
                      <div className="space-y-1">
                        <UploadCloud className="w-8 h-8 text-slate-400 mx-auto" />
                        <p className="text-xs text-slate-600 dark:text-slate-300">{isVi ? 'Kéo thả file .zip hoặc click chọn tệp' : 'Drop .zip file or click to select'}</p>
                      </div>
                    )}
                  </div>
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      disabled={!selectedFile || uploading}
                      onClick={handleSubmit}
                      className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50 cursor-pointer"
                    >
                      {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UploadCloud className="w-3.5 h-3.5" />}
                      <span>{isVi ? 'Xác nhận nộp tệp này' : 'Confirm Upload'}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* PHẦN 2: THƯ MỤC DỰ ÁN ĐÃ NỘP */}
            <div className="p-5 md:p-6 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <RealisticFolderIcon className="w-5 h-5 shrink-0" />
                  <h2 className="font-bold text-sm text-slate-900 dark:text-white">
                    {isVi ? 'Thư mục dự án đã nộp' : 'Submitted Project Folder'}
                  </h2>
                </div>

                <div className="flex items-center gap-2 text-xs">
                  {isGradingWait ? (
                    <span className="inline-flex items-center gap-1.5 text-blue-600 dark:text-blue-400 font-semibold">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>{isVi ? `Đang chấm AI (${gradingSeconds}s)...` : `AI Grading (${gradingSeconds}s)...`}</span>
                    </span>
                  ) : submission ? (
                    <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      <span>{formatDate(submission.submittedAt)}</span>
                    </span>
                  ) : (
                    <span className="text-amber-500 font-medium">
                      {isVi ? 'Chưa có bài nộp' : 'No submission yet'}
                    </span>
                  )}
                </div>
              </div>

              {submission ? (
                <div className="space-y-4">
                  <div className="p-4 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-800/60 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-3.5 min-w-0">
                      <RealisticFolderIcon className="w-10 h-10 shrink-0 drop-shadow-xs" />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-sm text-slate-900 dark:text-white font-mono">
                            {submission.filename ? submission.filename.replace(/\.zip$/i, '') : 'source'}
                          </span>
                          <span className="text-[11px] font-mono px-2.5 py-0.5 rounded bg-slate-200/70 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300/50 dark:border-slate-700">
                            {submission.filename || 'source.zip'}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-slate-700 dark:text-slate-300">{isVi ? 'Lần nộp' : 'Attempt'} #{submission.attemptNumber || 1}</span>
                          <span>•</span>
                          <span>
                            {isGradingWait ? (
                              <span className="text-blue-600 dark:text-blue-400 font-medium inline-flex items-center gap-1">
                                <Loader2 className="w-3 h-3 animate-spin" />
                                {isVi ? 'Đang chấm AI...' : 'AI Grading...'}
                              </span>
                            ) : isPublished ? (
                              <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                                {isVi ? `Đã hoàn tất đánh giá (${Number(submission.score ?? submission.finalScore ?? 0).toFixed(1)}/10)` : `Graded (${submission.score}/10)`}
                              </span>
                            ) : (
                              <span className="text-slate-700 dark:text-slate-300 inline-flex items-center gap-1 font-medium">
                                <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 stroke-[2.5]" />
                                <span>{isVi ? 'Đã tiếp nhận bài nộp • Chờ giảng viên duyệt' : 'Submitted successfully • Pending Review'}</span>
                              </span>
                            )}
                          </span>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
                      {/* Tải tệp đã nộp về máy */}
                      <button
                        type="button"
                        onClick={handleDownloadSubmittedFile}
                        disabled={isDownloadingSubmitted}
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold shadow-xs transition-colors cursor-pointer border border-slate-200 dark:border-slate-700"
                        title={isVi ? 'Tải tệp bài làm đã nộp về máy' : 'Download submitted file'}
                      >
                        {isDownloadingSubmitted ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-500" />
                        ) : (
                          <Download className="w-3.5 h-3.5 text-blue-500" />
                        )}
                        <span>{isVi ? 'Tải bài nộp về' : 'Download'}</span>
                      </button>

                      {/* Biên nhận tiếp nhận bài nộp */}
                      <button
                        type="button"
                        onClick={() => {
                          const id = submission.id || (submission as any).submissionId || (submission as any).Id
                          if (id) {
                            setStudentSubmissionModal({
                              open: true,
                              mode: 'receipt',
                              subId: id,
                              fileName: submission.filename || `${id}.zip`,
                              fileSize: undefined,
                              attemptNumber: submission.attemptNumber || 1,
                              submittedAt: submission.submittedAt,
                            })
                          }
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 text-xs font-semibold shadow-xs transition-colors cursor-pointer border border-emerald-200 dark:border-emerald-800"
                        title={isVi ? 'Xem biên nhận xác thực tiếp nhận bài nộp' : 'View Submission Receipt'}
                      >
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                        <span>{isVi ? 'Biên nhận tiếp nhận' : 'Receipt'}</span>
                      </button>

                      <div className="text-xs text-slate-400 font-mono">
                        {formatDate(submission.submittedAt)}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                /* VÙNG UPLOAD TRỰC TIẾP KHI CHƯA NỘP */
                <div className="space-y-3">
                  <div
                    onDragEnter={handleDrag}
                    onDragLeave={handleDrag}
                    onDragOver={handleDrag}
                    onDrop={handleDrop}
                    onClick={() => document.getElementById('projectFolderInputDirect')?.click()}
                    className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
                      selectedFile
                        ? 'border-emerald-500/60 bg-emerald-50/30 dark:bg-emerald-950/20'
                        : 'border-slate-300 dark:border-slate-700 hover:border-blue-400 dark:hover:border-blue-500 bg-slate-50/50 dark:bg-slate-950/40'
                    }`}
                  >
                    <input id="projectFolderInputDirect" type="file" accept=".zip" onChange={handleFileChange} className="hidden" />
                    {selectedFile ? (
                      <div className="space-y-2">
                        <RealisticFolderIcon className="w-10 h-10 mx-auto drop-shadow-xs" />
                        <div>
                          <p className="text-sm font-bold text-slate-900 dark:text-white font-mono">{selectedFile.name}</p>
                          <p className="text-xs text-slate-500">{(selectedFile.size / (1024 * 1024)).toFixed(2)} MB</p>
                        </div>
                        <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                          {isVi ? 'Đã chọn tệp. Nhấn "Xác nhận nộp bài" bên dưới.' : 'File chosen. Click below to confirm submission.'}
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <RealisticFolderIcon className="w-10 h-10 mx-auto drop-shadow-xs opacity-80" />
                        <div>
                          <p className="text-xs md:text-sm font-semibold text-slate-700 dark:text-slate-300">
                            {isVi ? 'Kéo thả thư mục dự án (.zip) vào đây hoặc nhấp để tải lên' : 'Drag & drop project folder (.zip) here or click to browse'}
                          </p>
                          <p className="text-xs text-slate-400 mt-1">
                            {isVi ? 'Định dạng bắt buộc: 1 tệp nén duy nhất (.ZIP, tối đa 100MB)' : 'Accepted format: Single .ZIP archive (max 100MB)'}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  {selectedFile && (
                    <div className="flex justify-end gap-2 pt-1">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          setSelectedFile(null)
                        }}
                        className="px-3 py-1.5 text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 cursor-pointer"
                      >
                        {isVi ? 'Hủy chọn' : 'Cancel'}
                      </button>
                      <button
                        type="button"
                        disabled={uploading}
                        onClick={handleSubmit}
                        className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50 cursor-pointer shadow-xs"
                      >
                        {uploading ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            <span>{isVi ? 'Đang nộp bài...' : 'Submitting...'}</span>
                          </>
                        ) : (
                          <>
                            <UploadCloud className="w-3.5 h-3.5" />
                            <span>{isVi ? 'Xác nhận nộp bài' : 'Confirm Submission'}</span>
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* PHẦN 3: MÔ TẢ ĐỀ BÀI & YÊU CẦU KỸ THUẬT */}
            <div className="p-5 md:p-6 space-y-4">
              {documentDownloadError && <p role="alert" className="rounded-xl bg-red-50 dark:bg-red-950/30 p-3 text-xs text-red-700 dark:text-red-300">{documentDownloadError}</p>}
              <AssignmentDocument content={detailedContent} analysis={assignment.documentAnalysis} attachments={assignment.attachments || []} onDownload={file => void handleDownloadDocument(file)} downloadingId={downloadingAttachment} />

              {/* Attachments */}
              {assignment?.sqlSetupScript && (
                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2">
                  <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                    <Download className="w-3.5 h-3.5 text-orange-500" />
                    <span>{isVi ? 'Tài liệu & Tệp đính kèm' : 'Attachments & Resources'}</span>
                  </h4>
                  <div className="flex flex-wrap gap-2.5">
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
                        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-orange-50 hover:bg-orange-100 dark:bg-orange-500/10 dark:hover:bg-orange-500/20 text-xs font-medium text-orange-700 dark:text-orange-300 transition-colors border border-orange-200 dark:border-orange-500/30"
                      >
                        <Database className="w-3.5 h-3.5 text-orange-500" />
                        <span>{isVi ? 'Tải SQL Setup Script (.sql)' : 'Download SQL Setup'}</span>
                        <Download className="w-3 h-3 opacity-60 ml-1" />
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* PHẦN 4: TIÊU CHÍ CHẤM ĐIỂM (BAREM RUBRIC) */}
            <div className="p-5 md:p-6 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-orange-500 shrink-0" />
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                    {isVi ? 'Tiêu chí chấm điểm (Barem Rubric AI)' : 'Grading Rubric & AI Criteria'}
                  </h3>
                </div>
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  {isVi ? 'Thang điểm tối đa' : 'Max points'}: <strong className="text-orange-600 dark:text-orange-400 font-bold">10.0 {isVi ? 'điểm' : 'pts'}</strong>
                </span>
              </div>

              {rubricRules && rubricRules.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {rubricRules.map((rule: any, idx: number) => {
                    const maxScore = Number(rule.weight ?? rule.maxPoints ?? 0).toFixed(1)
                    return (
                      <div
                        key={rule.id || idx}
                        className="p-3.5 rounded-xl border border-slate-200/90 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 space-y-1.5"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-bold text-xs text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                            <span className="w-4 h-4 rounded-full bg-orange-500/15 text-orange-600 dark:text-orange-400 text-[10px] flex items-center justify-center font-mono font-bold">
                              {idx + 1}
                            </span>
                            <span>{rule.title || rule.name || `Tiêu chí ${idx + 1}`}</span>
                          </span>
                          <span className="px-2 py-0.5 rounded text-[11px] font-bold font-mono bg-orange-100 text-orange-700 dark:bg-orange-950/60 dark:text-orange-300 border border-orange-200/60 dark:border-orange-800/60 shrink-0">
                            {maxScore} {isVi ? 'điểm' : 'pts'}
                          </span>
                        </div>
                        {rule.description && (
                          <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed pl-5.5">
                            {rule.description}
                          </p>
                        )}
                        {rule.passCondition && (
                          <p className="text-[11px] text-emerald-600 dark:text-emerald-400 pl-5.5 flex items-start gap-1">
                            <Check className="w-3 h-3 shrink-0 mt-0.5" />
                            <span><strong>{isVi ? 'Đạt' : 'Pass'}:</strong> {rule.passCondition}</span>
                          </p>
                        )}
                        {rule.failCondition && (
                          <p className="text-[11px] text-rose-500 dark:text-rose-400 pl-5.5 flex items-start gap-1">
                            <X className="w-3 h-3 shrink-0 mt-0.5" />
                            <span><strong>{isVi ? 'Trừ điểm' : 'Penalty'}:</strong> {rule.failCondition}</span>
                          </p>
                        )}
                      </div>
                    )
                  })}
                </div>
              ) : (
                <p className="text-xs text-slate-400 italic">
                  {isVi ? 'Đang cập nhật barem chấm điểm chi tiết...' : 'Rubric criteria will be updated soon.'}
                </p>
              )}
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

        {/* Professional Student Submission & Verification Modal */}
        {studentSubmissionModal?.open && (
          <StudentSubmissionModal
            isOpen={studentSubmissionModal.open}
            onClose={() => {
              if (studentSubmissionModal.mode === 'uploading' && selectedFile) setShowUploadForm(true)
              setStudentSubmissionModal(null)
            }}
            submissionId={studentSubmissionModal.subId}
            assignmentId={assignmentId}
            file={studentSubmissionModal.file}
            noteContent={studentSubmissionModal.noteContent}
            assignmentTitle={assignment?.title}
            subjectCode={assignment?.subjectCode || assignment?.SubjectCode}
            fileName={studentSubmissionModal.fileName}
            fileSize={studentSubmissionModal.fileSize}
            attemptNumber={studentSubmissionModal.attemptNumber}
            initialMode={studentSubmissionModal.mode}
            submittedAt={studentSubmissionModal.submittedAt}
            onUploadSuccess={handleUploadSuccess}
            onComplete={handleModalComplete}
          />
        )}
      </div>
    </DashboardLayout>
  )
}
