'use client'

import * as React from 'react'
import {
  CheckCircle2,
  ShieldCheck,
  UploadCloud,
  Cpu,
  Layers,
  Download,
  Check,
  X,
  Clock,
  Loader2,
  AlertCircle,
} from 'lucide-react'
import { gradingApi } from '@/lib/api/modules/grading'
import { submissionsApi } from '@/lib/api/modules/submissions'
import { clearClientApiCache } from '@/lib/api/client'
import { cn, formatDate } from '@/lib/utils'

export interface StudentSubmissionModalProps {
  isOpen: boolean
  onClose: () => void
  submissionId?: string
  assignmentId?: string
  file?: File | null
  noteContent?: string
  assignmentTitle?: string
  subjectCode?: string
  fileName?: string
  fileSize?: number
  attemptNumber?: number
  techStackHint?: string
  initialMode?: 'processing' | 'receipt' | 'uploading'
  submittedAt?: string | Date
  onComplete?: () => void
  onUploadSuccess?: (submission: any) => void
}

interface StudentStage {
  id: string
  stepNumber: number
  title: string
  description: string
  icon: React.ElementType
}

const STUDENT_STAGES: StudentStage[] = [
  { id: 'upload', stepNumber: 1, title: 'Tiếp nhận tệp tin', description: 'Truyền tải tệp bài làm và ghi chú lên hệ thống', icon: UploadCloud },
  { id: 'validation', stepNumber: 2, title: 'Kiểm tra điều kiện', description: 'Máy chủ kiểm tra lớp học, hạn nộp và quyền nộp bài', icon: ShieldCheck },
  { id: 'storage', stepNumber: 3, title: 'Lưu trữ bài làm', description: 'Lưu tệp mã nguồn và ghi nhận lần nộp vào hệ thống', icon: Cpu },
  { id: 'grading', stepNumber: 4, title: 'Chuẩn bị đánh giá', description: 'Tiếp nhận để xử lý theo chế độ chấm của bài tập', icon: Layers },
  { id: 'ready', stepNumber: 5, title: 'Hoàn tất & Chờ duyệt', description: 'Ghi nhận bài nộp thành công, chờ giảng viên công bố kết quả', icon: CheckCircle2 },
]

interface VerificationLog {
  id: string
  stepIdx: number
  time: string
  text: string
  type: 'info' | 'success' | 'highlight' | 'warn' | 'error'
}

export function StudentSubmissionModal({
  isOpen,
  onClose,
  submissionId: initialSubId,
  assignmentId,
  file,
  noteContent = '',
  assignmentTitle = 'Bài tập thực hành',
  subjectCode = 'CNTT',
  fileName = 'source.zip',
  fileSize,
  attemptNumber = 1,
  techStackHint,
  initialMode = 'uploading',
  submittedAt,
  onComplete,
  onUploadSuccess,
}: StudentSubmissionModalProps) {
  const [activeSubId, setActiveSubId] = React.useState<string>(initialSubId || '')
  const [currentStageIdx, setCurrentStageIdx] = React.useState(initialMode === 'receipt' ? 4 : 0)
  const [progressPercent, setProgressPercent] = React.useState(initialMode === 'receipt' ? 100 : 0)
  const [isFinished, setIsFinished] = React.useState(initialMode === 'receipt')
  const [logs, setLogs] = React.useState<VerificationLog[]>([])
  const [isDownloading, setIsDownloading] = React.useState(false)
  const [elapsedSeconds, setElapsedSeconds] = React.useState(0)
  const [confirmedSubmittedAt, setConfirmedSubmittedAt] = React.useState<string | null>(null)

  // The HTTP client does not expose byte progress; show a pending state until confirmed.
  const [isUploadingLive, setIsUploadingLive] = React.useState(initialMode === 'uploading')
  const [uploadError, setUploadError] = React.useState<string | null>(null)

  const logBottomRef = React.useRef<HTMLDivElement | null>(null)
  const startTimeRef = React.useRef<number>(Date.now())

  // Detect runtime stack
  const detectedStack = React.useMemo(() => {
    if (techStackHint) return techStackHint
    const code = subjectCode.toUpperCase()
    if (code.includes('CSD') || code.includes('PRO')) return 'C++17 (Gnu C++ Compiler)'
    if (code.includes('SDN') || code.includes('FER') || code.includes('PRN')) return 'Node.js 20 / TypeScript & Next.js'
    if (code.includes('PRJ') || code.includes('PRM') || code.includes('JAVA')) return 'Java OpenJDK 17 & Maven'
    if (code.includes('DBI') || code.includes('SQL')) return 'PostgreSQL / SQL Server Engine'
    if (code.includes('MAS') || code.includes('AIP') || code.includes('PY')) return 'Python 3.11 Runtime'
    return 'Universal Fullstack & AI Analysis'
  }, [techStackHint, subjectCode])

  const formattedSize = React.useMemo(() => {
    const size = fileSize || (file ? file.size : 0)
    if (!size) return file ? '0 B' : 'Không có thông tin'
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`
    return `${(size / (1024 * 1024)).toFixed(2)} MB`
  }, [fileSize, file])

  const effectiveFileName = file?.name || fileName || 'Mobile_Expense_Tracker_Submission.zip'

  const onUploadSuccessRef = React.useRef(onUploadSuccess)
  React.useEffect(() => { onUploadSuccessRef.current = onUploadSuccess }, [onUploadSuccess])

  // Preserve the POST across Strict Mode's setup/cleanup/setup cycle.
  // Each setup observes the same request; cleanup only detaches its observer.
  const uploadSessionRef = React.useRef<{
    promise: Promise<any>
    startedAt: number
    notified: boolean
  } | null>(null)

  const submissionDataRef = React.useRef({
    file,
    noteContent,
    assignmentId,
    initialSubId,
    effectiveFileName,
    formattedSize,
    detectedStack,
  })
  React.useEffect(() => {
  submissionDataRef.current = {
    file,
    noteContent,
    assignmentId,
    initialSubId,
    effectiveFileName,
    formattedSize,
    detectedStack,
  }
  }, [file, noteContent, assignmentId, initialSubId, effectiveFileName, formattedSize, detectedStack])

  const formattedDateStr = React.useMemo(() => {
    if (confirmedSubmittedAt) return formatDate(confirmedSubmittedAt)
    if (submittedAt) return formatDate(typeof submittedAt === 'string' ? submittedAt : submittedAt.toISOString())
    return formatDate(new Date().toISOString())
  }, [submittedAt, confirmedSubmittedAt])

  const appendLog = React.useCallback(
    (stepIdx: number, text: string, type: 'info' | 'success' | 'highlight' | 'warn' | 'error' = 'info') => {
      const seconds = Math.floor((Date.now() - startTimeRef.current) / 1000)
      const time = `${Math.floor(seconds / 60).toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`
      setLogs((prev) => [
        ...prev,
        {
          id: `${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          stepIdx,
          time,
          text,
          type,
        },
      ])
    },
    []
  )

  const appendLogRef = React.useRef(appendLog)
  React.useEffect(() => { appendLogRef.current = appendLog }, [appendLog])

  // Scroll logs smoothly
  React.useEffect(() => {
    if (logBottomRef.current) {
      logBottomRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [logs])

  React.useEffect(() => {
    if (!isOpen) {
      uploadSessionRef.current = null
      setConfirmedSubmittedAt(null)
      return
    }
    const data = submissionDataRef.current
    if (initialMode === 'receipt') {
      setActiveSubId(data.initialSubId || '')
      setUploadError(data.initialSubId ? null : 'Không tìm thấy mã bài nộp để xem biên nhận.')
      setIsFinished(!!data.initialSubId)
      setIsUploadingLive(false)
      setProgressPercent(data.initialSubId ? 100 : 0)
      setCurrentStageIdx(data.initialSubId ? 4 : 0)
      setLogs(data.initialSubId ? [{
        id: 'receipt', stepIdx: 4, time: '00:00', type: 'success',
        text: `[Tiếp nhận] Bài nộp ${data.initialSubId}. Kết quả chính thức do giảng viên công bố.`,
      }] : [])
      return
    }
    let active = true
    let session = uploadSessionRef.current
    if (!session) {
      const startedAt = Date.now()
      const promise = Promise.resolve().then(async () => {
        if (initialMode === 'processing' && data.initialSubId) {
          return submissionsApi.getSubmission(data.initialSubId)
        }
        if (!data.file || !data.assignmentId) {
          throw new Error('Vui lòng chọn tệp bài làm và bài tập trước khi nộp.')
        }
        return submissionsApi.submitAssignment(data.file, data.noteContent, data.assignmentId)
      }).then((result) => {
        const id = result?.id || (result && 'submissionId' in result ? result.submissionId : undefined)
        if (!id) throw new Error('Máy chủ chưa xác nhận mã bài nộp. Hãy kiểm tra lịch sử nộp bài trước khi thử lại.')
        clearClientApiCache('/submissions')
        return { ...result, id }
      })
      session = { promise, startedAt, notified: false }
      uploadSessionRef.current = session
    }
    const currentSession = session
    startTimeRef.current = session.startedAt
    setIsFinished(false)
    setCurrentStageIdx(0)
    setProgressPercent(0)
    setUploadError(null)
    setIsUploadingLive(true)
    setLogs([{
      id: 'upload', stepIdx: 0, time: '00:00', type: 'info',
      text: `[Tiếp nhận] Đang gửi ${data.effectiveFileName} (${data.formattedSize}) và chờ phản hồi từ máy chủ...`,
    }])
    const updateElapsed = () => setElapsedSeconds(Math.floor((Date.now() - currentSession.startedAt) / 1000))
    updateElapsed()
    const timer = setInterval(updateElapsed, 1000)
    // A delayed POST may already have saved: never retry it automatically.
    const timeout = setTimeout(() => {
      if (!active) return
      clearInterval(timer)
      setIsUploadingLive(false)
      setUploadError('Máy chủ phản hồi quá lâu. Bài nộp có thể đã được lưu; hãy kiểm tra lịch sử nộp bài trước khi gửi lại.')
      appendLogRef.current(0, '[Chưa xác nhận] Hết thời gian chờ phản hồi từ máy chủ.', 'warn')
    }, 120_000)
    currentSession.promise.then((result) => {
      if (!active) return
      clearInterval(timer)
      clearTimeout(timeout)
      updateElapsed()
      setActiveSubId(result.id)
      setConfirmedSubmittedAt(result.submittedAt || new Date().toISOString())
      setUploadError(null)
      setIsUploadingLive(false)
      // The submit endpoint confirms these steps together; do not invent timed stages.
      setCurrentStageIdx(4)
      setProgressPercent(100)
      setIsFinished(true)
      appendLogRef.current(1, '[Điều kiện] Máy chủ đã chấp nhận yêu cầu nộp bài.', 'success')
      appendLogRef.current(2, `[Lưu trữ] Máy chủ xác nhận đã lưu bài nộp ${result.id}.`, 'success')
      appendLogRef.current(3, '[Đánh giá] Bài làm được xử lý theo chế độ chấm của bài tập.', 'info')
      appendLogRef.current(4, '[Thành công] Đã tiếp nhận bài nộp. Giảng viên công bố kết quả chính thức.', 'highlight')
      if (!currentSession.notified) {
        currentSession.notified = true
        onUploadSuccessRef.current?.(result)
      }
    }, (error: unknown) => {
      if (!active) return
      clearInterval(timer)
      clearTimeout(timeout)
      updateElapsed()
      setIsUploadingLive(false)
      const message = error instanceof Error ? error.message : 'Không thể nộp bài. Vui lòng kiểm tra lại kết nối.'
      setUploadError(message)
      appendLogRef.current(0, `[Lỗi tiếp nhận] ${message}`, 'error')
    })
    return () => {
      active = false
      clearInterval(timer)
      clearTimeout(timeout)
    }
  }, [isOpen, initialMode])

  // Download submitted archive
  const handleDownload = async () => {
    const subIdToDownload = activeSubId || initialSubId
    if (!subIdToDownload) return
    setIsDownloading(true)
    try {
      await gradingApi.downloadSubmission(subIdToDownload, effectiveFileName.replace(/\.zip$/i, ''))
    } catch (err: any) {
      alert(err?.message || 'Không thể tải tệp tin bài làm về máy lúc này.')
    } finally {
      setIsDownloading(false)
    }
  }

  const handleFinishAndClose = () => {
    if (isUploadingLive && !uploadError) return
    if (isFinished) onComplete?.()
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
      <style>{`@keyframes submission-upload-sweep { from { transform: translateX(-100%); } to { transform: translateX(334%); } }`}</style>
      <div className="relative w-full max-w-3xl overflow-hidden rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl text-slate-100 flex flex-col max-h-[92vh]">
        {/* Glowing subtle top bar */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-orange-500 via-amber-400 to-emerald-400" />

        {/* Modal Header */}
        <div className="p-5 sm:p-6 pb-4 border-b border-slate-800 flex items-start justify-between gap-4 shrink-0 bg-slate-900/95">
          <div className="flex items-center gap-3.5">
            <div
              className={cn(
                'w-11 h-11 rounded-2xl flex items-center justify-center text-white shadow-lg transition-all',
                isFinished
                  ? 'bg-gradient-to-tr from-emerald-500 to-teal-400 shadow-emerald-500/25 ring-2 ring-emerald-400/40'
                  : 'bg-gradient-to-tr from-orange-500 via-amber-500 to-orange-400 shadow-orange-500/25 animate-pulse'
              )}
            >
              {isFinished ? <CheckCircle2 className="w-6 h-6" /> : <UploadCloud className="w-6 h-6" />}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-orange-500/15 text-orange-400 border border-orange-500/30">
                  {subjectCode}
                </span>
                <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-800 text-slate-300 border border-slate-700">
                  {detectedStack}
                </span>
                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                  Lần nộp #{attemptNumber}
                </span>
              </div>
              <h2 className="text-base sm:text-lg font-bold text-white mt-1 leading-snug">
                {isFinished
                  ? 'Bài làm đã tiếp nhận thành công'
                  : isUploadingLive
                  ? 'Đang truyền tải & xác thực bài nộp'
                  : 'Tiếp nhận bài nộp'}
              </h2>
              <p className="text-xs text-slate-400 truncate max-w-md">
                {assignmentTitle}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {/* Live Timer if still running */}
            {!isFinished && !uploadError && (
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800/80 border border-slate-700 font-mono text-xs text-slate-300">
                <Clock className="w-3.5 h-3.5 text-orange-400" />
                <span>
                  {Math.floor(elapsedSeconds / 60)
                    .toString()
                    .padStart(2, '0')}
                  :{(elapsedSeconds % 60).toString().padStart(2, '0')}
                </span>
              </div>
            )}

            <button
              onClick={handleFinishAndClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              disabled={isUploadingLive && !uploadError}
              title="Đóng"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-4 flex-1 custom-scrollbar bg-slate-950/50">
          {/* HIGH-END PRODUCTION UPLOAD CARD (Active when uploading) */}
          {isUploadingLive && !uploadError && (
            <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-blue-950/40 via-slate-900 to-indigo-950/40 border border-blue-500/30 shadow-xl space-y-3 animate-in fade-in zoom-in-95 duration-200">
              <div className="flex items-center gap-3.5">
                <div className="relative flex items-center justify-center shrink-0">
                  <div className="absolute inset-0 rounded-2xl bg-blue-500/20 animate-ping opacity-75" />
                  <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-blue-600 to-cyan-500 text-white flex items-center justify-center shadow-lg shadow-blue-500/25 relative z-10">
                    <UploadCloud className="w-6 h-6 animate-pulse" />
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-xs sm:text-sm font-bold text-white flex items-center gap-2">
                      <span>Đang truyền tải tệp tin lên máy chủ...</span>
                      <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded-full border border-cyan-500/20">
                        <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
                        Chờ máy chủ
                      </span>
                    </h3>
                    <span className="text-xs font-mono font-bold text-blue-400">Đang xử lý</span>
                  </div>
                  <p className="text-xs text-slate-300 truncate font-mono mt-0.5">
                    {effectiveFileName} • {formattedSize}
                  </p>
                </div>
              </div>

              {/* Progress Bar for Upload */}
              <div className="space-y-1">
                <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden p-0.5 border border-slate-700/60">
                  <div
                    className="h-full bg-gradient-to-r from-blue-500 via-indigo-400 to-cyan-400 rounded-full"
                    style={{ width: '30%', animation: 'submission-upload-sweep 1.4s ease-in-out infinite' }}
                  />
                </div>
                <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 pt-0.5">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3 text-cyan-400" /> Đang chờ xác nhận lưu bài
                  </span>
                  <span>Hệ thống AITA</span>
                </div>
              </div>
            </div>
          )}

          {/* Upload Error Banner */}
          {uploadError && (
            <div className="p-4 rounded-2xl bg-rose-950/40 border border-rose-500/40 text-rose-300 space-y-2 animate-in fade-in duration-200">
              <div className="flex items-center gap-2 font-bold text-rose-400">
                <AlertCircle className="w-5 h-5 shrink-0" />
                <span>Không thể tải lên tệp tin bài làm</span>
              </div>
              <p className="text-xs text-rose-200/80 leading-relaxed">{uploadError}</p>
            </div>
          )}

          {/* Stepper Progress Bar */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs font-semibold">
              <span className="text-slate-400 flex items-center gap-2">
                {!isFinished && !uploadError && <Loader2 className="w-3.5 h-3.5 animate-spin text-orange-400" />}
                <span>
                  {uploadError
                    ? 'Quá trình gặp sự cố'
                    : STUDENT_STAGES[currentStageIdx]?.title || 'Tiến trình tiếp nhận bài làm'}
                </span>
              </span>
              <span className="font-mono text-orange-400 font-bold">{isUploadingLive ? 'Đang chờ xác nhận' : `${progressPercent}%`}</span>
            </div>
            <div role="progressbar" aria-label="Tiến trình tiếp nhận bài nộp" aria-valuemin={0} aria-valuemax={100} aria-valuenow={isUploadingLive ? undefined : progressPercent} className="h-2 w-full bg-slate-800 rounded-full overflow-hidden p-0.5 border border-slate-700/60">
              <div
                className="h-full bg-gradient-to-r from-orange-500 via-amber-400 to-emerald-400 rounded-full transition-all duration-300 ease-out"
                style={{ width: isUploadingLive ? '30%' : `${progressPercent}%`, animation: isUploadingLive ? 'submission-upload-sweep 1.4s ease-in-out infinite' : undefined }}
              />
            </div>
          </div>

          {/* Stepper Steps (5 Cards designed for Students) */}
          <div role="list" aria-label="Các bước tiếp nhận bài nộp" className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
            {STUDENT_STAGES.map((st, idx) => {
              const Icon = st.icon
              const isPast = idx < currentStageIdx || isFinished
              const isCurrent = idx === currentStageIdx && !isFinished

              return (
                <div
                  key={st.id}
                  role="listitem"
                  aria-current={isCurrent ? 'step' : undefined}
                  className={cn(
                    'p-3 rounded-2xl border transition-all flex flex-col justify-between text-left',
                    isCurrent
                      ? 'bg-orange-500/10 border-orange-500/60 shadow-md shadow-orange-500/10 ring-1 ring-orange-500/40 animate-pulse'
                      : isPast
                      ? 'bg-slate-800/60 border-emerald-500/30 text-slate-300'
                      : 'bg-slate-900/40 border-slate-800/80 text-slate-500 opacity-60'
                  )}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div
                      className={cn(
                        'w-7 h-7 rounded-xl flex items-center justify-center text-xs font-bold transition-all',
                        isPast
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : isCurrent
                          ? 'bg-orange-500 text-white shadow-xs'
                          : 'bg-slate-800 text-slate-500'
                      )}
                    >
                      {isPast ? <Check className="w-4 h-4 stroke-[3]" /> : idx + 1}
                    </div>
                    <Icon className={cn('w-4 h-4', isCurrent ? 'text-orange-400' : isPast ? 'text-emerald-400' : 'text-slate-600')} />
                  </div>

                  <div className="space-y-0.5">
                    <h3 className={cn('text-xs font-bold leading-snug line-clamp-1', isCurrent ? 'text-white' : isPast ? 'text-slate-200' : 'text-slate-400')}>
                      {st.title}
                    </h3>
                    <p className="text-[10px] text-slate-400 line-clamp-2 leading-relaxed">
                      {st.description}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Reassuring Completion Receipt Card (Persistent, never flashes away) */}
          {isFinished && (
            <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-emerald-950/40 via-slate-900 to-slate-900 border border-emerald-500/40 shadow-xl animate-in fade-in slide-in-from-bottom-2 duration-300 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shrink-0 shadow-lg shadow-emerald-500/20">
                    <CheckCircle2 className="w-7 h-7" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                      <span>Nộp bài thành công!</span>
                      <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                        Chờ giảng viên duyệt
                      </span>
                    </h3>
                    <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                      Bài làm đã được máy chủ tiếp nhận. Hệ thống xử lý theo chế độ chấm của bài tập; giảng viên kiểm tra và công bố điểm chính thức.
                    </p>
                  </div>
                </div>
              </div>

              {/* Receipt Details Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 text-xs">
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase font-mono">Tệp bài làm</span>
                  <span className="font-semibold text-slate-200 truncate block font-mono" title={effectiveFileName}>
                    {effectiveFileName}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase font-mono">Dung lượng</span>
                  <span className="font-semibold text-slate-200 block font-mono">
                    {formattedSize}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase font-mono">Thời gian tiếp nhận</span>
                  <span className="font-semibold text-slate-200 block font-mono">
                    {formattedDateStr}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase font-mono">Biên nhận máy chủ</span>
                  <span className="font-semibold text-emerald-400 flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5" /> Đã tiếp nhận
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Student-friendly Verification Logs Console */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs px-1">
              <span className="font-mono font-bold text-slate-300 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>Nhật ký xác thực tệp tin & trạng thái tiếp nhận</span>
              </span>
              <span className="inline-flex items-center gap-1 text-[11px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                {isFinished ? 'Đã tiếp nhận' : uploadError ? 'Chưa xác nhận' : 'Đang chờ xác nhận'}
              </span>
            </div>

            <div className="rounded-2xl bg-black/85 border border-slate-800/90 shadow-xl p-4 font-mono text-xs space-y-2 max-h-[220px] min-h-[140px] overflow-y-auto custom-scrollbar">
              {logs.map((lg) => (
                <div key={lg.id} className="flex items-start gap-2.5 leading-relaxed hover:bg-slate-900/50 px-1 py-0.5 rounded transition-colors">
                  <span className="text-slate-500 select-none shrink-0 font-semibold">{lg.time}</span>
                  <span
                    className={cn(
                      'px-1.5 py-0.2 rounded text-[10px] font-bold select-none shrink-0 uppercase',
                      lg.type === 'highlight'
                        ? 'bg-amber-500/15 text-amber-300 border border-amber-500/25'
                        : lg.type === 'error'
                        ? 'bg-rose-500/15 text-rose-400 border border-rose-500/25'
                        : lg.type === 'success'
                        ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/25'
                        : 'bg-sky-500/15 text-sky-400 border border-sky-500/25'
                    )}
                  >
                    BƯỚC {lg.stepIdx + 1}
                  </span>
                  <span
                    className={cn(
                      'break-words',
                      lg.type === 'highlight'
                        ? 'text-amber-300 font-medium'
                        : lg.type === 'error'
                        ? 'text-rose-400 font-medium'
                        : lg.type === 'success'
                        ? 'text-emerald-400 font-medium'
                        : 'text-slate-300'
                    )}
                  >
                    {lg.text}
                  </span>
                </div>
              ))}
              <div ref={logBottomRef} />
            </div>
          </div>
        </div>

        {/* Modal Footer Actions */}
        <div className="p-4 sm:p-5 border-t border-slate-800 bg-slate-900/90 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-slate-400 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span>
              Quy trình: <strong>Tiếp nhận bài nộp & Chờ công bố kết quả</strong>
            </span>
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
            {uploadError && (
              <button
                type="button"
                onClick={handleFinishAndClose}
                className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-300 bg-slate-800 hover:bg-slate-700 border border-slate-700 cursor-pointer transition-colors"
              >
                Đóng & Chọn lại tệp
              </button>
            )}

            {isFinished && (
              <button
                type="button"
                onClick={handleDownload}
                disabled={isDownloading}
                className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-300 bg-slate-800 hover:bg-slate-700 border border-slate-700 flex items-center gap-1.5 cursor-pointer disabled:opacity-50 transition-colors"
                title="Tải tệp ZIP bài làm vừa nộp về máy"
              >
                {isDownloading ? <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-400" /> : <Download className="w-3.5 h-3.5 text-blue-400" />}
                <span>Tải tệp vừa nộp (.zip)</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleFinishAndClose}
              disabled={isUploadingLive && !uploadError}
              className={cn(
                'px-6 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer disabled:opacity-50',
                isFinished
                  ? 'bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 text-white shadow-lg shadow-emerald-500/25 hover:opacity-95 ring-1 ring-emerald-400/50'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
              )}
            >
              {isFinished ? 'Xác nhận & Xem bài nộp' : isUploadingLive ? 'Đang gửi & Chờ xác nhận...' : 'Đóng'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
