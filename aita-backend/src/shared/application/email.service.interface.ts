export interface IEmailService {
  sendEmail(to: string | string[], subject: string, html: string): Promise<boolean>
}
