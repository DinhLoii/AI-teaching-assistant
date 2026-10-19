import type { GradingEvent } from '../queue/SubmissionJobManager.js'

export type ExecutionObserver = (event: GradingEvent) => void

/** Keep the cause actionable; never translate a runner outage into a student's test failure. */
export function executionFailureMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error)
  if (/ENOENT|ECONNREFUSED|pipe.*docker|docker.*pipe|daemon.*not running/i.test(message)) return 'Không kết nối được Docker Engine. Mở Docker Desktop, chờ Engine sẵn sàng rồi chấm lại; testcase chưa được thực thi.'
  if (/SANDBOX_DISABLED/.test(message)) return 'Runner đang bị tắt trong cấu hình máy chủ; cần bật môi trường thực thi trước khi chạy testcase.'
  return message.slice(0, 1500)
}
