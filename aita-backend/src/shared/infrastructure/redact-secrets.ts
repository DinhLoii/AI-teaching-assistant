export function safeUrl(value: string): string {
  return value.replace(/([?&](?:token|access_token|refresh_token|ticket|api_key|key|signature|x-amz-signature|password)=)[^&#]*/gi, '$1[REDACTED]')
}

export function safeLogData(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(safeLogData)
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, /password|token|secret|authorization|api.?key|otp/i.test(key) ? '[REDACTED]' : safeLogData(item)]))
  return typeof value === 'string' ? safeUrl(value) : value
}
