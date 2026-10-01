import { env } from '../../config/env.js'
import type { ILogger } from '../application/ports/logger.interface.js'
import { AsyncLocalStorage } from 'async_hooks'

export const requestContext = new AsyncLocalStorage<Map<string, any>>()

export class Logger implements ILogger {
  private context: string

  constructor(context: string = 'App') {
    this.context = context
  }

  private formatMessage(level: string, message: string, meta?: any): string {
    const store = requestContext.getStore()
    const requestId = store?.get('requestId') || 'system'

    if (env.NODE_ENV === 'production') {
      return JSON.stringify({
        timestamp: new Date().toISOString(),
        level,
        context: this.context,
        requestId,
        message,
        meta: meta || undefined
      })
    }

    // Development format
    const metaString = meta ? `\n${JSON.stringify(meta, null, 2)}` : ''
    const reqIdStr = requestId !== 'system' ? `[${requestId}] ` : ''
    const icons: Record<string, string> = { DEBUG: '🔍', INFO: 'ℹ️ ', WARN: '⚠️', ERROR: '❌' }
    return `${reqIdStr}[${this.context}] ${icons[level] || ''} ${message}${metaString}`
  }

  debug(message: string, meta?: Record<string, unknown>): void {
    if (env.NODE_ENV !== 'production' || process.env.LOG_LEVEL === 'debug') {
      console.debug(this.formatMessage('DEBUG', message, meta))
    }
  }

  info(message: string, meta?: Record<string, unknown>): void {
    console.info(this.formatMessage('INFO', message, meta))
  }

  warn(message: string, meta?: Record<string, unknown>): void {
    console.warn(this.formatMessage('WARN', message, meta))
  }

  error(message: string, error?: Error | Record<string, unknown>): void {
    const errorDetails = error instanceof Error
      ? { name: error.name, message: error.message, stack: env.NODE_ENV === 'development' ? error.stack : undefined }
      : error
    console.error(this.formatMessage('ERROR', message, errorDetails))
  }

  createChild(childContext: string): Logger {
    return new Logger(`${this.context}:${childContext}`)
  }

  // Helper for tracking elapsed time
  startTimer(): () => number {
    const start = process.hrtime.bigint()
    return () => {
      const end = process.hrtime.bigint()
      return Number(end - start) / 1_000_000 // Convert nanoseconds to milliseconds
    }
  }
}

export const logger = new Logger('App')
