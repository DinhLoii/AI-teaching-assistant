import { prisma } from '../../../database/prisma.js'
import { TooManyRequestsError } from '../../../shared/application/app.error.js'
import { databaseTransactionOptions } from '../../../database/transaction-options.js'

/** OTP attempt limits persist across restarts and API instances. */
export class PasswordResetAttempts {
  constructor(private readonly db: any = prisma) {}
  async consume(userId: string) {
    const key = `otp_attempts:${userId}`
    await this.db.$transaction(async (tx: any) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${key}))`
      const row = await tx.systemConfig.findUnique({ where: { Key: key } })
      const previous = row?.Value ? JSON.parse(row.Value) : { count: 0, expires: 0 }
      const value = previous.expires > Date.now() ? previous : { count: 0, expires: Date.now() + 15 * 60000 }
      if (value.count >= 5) throw new TooManyRequestsError('Đã vượt số lần thử OTP. Vui lòng yêu cầu mã mới sau ít phút.')
      value.count++
      const Value = JSON.stringify(value)
      await tx.systemConfig.upsert({ where: { Key: key }, create: { Key: key, Value }, update: { Value } })
    }, databaseTransactionOptions)
  }
  async clear(userId: string) { await this.db.systemConfig.deleteMany({ where: { Key: `otp_attempts:${userId}` } }) }
}
