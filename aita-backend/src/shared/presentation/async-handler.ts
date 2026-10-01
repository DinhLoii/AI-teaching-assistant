import type { Request, Response, NextFunction } from 'express'

/**
 * Async handler wrapper for Express routes.
 * Catches async errors and forwards them to the error-handling middleware.
 */
export const asyncHandler = <
  P = any,
  ResBody = any,
  ReqBody = any,
  ReqQuery = any,
  Locals extends Record<string, any> = Record<string, any>
>(
  fn: (
    req: Request<P, ResBody, ReqBody, ReqQuery, Locals>,
    res: Response<ResBody, Locals>,
    next: NextFunction
  ) => Promise<any> | void
) => {
  return (
    req: Request<P, ResBody, ReqBody, ReqQuery, Locals>,
    res: Response<ResBody, Locals>,
    next: NextFunction
  ) => {
    Promise.resolve(fn(req, res, next)).catch(next)
  }
}
