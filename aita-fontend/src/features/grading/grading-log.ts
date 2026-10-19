export interface GradingLog {
  id: string
  timestamp: string
  message: string
  state: string
  stage?: number
  runtime?: string
  status?: 'started' | 'completed' | 'failed' | 'skipped' | 'info' | 'warning'
}

/** Group real events for navigation only; a group does not prove successful execution. */
export function logStage(message: string, stage?: number): number | null {
  if (typeof stage === 'number' && Number.isInteger(stage) && stage >= 0 && stage <= 4) return stage
  if (/lưu.*báo cáo|evaluation complete|hoàn tất chấm|pendingreview|persist/i.test(message)) return 4
  if (/phân tích:|evaluation of criteria|ai feedback|tổng hợp nhận xét|code review|rubric|theo barem/i.test(message)) return 3
  if (/testcase|test suite|probe|compil|biên dịch|kiểm chứng/i.test(message)) return 2
  if (/sandbox|execution environment|migration|build db|docker/i.test(message)) return 1
  if (/source analysis|source snapshot|giải nén|unpack|nhận diện|extract/i.test(message)) return 0
  return null
}

/** The server owns the event clock and run identity. Never manufacture pipeline events. */
export function serverLogs(value: unknown): GradingLog[] {
  if (!Array.isArray(value)) return []
  const seen = new Set<string>()
  return value.filter((event): event is GradingLog => {
    if (!event || typeof event.id !== 'string' || typeof event.message !== 'string' || !event.message.trim() || !Number.isFinite(Date.parse(event.timestamp)) || seen.has(event.id)) return false
    seen.add(event.id)
    return true
  }).slice(-200)
}

export function acceptsProgress(submissionId: string, current: any, incoming: any): boolean {
  if (!incoming || (incoming.submissionId || incoming.id) !== submissionId) return false
  if (!current) return true
  if (Number(incoming.requestVersion || 0) !== Number(current.requestVersion || 0)) return Number(incoming.requestVersion || 0) > Number(current.requestVersion || 0)
  if (Number(incoming.attempt || 0) !== Number(current.attempt || 0)) return Number(incoming.attempt || 0) > Number(current.attempt || 0)
  if (['completed', 'failed'].includes(current.state) && !['completed', 'failed'].includes(incoming.state)) return false
  return true
}
