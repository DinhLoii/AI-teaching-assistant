import nodemailer from 'nodemailer'
import { IEmailService } from '../../application/email.service.interface.js'
import { logger } from '../logger.js'

export class NodemailerService implements IEmailService {
  private transporter: nodemailer.Transporter | null = null

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
    } else {
      logger.warn('SMTP credentials not fully provided. Emails will only be logged.')
    }
  }

  async sendEmail(to: string | string[], subject: string, html: string): Promise<boolean> {
    try {
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
        // Fallback for dev if no config
        logger.info(`[MOCK EMAIL] To: ${to} | Subject: ${subject}`)
        return true
      }
    } catch (error: any) {
      logger.error(`Failed to send email to ${to}: ${error.message}`)
      return false
    }
  }
}
