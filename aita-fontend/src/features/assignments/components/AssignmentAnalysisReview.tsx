'use client'

export function AssignmentAnalysisReview({ analysis, acknowledged, onAcknowledge }: { analysis: any; acknowledged: boolean; onAcknowledge: (value: boolean) => void }) {
  if (!analysis) return null
  const groups = analysis.requirementGroups || {}
  return <section className="rounded-xl border border-amber-200 bg-amber-50 dark:bg-amber-950/20 p-4 space-y-3 text-xs" aria-label="Đối chiếu phân tích với đề bài">
    <h3 className="font-bold">Phân tích từ đề bài · Cần giảng viên duyệt</h3>
    <p>{analysis.analysisReview?.profile?.platform} · {analysis.detectedLanguage} · {analysis.analysisReview?.status === 'extraction_only' ? 'Chỉ trích xuất tài liệu, AI chưa hoàn tất' : analysis.provenanceReport?.rubricSourceType === 'ORIGINAL_DOCUMENT' ? 'Barem gốc trong đề' : 'Barem AI đề xuất'}</p>
    {(analysis.analysisReview?.warnings || []).map((warning: string, index: number) => <p key={index} role="status">{warning}</p>)}
    <details><summary className="cursor-pointer font-semibold">Yêu cầu bắt buộc, nâng cao và ngoài phạm vi</summary><div className="space-y-3 mt-3">
      {([['required', 'Bắt buộc'], ['advanced', 'Nâng cao'], ['excluded', 'Không bắt buộc / ngoài phạm vi']] as const).map(([key, label]) => <div key={key}><strong>{label}</strong><ul className="list-disc pl-5">{(groups[key] || []).map((row: any, index: number) => <li key={index} className="mt-1 whitespace-pre-wrap">{row.text}</li>)}</ul>{!groups[key]?.length && <p>Chưa trích xuất được mục riêng.</p>}</div>)}
    </div></details>
    {!!analysis.acceptanceTests?.length && <details><summary className="cursor-pointer font-semibold">Tình huống kiểm thử trong đề ({analysis.acceptanceTests.length}) · Chưa chạy tự động</summary><div className="space-y-2 mt-2">{analysis.acceptanceTests.map((test: any, index: number) => <div key={`${test.id || 'acceptance'}:${index}`} className="rounded bg-white/70 dark:bg-slate-900 p-2"><strong>{test.id} · {test.level === 'advanced' ? 'Nâng cao' : 'Bắt buộc'}</strong><p>{test.steps}</p><p>Kỳ vọng: {test.expectedResult}</p></div>)}</div></details>}
    <label className="flex items-start gap-2 font-semibold"><input type="checkbox" checked={acknowledged} onChange={event => onAcknowledge(event.target.checked)} className="mt-0.5" />Tôi đã đối chiếu với đề gốc, kiểm tra phạm vi và duyệt barem điểm trước khi giao bài.</label>
  </section>
}
