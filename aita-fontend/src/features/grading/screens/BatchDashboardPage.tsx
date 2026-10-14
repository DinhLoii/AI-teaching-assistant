'use client'

import * as React from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { LECTURER_NAV } from '@/config/navigation'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Modal } from '@/components/ui/modal'
import { assignmentsApi } from '@/lib/api/modules/assignments'
import { gradingApi } from '@/lib/api/modules/grading'
import { errorMessage } from '@/lib/api/errors'
import {
  ArrowLeft,
  UploadCloud,
  FileArchive,
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  StopCircle,
  RefreshCw,
  ExternalLink,
  AlertTriangle,
  RotateCcw,
  Check,
  Search,
} from 'lucide-react'
import { useLanguage } from '@/providers/language-provider'

interface BatchJob {
  id: string
  studentName: string
  studentCode?: string
  fileName: string
  state: 'queued' | 'processing' | 'completed' | 'failed'
  progressPercent: number
  currentTask: string
  error?: string
  score?: number
}

export default function BatchDashboardPage() {
  const { t } = useLanguage()
  const params = useParams()
  const router = useRouter()
  const assignmentId = params?.id ? String(params.id) : undefined

  const [assignment, setAssignment] = React.useState<any>(null)
  const [assignmentTitle, setAssignmentTitle] = React.useState('Bài tập')
  const [isUploading, setIsUploading] = React.useState(false)
  const [isCancelling, setIsCancelling] = React.useState(false)
  const [cancelModal, setCancelModal] = React.useState(false)
  const [search, setSearch] = React.useState('')
  const [filterState, setFilterState] = React.useState<'all' | 'processing' | 'completed' | 'failed'>('all')

  const fileInputRef = React.useRef<HTMLInputElement | null>(null)
  const [elapsedSeconds, setElapsedSeconds] = React.useState(0)

  // Local storage keys
  const jobsKey = assignmentId ? `batchJobs_${assignmentId}` : 'batchJobs_general'
  const startKey = assignmentId ? `batchStartTime_${assignmentId}` : 'batchStartTime_general'

  // Jobs state
  const [jobs, setJobs] = React.useState<BatchJob[]>(() => {
    if (typeof window === 'undefined') return []
    try {
      const saved = localStorage.getItem(jobsKey)
      return saved ? JSON.parse(saved) : []
    } catch {
      return []
    }
  })

  // Start time state
  const [batchStartTime, setBatchStartTime] = React.useState<number | null>(() => {
    if (typeof window === 'undefined') return null
    try {
      const saved = localStorage.getItem(startKey)
      return saved ? parseInt(saved, 10) : null
    } catch {
      return null
    }
  })

  // Load assignment details
  React.useEffect(() => {
    if (assignmentId) {
      assignmentsApi.getAssignment(assignmentId)
        .then(res => {
          setAssignment(res)
          setAssignmentTitle(res?.title || 'Bài tập')
        })
        .catch(console.error)
    }
  }, [assignmentId])

  // Save jobs to localStorage
  React.useEffect(() => {
    if (jobs.length > 0) {
      localStorage.setItem(jobsKey, JSON.stringify(jobs))
    } else {
      localStorage.removeItem(jobsKey)
    }
  }, [jobs, jobsKey])

  // Elapsed timer
  React.useEffect(() => {
    if (!batchStartTime) return
    const activeJobs = jobs.filter(j => j.state === 'queued' || j.state === 'processing')
    if (activeJobs.length === 0) return

    const interval = setInterval(() => {
      setElapsedSeconds(Math.floor((Date.now() - batchStartTime) / 1000))
    }, 1000)
    return () => clearInterval(interval)
  }, [batchStartTime, jobs])

  // Polling for batch status
  React.useEffect(() => {
    const activeJobs = jobs.filter(j => j.state === 'queued' || j.state === 'processing')
    if (activeJobs.length === 0) return

    const interval = setInterval(async () => {
      try {
        const ids = activeJobs.map(j => j.id)
        const res = await gradingApi.getBatchStatus(ids)

        if (res && res.statuses) {
          setJobs(prevJobs => {
            let changed = false
            const nextJobs = prevJobs.map(job => {
              const updated = res.statuses[job.id]
              if (updated) {
                if (
                  job.state !== updated.state ||
                  job.progressPercent !== updated.progressPercent ||
                  job.currentTask !== updated.currentTask ||
                  job.score !== updated.score
                ) {
                  changed = true
                  return {
                    ...job,
                    ...updated,
                  }
                }
              }
              return job
            })
            return changed ? nextJobs : prevJobs
          })
        }
      } catch (err) {
        console.error('Batch polling error:', err)
      }
    }, 3500)

    return () => clearInterval(interval)
  }, [jobs])

  // Multi-file upload with validation
  const handleUploadFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files
    if (!fileList || fileList.length === 0) return

    const files = Array.from(fileList)

    // Validate formats
    const invalidFormatFiles = files.filter(f => !f.name.match(/\.(zip|rar|tar\.gz)$/i))
    if (invalidFormatFiles.length > 0) {
      alert(`Phát hiện ${invalidFormatFiles.length} tệp không đúng định dạng. Hệ thống chỉ hỗ trợ tệp nén ZIP, RAR hoặc TAR.GZ:\n` + invalidFormatFiles.map(f => f.name).join(', '))
      if (fileInputRef.current) fileInputRef.current.value = ''
      return
    }

    // Validate size (max 100MB per file)
    const MAX_SIZE = 100 * 1024 * 1024
    const oversizedFiles = files.filter(f => f.size > MAX_SIZE)
    if (oversizedFiles.length > 0) {
      alert(`Phát hiện ${oversizedFiles.length} tệp vượt quá giới hạn 100MB:\n` + oversizedFiles.map(f => `${f.name} (${(f.size / 1024 / 1024).toFixed(1)}MB)`).join(', '))
      if (fileInputRef.current) fileInputRef.current.value = ''
      return
    }

    setIsUploading(true)
    try {
      const res = await gradingApi.submitBatchProject(files, assignmentId)

      const newJobs: BatchJob[] = (res.jobs || []).map((job: any) => ({
        id: job.submissionId || job.id,
        studentName: job.studentName || job.name || 'Sinh viên',
        studentCode: job.studentCode || '',
        fileName: job.fileName || job.filename || 'source.zip',
        state: 'queued',
        progressPercent: 0,
        currentTask: 'Đang xếp hàng đợi chấm điểm...',
      }))

      const now = Date.now()
      setBatchStartTime(now)
      localStorage.setItem(startKey, now.toString())
      setJobs(prev => [...newJobs, ...prev])
    } catch (err) {
      alert(errorMessage(err))
    } finally {
      setIsUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  // Cancel all pending jobs
  const handleCancelAll = async () => {
    const activeJobs = jobs.filter(j => j.state === 'queued' || j.state === 'processing')
    if (activeJobs.length === 0) return

    setIsCancelling(true)
    try {
      const ids = activeJobs.map(j => j.id)
      await gradingApi.cancelBatch(ids)

      // Optimistic update
      setJobs(prev =>
        prev.map(j => (ids.includes(j.id) ? { ...j, state: 'failed', error: 'Đã hủy bởi giảng viên', currentTask: 'Đã hủy' } : j))
      )
      setCancelModal(false)
    } catch (err) {
      alert(errorMessage(err))
    } finally {
      setIsCancelling(false)
    }
  }

  // Retry a single failed job
  const handleRetryJob = async (jobId: string) => {
    try {
      await gradingApi.gradeExistingSubmission(jobId)
      setJobs(prev =>
        prev.map(j => (j.id === jobId ? { ...j, state: 'queued', progressPercent: 0, currentTask: 'Đang xếp hàng thử lại...', error: undefined } : j))
      )
    } catch (err) {
      alert(errorMessage(err))
    }
  }

  // Clear batch
  const handleClearBatch = () => {
    if (!confirm('Bạn có muốn xóa dữ liệu bảng theo dõi batch này khỏi bộ nhớ tạm không?')) return
    localStorage.removeItem(jobsKey)
    localStorage.removeItem(startKey)
    setJobs([])
    setBatchStartTime(null)
    setElapsedSeconds(0)
  }

  const completedCount = jobs.filter(j => j.state === 'completed').length
  const failedCount = jobs.filter(j => j.state === 'failed').length
  const processingCount = jobs.filter(j => j.state === 'processing').length
  const queuedCount = jobs.filter(j => j.state === 'queued').length
  const totalCount = jobs.length

  const overallProgress = totalCount > 0 ? Math.round(((completedCount + failedCount) / totalCount) * 100) : 0

  const filteredJobs = jobs.filter(j => {
    if (filterState === 'completed' && j.state !== 'completed') return false
    if (filterState === 'failed' && j.state !== 'failed') return false
    if (filterState === 'processing' && (j.state !== 'processing' && j.state !== 'queued')) return false
    if (!search) return true
    const text = `${j.studentName} ${j.studentCode || ''} ${j.fileName}`.toLowerCase()
    return text.includes(search.toLowerCase())
  })

  const formatElapsed = (sec: number) => {
    const mins = Math.floor(sec / 60)
    const secs = sec % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <DashboardLayout
      navItems={LECTURER_NAV}
      roleLabel="Lecturer"
      requiredRole="lecturer"
      title="Bảng theo dõi chấm hàng loạt (Batch Dashboard)"
    >
      <div className="space-y-6 w-full pb-12">
        {/* Header Bar */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.back()}
              className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-slate-600 dark:text-slate-400" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  {assignmentTitle}
                </span>
                <span className="text-slate-300 dark:text-slate-700">•</span>
                <span className="text-xs text-orange-600 dark:text-orange-400 font-bold">
                  Batch Processing Pipeline
                </span>
              </div>
              <h1 className="text-xl font-bold text-slate-900 dark:text-white">
                Chấm bài hàng loạt & Giám sát tiến độ
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <input
              type="file"
              ref={fileInputRef}
              accept=".zip,.rar,.tar.gz"
              multiple
              onChange={handleUploadFiles}
              className="hidden"
            />
            <Button
              variant="primary"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              isLoading={isUploading}
              className="text-xs gap-1.5 bg-orange-500 hover:bg-orange-600 text-white shadow-md shadow-orange-500/20"
            >
              <UploadCloud className="w-3.5 h-3.5" />
              <span>Tải thêm file ZIP</span>
            </Button>

            {processingCount + queuedCount > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCancelModal(true)}
                className="text-xs gap-1.5 text-rose-600 border-rose-200 hover:bg-rose-50 dark:border-rose-900/40"
              >
                <StopCircle className="w-3.5 h-3.5" />
                <span>Hủy toàn bộ hàng đợi</span>
              </Button>
            )}

            {jobs.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleClearBatch}
                className="text-xs gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Xóa bảng theo dõi</span>
              </Button>
            )}
          </div>
        </div>

        {/* Aggregate Progress Banner */}
        {totalCount > 0 && (
          <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 text-white shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-1">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Tiến độ chấm bài song song
                </span>
                <div className="flex items-center gap-3">
                  <span className="text-2xl font-black font-mono text-emerald-400">
                    {completedCount + failedCount} / {totalCount} bài
                  </span>
                  <span className="text-xs text-slate-400 font-mono">
                    (Thời gian thực thi: {formatElapsed(elapsedSeconds)})
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-4 text-xs font-mono">
                <span className="flex items-center gap-1.5 text-emerald-400">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Xong: {completedCount}</span>
                </span>
                <span className="flex items-center gap-1.5 text-amber-400">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Đang chạy: {processingCount + queuedCount}</span>
                </span>
                <span className="flex items-center gap-1.5 text-rose-400">
                  <XCircle className="w-4 h-4" />
                  <span>Lỗi: {failedCount}</span>
                </span>
              </div>
            </div>

            <div className="w-full bg-slate-800/80 rounded-full h-3 overflow-hidden p-0.5 border border-slate-700/50">
              <div
                className="bg-gradient-to-r from-orange-500 via-amber-400 to-emerald-400 h-full rounded-full transition-all duration-300"
                style={{ width: `${overallProgress}%` }}
              />
            </div>
          </div>
        )}

        {/* Filter & Search Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="w-full sm:max-w-xs">
            <input
              type="text"
              placeholder="Tìm theo tên sinh viên, file..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full text-xs rounded-xl border border-orange-100/90 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-orange-400"
            />
          </div>

          <div className="inline-flex p-1.5 bg-gradient-to-br from-orange-50/80 via-white to-amber-50/40 dark:from-slate-900 dark:via-slate-900/90 dark:to-orange-950/20 rounded-2xl border border-orange-100/90 dark:border-orange-900/30 shadow-xs">
            {(['all', 'processing', 'completed', 'failed'] as const).map(st => (
              <button
                key={st}
                onClick={() => setFilterState(st)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  filterState === st
                    ? 'bg-gradient-to-r from-orange-500 via-amber-500 to-orange-400 text-white shadow-md shadow-orange-500/20'
                    : 'text-slate-600 dark:text-slate-400 hover:text-orange-600 dark:hover:text-orange-400'
                }`}
              >
                {st === 'all' ? `Tất cả (${totalCount})` :
                 st === 'processing' ? `Đang chấm (${processingCount + queuedCount})` :
                 st === 'completed' ? `Hoàn thành (${completedCount})` :
                 `Lỗi (${failedCount})`}
              </button>
            ))}
          </div>
        </div>

        {/* Batch Jobs Table */}
        <div className="rounded-2xl border border-orange-100/90 dark:border-orange-900/30 overflow-hidden shadow-xs bg-white dark:bg-slate-900">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-orange-100/90 bg-gradient-to-r from-orange-50/70 via-amber-50/40 to-orange-50/50 dark:bg-slate-950/60 text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  <th className="p-4 pl-6">Sinh viên & File</th>
                  <th className="p-4">Trạng thái</th>
                  <th className="p-4">Tiến trình & Nhiệm vụ</th>
                  <th className="p-4">Điểm AI</th>
                  <th className="p-4 pr-6 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {filteredJobs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-12 text-center text-slate-400 text-xs">
                      {jobs.length === 0
                        ? 'Chưa có bài nộp nào trong phiên batch. Hãy bấm "Tải thêm file ZIP" để bắt đầu.'
                        : 'Không tìm thấy bài làm nào theo bộ lọc.'}
                    </td>
                  </tr>
                ) : (
                  filteredJobs.map((job) => {
                    const isDone = job.state === 'completed'
                    const isFail = job.state === 'failed'
                    const isRunning = job.state === 'processing' || job.state === 'queued'

                    return (
                      <tr key={job.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/30 transition-colors">
                        <td className="p-4 pl-6">
                          <div className="font-bold text-slate-900 dark:text-white">
                            {job.studentName}
                          </div>
                          <div className="text-xs text-slate-400 font-mono flex items-center gap-1.5 pt-0.5">
                            <FileArchive className="w-3.5 h-3.5 text-orange-500" />
                            <span>{job.fileName}</span>
                          </div>
                        </td>
                        <td className="p-4">
                          <Badge variant={isDone ? 'success' : isFail ? 'danger' : 'warning'}>
                            {job.state.toUpperCase()}
                          </Badge>
                        </td>
                        <td className="p-4">
                          <div className="space-y-1.5 max-w-md">
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-slate-600 dark:text-slate-300 font-mono text-[11px] truncate">
                                {job.currentTask}
                              </span>
                              <span className="font-mono font-bold text-slate-500">{job.progressPercent}%</span>
                            </div>
                            <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all ${
                                  isFail ? 'bg-rose-500' : isDone ? 'bg-emerald-500' : 'bg-orange-500'
                                }`}
                                style={{ width: `${job.progressPercent}%` }}
                              />
                            </div>
                            {job.error && (
                              <p className="text-[11px] text-rose-500 font-mono">{job.error}</p>
                            )}
                          </div>
                        </td>
                        <td className="p-4">
                          {job.score !== undefined ? (
                            <span className="font-mono font-black text-emerald-600 dark:text-emerald-400 text-base">
                              {Number(job.score).toFixed(1)}
                              <span className="text-xs text-slate-400 font-normal"> / 10</span>
                            </span>
                          ) : (
                            <span className="text-xs text-slate-400">—</span>
                          )}
                        </td>
                        <td className="p-4 pr-6 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {isRunning && (
                              <Link href={`/lecturer/grading/live/${job.id}?assignmentId=${assignmentId || ''}`}>
                                <Button variant="outline" size="sm" className="text-xs py-1 px-2.5 gap-1">
                                  <span>Theo dõi Live</span>
                                </Button>
                              </Link>
                            )}

                            {isDone && (
                              <Link href={`/lecturer/grading/result/${job.id}`}>
                                <Button variant="primary" size="sm" className="text-xs py-1 px-2.5 gap-1 bg-emerald-600 hover:bg-emerald-700 text-white">
                                  <ExternalLink className="w-3 h-3" />
                                  <span>Xem điểm</span>
                                </Button>
                              </Link>
                            )}

                            {isFail && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleRetryJob(job.id)}
                                className="text-xs py-1 px-2.5 gap-1 text-orange-600 border-orange-300 hover:bg-orange-50"
                              >
                                <RefreshCw className="w-3 h-3" />
                                <span>Thử lại</span>
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Cancel Confirmation Modal */}
        <Modal
          isOpen={cancelModal}
          onClose={() => setCancelModal(false)}
          title="Hủy toàn bộ hàng đợi chấm batch"
          description="Bạn có chắc chắn muốn hủy tất cả các bài đang chờ hoặc đang chấm trong hàng đợi không?"
        >
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="ghost" size="sm" onClick={() => setCancelModal(false)}>
              Quay lại
            </Button>
            <Button variant="danger" size="sm" onClick={handleCancelAll} isLoading={isCancelling}>
              Xác nhận hủy
            </Button>
          </div>
        </Modal>
      </div>
    </DashboardLayout>
  )
}
