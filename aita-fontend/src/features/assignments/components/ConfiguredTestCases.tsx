import type { AssignmentRow } from '@/lib/api/contracts'

export function ConfiguredTestCases({ tests = [], language, executionSelected }: {
  tests: AssignmentRow['testCases']; language?: string | null; executionSelected: boolean
}) {
  return (
    <section className="p-5 rounded-3xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 space-y-4">
      <div className="flex flex-wrap justify-between gap-2">
        <h4 className="font-bold text-sm">Bộ kiểm thử đã cấu hình ({tests.length})</h4>
        {language && <span className="text-xs font-mono text-orange-600">Ngôn ngữ yêu cầu: {language}</span>}
      </div>
      <p className="text-xs text-slate-500">Đây là testcase đã lưu cùng đề bài. Kết quả Pass/Fail chỉ có sau khi chạy bài nộp trong môi trường kiểm thử.</p>
      {tests.length > 0 && !executionSelected && <p role="status" className="p-3 rounded-xl bg-sky-50 text-sky-800 dark:bg-sky-950/40 dark:text-sky-200 text-xs">Với bài console, hệ thống chạy bộ test để kiểm chứng khi runner sẵn sàng. Điểm vẫn tính theo barem đã duyệt; không cộng điểm testcase thêm lần nữa.</p>}
      {tests.length === 0 && <p className="text-sm text-slate-500">Bài tập chưa có testcase stdin/stdout được lưu.</p>}
      {tests.map((test, index) => (
        <details key={test.id} className="rounded-xl border border-slate-200 dark:border-slate-800 p-3">
          <summary className="cursor-pointer text-xs font-semibold">Testcase {index + 1} · {test.isHidden ? 'Ẩn với sinh viên' : 'Công khai'}</summary>
          <div className="grid md:grid-cols-2 gap-3 mt-3">
            <div><p className="text-xs text-slate-500 mb-1">Input / stdin</p><pre className="text-xs bg-slate-50 dark:bg-slate-950 p-3 rounded-lg overflow-auto max-h-64 whitespace-pre">{test.input}</pre></div>
            <div><p className="text-xs text-slate-500 mb-1">Expected output / stdout</p><pre className="text-xs bg-slate-50 dark:bg-slate-950 p-3 rounded-lg overflow-auto max-h-64 whitespace-pre">{test.expectedOutput}</pre></div>
          </div>
        </details>
      ))}
    </section>
  )
}
