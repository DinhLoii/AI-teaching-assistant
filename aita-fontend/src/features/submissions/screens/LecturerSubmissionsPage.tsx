'use client'

import { RefreshAction } from '@/components/actions/RefreshAction'

import * as React from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Modal } from '@/components/ui/modal'
import { EvaluationReportViewer } from '@/features/submissions/components/EvaluationReportViewer'
import { LiveGradingRunnerModal } from '@/features/grading/components/LiveGradingRunnerModal'
import { submissionsApi } from '@/lib/api/modules/submissions'
import { loadSubmissionWorkspace } from '../load-workspace'
import { gradingApi } from '@/lib/api/modules/grading'
import { formatDate } from '@/lib/utils'
import { errorMessage } from '@/lib/api/errors'
import {
  ArrowLeft,
  Users,
  Download,
  CheckCircle2,
  Clock,
  Play,
  Share2,
  Edit,
  Award,
  Search,
  Sparkles,
  RotateCcw,
  ExternalLink,
  Calendar,
  Eye,
  Check,
  X,
  FileSearch,
  UploadCloud,
  AlertCircle,
  ShieldAlert,
  HelpCircle,
  FileArchive,
  Terminal,
} from 'lucide-react'
import { useLanguage } from '@/providers/language-provider'

export default function LecturerSubmissionsPage() {
  const { t } = useLanguage()
  const params = useParams()
  const router = useRouter()
  const assignmentId = String(params?.id ?? '')

  const [assignment, setAssignment] = React.useState<any>(null)
  const [submissions, setSubmissions] = React.useState<any[]>([])
  const [roster, setRoster] = React.useState<any[]>([])
  const [loading, setLoading] = React.useState(true)
  const [loadError, setLoadError] = React.useState<string | null>(null)
  const loadVersion = React.useRef(0)
  const [search, setSearch] = React.useState('')
  const [statusFilter, setStatusFilter] = React.useState<'all' | 'submitted' | 'graded' | 'pending' | 'missing'>('all')
  const [publishing, setPublishing] = React.useState(false)
  const [publishingId, setPublishingId] = React.useState<string | null>(null)

  // Selection for bulk actions
  const [selectedIds, setSelectedIds] = React.useState<string[]>([])
  const [regradingBatch, setRegradingBatch] = React.useState(false)
  const [regradingSub, setRegradingSub] = React.useState<any | null>(null)

  // Batch Upload State
  const fileInputRef = React.useRef<HTMLInputElement | null>(null)
  const [uploadingBatch, setUploadingBatch] = React.useState(false)

  // Edit Score Modal State
  const [editModal, setEditModal] = React.useState<{
    open: boolean
    sub: any | null
    score: number
    feedback: string
    isPublished: boolean
  }>({
    open: false,
    sub: null,
    score: 0,
    feedback: '',
    isPublished: false,
  })
  const [savingScore, setSavingScore] = React.useState(false)

  // Review Rubric Modal State
  const [reviewModal, setReviewModal] = React.useState<{
    open: boolean
    sub: any | null
  }>({
    open: false,
    sub: null,
  })

  // Reopen / Extension Modal State (G5.7)
  const [reopenModal, setReopenModal] = React.useState<{
    open: boolean
    studentId: string
    studentName: string
    studentCode: string
    extendedDueDate: string
    penaltyMode: 'SYSTEM_DEFAULT' | 'CUSTOM_RATE' | 'FLAT_AMOUNT' | 'WAIVE' | 'SCORE_CAP'
    customPenaltyRate: number
    flatPenaltyAmount: number
    scoreCap: number
    reason: string
  }>({
    open: false,
    studentId: '',
    studentName: '',
    studentCode: '',
    extendedDueDate: '',
    penaltyMode: 'WAIVE',
    customPenaltyRate: 0,
    flatPenaltyAmount: 0,
    scoreCap: 10,
    reason: '',
  })
  const [savingReopen, setSavingReopen] = React.useState(false)

  const loadData = React.useCallback(async (background = false) => {
    const version = ++loadVersion.current
    if (!background) setLoading(true)
    setLoadError(null)
    const current = () => version === loadVersion.current
    try {
      await loadSubmissionWorkspace(assignmentId, {
        assignment: value => { if (current()) setAssignment(value) },
        roster: value => { if (current()) setRoster(value || []) },
        submissions: value => { if (current()) setSubmissions(value || []) },
        submissionsError: error => { if (current()) setLoadError(errorMessage(error)) },
        submissionsSettled: () => { if (current()) setLoading(false) },
      }, background)
    } catch (error) {
      if (background) throw error
      console.error('Failed to load assignment workspace:', error)
    }
  }, [assignmentId])

  React.useEffect(() => {
    loadData()
    return () => { loadVersion.current++ }
  }, [loadData])

  // Polling for active grading jobs
  React.useEffect(() => {
    const hasPending = submissions.some(sub => {
      const status = String(sub.gradingStatus || sub.status || '').toLowerCase()
      return ['queued', 'grading', 'in_progress', 'pending', 'processing', 'running'].includes(status)
    })

    if (hasPending) {
      let busy = false, cancelled = false
      const interval = setInterval(async () => {
        if (busy || document.hidden) return
        busy = true
        try {
          const subs = await submissionsApi.getSubmissions({ assignmentId, view: 'summary' }, true)
          if (!cancelled) setSubmissions(subs || [])
        } catch (err) { console.error(err) }
        finally { busy = false }
      }, 3500)
      return () => { cancelled = true; clearInterval(interval) }
    }
  }, [submissions, assignmentId])

  // Combine submissions with unsubmitted roster students
  const submittedStudentMap = React.useMemo(() => {
    const map = new Map<string, any>()
    submissions.forEach(s => {
      const sId = typeof s.studentId === 'object' ? s.studentId?.id || s.studentId?.studentCode : s.studentId
      if (sId) map.set(String(sId).toLowerCase(), s)
    })
    return map
  }, [submissions])

  const missingStudents = React.useMemo(() => {
    if (!roster || roster.length === 0) return []
    return roster.filter(st => {
      const idMatch = submittedStudentMap.has(String(st.id || st.studentId).toLowerCase())
      const codeMatch = st.studentId && submittedStudentMap.has(String(st.studentId).toLowerCase())
      return !idMatch && !codeMatch
    })
  }, [roster, submittedStudentMap])

  // Bulk publish for all students
  const handleBulkPublish = async () => {
    if (!confirm(t('lecturer.submissions.confirm_bulk_publish', 'Bạn có chắc chắn muốn công bố điểm bài thi này cho toàn bộ sinh viên không?'))) return
    setPublishing(true)
    try {
      const res = await gradingApi.bulkPublishGrades(assignmentId)
      alert(`Đã công bố điểm thành công cho ${res?.count ?? 'toàn bộ'} sinh viên!`)
      await loadData()
    } catch (err) {
      alert(errorMessage(err))
    } finally {
      setPublishing(false)
    }
  }

  // Publish or unpublish for a single student
  const handlePublishSingle = async (sub: any, publish: boolean) => {
    const studentName = typeof sub.student === 'object' ? (sub.student?.fullName || sub.student?.name) : sub.student
    const actionLabel = publish ? 'công bố điểm' : 'thu hồi công bố điểm'
    if (!confirm(`Bạn có chắc chắn muốn ${actionLabel} cho sinh viên ${studentName}?`)) return

    setPublishingId(sub.id)
    try {
      if (publish) {
        await gradingApi.publishSubmission(sub.id)
      } else {
        await gradingApi.unpublishSubmission(sub.id)
      }
      await loadData()
    } catch (err) {
      alert(errorMessage(err))
    } finally {
      setPublishingId(null)
    }
  }

  // Batch re-grade selected submissions
  const handleBatchRegrade = async () => {
    if (selectedIds.length === 0) return
    if (!confirm(`Bạn có chắc chắn muốn chạy lại chấm điểm cho ${selectedIds.length} bài đã chọn?`)) return

    setRegradingBatch(true)
    try {
      await gradingApi.gradeSelectedBatch(assignmentId, selectedIds)
      alert(`Đã đưa ${selectedIds.length} bài vào hàng đợi chấm điểm thành công!`)
      setSelectedIds([])
      await loadData()
    } catch (err) {
      alert(errorMessage(err))
    } finally {
      setRegradingBatch(false)
    }
  }

  // Download submission ZIP file
  const handleDownload = async (sub: any) => {
    try {
      const studentName = typeof sub.student === 'object' ? (sub.student?.fullName || sub.student?.name) : sub.student
      await gradingApi.downloadSubmission(sub.id, studentName || 'submission')
    } catch (err) {
      alert(errorMessage(err))
    }
  }

  // Batch ZIP Upload
  const handleBatchUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    const fileArray = Array.from(files)
    const invalidFiles = fileArray.filter(f => !f.name.match(/\.(zip|rar|tar\.gz)$/i))
    if (invalidFiles.length > 0) {
      alert('Vui lòng chỉ tải lên các tệp nén có định dạng .ZIP, .RAR hoặc .TAR.GZ')
      if (fileInputRef.current) fileInputRef.current.value = ''
      return
    }

    setUploadingBatch(true)
    try {
      await submissionsApi.submitBatchProject(fileArray, assignmentId)
      alert(t('lecturer.submissions.batch_upload_success', 'Đã tải lên và đưa vào hàng đợi chấm điểm hàng loạt thành công!'))
      router.push(`/lecturer/grading/assignments/${assignmentId}/submit`)
    } catch (err) {
      alert(errorMessage(err))
    } finally {
      setUploadingBatch(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleOpenEdit = (sub: any) => {
    setEditModal({
      open: true,
      sub,
      score: Number(sub.score ?? sub.finalScore ?? sub.rawScore ?? 0),
      feedback: sub.instructorFeedback || sub.feedback || '',
      isPublished: sub.isPublished === true,
    })
  }

  const handleSaveScore = async () => {
    if (!editModal.sub) return
    setSavingScore(true)
    try {
      await submissionsApi.gradeSubmission(editModal.sub.id, {
        score: editModal.score,
        feedback: editModal.feedback,
        isPublished: editModal.isPublished,
      })
      setEditModal({ open: false, sub: null, score: 0, feedback: '', isPublished: false })
      await loadData()
    } catch (err) {
      alert(errorMessage(err))
    } finally {
      setSavingScore(false)
    }
  }

  // Open Reopen / Extension Modal
  const handleOpenReopen = (student: any, fromSubmission = false) => {
    const stId = fromSubmission ? student.studentUserId : student.id
    if (!stId) {
      alert('Không xác định được tài khoản sinh viên. Vui lòng tải lại danh sách.')
      return
    }
    const stName = student.fullName || student.name || (typeof student.student === 'object' ? student.student?.fullName : student.student) || 'Sinh viên'
    const stCode = student.studentCode || (typeof student.studentId === 'object' ? student.studentId?.studentCode : student.studentId) || ''

    // Default to +24 hours from now
    const next = new Date(Date.now() + 24 * 60 * 60 * 1000)
    const nextDate = new Date(next.getTime() - next.getTimezoneOffset() * 60000).toISOString().slice(0, 16)

    setReopenModal({
      open: true,
      studentId: String(stId),
      studentName: String(stName),
      studentCode: String(stCode),
      extendedDueDate: nextDate,
      penaltyMode: 'WAIVE',
      customPenaltyRate: 0,
      flatPenaltyAmount: 0,
      scoreCap: 10,
      reason: '',
    })
  }

  const handleSaveReopen = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!reopenModal.extendedDueDate) {
      alert('Vui lòng chọn thời gian gia hạn nộp bài.')
      return
    }

    setSavingReopen(true)
    try {
      await submissionsApi.reopenSubmission({
        examId: assignmentId,
        studentId: reopenModal.studentId,
        extendedDueDate: new Date(reopenModal.extendedDueDate).toISOString(),
        penaltyMode: reopenModal.penaltyMode,
        customPenaltyRate: reopenModal.customPenaltyRate,
        flatPenaltyAmount: reopenModal.flatPenaltyAmount,
        scoreCap: reopenModal.scoreCap,
        reason: reopenModal.reason,
      })
      alert(`Đã gia hạn nộp bài thành công cho sinh viên ${reopenModal.studentName}!`)
      setReopenModal(prev => ({ ...prev, open: false }))
      await loadData()
    } catch (err) {
      alert(errorMessage(err))
    } finally {
      setSavingReopen(false)
    }
  }

  // Toggle selection
  const toggleSelectAll = () => {
    if (selectedIds.length === submissions.length) {
      setSelectedIds([])
    } else {
      setSelectedIds(submissions.map(s => s.id))
    }
  }

  const toggleSelectOne = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    )
  }

  // Filter submissions
  const filteredSubmissions = submissions.filter((s) => {
    const statusStr = String(s.gradingStatus || s.status || '').toLowerCase()
    const isGraded = statusStr === 'graded' || s.score !== null

    if (statusFilter === 'graded' && !isGraded) return false
    if (statusFilter === 'pending' && isGraded) return false
    if (statusFilter === 'missing') return false

    const studentText = typeof s.student === 'object' ? (s.student?.fullName || s.student?.name || '') : String(s.student || '')
    const idText = typeof s.studentId === 'object' ? (s.studentId?.studentCode || '') : String(s.studentId || '')
    const text = `${studentText} ${idText} ${s.filename || ''}`.toLowerCase()
    return text.includes(search.toLowerCase())
  })

  const filteredMissing = missingStudents.filter(m => {
    if (statusFilter !== 'all' && statusFilter !== 'missing') return false
    const text = `${m.name || m.fullName || ''} ${m.studentId || ''} ${m.email || ''}`.toLowerCase()
    return text.includes(search.toLowerCase())
  })

  const gradedCount = submissions.filter(s => s.score !== null || String(s.gradingStatus || s.status || '').toLowerCase() === 'graded').length
  const avgScore = gradedCount > 0
    ? (submissions.reduce((acc, sub) => acc + (sub.finalScore ?? sub.score ?? 0), 0) / gradedCount).toFixed(1)
    : '--'

  return (
    <div className="space-y-6">
      {/* Executive KPI Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="relative overflow-hidden p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-orange-50/80 via-white to-amber-50/40 dark:from-slate-900 dark:via-slate-900/90 dark:to-orange-950/20 border border-orange-100/90 dark:border-orange-900/30 shadow-xs hover:shadow-md transition-all group">
          <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-gradient-to-tr from-orange-400/15 via-amber-300/15 to-transparent rounded-full blur-2xl group-hover:from-orange-400/25 group-hover:via-amber-300/25 transition-all pointer-events-none" />
          <div className="flex items-start justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Tổng đã nộp
            </span>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-orange-500 via-amber-500 to-orange-400 text-white flex items-center justify-center shadow-md shadow-orange-500/25">
              <Users className="w-5 h-5 text-white" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">{submissions.length}</span>
            <span className="text-xs font-semibold text-slate-500">/ {roster.length > 0 ? roster.length : submissions.length} SV</span>
          </div>
          <p className="mt-1 text-[11px] font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-orange-400" />
            <span>Tỷ lệ nộp {roster.length > 0 ? Math.round((submissions.length / roster.length) * 100) : 100}%</span>
          </p>
        </div>

        <div className="relative overflow-hidden p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-orange-50/80 via-white to-amber-50/40 dark:from-slate-900 dark:via-slate-900/90 dark:to-orange-950/20 border border-orange-100/90 dark:border-orange-900/30 shadow-xs hover:shadow-md transition-all group">
          <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-gradient-to-tr from-orange-400/15 via-amber-300/15 to-transparent rounded-full blur-2xl group-hover:from-orange-400/25 group-hover:via-amber-300/25 transition-all pointer-events-none" />
          <div className="flex items-start justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Đã có điểm (AI)
            </span>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-orange-500 via-amber-500 to-orange-400 text-white flex items-center justify-center shadow-md shadow-orange-500/25">
              <CheckCircle2 className="w-5 h-5 text-white" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">{gradedCount}</span>
            <span className="text-xs font-semibold text-slate-500">bài</span>
          </div>
          <p className="mt-1 text-[11px] font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-orange-400" />
            <span>Đã hoàn thành Rubric</span>
          </p>
        </div>

        <div className="relative overflow-hidden p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-orange-50/80 via-white to-amber-50/40 dark:from-slate-900 dark:via-slate-900/90 dark:to-orange-950/20 border border-orange-100/90 dark:border-orange-900/30 shadow-xs hover:shadow-md transition-all group">
          <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-gradient-to-tr from-orange-400/15 via-amber-300/15 to-transparent rounded-full blur-2xl group-hover:from-orange-400/25 group-hover:via-amber-300/25 transition-all pointer-events-none" />
          <div className="flex items-start justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Điểm trung bình
            </span>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-orange-500 via-amber-500 to-orange-400 text-white flex items-center justify-center shadow-md shadow-orange-500/25">
              <Award className="w-5 h-5 text-white" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-black text-orange-600 dark:text-orange-400 tracking-tight font-mono">{avgScore}</span>
            <span className="text-xs font-semibold text-slate-500">/ 10</span>
          </div>
          <p className="mt-1 text-[11px] font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-orange-400" />
            <span>Phổ điểm toàn lớp</span>
          </p>
        </div>

        <div className="relative overflow-hidden p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-orange-50/80 via-white to-amber-50/40 dark:from-slate-900 dark:via-slate-900/90 dark:to-orange-950/20 border border-orange-100/90 dark:border-orange-900/30 shadow-xs hover:shadow-md transition-all group">
          <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-gradient-to-tr from-orange-400/15 via-amber-300/15 to-transparent rounded-full blur-2xl group-hover:from-orange-400/25 group-hover:via-amber-300/25 transition-all pointer-events-none" />
          <div className="flex items-start justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Chưa nộp bài
            </span>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-orange-500 via-amber-500 to-orange-400 text-white flex items-center justify-center shadow-md shadow-orange-500/25">
              <Clock className="w-5 h-5 text-white" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">{missingStudents.length}</span>
            <span className="text-xs font-semibold text-slate-500">SV</span>
          </div>
          <p className="mt-1 text-[11px] font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-orange-400" />
            <span>Cần đôn đốc nộp bài</span>
          </p>
        </div>
      </div>

      {/* Header Actions */}
      <div className="rounded-2xl p-6 bg-gradient-to-br from-orange-50/80 via-white to-amber-50/40 dark:bg-gradient-to-r dark:from-orange-950/40 dark:via-slate-900/90 dark:to-blue-950/30 border border-orange-100/90 dark:border-orange-500/20 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xs transition-colors">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Badge variant="orange">{assignment?.subjectCode || 'Môn học'}</Badge>
            <span className="text-xs text-slate-600 dark:text-slate-400">
              Đã nộp: <strong>{submissions.length}</strong> / Tổng sĩ số: <strong>{roster.length > 0 ? roster.length : submissions.length}</strong> sinh viên
            </span>
          </div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">{assignment?.title}</h2>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <RefreshAction onRefresh={() => loadData(true)} disabled={loading} cachePaths={["/submissions","/assignments","/exams","/classes"]} />

          <Link href={`/lecturer/grading/assignments/${assignmentId}/submit`}>
            <button
              type="button"
              className="border border-orange-200/80 dark:border-orange-900/40 bg-gradient-to-br from-orange-50/60 via-white to-amber-50/30 dark:from-slate-900 dark:to-slate-800 text-orange-700 dark:text-orange-300 hover:border-orange-300 rounded-2xl h-10 px-4 font-bold text-xs shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <UploadCloud className="w-3.5 h-3.5 text-orange-500" />
              <span>Chấm hàng loạt (Batch)</span>
            </button>
          </Link>

          {selectedIds.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleBatchRegrade}
              isLoading={regradingBatch}
              className="text-xs gap-1.5 text-blue-600 border-blue-200 hover:bg-blue-50 dark:border-blue-900/40 dark:text-blue-400 rounded-2xl h-10 px-4 font-bold"
            >
              <Play className="w-3.5 h-3.5" />
              <span>Chấm lại ({selectedIds.length}) bài chọn</span>
            </Button>
          )}

          <button
            type="button"
            onClick={handleBulkPublish}
            disabled={publishing}
            className="bg-gradient-to-r from-orange-500 via-amber-500 to-orange-500 hover:from-orange-600 hover:via-amber-600 hover:to-orange-600 shadow-orange-500/25 rounded-2xl h-10 px-5 text-white font-bold text-xs gap-1.5 shadow-md active:scale-95 transition-all flex items-center cursor-pointer"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>Công bố điểm toàn bộ</span>
          </button>
        </div>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="p-4 sm:p-5 rounded-2xl shadow-xs bg-gradient-to-br from-orange-50/80 via-white to-amber-50/40 dark:from-slate-900 dark:via-slate-900/90 dark:to-orange-950/20 border border-orange-100/90 dark:border-orange-900/30 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div className="w-full sm:max-w-md">
          <Input
            type="text"
            placeholder={t('lecturer.submissions.search_placeholder', 'Tìm kiếm theo tên sinh viên, MSSV, file...')}
            icon={<Search className="w-4 h-4 text-orange-500" />}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="border-orange-200/80 focus:ring-2 focus:ring-orange-400/25 focus:border-orange-400 rounded-xl"
          />
        </div>

        <div className="inline-flex flex-wrap p-1.5 bg-gradient-to-br from-orange-50/80 via-white to-amber-50/40 dark:from-slate-900 dark:via-slate-900/90 dark:to-orange-950/20 rounded-2xl border border-orange-100/90 dark:border-orange-900/30 shadow-xs gap-1">
          <button
            type="button"
            onClick={() => setStatusFilter('all')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
              statusFilter === 'all'
                ? 'bg-gradient-to-r from-orange-500 via-amber-500 to-orange-500 text-white shadow-md shadow-orange-500/20'
                : 'text-slate-600 hover:text-orange-600 dark:text-slate-300 dark:hover:text-white hover:bg-orange-50/60'
            }`}
          >
            Tất cả ({submissions.length + missingStudents.length})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('submitted')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
              statusFilter === 'submitted'
                ? 'bg-gradient-to-r from-orange-500 via-amber-500 to-orange-500 text-white shadow-md shadow-orange-500/20'
                : 'text-slate-600 hover:text-orange-600 dark:text-slate-300 dark:hover:text-white hover:bg-orange-50/60'
            }`}
          >
            Đã nộp ({submissions.length})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('graded')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
              statusFilter === 'graded'
                ? 'bg-gradient-to-r from-orange-500 via-amber-500 to-orange-500 text-white shadow-md shadow-orange-500/20'
                : 'text-slate-600 hover:text-orange-600 dark:text-slate-300 dark:hover:text-white hover:bg-orange-50/60'
            }`}
          >
            Đã chấm ({gradedCount})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('missing')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
              statusFilter === 'missing'
                ? 'bg-gradient-to-r from-rose-500 to-rose-600 text-white shadow-md shadow-rose-500/20'
                : 'text-slate-600 hover:text-rose-600 dark:text-slate-300 dark:hover:text-white hover:bg-rose-50/60'
            }`}
          >
            Chưa nộp ({missingStudents.length})
          </button>
        </div>
      </div>

      {/* Submissions Table */}
      <div className="rounded-2xl border border-orange-100/90 dark:border-orange-900/30 overflow-hidden shadow-xs bg-white dark:bg-slate-900">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="border-b border-orange-100/90 dark:border-slate-800 bg-gradient-to-r from-orange-50/70 via-amber-50/40 to-orange-50/50 dark:bg-slate-950/60 text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                <th className="p-4 pl-6 w-10">
                  <input
                    type="checkbox"
                    checked={submissions.length > 0 && selectedIds.length === submissions.length}
                    onChange={toggleSelectAll}
                    className="w-4 h-4 rounded text-orange-500 focus:ring-orange-500 cursor-pointer"
                  />
                </th>
                <th className="p-4">{t('lecturer.submissions.col_student', 'Sinh viên & MSSV')}</th>
                <th className="p-4">{t('lecturer.submissions.col_submitted_at', 'Thời gian nộp')}</th>
                <th className="p-4">{t('lecturer.submissions.col_status', 'Trạng thái chấm & Công bố')}</th>
                <th className="p-4">Điểm số (Thô / Phạt / Cuối)</th>
                <th className="p-4">{t('lecturer.submissions.col_file', 'File bài làm')}</th>
                <th className="p-4 pr-6 text-right">{t('lecturer.submissions.col_action', 'Thao tác')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400 text-xs">
                    {t('lecturer.submissions.loading', 'Đang tải danh sách bài nộp...')}
                  </td>
                </tr>
              ) : filteredSubmissions.length === 0 && filteredMissing.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400 text-xs">
                    {loadError || t('lecturer.submissions.no_submissions', 'Không tìm thấy bài nộp nào phù hợp.')}
                  </td>
                </tr>
              ) : (
                <>
                  {/* Submitted List */}
                  {filteredSubmissions.map((sub: any) => {
                    const statusStr = String(sub.gradingStatus || sub.status || '').toLowerCase()
                    const isGraded = statusStr === 'graded' || sub.score !== null
                    const rawScore = Number(sub.rawScore ?? sub.rawAiScore ?? sub.score ?? 0)
                    const latePenalty = Number(sub.latePenaltyAmount ?? 0)
                    const finalScore = Number(sub.finalScore ?? sub.score ?? Math.max(0, rawScore - latePenalty))
                    const isPublished = sub.isPublished === true
                    const isRowPublishing = publishingId === sub.id
                    const isSelected = selectedIds.includes(sub.id)

                    return (
                      <tr key={sub.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/30 transition-colors">
                        <td className="p-4 pl-6">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelectOne(sub.id)}
                            className="w-4 h-4 rounded text-orange-500 focus:ring-orange-500 cursor-pointer"
                          />
                        </td>
                        <td className="p-4">
                          <div className="font-bold text-slate-900 dark:text-white">
                            {typeof sub.student === 'object' ? (sub.student?.fullName || sub.student?.name || 'Sinh viên') : (sub.student || 'Sinh viên')}
                          </div>
                          <div className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                            {typeof sub.studentId === 'object' ? (sub.studentId?.studentCode || 'HE170001') : (sub.studentId || 'HE170001')}
                          </div>
                        </td>
                        <td className="p-4 text-xs text-slate-500 dark:text-slate-400">
                          {formatDate(sub.submittedAt)}
                        </td>
                        <td className="p-4">
                          <div className="flex flex-col gap-1.5 items-start">
                            <Badge
                              variant={
                                isGraded
                                  ? 'success'
                                  : sub.gradingStatus === 'Grading' || sub.gradingStatus === 'Queued'
                                  ? 'warning'
                                  : 'default'
                              }
                              className="text-[11px]"
                            >
                              {sub.gradingStatus || sub.status || 'Pending'}
                            </Badge>

                            {isPublished ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                                <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                                {t('lecturer.submissions.status_published', 'Đã công bố điểm')}
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                                <Clock className="w-3 h-3 text-amber-500" />
                                {t('lecturer.submissions.status_unpublished', 'Chưa công bố')}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="p-4">
                          {isGraded ? (
                            <div className="space-y-0.5 font-mono">
                              <div className="font-extrabold text-base text-emerald-600 dark:text-emerald-400">
                                {finalScore.toFixed(1)}
                                <span className="text-xs text-slate-400 font-normal"> / 10</span>
                              </div>
                              {latePenalty > 0 && (
                                <div className="text-[10px] text-rose-500">
                                  Trừ trễ: -{latePenalty.toFixed(1)}đ (Thô: {rawScore.toFixed(1)})
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-xs text-slate-400">—</span>
                          )}
                        </td>
                        <td className="p-4 text-xs">
                          {sub.downloadUrl || sub.zipFileUrl ? (
                            <button
                              onClick={() => handleDownload(sub)}
                              className="text-orange-600 dark:text-orange-400 hover:underline flex items-center gap-1 font-mono text-left"
                            >
                              <Download className="w-3.5 h-3.5 shrink-0" />
                              <span className="truncate max-w-[130px]">{sub.filename || 'source.zip'}</span>
                            </button>
                          ) : (
                            <span className="text-slate-400">{t('lecturer.submissions.no_link', 'Chưa có link')}</span>
                          )}
                        </td>
                        <td className="p-4 pr-6 text-right">
                          <div className="flex items-center justify-end gap-1.5 flex-wrap">
                            {/* Full Route / Modal View */}
                            <Link href={`/lecturer/grading/result/${sub.id}`}>
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-xs py-1 px-2.5 gap-1 border-slate-200 dark:border-slate-800"
                                title="Xem trang báo cáo chi tiết"
                              >
                                <ExternalLink className="w-3 h-3 text-blue-500" />
                                <span>Chi tiết</span>
                              </Button>
                            </Link>

                            {/* Xem chi tiết phiên Docker Sandbox & AI (>_ logs) */}
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setRegradingSub(sub)
                                gradingApi.gradeExistingSubmission(sub.id).catch((err: any) => {
                                  console.warn('Backend grade trigger:', err)
                                })
                              }}
                              className="text-xs py-1 px-2.5 gap-1 font-mono text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-800/60 bg-amber-50/60 dark:bg-amber-950/20 hover:bg-amber-100 dark:hover:bg-amber-900/40"
                              title="Xem chi tiết phiên chấm Docker Sandbox & AI Rubric (>_ logs)"
                            >
                              <Terminal className="w-3 h-3 text-orange-500" />
                              <span>&gt;_ Logs Sandbox & AI</span>
                            </Button>

                            {/* Edit score */}
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleOpenEdit(sub)}
                              className="text-xs py-1 px-2.5 gap-1"
                            >
                              <Edit className="w-3 h-3 text-orange-500" />
                              <span>Sửa điểm</span>
                            </Button>

                            {/* Reopen / Extension */}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleOpenReopen(sub, true)}
                              className="text-xs py-1 px-2 text-slate-500 hover:text-orange-500"
                              title="Gia hạn nộp bài cho sinh viên này"
                            >
                              <Calendar className="w-3 h-3" />
                            </Button>

                            {/* Publish / Unpublish */}
                            {isPublished ? (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handlePublishSingle(sub, false)}
                                disabled={isRowPublishing}
                                isLoading={isRowPublishing}
                                className="text-xs py-1 px-2 text-slate-400 hover:text-rose-500 gap-1"
                              >
                                <RotateCcw className="w-3 h-3" />
                                <span>Thu hồi</span>
                              </Button>
                            ) : (
                              <Button
                                variant="primary"
                                size="sm"
                                onClick={() => handlePublishSingle(sub, true)}
                                disabled={isRowPublishing}
                                isLoading={isRowPublishing}
                                className="text-xs py-1 px-2.5 gap-1 bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
                              >
                                <Share2 className="w-3 h-3" />
                                <span>Công bố</span>
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })}

                  {/* Missing Students List (G5.3) */}
                  {filteredMissing.map((st: any) => (
                    <tr key={st.id || st.studentId} className="bg-rose-50/20 dark:bg-rose-950/10 hover:bg-rose-50/40 transition-colors">
                      <td className="p-4 pl-6">
                        <span className="w-2 h-2 rounded-full bg-rose-400 inline-block" />
                      </td>
                      <td className="p-4">
                        <div className="font-bold text-slate-800 dark:text-slate-200">
                          {st.name || st.fullName}
                        </div>
                        <div className="text-xs text-rose-500 font-mono">
                          {st.studentId || st.studentCode || 'HE170000'}
                        </div>
                      </td>
                      <td className="p-4 text-xs text-slate-400 italic">
                        Chưa nộp bài
                      </td>
                      <td className="p-4">
                        <Badge variant="danger" className="text-[10px]">
                          Chưa nộp
                        </Badge>
                      </td>
                      <td className="p-4 text-xs text-slate-400 font-mono">
                        0.0 / 10
                      </td>
                      <td className="p-4 text-xs text-slate-400 italic">
                        Không có tệp
                      </td>
                      <td className="p-4 pr-6 text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenReopen(st)}
                          className="text-xs py-1 px-2.5 gap-1 text-orange-600 border-orange-200 hover:bg-orange-50 dark:border-orange-500/30"
                        >
                          <Calendar className="w-3 h-3" />
                          <span>Gia hạn nộp bài</span>
                        </Button>
                      </td>
                    </tr>
                  ))}
                </>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Score Modal */}
      <Modal
        isOpen={editModal.open}
        onClose={() => setEditModal({ open: false, sub: null, score: 0, feedback: '', isPublished: false })}
        title={t('lecturer.submissions.modal_edit_title', 'Điều chỉnh điểm & Nhận xét của giảng viên')}
        description={`Sinh viên: ${typeof editModal.sub?.student === 'object' ? (editModal.sub?.student?.fullName || editModal.sub?.student?.name) : (editModal.sub?.student || '')}`}
      >
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Điểm số (Thang điểm 10)</label>
            <Input
              type="number"
              step="0.1"
              min="0"
              max="10"
              value={editModal.score}
              onChange={(e) => setEditModal({ ...editModal, score: parseFloat(e.target.value) || 0 })}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Nhận xét của giảng viên</label>
            <textarea
              rows={4}
              placeholder="Nhập nhận xét trực tiếp cho sinh viên..."
              value={editModal.feedback}
              onChange={(e) => setEditModal({ ...editModal, feedback: e.target.value })}
              className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 py-2 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-orange-500"
            />
          </div>

          <div className="p-3 rounded-xl bg-orange-50/60 dark:bg-orange-500/10 border border-orange-200 dark:border-orange-500/20">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={editModal.isPublished}
                onChange={(e) => setEditModal({ ...editModal, isPublished: e.target.checked })}
                className="w-4 h-4 rounded text-orange-500 focus:ring-orange-500 cursor-pointer"
              />
              <span className="text-xs font-bold text-slate-900 dark:text-white">
                Công bố điểm ngay cho sinh viên này
              </span>
            </label>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setEditModal({ open: false, sub: null, score: 0, feedback: '', isPublished: false })}
            >
              Hủy bỏ
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleSaveScore}
              isLoading={savingScore}
            >
              Lưu điểm
            </Button>
          </div>
        </div>
      </Modal>

      {/* Reopen / Extension Modal (G5.7) */}
      <Modal
        isOpen={reopenModal.open}
        onClose={() => setReopenModal(prev => ({ ...prev, open: false }))}
        title="Gia hạn nộp bài riêng (Re-open Submission)"
        description={`Sinh viên: ${reopenModal.studentName} (${reopenModal.studentCode})`}
      >
        <form onSubmit={handleSaveReopen} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Thời hạn gia hạn mới (Extended Due Date)
            </label>
            <input
              type="datetime-local"
              required
              value={reopenModal.extendedDueDate}
              onChange={(e) => setReopenModal({ ...reopenModal, extendedDueDate: e.target.value })}
              className="w-full text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 py-2 text-slate-900 dark:text-white focus:outline-none focus:border-orange-500"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Chính sách phạt trễ (Penalty Mode Override)
            </label>
            <select
              value={reopenModal.penaltyMode}
              onChange={(e) => setReopenModal({ ...reopenModal, penaltyMode: e.target.value as any })}
              className="w-full text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 py-2 text-slate-900 dark:text-white focus:outline-none focus:border-orange-500"
            >
              <option value="WAIVE">Miễn phạt trễ hoàn toàn (Waive Penalty)</option>
              <option value="SYSTEM_DEFAULT">Theo chính sách mặc định của bài</option>
              <option value="FLAT_AMOUNT">Trừ điểm cố định (Flat Amount)</option>
              <option value="CUSTOM_RATE">Trừ theo % (Custom Rate)</option>
              <option value="SCORE_CAP">Giới hạn điểm tối đa (Score Cap)</option>
            </select>
          </div>

          {reopenModal.penaltyMode === 'FLAT_AMOUNT' && (
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Số điểm trừ</label>
              <Input
                type="number"
                step="0.5"
                min="0"
                max="10"
                value={reopenModal.flatPenaltyAmount}
                onChange={(e) => setReopenModal({ ...reopenModal, flatPenaltyAmount: parseFloat(e.target.value) || 0 })}
              />
            </div>
          )}

          {reopenModal.penaltyMode === 'CUSTOM_RATE' && (
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Tỷ lệ trừ %</label>
              <Input
                type="number"
                min="0"
                max="100"
                value={reopenModal.customPenaltyRate}
                onChange={(e) => setReopenModal({ ...reopenModal, customPenaltyRate: parseFloat(e.target.value) || 0 })}
              />
            </div>
          )}

          {reopenModal.penaltyMode === 'SCORE_CAP' && (
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Điểm tối đa có thể đạt</label>
              <Input
                type="number"
                step="0.5"
                min="0"
                max="10"
                value={reopenModal.scoreCap}
                onChange={(e) => setReopenModal({ ...reopenModal, scoreCap: parseFloat(e.target.value) || 0 })}
              />
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Lý do gia hạn</label>
            <textarea
              rows={3}
              placeholder="Nhập lý do gia hạn (ví dụ: Sự cố kỹ thuật, có giấy phép y tế...)"
              value={reopenModal.reason}
              onChange={(e) => setReopenModal({ ...reopenModal, reason: e.target.value })}
              className="w-full text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 py-2 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-orange-500"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="ghost"
              size="sm"
              type="button"
              onClick={() => setReopenModal(prev => ({ ...prev, open: false }))}
            >
              Hủy bỏ
            </Button>
            <Button
              variant="primary"
              size="sm"
              type="submit"
              isLoading={savingReopen}
              className="bg-orange-500 hover:bg-orange-600 text-white"
            >
              Xác nhận gia hạn
            </Button>
          </div>
        </form>
      </Modal>

      {/* Live Grading Runner Modal for Lecturer single regrade */}
      {regradingSub && (
        <LiveGradingRunnerModal
          isOpen={Boolean(regradingSub)}
          onClose={() => {
            setRegradingSub(null)
            loadData()
          }}
          submissionId={regradingSub.id}
          assignmentTitle={assignment?.title || 'Bài tập'}
          subjectCode={assignment?.subjectCode || assignment?.SubjectCode || 'CNTT'}
          role="lecturer"
          studentName={regradingSub.studentName || regradingSub.user?.name || regradingSub.studentCode}
          studentCode={regradingSub.studentCode || regradingSub.studentId}
          onFinished={() => {
            loadData()
          }}
        />
      )}
    </div>
  )
}
