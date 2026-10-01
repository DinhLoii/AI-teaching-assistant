import type { Request, Response, NextFunction } from 'express'
import { v4 as uuidv4 } from 'uuid'
import { requestContext } from '../shared/infrastructure/logger.js'

export function requestIdMiddleware(req: Request, res: Response, next: NextFunction) {
  const requestId = req.headers['x-request-id']?.toString() || uuidv4()
  
  // Attach to Express Request object
  req.requestId = requestId
  
  // Return in response headers
  res.setHeader('X-Request-Id', requestId)
  
  // Set in AsyncLocalStorage for logger
  const store = new Map<string, any>()
  store.set('requestId', requestId)
  
  requestContext.run(store, () => {
    next()
  })
}
