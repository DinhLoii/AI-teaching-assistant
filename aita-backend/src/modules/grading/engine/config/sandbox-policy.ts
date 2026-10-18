export function sandboxExecutionAllowed(environment: Record<string, string | undefined> = process.env) {
  return environment.NODE_ENV === 'production' ? environment.SANDBOX_ENABLED === 'true' : environment.SANDBOX_ENABLED !== 'false'
}

export function assertSandboxExecution() {
  if (!sandboxExecutionAllowed()) throw new Error('SANDBOX_DISABLED: Chưa cấu hình môi trường thực thi. Không thể xác nhận testcase đã chạy; cần giảng viên kiểm tra hoặc bật worker sandbox.')
}

/** Allows the constrained, network-free console runner without enabling web/SQL sandboxes. */
export function assertStdioSandboxExecution() {
  if (process.env.STDIO_SANDBOX_ENABLED === 'true') return
  assertSandboxExecution()
}
