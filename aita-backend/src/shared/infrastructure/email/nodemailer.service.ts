import nodemailer from 'nodemailer'
import { IEmailService } from '../../application/email.service.interface.js'
import { logger } from '../logger.js'
import { ServiceUnavailableError } from '../../application/app.error.js'

export class NodemailerService implements IEmailService {
  private transporter: ReturnType<typeof nodemailer.createTransport> | null = null

  constructor() {
    const host = process.env.SMTP_HOST
    const port = Number(process.env.SMTP_PORT) || 587
    const user = process.env.SMTP_USER
    const pass = process.env.SMTP_PASS

    if (host && user && pass) {
      this.transporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465, // true for 465, false for other ports
        auth: {
          user,
          pass,
        },
      })
    } else if (!(process.env.RESEND_API_KEY && process.env.EMAIL_FROM)) {
      logger.warn('Email provider is not configured; delivery is available only in development mock mode.')
    }
  }

  async sendEmail(to: string | string[], subject: string, html: string): Promise<boolean> {
    try {
      if (process.env.RESEND_API_KEY && process.env.EMAIL_FROM) {
        const response = await fetch('https://api.resend.com/emails', { method: 'POST',
          headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ from: process.env.EMAIL_FROM, to: Array.isArray(to) ? to : [to], subject, html }), signal: AbortSignal.timeout(15000) })
        if (!response.ok) throw new Error('Email provider rejected delivery')
        return true
      }
      if (this.transporter) {
        await this.transporter.sendMail({
          from: `"AITA System" <${process.env.SMTP_USER || 'noreply@aita.com'}>`,
          to: Array.isArray(to) ? to.join(', ') : to,
          subject,
          html,
        })
        logger.info(`Email sent to ${to}: ${subject}`)
        return true
      } else {
        if (process.env.NODE_ENV === 'production') throw new ServiceUnavailableError('Email chưa được cấu hình. Vui lòng liên hệ quản trị viên.')
        // Fallback for dev if no config
        logger.info(`[MOCK EMAIL] To: ${to} | Subject: ${subject}`)
        return true
      }
    } catch (error: any) {
      logger.error(`Failed to send email to ${to}: ${error.message}`)
      throw new ServiceUnavailableError('Không gửi được email. Vui lòng thử lại sau.')
    }
  }
}
