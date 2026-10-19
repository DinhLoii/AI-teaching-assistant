export function failedGradingUpdate(existing: any, error: string, partialReport: any = {}) {
  let previous: any = null
  try { previous = JSON.parse(existing?.ReportData || 'null') } catch {}
  const hasCompletedResult = previous && !previous.error && ((previous.passedRules?.length || 0) + (previous.failedRules?.length || 0) > 0)
  return hasCompletedResult
    ? { GradingStatus: 'Error', ReportData: JSON.stringify({ ...previous, lastGradingError: error, lastGradingLogs: partialReport.error ? partialReport.gradingLogs || [] : previous.lastGradingLogs || [] }) }
    : { GradingStatus: 'Error', RawScore: null, FinalScore: null, GradedAt: null, ReportData: JSON.stringify({ ...partialReport, error }) }
}
