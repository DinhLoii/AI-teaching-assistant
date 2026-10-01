import type { Request, Response, NextFunction } from 'express'
import { logger } from '../shared/infrastructure/logger.js'

/**
 * Middleware to log HTTP request metadata and latency.
 */
export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const start = process.hrtime()
  const { method, originalUrl, ip } = req
  const userAgent = req.headers['user-agent'] || 'unknown'
  
  // Mask sensitive data
  const body = req.body ? { ...req.body } : {}
  if (body.password) body.password = '***'
  if (body.token) body.token = '***'
  if (body.refreshToken) body.refreshToken = '***'

  logger.debug(`Incoming ${method} ${originalUrl}`, { 
    ip, 
    userAgent,
    body: Object.keys(body).length > 0 ? body : undefined 
  })

  res.on('finish', () => {
    const diff = process.hrtime(start)
    const durationMs = (diff[0] * 1e3 + diff[1] * 1e-6).toFixed(2)
    const statusCode = res.statusCode

    const logMessage = `${method} ${originalUrl} ${statusCode} - ${durationMs}ms`

    if (statusCode >= 500) {
      logger.error(logMessage, { ip, method, url: originalUrl, statusCode, durationMs })
    } else if (statusCode >= 400) {
      logger.warn(logMessage, { ip, method, url: originalUrl, statusCode, durationMs })
    } else {
      logger.info(logMessage, { ip, method, url: originalUrl, statusCode, durationMs })
    }
  })

  next()
}
