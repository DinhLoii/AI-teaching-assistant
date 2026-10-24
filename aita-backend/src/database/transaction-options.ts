import { env } from '../config/env.js'

// Shared by direct Prisma calls and the Unit of Work. Remote databases can
// exceed Prisma's 5-second default even when every query is valid.
export const databaseTransactionOptions = {
  timeout: env.DB_TRANSACTION_TIMEOUT,
  maxWait: env.DB_TRANSACTION_MAX_WAIT,
}
