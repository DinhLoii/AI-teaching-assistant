import type { Request, Response, NextFunction } from 'express'
import { TooManyRequestsError } from '../shared/application/app.error.js'

interface RateLimitStore {
  [key: string]: {
    count: number
    resetTime: number
  }
}

const store: RateLimitStore = {}

// Very simple in-memory rate limiter
export function rateLimiter(limit: number = 100, windowMs: number = 60000) {
  return (req: Request, res: Response, next: NextFunction) => {
    const ip = req.ip || req.socket.remoteAddress || 'unknown'
    const now = Date.now()
    
    if (!store[ip]) {
      store[ip] = { count: 0, resetTime: now + windowMs }
    }
    
    if (now > store[ip].resetTime) {
      store[ip].count = 0
      store[ip].resetTime = now + windowMs
    }
    
    store[ip].count++
    
    res.setHeader('X-RateLimit-Limit', limit)
    res.setHeader('X-RateLimit-Remaining', Math.max(0, limit - store[ip].count))
    res.setHeader('X-RateLimit-Reset', Math.ceil(store[ip].resetTime / 1000))
    
    if (store[ip].count > limit) {
      return next(new TooManyRequestsError('Quá nhiều yêu cầu, vui lòng thử lại sau.'))
    }
    
    next()
  }
}

// Cleanup interval to prevent memory leaks
const cleanupInterval = setInterval(() => {
  const now = Date.now()
  for (const ip in store) {
    if (now > store[ip].resetTime) {
      delete store[ip]
    }
  }
}, 60000)

cleanupInterval.unref()
