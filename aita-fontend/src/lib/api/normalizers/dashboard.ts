type SummaryKind = 'execution' | 'testcases' | 'review'

/** Dashboard summaries can be legacy strings or structured grading metadata. */
export function dashboardSummaryText(value: unknown, kind: SummaryKind, isVi = true): string {
  if (typeof value === 'string' && value.trim()) return value.trim()
  if (kind === 'execution' && value && typeof value === 'object' && !Array.isArray(value)) {
    const execution = value as { runtimeStack?: unknown; ready?: unknown }
    if (execution.ready === false) return execution.runtimeStack === 'android'
      ? (isVi ? 'Đánh giá mã nguồn Android; chưa chạy trên máy ảo.' : 'Android source assessed; not run on an emulator.')
      : (isVi ? 'Chưa có môi trường thực thi; xem báo cáo chi tiết.' : 'Execution environment unavailable; see the detailed report.')
    if (execution.ready === true) return isVi ? 'Môi trường thực thi đã sẵn sàng.' : 'Execution environment was ready.'
  }
  if (kind === 'testcases') return isVi ? 'Chưa có thông tin kiểm thử.' : 'No test execution summary available.'
  if (kind === 'review') return isVi ? 'Xem nhận xét trong báo cáo chi tiết.' : 'See feedback in the detailed report.'
  return isVi ? 'Chưa có thông tin thực thi.' : 'No execution summary available.'
}
