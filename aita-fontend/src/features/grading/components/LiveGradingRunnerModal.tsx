'use client'

import * as React from 'react'
import { X, Loader2, AlertCircle, CheckCircle2, Clock, Check, FileArchive, Box, Layers, Bot, ShieldCheck, Cpu, Share2 } from 'lucide-react'
import { gradingApi } from '@/lib/api/modules/grading'
import { reportFacts } from '@/features/submissions/report-facts'
import { acceptsProgress, serverLogs, logStage } from '../grading-log'
import { assessmentMethod } from '@/features/submissions/report-facts'
import { cn } from '@/lib/utils'

const STAGES = [
  { title: 'Giải nén & Nhận diện Công nghệ', subtitle: 'Unpack & Tech Stack', icon: FileArchive },
  { title: 'Khởi tạo Docker Sandbox', subtitle: 'Execution Environment', icon: Box },
  { title: 'Thực thi Probe & Test Suite', subtitle: 'Execution Probe', icon: Layers },
  { title: 'AI Code Review', subtitle: 'Đánh giá theo barem', icon: Bot },
  { title: 'Lưu điểm & Trạng thái', subtitle: 'Persistence & Review', icon: ShieldCheck },
]

export interface LiveGradingRunnerModalProps {
  isOpen: boolean
  onClose: () => void
  submissionId: string
  assignmentTitle?: string
  subjectCode?: string
  techStackHint?: string
  role?: 'student' | 'lecturer'
  studentName?: string
  studentCode?: string
  onFinished?: (result: { score?: number; totalScore?: number; reviewStatus?: string }) => void
}

export function GradingLogViewer({ submissionId, role = 'student', onFinished, onClose, assignmentTitle, subjectCode, studentName, studentCode }: Omit<LiveGradingRunnerModalProps, 'isOpen' | 'onClose'> & { onClose?: () => void }) {
  const [job, setJob] = React.useState<any>(null)
  const [result, setResult] = React.useState<any>(null)
  const [error, setError] = React.useState('')
  const [resultError, setResultError] = React.useState('')
  const [publishing, setPublishing] = React.useState(false)
  const [published, setPublished] = React.useState(false)
  const [retry, setRetry] = React.useState(0)
  const [filter, setFilter] = React.useState<number | 'all'>('all')
  const finishedRef = React.useRef(onFinished)
  React.useEffect(() => { finishedRef.current = onFinished }, [onFinished])

  React.useEffect(() => {
    let active = true
    let current: any = null
    let resultRequested = false
    const runKey = (value: any) => JSON.stringify([value?.requestVersion, value?.attempt, value?.generation])
    setJob(null); setResult(null); setError(''); setResultError(''); setPublished(false); setFilter('all')
    if (!submissionId || submissionId === 'in-progress') return
    const loadResult = async () => {
      if (resultRequested) return
      resultRequested = true
      const requestedRun = runKey(current)
      try {
        const saved = await gradingApi.getSubmissionResult(submissionId)
        if (!active || runKey(current) !== requestedRun) return
        if (saved.submissionId !== submissionId) throw new Error('Báo cáo không khớp bài nộp.')
        setResult(saved)
        setPublished(saved.isPublished === true)
        const score = saved.score == null ? undefined : Number(saved.score)
        if (current?.state === 'completed') finishedRef.current?.({ score, totalScore: score, reviewStatus: saved.reviewStatus })
      } catch (err) {
        if (active && runKey(current) === requestedRun) setResultError(role === 'student' ? 'Kết quả sẽ hiển thị khi giảng viên công bố.' : err instanceof Error ? err.message : 'Chưa tải được báo cáo đã lưu.')
      }
    }
    const unsubscribe = gradingApi.subscribeToProgress(submissionId, incoming => {
      if (!active || !acceptsProgress(submissionId, current, incoming)) return
      if (runKey(current) !== runKey(incoming)) {
        resultRequested = false
        setResult(null); setResultError(''); setPublished(false)
      }
      current = incoming
      setJob(incoming)
      if (incoming.state === 'completed' || incoming.state === 'failed') void loadResult()
    }, () => {}, err => {
      if (active && current?.state !== 'failed') setError(err instanceof Error ? err.message : 'Mất kết nối tiến trình. Hãy kết nối lại để kiểm tra trạng thái.')
    })
    return () => { active = false; unsubscribe() }
  }, [submissionId, role, retry])

  const logs = serverLogs(job?.logs?.length ? job.logs : result?.gradingLogs)
  const completed = job?.state === 'completed'
  const failed = job?.state === 'failed'
  const facts = reportFacts({ id: submissionId, score: failed ? null : result?.score, reportData: result ? { ...result, passedRules: result.rules, totalScore: failed ? null : result.score, maxPossibleScore: result.maxScore } : null })
  const percent = typeof job?.progressPercent === 'number' ? Math.max(0, Math.min(100, job.progressPercent)) : 0
  const publish = async () => {
    setPublishing(true); setResultError('')
    try {
      await gradingApi.publishSubmission(submissionId)
      setPublished(true)
      finishedRef.current?.({ score: facts.score ?? undefined, totalScore: facts.score ?? undefined, reviewStatus: 'PUBLISHED' })
    } catch (err) { setResultError(err instanceof Error ? err.message : 'Không công bố được điểm.') }
    finally { setPublishing(false) }
  }
  const filteredLogs = logs.filter(log => filter === 'all' || logStage(log.message, log.stage) === filter)
  const activeStage = !completed && !failed ? logStage(job?.currentTask || '', job?.currentStage) : null
  const stageEvents = STAGES.map((_, stage) => [...logs].reverse().find(log => logStage(log.message, log.stage) === stage && log.status && ['completed', 'failed', 'skipped', 'warning'].includes(log.status)))
  const aiEvaluations = facts.evaluations.filter((rule: Parameters<typeof assessmentMethod>[0]) => assessmentMethod(rule).startsWith('AI'))
  const ready = result?.executionSummary?.ready
  const testComplete = facts.testExecuted > 0
  const allPassed = testComplete && facts.testPassed === facts.testExecuted && facts.tests.every(test => test.passed === true)
  const stageDetails = [
    stageEvents[0]?.status === 'completed' ? 'Đã kiểm tra mã nguồn' : null,
    ready === true ? 'Đã xác minh môi trường' : ready === false ? 'Môi trường chưa sẵn sàng' : null,
    testComplete ? facts.testPassed + '/' + facts.testExecuted + ' test đạt' : facts.compilation === false ? 'Biên dịch thất bại' : null,
    aiEvaluations.length ? 'Đã đánh giá ' + aiEvaluations.length + ' tiêu chí' : null,
    completed && result ? 'Đã lưu báo cáo' : null,
  ]
  const verifiedStages = [stageEvents[0]?.status === 'completed', ready === true || stageEvents[1]?.status === 'completed', allPassed, aiEvaluations.length > 0, completed && !!result]
  const warningStages = [false, ready === false, testComplete && !allPassed || facts.compilation === false, false, failed].map((warning, index) => warning || ['failed', 'warning'].includes(stageEvents[index]?.status || ''))
  const firstTime = logs.length ? Date.parse(logs[0].timestamp) : null
  const lastTime = logs.length ? Date.parse(logs[logs.length - 1].timestamp) : null
  const elapsed = firstTime !== null && lastTime !== null ? Math.max(0, Math.floor((lastTime - firstTime) / 1000)) : null
  const elapsedText = elapsed === null ? '--:--' : String(Math.floor(elapsed / 60)).padStart(2, '0') + ':' + String(elapsed % 60).padStart(2, '0')
  const title = failed ? 'Lượt chấm gặp lỗi' : completed ? 'Hoàn tất chấm điểm tự động' : 'Đang theo dõi phiên chấm bài'
  const runtime = [...logs].reverse().find(log => typeof log.runtime === 'string' && log.runtime.trim())?.runtime || result?.executionSummary?.runtimeStack
  const probeNames = [...new Set(facts.tests.map(test => test.kind))]
  const canPublish = role === 'lecturer' && completed && !published && facts.score !== null && !facts.gradingError
  return <>
    <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-orange-500 via-amber-400 to-emerald-400" />
    <header className="p-5 sm:p-6 border-b border-slate-800 flex items-start justify-between gap-4 shrink-0 bg-slate-900/95">
      <div className="flex items-center gap-3.5 min-w-0">
        <div className={cn('w-11 h-11 rounded-2xl flex items-center justify-center text-white shadow-lg shrink-0', failed ? 'bg-amber-500/20 text-amber-400' : completed ? 'bg-gradient-to-tr from-emerald-500 to-teal-400 shadow-emerald-500/25' : 'bg-gradient-to-tr from-orange-500 to-amber-400')}>
          {failed ? <AlertCircle className="w-6 h-6" /> : completed ? <CheckCircle2 className="w-6 h-6" /> : <Cpu className="w-6 h-6" />}
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            {subjectCode && <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-orange-500/15 text-orange-400 border border-orange-500/30">{subjectCode}</span>}
            <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-800 text-slate-300 border border-slate-700">{runtime && runtime !== 'unknown' ? runtime : 'Chưa xác minh runtime'}</span>
            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">{probeNames.length ? probeNames.join(' · ') : 'Chưa có bằng chứng kiểm thử'}</span>
          </div>
          <h2 className="text-base sm:text-lg font-bold text-white mt-1 leading-snug">{title}</h2>
          <p className="text-xs text-slate-400 truncate max-w-md">{studentName ? studentName + (studentCode ? ' (' + studentCode + ')' : '') + ' — ' : ''}{assignmentTitle || 'Bài nộp'}</p>
        </div>
      </div>
      <div className="flex items-center gap-3 shrink-0">
        <div title="Khoảng thời gian giữa các sự kiện đã ghi nhận trên server" className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800/80 border border-slate-700 font-mono text-xs text-slate-300"><Clock className="w-3.5 h-3.5 text-orange-400" /><span>{elapsedText}</span></div>
        {onClose && <button aria-label="Đóng nhật ký" onClick={onClose} className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"><X className="w-5 h-5" /></button>}
      </div>
    </header>
    <div className="p-5 sm:p-6 overflow-y-auto space-y-4 flex-1 bg-slate-950/50">
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs font-semibold gap-3">
          <span className="text-slate-400 flex items-center gap-2">{!completed && !failed && !error && <Loader2 className="w-3.5 h-3.5 animate-spin text-orange-400" />}{failed ? 'Lượt chấm gặp lỗi' : job?.currentTask || 'Đang kết nối tiến trình bài nộp...'}</span>
          <span className="font-mono text-orange-400 font-bold">{job ? percent + '%' : '—'}</span>
        </div>
        <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden p-0.5 border border-slate-700/60"><div className="h-full bg-gradient-to-r from-orange-500 via-amber-400 to-emerald-400 rounded-full transition-all duration-300" style={{ width: percent + '%' }} /></div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
        {STAGES.map((stage, index) => {
          const Icon = stage.icon
          const verified = verifiedStages[index]
          const warning = warningStages[index]
          const active = activeStage === index
          const recorded = logs.some(log => logStage(log.message, log.stage) === index)
          const skipped = stageEvents[index]?.status === 'skipped'
          const detail = stageEvents[index]?.status === 'failed' ? 'Không thực hiện được' : skipped ? 'Không thực thi · xem log' : stageDetails[index] || (active ? 'Đang xử lý' : recorded ? 'Đã ghi nhận hoạt động' : 'Chưa có bằng chứng')
          return <button type="button" key={stage.title} onClick={() => setFilter(filter === index ? 'all' : index)} aria-pressed={filter === index} data-testid={'grading-stage-' + index} data-status={warning ? 'warning' : skipped ? 'skipped' : verified ? 'verified' : active ? 'active' : recorded ? 'recorded' : 'unknown'} title={stage.title + ': ' + (stageEvents[index]?.message || detail)} className={cn('p-3 rounded-2xl border transition-all flex flex-col justify-between text-left cursor-pointer min-w-0', filter === index ? 'ring-2 ring-blue-500 bg-blue-500/10 border-blue-500' : warning ? 'bg-amber-500/10 border-amber-500/40' : active ? 'bg-orange-500/10 border-orange-500/60 ring-1 ring-orange-500/40' : verified ? 'bg-slate-800/60 border-emerald-500/30' : 'bg-slate-900/40 border-slate-800/80')}>
            <div className="flex items-center justify-between mb-2">
              <div className={cn('w-7 h-7 rounded-xl flex items-center justify-center text-xs font-bold', warning ? 'bg-amber-500/15 text-amber-400' : verified ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : active ? 'bg-orange-500 text-white' : 'bg-slate-800 text-slate-500')}>{warning ? <AlertCircle className="w-4 h-4" /> : verified ? <Check className="w-4 h-4 stroke-[3]" /> : active ? <Loader2 className="w-4 h-4 animate-spin" /> : index + 1}</div>
              <Icon className={cn('w-4 h-4', warning ? 'text-amber-400' : verified ? 'text-emerald-400' : 'text-slate-500')} />
            </div>
            <div className="space-y-1">
              <h3 className="text-xs font-bold leading-snug truncate text-slate-200">{stage.title}</h3>
              <p className="text-[10px] font-mono text-slate-500 truncate">{stage.subtitle}</p>
              <p className={cn('text-[10px] truncate', warning ? 'text-amber-400' : verified ? 'text-emerald-400' : 'text-slate-400')}>{detail}</p>
            </div>
          </button>
        })}
      </div>
      {error && <div role="alert" className="text-amber-300 text-sm">{error} <button className="underline cursor-pointer" onClick={() => setRetry(value => value + 1)}>Kết nối lại</button></div>}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="font-mono font-bold text-slate-300"><span className="text-orange-400">&gt;_</span> aita-sandbox-runtime.log</span>
          <span className={cn('inline-flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded-full border', error ? 'text-amber-400 border-amber-500/20 bg-amber-500/10' : 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20')}>
            <span className={cn('w-1.5 h-1.5 rounded-full bg-current', !completed && !failed && !error && job && 'animate-pulse')} />
            {failed ? 'Lượt chấm lỗi' : error ? 'Kết nối gián đoạn' : completed ? 'Nhật ký lượt chấm' : job ? 'Live SSE Stream' : 'Đang kết nối'}
          </span>
        </div>
        <div className="flex items-center gap-1 overflow-x-auto text-[11px] font-mono">
          {(['all', 0, 1, 2, 3, 4] as const).map(tab => <button type="button" key={tab} aria-pressed={filter === tab} onClick={() => setFilter(tab)} className={cn('px-2 py-1 rounded-lg border cursor-pointer whitespace-nowrap', filter === tab ? 'bg-orange-500/20 text-orange-400 border-orange-500/40 font-bold' : 'bg-slate-900 border-slate-800 text-slate-500 hover:text-slate-300')}>{tab === 'all' ? 'Tất cả logs (' + logs.length + ')' : 'B' + (tab + 1)}</button>)}
        </div>
      </div>
      <div className="rounded-2xl bg-black/90 border border-slate-800/90 shadow-2xl p-4 font-mono text-xs space-y-1.5 min-h-[260px] max-h-[400px] overflow-y-auto" aria-live="polite">
        {filteredLogs.length ? filteredLogs.map((log, index) => {
          const stage = logStage(log.message, log.stage)
          const previousStage = index ? logStage(filteredLogs[index - 1].message, filteredLogs[index - 1].stage) : null
          return <React.Fragment key={log.id}>
            {stage !== null && (index === 0 || stage !== previousStage) && <div className="pt-2 pb-1 text-center border-b border-slate-800 text-amber-300 font-bold tracking-wider text-[11px]">─── BƯỚC {stage + 1}: {STAGES[stage].title.toLocaleUpperCase('vi-VN')} ───</div>}
            <div className="flex items-start gap-2.5 leading-relaxed hover:bg-slate-900/60 px-1 py-0.5 rounded">
              <time className="text-slate-500 shrink-0 font-semibold" dateTime={log.timestamp}>{new Date(log.timestamp).toLocaleTimeString('vi-VN')}</time>
              <span className={cn('px-1.5 rounded text-[10px] font-bold shrink-0 border', stage === 1 ? 'bg-cyan-500/15 text-cyan-400 border-cyan-500/20' : stage === 3 ? 'bg-purple-500/15 text-purple-400 border-purple-500/20' : 'bg-sky-500/15 text-sky-400 border-sky-500/20')}>{stage === null ? 'SERVER' : 'BƯỚC ' + (stage + 1)}</span>
              <span className={cn('whitespace-pre-wrap break-words min-w-0', log.status === 'failed' || log.state === 'failed' ? 'text-rose-400' : log.status === 'warning' || log.status === 'skipped' ? 'text-amber-400' : log.status === 'completed' || log.state === 'completed' ? 'text-emerald-400' : stage === 1 ? 'text-cyan-300' : 'text-slate-300')}>{log.status && log.status !== 'info' && <strong className="mr-1">{({ started: '[BẮT ĐẦU]', completed: '[HOÀN TẤT]', failed: '[LỖI]', skipped: '[KHÔNG CHẠY]', warning: '[LƯU Ý]' } as Record<string, string>)[log.status]}</strong>}{log.message}</span>
            </div>
          </React.Fragment>
        }) : <p className="text-slate-500 italic py-12 text-center">{logs.length ? 'Chưa có nhật ký ghi nhận cho bước này.' : completed || failed ? 'Không có nhật ký chi tiết được lưu cho lượt chấm này.' : 'Chưa nhận được sự kiện nhật ký từ server.'}</p>}
      </div>
      {resultError && <p role="alert" className="text-sm text-amber-300">{resultError}</p>}
      {(result?.gradingError || (failed && job?.error)) && <p role="alert" className="text-sm text-amber-300">{result?.gradingError || job?.error}</p>}
      {result && (completed || failed) && <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-emerald-950/40 via-slate-900 to-slate-900 border border-emerald-500/40 shadow-xl space-y-3.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shrink-0"><CheckCircle2 className="w-6 h-6" /></div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center flex-wrap gap-2">{failed ? 'Kết quả kiểm chứng trước khi đánh giá lỗi' : 'Chấm điểm hoàn tất'}<span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30">{published ? 'PUBLISHED' : result.reviewStatus || 'Chưa có trạng thái'}</span></h3>
              <p className="text-xs text-slate-300 mt-0.5">{testComplete ? facts.testPassed + '/' + facts.testExecuted + ' test đã chạy đạt yêu cầu' : 'Chưa có bằng chứng thực thi testcase.'}</p>
            </div>
          </div>
          <div className="px-4 py-2 rounded-2xl bg-slate-800/90 border border-slate-700 text-right shrink-0">
            <span className="text-[11px] font-semibold text-slate-400 block uppercase tracking-wider">Điểm tổng kết</span>
            <span data-testid="grading-score" className="text-2xl font-black font-mono text-emerald-400">{facts.score === null ? '—' : facts.score}<span className="text-xs text-slate-400 font-normal"> / {facts.maxScore ?? '—'}</span></span>
          </div>
        </div>
        <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 text-xs flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3 flex-wrap text-slate-300">
            <span>Biên dịch: {facts.compilation === null ? 'Chưa có bằng chứng' : facts.compilation ? 'Thành công' : 'Thất bại'}</span>
            <span className={testComplete && !allPassed ? 'text-amber-400' : 'text-slate-300'}>Testcase: {testComplete ? facts.testPassed + '/' + facts.testExecuted + ' đạt' : 'Chưa xác minh'}</span>
            <span>AI: {aiEvaluations.length ? aiEvaluations.length + ' tiêu chí đã đánh giá' : 'Chưa có bằng chứng đánh giá'}</span>
          </div>
          <span className={cn('font-medium flex items-center gap-1', published ? 'text-emerald-400' : 'text-amber-400')}><Clock className="w-3.5 h-3.5" />{published ? 'Đã công bố điểm' : 'Chưa công bố điểm'}</span>
        </div>
        {facts.tests.length > 0 && <details className="text-xs text-slate-300"><summary className="cursor-pointer">Xem kết quả từng testcase đã lưu</summary><ul className="mt-2 space-y-1">{facts.tests.map(test => <li key={test.key}>{test.name}: {test.passed === null ? 'Chưa thực thi' : test.passed ? 'Đạt' : 'Không đạt'}</li>)}</ul></details>}
        {result.consoleVerification?.error && <p className="text-xs text-amber-300">{result.consoleVerification.error}</p>}
        {result.executionSummary?.limitation && <p className="text-xs text-amber-300">{result.executionSummary.limitation}</p>}
      </div>}
    </div>
    <footer className="p-4 sm:p-5 border-t border-slate-800 bg-slate-900/90 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
      <div className="text-xs text-slate-400 flex items-center gap-2 min-w-0"><span className="w-2 h-2 rounded-full bg-orange-400 shrink-0" /><span className="break-all">Bài nộp: {submissionId || 'Đang chờ mã bài nộp'}</span></div>
      <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
        {canPublish && <button disabled={publishing} onClick={publish} className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 shadow-md flex items-center gap-1.5 cursor-pointer disabled:opacity-50">{publishing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Share2 className="w-3.5 h-3.5" />}<span>{publishing ? 'Đang công bố...' : 'Duyệt & Công bố điểm ngay'}</span></button>}
        {onClose && <button onClick={onClose} className="px-6 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-orange-500 via-amber-500 to-orange-400 text-white shadow-lg shadow-orange-500/25 hover:opacity-95 ring-1 ring-orange-400/50 cursor-pointer">{completed ? 'Hoàn tất & Đóng' : 'Đóng'}</button>}
      </div>
    </footer>
  </>
}

export function LiveGradingRunnerModal(props: LiveGradingRunnerModalProps) {
  if (!props.isOpen) return null
  return <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/80 backdrop-blur-md">
    <section role="dialog" aria-modal="true" aria-label="Nhật ký chấm bài" className="relative w-full max-w-4xl overflow-hidden rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl text-slate-100 flex flex-col max-h-[92vh]">
      <GradingLogViewer key={props.submissionId} {...props} />
    </section>
  </div>
}
