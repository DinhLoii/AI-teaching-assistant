'use client'

import * as React from 'react'
import { BookOpen, Download, FileText, ListChecks, Loader2 } from 'lucide-react'
import { readableAssignmentText } from '../document-content'

function DocumentText({ content }: { content: string }) {
  const lines = readableAssignmentText(content).split('\n')
  const blocks: React.ReactNode[] = []
  const inline = (text: string) => text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g).map((part, index) => part.startsWith('**') ? <strong key={index}>{part.slice(2, -2)}</strong> : part.startsWith('`') ? <code key={index} className="rounded bg-slate-100 dark:bg-slate-800 px-1">{part.slice(1, -1)}</code> : part)
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue
    if (line.startsWith('```')) {
      const code: string[] = []; const start = i
      while (++i < lines.length && !lines[i].trim().startsWith('```')) code.push(lines[i])
      blocks.push(<pre key={start} className="overflow-x-auto rounded-xl bg-slate-950 text-slate-100 p-4 text-xs"><code>{code.join('\n')}</code></pre>); continue
    }
    if (line.startsWith('|') && lines[i + 1]?.trim().match(/^\|?\s*:?-{2,}/)) {
      const cells = (row: string) => row.trim().replace(/^\||\|$/g, '').split('|').map(value => value.trim())
      const header = cells(line), rows: string[][] = [], start = i; i++
      while (i + 1 < lines.length && lines[i + 1].trim().startsWith('|')) rows.push(cells(lines[++i]))
      blocks.push(<div key={start} className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700"><table className="w-full text-left text-xs"><thead className="bg-slate-50 dark:bg-slate-800"><tr>{header.map((value, index) => <th key={index} className="p-3">{inline(value)}</th>)}</tr></thead><tbody>{rows.map((row, index) => <tr key={index} className="border-t border-slate-100 dark:border-slate-800">{row.map((value, j) => <td key={j} className="p-3 align-top">{inline(value)}</td>)}</tr>)}</tbody></table></div>); continue
    }
    if (/^#{1,6}\s|^\d+(?:\.\d+)*\.\s/.test(line)) {
      blocks.push(<h4 key={i} className="font-bold text-base text-slate-900 dark:text-white pt-3">{inline(line.replace(/^#{1,6}\s*/, ''))}</h4>); continue
    }
    blocks.push(<p key={i} className={`whitespace-pre-wrap break-words leading-7 ${/^[-•]\s/.test(line) ? 'pl-4' : ''}`}>{inline(line)}</p>)
  }
  return <div className="space-y-3 text-sm text-slate-700 dark:text-slate-300">{blocks}</div>
}

export function AssignmentDocument({ content, analysis, attachments, onDownload, downloadingId }: {
  content: string; analysis?: any; attachments: any[]; onDownload: (attachment: any) => void; downloadingId: string | null
}) {
  const [tab, setTab] = React.useState<'document' | 'requirements' | 'tests'>('document')
  const groups = analysis?.requirementGroups
  const tests = analysis?.acceptanceTests || []
  return <section aria-label="Đề bài và phân tích yêu cầu" className="space-y-4 min-w-0">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div><h3 className="flex items-center gap-2 font-bold text-base"><FileText className="w-5 h-5 text-orange-500" />Mô tả đề bài & Yêu cầu kỹ thuật</h3><p className="mt-1 text-xs text-slate-500">Đọc nội dung đề trên web và đối chiếu phần phân tích theo tài liệu giảng viên.</p></div>
      {analysis?.language && <span className="rounded-full bg-orange-50 dark:bg-orange-950/30 px-3 py-1 text-xs text-orange-700 dark:text-orange-300">{analysis.platform} · {analysis.language}</span>}
    </div>
    {!!attachments.length && <div className="flex flex-wrap gap-2">{attachments.map(file => <button key={file.id} type="button" onClick={() => onDownload(file)} disabled={downloadingId !== null} className="inline-flex max-w-full items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-700 px-3 py-2 text-xs hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-60">
      {downloadingId === file.id ? <Loader2 className="h-4 w-4 animate-spin shrink-0" /> : <Download className="h-4 w-4 text-orange-500 shrink-0" />}<span className="break-all">{file.fileName || 'Tệp đề bài gốc'}</span><span className="text-slate-400 shrink-0">Tệp gốc</span>
    </button>)}</div>}
    <div role="tablist" aria-label="Nội dung đề bài" className="flex gap-2 overflow-x-auto border-b border-slate-200 dark:border-slate-700 pb-2">
      {([['document', 'Nội dung đề', BookOpen], ['requirements', 'Phân tích yêu cầu', ListChecks], ['tests', `Tình huống kiểm thử (${tests.length})`, ListChecks]] as const).map(([id, label, Icon]) => <button key={id} type="button" role="tab" aria-selected={tab === id} onClick={() => setTab(id)} className={`shrink-0 flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold ${tab === id ? 'bg-orange-50 text-orange-700 dark:bg-orange-950/40 dark:text-orange-300' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'}`}><Icon className="h-3.5 w-3.5" />{label}</button>)}
    </div>
    <div role="tabpanel" className="rounded-2xl bg-slate-50/60 dark:bg-slate-950/30 p-4 sm:p-6 min-w-0">
      {tab === 'document' && (content.trim() ? <div className="space-y-4"><p className="text-xs text-slate-500">Bản đọc trên web. Tải tệp gốc để giữ nguyên định dạng tài liệu của giảng viên.</p><div tabIndex={0} aria-label="Nội dung đầy đủ của đề bài" className="max-h-[65vh] sm:max-h-[720px] overflow-y-auto overscroll-contain pr-2"><DocumentText content={content} /></div></div> : <p className="text-sm text-slate-500">Chưa có nội dung đề được lưu để đọc trên web. {attachments.length ? 'Bạn có thể tải tệp gốc ở phía trên.' : 'Giảng viên cần bổ sung đề bài.'}</p>)}
      {tab === 'requirements' && <div className="space-y-5"><p className="text-xs text-slate-500">{analysis?.reviewStatus === 'teacher_reviewed' ? 'Phân tích đã được giảng viên xác nhận khi giao bài.' : 'Chưa có phân tích được giảng viên xác nhận. Nội dung đề và barem chính thức là căn cứ làm bài.'}</p>
        {!groups && <p className="text-sm text-slate-500">Bài tập này chưa lưu phân tích yêu cầu. Không tự bổ sung yêu cầu ngoài đề.</p>}
        {groups && ([['required', 'Yêu cầu bắt buộc'], ['advanced', 'Yêu cầu nâng cao'], ['excluded', 'Không bắt buộc / Ngoài phạm vi']] as const).map(([key, label]) => <div key={key}><h4 className="font-semibold text-sm mb-2">{label}</h4>{groups[key]?.length ? <ul className="list-disc pl-5 space-y-2 text-sm text-slate-700 dark:text-slate-300">{groups[key].map((row: any, index: number) => <li key={index} className="break-words">{row.text}</li>)}</ul> : <p className="text-sm text-slate-500">Không có mục riêng được lưu.</p>}</div>)}
      </div>}
      {tab === 'tests' && <div className="space-y-3"><p className="text-xs text-slate-500">Đây là tình huống và kết quả mong đợi trong đề, chưa phải kết quả chấm hoặc xác nhận kiểm thử đã chạy.</p>{!tests.length && <p className="text-sm text-slate-500">Chưa có tình huống kiểm thử được lưu riêng. Xem nội dung đề gốc.</p>}{tests.map((test: any, index: number) => <article key={`${test.id || 'acceptance'}:${index}`} className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4 text-sm space-y-2"><h4 className="font-bold">{test.id} · {test.level === 'advanced' ? 'Nâng cao' : 'Bắt buộc'}</h4><p>{test.steps}</p><p className="text-slate-600 dark:text-slate-300"><strong>Kỳ vọng:</strong> {test.expectedResult}</p></article>)}</div>}
    </div>
  </section>
}
