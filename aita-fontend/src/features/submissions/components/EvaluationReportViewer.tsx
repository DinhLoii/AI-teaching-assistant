'use client'

import * as React from 'react'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/providers/auth-provider'
import { submissionsApi } from '@/lib/api/modules/submissions'
import { reportFacts, evidenceMatches, assessmentMethod } from '../report-facts'
import { SubmissionHistory } from './SubmissionHistory'
import { VsCodeExplorerViewer } from './VsCodeExplorerViewer'

export interface EvaluationReportViewerProps {
  submission: any
  onResubmit?: () => void
  onGetHint?: (ruleId?: any, ruleTitle?: any) => void | Promise<any>
  isLecturer?: boolean
  onUpdateRuleScore?: (updatedRuleScores: any[], newTotalScore: number) => void
  onOpenAppeal?: () => void
}
const tabs = [['overview', 'Tổng quan'], ['rubric', 'Chi tiết đánh giá'], ['testcases', 'Test cases'], ['review', 'Code Review'], ['history', 'Lịch sử nộp bài']] as const
const languages: Record<string, string> = { kt: 'kotlin', kts: 'kotlin', java: 'java', cpp: 'cpp', c: 'c', h: 'c', cs: 'csharp', py: 'python', ts: 'typescript', tsx: 'typescript', js: 'javascript', sql: 'sql', xml: 'xml', json: 'json' }
const time = (value?: string) => value ? new Date(value).toLocaleString('vi-VN') : 'Chưa rõ thời gian'
const panel = 'rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-4'

export function EvaluationReportViewer({ submission, onResubmit, onGetHint, isLecturer, onUpdateRuleScore, onOpenAppeal }: EvaluationReportViewerProps) {
  const { role } = useAuth()
  const staff = isLecturer || role === 'lecturer' || role === 'admin'
  const facts = reportFacts(!staff && !submission?.isPublished ? { ...submission, reportData: null, ReportData: null, ruleScores: [], score: null, finalScore: null } : submission)
  const submissionId = String(submission?.id || submission?.submissionId || '')
  const [tab, setTab] = React.useState<typeof tabs[number][0]>('overview')
  const [source, setSource] = React.useState<{ id: string; files: { path: string; content: string }[]; hash?: string; skipped?: number; error?: string }>({ id: '', files: [] })
  const [retry, retrySource] = React.useReducer(n => n + 1, 0)
  const [edits, setEdits] = React.useState<Record<string, number>>({})
  const [copied, setCopied] = React.useState<string | null>(null)
  React.useEffect(() => {
    if (!submissionId) return
    const controller = new AbortController()
    setSource({ id: '', files: [] }); setEdits({})
    submissionsApi.getSource(submissionId, controller.signal).then(data => {
      if (!controller.signal.aborted) setSource({ id: submissionId, files: data.files, hash: data.archiveSha256, skipped: data.skipped })
    }).catch(error => { if (!controller.signal.aborted) setSource({ id: submissionId, files: [], error: error.message || 'Không đọc được ZIP.' }) })
    return () => controller.abort()
  }, [submissionId, retry])
  const files = source.id === submissionId ? source.files : []
  const viewerFiles = files.map(file => ({ id: file.path, path: file.path, name: file.path.split('/').pop() || file.path, content: file.content, language: languages[file.path.split('.').pop() || ''] || 'text' }))
  const max = facts.maxScore
  const score = facts.score
  const scoreLabel = score === null ? 'Chưa có điểm' : `${score.toFixed(2)}${max && max > 0 ? ` / ${max}` : ''}`
  const rank = score === null || !max || max <= 0 ? 'Chưa đủ dữ liệu xếp loại' : score / max >= .8 ? 'Đạt tốt' : score / max >= .5 ? 'Đạt yêu cầu' : 'Cần cải thiện'
  const filename = submission?.filename || 'ZIP bài nộp'
  const save = () => {
    const updated = facts.evaluations.map((rule: any, index: number) => ({ ...rule, earnedScore: edits[String(rule.ruleId || index)] ?? rule.earnedScore }))
    onUpdateRuleScore?.(updated, updated.reduce((sum: number, rule: any) => sum + Number(rule.earnedScore || 0), 0))
    setEdits({})
  }
  return <div className="space-y-5 text-slate-900 dark:text-white">
    <section className={panel}>
      <div className="flex flex-wrap justify-between gap-2 text-xs text-slate-500"><span>{submission?.subjectCode || 'Chưa có mã môn'} · Lần nộp #{submission?.attemptNumber ?? '—'}</span><span>{submission?.gradingStatus || submission?.status || 'Chưa có trạng thái'} · {submission?.isPublished ? 'Đã công bố' : 'Chưa công bố'}</span></div>
      <h2 className="text-xl font-bold">{submission?.assignmentTitle || (typeof submission?.assignment === 'string' ? submission.assignment : null) || 'Báo cáo bài nộp'}</h2>
      <p className="text-xs text-slate-500">{filename} · Nộp: {time(submission?.submittedAt)} · Chấm: {time(submission?.gradedAt)}</p>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[['Tổng điểm', scoreLabel, rank], ['Test cases thực thi', facts.testExecuted ? `${facts.testPassed}/${facts.testExecuted}` : 'Chưa có kết quả', 'Chỉ tính bằng chứng thực thi'], ['Tiêu chí barem', facts.evaluations.length, 'Theo báo cáo đã lưu'], ['Biên dịch', facts.compilation === null ? 'Chưa xác minh' : facts.compilation ? 'Đạt' : 'Không đạt', 'Cần log biên dịch riêng']].map(([label, value, note]) => <div key={label} className="rounded-xl bg-slate-50 dark:bg-slate-800 p-4 space-y-2"><p className="text-xs text-slate-500">{label}</p><strong className="text-xl tabular-nums">{value}</strong><p className="text-xs text-slate-500">{note}</p></div>)}
      </div>
      {facts.identityMismatch && <p role="alert" className="text-sm text-red-600">Báo cáo không khớp mã bài tập hoặc lần nộp đang xem. Cần chấm lại đúng ZIP; không sử dụng điểm của báo cáo này.</p>}
      {facts.report.executionSummary?.ready === false && <p role="status" className="rounded-xl bg-amber-50 dark:bg-amber-950/30 p-3 text-sm text-amber-800 dark:text-amber-300">{facts.report.executionSummary.runtimeStack === 'android' ? 'Bài Android được đánh giá từ mã nguồn. Hệ thống chưa chạy ứng dụng trên máy ảo Android; các acceptance test cần được giảng viên kiểm chứng.' : 'Chưa có môi trường chạy ứng dụng trong lượt chấm này. Xem phương thức và bằng chứng của từng tiêu chí bên dưới.'}</p>}
      {facts.gradingError && <p role="alert" className="rounded-xl bg-red-50 dark:bg-red-950/30 p-3 text-sm text-red-700 dark:text-red-300">Lượt chấm chưa hoàn tất: {String(facts.gradingError)}. Điểm lỗi không được coi là điểm 0 của bài làm.</p>}
      {facts.report.manualReviewNotes?.length > 0 && <div role="alert" className="rounded-xl bg-amber-50 dark:bg-amber-950/30 p-3 text-sm text-amber-800 dark:text-amber-300">Cần giảng viên xem lại: {facts.report.manualReviewNotes.join(' · ')}</div>}
    </section>
    <div role="tablist" aria-label="Nội dung báo cáo" className="flex gap-5 overflow-x-auto border-b border-slate-200 dark:border-slate-800">
      {tabs.map(([id, label]) => <button key={id} role="tab" aria-selected={tab === id} onClick={() => setTab(id)} className={`shrink-0 pb-3 text-sm font-semibold border-b-2 ${tab === id ? 'border-orange-500 text-orange-600' : 'border-transparent text-slate-500'}`}>{label}</button>)}
    </div>
    {tab === 'overview' && <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
      <section className={`${panel} xl:col-span-2 min-w-0`}><h3 className="font-bold">Mã nguồn từ ZIP đã nộp</h3>
        {viewerFiles.length ? <VsCodeExplorerViewer key={submissionId} initialFiles={viewerFiles} archiveName={filename} height="h-[520px]" /> : <p role={source.error ? 'alert' : 'status'} className="py-12 text-center text-sm text-slate-500">{source.id !== submissionId ? 'Đang đọc ZIP đã lưu...' : source.error || 'ZIP không có tệp mã nguồn hỗ trợ xem.'}{source.error && <button onClick={retrySource} className="ml-2 text-orange-600 underline">Thử lại</button>}</p>}
        {source.id === submissionId && source.hash && <p className="break-all text-[10px] text-slate-500">ZIP SHA-256: {source.hash} · {files.length} tệp hiển thị · {source.skipped || 0} mục bị bỏ qua (thư viện, tệp nhị phân hoặc giới hạn đọc).</p>}
      </section>
      <section className={panel}><h3 className="font-bold">Chất lượng mã nguồn theo barem</h3><p className="text-xs text-slate-500">Không có điểm Code Quality riêng nếu giảng viên không cấu hình tiêu chí đó. Nhận xét bên dưới lấy từ từng tiêu chí đã chấm.</p>
        {!facts.evaluations.length && <p className="text-sm text-slate-500">Chưa có đánh giá theo tiêu chí.</p>}
        {facts.evaluations.map((rule: any, index: number) => <div key={rule.ruleId || index} className="border-t border-slate-100 dark:border-slate-800 pt-3 text-xs space-y-1"><strong>{rule.title || rule.ruleId} · {rule.earnedScore ?? '—'} / {rule.weight ?? '—'}</strong><p className="whitespace-pre-wrap">{rule.details || rule.reason || 'Chưa có nhận xét.'}</p></div>)}
      </section>
    </div>}
    {tab === 'rubric' && <div className="space-y-4">
      {!facts.evaluations.length && <section className={panel}>Chưa có kết quả theo barem. Không thay bằng tiêu chí mẫu.</section>}
      {facts.evaluations.map((rule: any, index: number) => {
        const id = String(rule.ruleId || index), weight = Number(rule.weight || 0)
        const snippets = rule.evidence?.snippets || (rule.evidence?.codeSnippet ? [rule.evidence] : [])
        return <section key={id} className={panel}>
          <div className="flex flex-wrap justify-between gap-3"><div><span className="text-xs text-slate-500">{id}</span><h3 className="font-bold">{rule.title || 'Tiêu chí chưa có tên'}</h3></div>{staff && onUpdateRuleScore ? <label className="text-xs">Điểm <input aria-label={`Điểm ${id}`} type="number" min="0" max={weight} step="0.25" disabled={weight <= 0} value={edits[id] ?? rule.earnedScore ?? 0} onChange={event => setEdits(previous => ({ ...previous, [id]: Math.max(0, Math.min(weight, Number(event.target.value) || 0)) }))} className="ml-2 w-20 rounded border p-1 bg-transparent" /> / {weight}</label> : <strong>{rule.earnedScore ?? '—'} / {rule.weight ?? '—'} điểm</strong>}</div>
          <p className="text-xs font-medium text-slate-500">{assessmentMethod(rule)}</p>
          <p className="text-sm whitespace-pre-wrap">{rule.details || rule.reason || rule.description || 'Chưa có nhận xét.'}</p>
          {snippets.map((snippet: any, i: number) => <div key={i} className="rounded-xl bg-slate-950 p-3 text-xs text-slate-200 space-y-2"><div className="flex flex-wrap justify-between gap-2"><span className="break-all">{snippet.filePath || 'Chưa có đường dẫn'} · {evidenceMatches(snippet.codeSnippet, snippet.filePath, files) ? 'Đoạn trích khớp ZIP' : 'Chưa xác minh đoạn trích với ZIP'}</span><button onClick={async () => { await navigator.clipboard.writeText(snippet.codeSnippet || ''); setCopied(`${id}:${i}`) }}>{copied === `${id}:${i}` ? 'Đã copy' : 'Copy'}</button></div><pre className="overflow-x-auto">{snippet.codeSnippet}</pre></div>)}
          {!staff && onGetHint && <Button size="sm" variant="outline" onClick={() => void onGetHint(id, rule.title)}>Gợi ý cho tiêu chí này</Button>}
        </section>
      })}
      {staff && onUpdateRuleScore && Object.keys(edits).length > 0 && <Button onClick={save}>Lưu điểm theo barem</Button>}
    </div>}
    {tab === 'testcases' && <section className={panel}><h3 className="font-bold">Kết quả kiểm thử theo barem</h3><p className="text-xs text-slate-500">Chỉ hiển thị kết quả được ghi trong bằng chứng thực thi của tiêu chí. Có tệp unit test hoặc nhận xét AI không có nghĩa testcase đã chạy thành công.</p>
      <p>{facts.testExecuted ? `${facts.testPassed}/${facts.testExecuted} kiểm thử đạt` : facts.report.consoleVerification?.error || 'Chưa có bằng chứng thực thi testcase.'}</p>
      {facts.report.consoleVerification?.scoringImpact === 'none' && <p className="text-xs text-slate-500">Bộ test kiểm chứng việc chạy chương trình; không cộng thêm điểm ngoài barem giảng viên đã duyệt.</p>}
      {facts.tests.map(test => <div key={test.key} className="rounded-xl bg-slate-50 dark:bg-slate-800 p-4 text-xs space-y-2"><div className="flex flex-wrap justify-between gap-2"><strong>{test.ruleId} · {test.kind} · {String(test.name)}</strong><span>{test.passed === true ? 'Đạt' : test.passed === false ? 'Không đạt' : 'Chưa có kết quả'}</span></div>{['input', 'expected', 'actual', 'error'].map(key => test[key] != null && <div key={key}><span className="text-slate-500">{key}:</span><pre className="whitespace-pre-wrap break-words">{String(test[key])}</pre></div>)}</div>)}
    </section>}
    {tab === 'review' && <section className={panel}><h3 className="font-bold">Code Review theo bài nộp và barem</h3>
      <p className="text-xs text-slate-500">Đối chiếu nhận xét với đoạn mã và tiêu chí ở mục Chi tiết đánh giá. Các đoạn trích chưa khớp ZIP cần được giảng viên xem lại.</p>
      {facts.evaluations.map((rule: any, i: number) => <div key={rule.ruleId || i} className="text-sm border-t border-slate-100 dark:border-slate-800 pt-3"><strong>{rule.title || rule.ruleId} · {rule.earnedScore ?? '—'} / {rule.weight ?? '—'}</strong><p className="mt-1 whitespace-pre-wrap">{rule.details || rule.reason || 'Chưa có nhận xét.'}</p></div>)}
      {facts.report.overallFeedback && <p className="whitespace-pre-wrap text-sm rounded-xl bg-slate-50 dark:bg-slate-800 p-4">{facts.report.overallFeedback}</p>}
      {!facts.evaluations.length && !facts.report.overallFeedback && <p className="text-sm text-slate-500">Chưa có nhận xét Code Review.</p>}
      {submission?.instructorFeedback && <p className="whitespace-pre-wrap text-sm"><strong>Nhận xét giảng viên:</strong> {submission.instructorFeedback}</p>}
    </section>}
    {tab === 'history' && <SubmissionHistory submissionId={submissionId} />}
    <div className="flex flex-wrap gap-3">{onResubmit && <Button variant="outline" onClick={onResubmit}>Nộp lại bài</Button>}{!staff && onOpenAppeal && <Button variant="outline" onClick={onOpenAppeal}>Phúc khảo điểm</Button>}</div>
  </div>
}
