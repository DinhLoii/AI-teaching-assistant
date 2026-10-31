export function publishedStudentScore(sub: { ReviewStatus?: string | null; GradingStatus?: string | null; FinalScore?: unknown; TotalScore?: unknown } | null | undefined): number | null {
  if (sub?.ReviewStatus?.toUpperCase() !== 'PUBLISHED' || sub.GradingStatus?.toLowerCase() !== 'graded') return null
  const score = sub.FinalScore ?? sub.TotalScore
  return score == null || !Number.isFinite(Number(score)) ? null : Number(score)
}

export function dashboardResultSummaries(report: any, instructorFeedback: unknown) {
  const text = (value: unknown, fallback: string) => typeof value === 'string' && value.trim() ? value.trim() : fallback
  const execution = report?.executionSummary
  const executionFallback = execution?.ready === false
    ? (execution.runtimeStack === 'android' ? 'Đánh giá mã nguồn Android; chưa chạy trên máy ảo.' : 'Chưa có môi trường thực thi; xem báo cáo chi tiết.')
    : execution?.ready === true ? 'Môi trường thực thi đã sẵn sàng.' : 'Chưa có thông tin thực thi.'
  return {
    testcases: text(report?.testcasesSummary, 'Chưa có thông tin kiểm thử.'),
    execution: text(execution, executionFallback),
    review: text(instructorFeedback, text(report?.aiSummary, 'Xem nhận xét trong báo cáo chi tiết.')),
  }
}
