/** Demo responses must never become a student's grade. */
export function assertRealGradingMode(stubMode: boolean): void {
  if (stubMode) throw new Error('Không thể chấm bài thật khi AI_STUB_MODE đang bật. Tắt chế độ giả lập và cấu hình dịch vụ AI trước khi chấm.')
}
