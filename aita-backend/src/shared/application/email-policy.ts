import { ServiceUnavailableError } from './app.error.js'

/** Email stays enabled by default; demos must explicitly opt out. */
export function isEmailEnabled(environment: NodeJS.ProcessEnv = process.env) {
  return environment.EMAIL_ENABLED !== 'false'
}

export function assertEmailEnabled() {
  if (!isEmailEnabled()) throw new ServiceUnavailableError('Tính năng gửi email và khôi phục mật khẩu hiện chưa khả dụng. Vui lòng liên hệ quản trị viên.')
}

export function assertProductionEmailConfiguration(environment: NodeJS.ProcessEnv = process.env) {
  if (!isEmailEnabled(environment)) return
  if (!(environment.RESEND_API_KEY && environment.EMAIL_FROM) && !(environment.SMTP_HOST && environment.SMTP_USER && environment.SMTP_PASS)) {
    throw new Error('Production requires an email provider. For a demo without email, explicitly set EMAIL_ENABLED=false.')
  }
}
