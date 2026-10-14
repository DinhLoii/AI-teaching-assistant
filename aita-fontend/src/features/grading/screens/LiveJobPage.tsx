'use client'

import * as React from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { LECTURER_NAV } from '@/config/navigation'
import { Button } from '@/components/ui/button'
import { Modal } from '@/components/ui/modal'
import { gradingApi } from '@/lib/api/modules/grading'
import { assignmentsApi } from '@/lib/api/modules/assignments'
import { submissionsApi } from '@/lib/api/modules/submissions'
import { errorMessage } from '@/lib/api/errors'
import {
  ArrowLeft,
  Loader2,
  Terminal,
  StopCircle,
  CheckCircle2,
  AlertCircle,
  Clock,
  Sparkles,
  ExternalLink,
  RotateCcw,
} from 'lucide-react'
import { useLanguage } from '@/providers/language-provider'

interface ActivityItem {
  id: string
  time: string
  task: string
  type?: 'info' | 'success' | 'warn' | 'error'
  meta?: any
}

export default function LiveJobPage() {
  const { t } = useLanguage()
  const params = useParams()
  const searchParams = useSearchParams()
  const router = useRouter()
  const submissionId = String(params?.id ?? '')
  const assignmentId = searchParams?.get('assignmentId') || undefined

  const [assignmentTitle, setAssignmentTitle] = React.useState('Bài tập')
  const [progress, setProgress] = React.useState(0)
  const [currentTask, setCurrentTask] = React.useState('Đang kết nối hệ thống chấm...')
  const [activities, setActivities] = React.useState<ActivityItem[]>([])
  const [error, setError] = React.useState<string | null>(null)
  const [isCompleted, setIsCompleted] = React.useState(false)
  const [elapsedSeconds, setElapsedSeconds] = React.useState(0)
  const [isCancelling, setIsCancelling] = React.useState(false)
  const [cancelModal, setCancelModal] = React.useState(false)

  const startTimeRef = React.useRef<number>(Date.now())
  const terminalBottomRef = React.useRef<HTMLDivElement | null>(null)

  // Fetch assignment info if available
  React.useEffect(() => {
    if (assignmentId) {
      assignmentsApi.getAssignment(assignmentId)
        .then(res => setAssignmentTitle(res?.title || 'Bài tập'))
        .catch(console.error)
    }
  }, [assignmentId])

  // Timer
  React.useEffect(() => {
    if (isCompleted || error) return
    const interval = setInterval(() => {
      setElapsedSeconds(Math.floor((Date.now() - startTimeRef.current) / 1000))
    }, 1000)
    return () => clearInterval(interval)
  }, [isCompleted, error])

  // Scroll to bottom of terminal
  React.useEffect(() => {
    terminalBottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [activities])

  // Connect to SSE stream
  React.useEffect(() => {
    if (!submissionId) return

    startTimeRef.current = Date.now()
    setProgress(5)
    setCurrentTask('Khởi tạo kết nối hàng đợi chấm điểm AI...')
    setActivities([
      {
        id: 'init',
        time: new Date().toLocaleTimeString(),
        task: 'Đã kết nối luồng sự kiện kiểm thử submission ID: ' + submissionId,
        type: 'info',
      }
    ])

    let isTerminated = false
    let autoRedirectTimer: any = null

    const handleFinish = (scoreText?: string) => {
      if (isTerminated) return
      isTerminated = true
      setProgress(100)
      setCurrentTask('Hoàn tất chấm điểm! Đang tổng hợp báo cáo Rubric...')
      setIsCompleted(true)
      setActivities(prev => {
        if (prev.some(a => a.id === 'complete')) return prev
        return [
          ...prev,
          {
            id: 'complete',
            time: new Date().toLocaleTimeString(),
            task: scoreText
              ? `Hoàn thành toàn bộ quy trình chấm điểm bài nộp thành công! (${scoreText})`
              : 'Hoàn thành toàn bộ quy trình chấm điểm bài nộp thành công!',
            type: 'success',
          }
        ]
      })

      autoRedirectTimer = setTimeout(() => {
        router.push(`/lecturer/grading/result/${submissionId}`)
      }, 1200)
    }

    const unsubscribe = gradingApi.subscribeToProgress(
      submissionId,
      (job) => {
        if (isTerminated) return
        const taskText = job.currentTask || job.task || 'Đang thực thi các bước kiểm thử...'
        const percent = Math.min(100, Math.max(0, Number(job.progressPercent ?? job.percent ?? 0)))
        setProgress(percent)
        setCurrentTask(taskText)

        setActivities(prev => [
          ...prev,
          {
            id: Date.now().toString() + Math.random(),
            time: new Date().toLocaleTimeString(),
            task: taskText,
            type: percent >= 100 ? 'success' : 'info',
            meta: job.meta,
          }
        ])

        if (percent >= 100 || job.state === 'completed') {
          handleFinish(job.result?.totalScore !== undefined ? `Điểm: ${job.result.totalScore}/10` : undefined)
        }
      },
      () => {
        handleFinish()
      },
      (err) => {
        if (isTerminated) return
        console.warn('[SSE] Notice:', err)
      }
    )

    // Polling fallback: ensures the live job screen NEVER gets stuck if SSE packets are delayed or missed
    const pollInterval = setInterval(async () => {
      if (isTerminated) return
      try {
        const sub = await submissionsApi.getSubmission(submissionId).catch(() => null)
        if (!sub) return

        const statusLower = String(sub.gradingStatus || sub.status || '').toLowerCase()
        const isGradedInDb = ['graded', 'completed'].includes(statusLower) || 
          (sub.score !== null && sub.score !== undefined && statusLower !== 'processing')

        if (isGradedInDb && !isTerminated) {
          clearInterval(pollInterval)
          const scoreDisplay = sub.score !== null && sub.score !== undefined ? `Điểm: ${sub.score}/10` : undefined
          handleFinish(scoreDisplay)
        } else if (statusLower === 'processing') {
          // Smooth progressive visual feedback while waiting for AI analysis
          setProgress(prev => (prev < 85 ? Math.min(85, prev + 10) : prev))
        }
      } catch (e) { }
    }, 1500)

    return () => {
      isTerminated = true
      clearInterval(pollInterval)
      if (autoRedirectTimer) clearTimeout(autoRedirectTimer)
      if (unsubscribe) unsubscribe()
    }
  }, [submissionId, router])

  const handleCancel = async () => {
    setIsCancelling(true)
    try {
      await gradingApi.cancelSubmission(submissionId)
      setCancelModal(false)
      router.back()
    } catch (err) {
      alert(errorMessage(err))
    } finally {
      setIsCancelling(false)
    }
  }

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
      title="Phiên chấm bài trực tiếp"
    >
      <div className="w-full space-y-6 pb-12">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.back()}
              className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-slate-600 dark:text-slate-400" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">{assignmentTitle}</span>
                <span className="text-slate-300 dark:text-slate-700">•</span>
                <span className="text-xs font-mono text-slate-500">ID: {submissionId.slice(0, 8)}</span>
              </div>
              <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                {!isCompleted && !error && <Loader2 className="w-5 h-5 animate-spin text-orange-500" />}
                {isCompleted && <CheckCircle2 className="w-5 h-5 text-emerald-500" />}
                {error && <AlertCircle className="w-5 h-5 text-rose-500" />}
                <span>Phiên chấm bài trực tiếp (Live Job)</span>
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-mono font-semibold text-slate-700 dark:text-slate-300">
              <Clock className="w-4 h-4 text-orange-500" />
              <span>Thời gian: {formatElapsed(elapsedSeconds)}</span>
            </div>

            {!isCompleted && !error && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCancelModal(true)}
                className="text-xs gap-1.5 text-rose-600 border-rose-300 hover:bg-rose-50 dark:border-rose-900/40"
              >
                <StopCircle className="w-3.5 h-3.5" />
                <span>Hủy phiên chấm</span>
              </Button>
            )}

            {isCompleted && (
              <Button
                variant="primary"
                size="sm"
                onClick={() => router.push(`/lecturer/grading/result/${submissionId}`)}
                className="text-xs gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Xem kết quả ngay</span>
              </Button>
            )}
          </div>
        </div>

        {/* Glowing Progress Bar */}
        <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 text-white shadow-xl space-y-3">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="font-semibold text-slate-300 truncate max-w-md">{currentTask}</span>
            </div>
            <span className="font-mono font-bold text-lg text-emerald-400">{progress}%</span>
          </div>

          <div className="w-full bg-slate-800/80 rounded-full h-3 overflow-hidden p-0.5 border border-slate-700/50 relative">
            <div
              className="bg-gradient-to-r from-orange-500 via-amber-400 to-emerald-400 h-full rounded-full transition-all duration-300 ease-out shadow-[0_0_12px_rgba(249,115,22,0.4)]"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Live Terminal Log Viewer */}
        <div className="rounded-3xl border border-slate-800 bg-[#0d1117] text-slate-200 overflow-hidden shadow-2xl">
          <div className="px-5 py-3 bg-[#161b22] border-b border-slate-800 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-rose-500/80 inline-block" />
                <span className="w-3 h-3 rounded-full bg-amber-500/80 inline-block" />
                <span className="w-3 h-3 rounded-full bg-emerald-500/80 inline-block" />
              </div>
              <span className="font-mono text-slate-400 pl-2">live-grading-session.log</span>
            </div>
            <span className="text-[11px] text-slate-500 font-mono">Stream: SSE Connected</span>
          </div>

          <div className="p-5 font-mono text-xs space-y-2 max-h-[460px] overflow-y-auto scrollbar-thin">
            {activities.map((act) => {
              const isErr = act.type === 'error'
              const isSucc = act.type === 'success'

              return (
                <div
                  key={act.id}
                  className={`flex items-start gap-3 py-1 ${
                    isErr ? 'text-rose-400' : isSucc ? 'text-emerald-400 font-bold' : 'text-slate-300'
                  }`}
                >
                  <span className="text-slate-500 shrink-0 select-none">[{act.time}]</span>
                  <span className="shrink-0">{isErr ? '✗' : isSucc ? '✓' : '❯'}</span>
                  <span className="flex-1 break-words">{act.task}</span>
                </div>
              )
            })}
            <div ref={terminalBottomRef} />
          </div>
        </div>

        {/* Cancel Confirmation Modal */}
        <Modal
          isOpen={cancelModal}
          onClose={() => setCancelModal(false)}
          title="Xác nhận hủy phiên chấm"
          description="Bạn có chắc chắn muốn hủy bỏ phiên chấm bài nộp này không? Quá trình phân tích sẽ dừng lại ngay lập tức."
        >
          <div className="flex justify-end gap-3 pt-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setCancelModal(false)}
            >
              Tiếp tục chấm
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={handleCancel}
              isLoading={isCancelling}
            >
              Hủy phiên chấm
            </Button>
          </div>
        </Modal>
      </div>
    </DashboardLayout>
  )
}
