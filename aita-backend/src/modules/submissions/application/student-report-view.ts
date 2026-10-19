/** Keep hidden-case outcomes without publishing their input, answer key or output. */
export function studentReportView(report: any): any {
  if (Array.isArray(report)) return report.map(studentReportView)
  if (!report || typeof report !== 'object') return report
  if (report.isHidden === true) return { caseId: report.caseId || report.id, passed: report.passed, timedOut: report.timedOut, isHidden: true }
  return Object.fromEntries(Object.entries(report).filter(([key]) => key !== 'gradingLogs' && key !== 'lastGradingLogs').map(([key, value]) => [key, studentReportView(value)]))
}
