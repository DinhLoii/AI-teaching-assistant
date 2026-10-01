import type { Request, Response, NextFunction } from 'express'
import { ZodError } from 'zod'
import { AppError } from '../shared/application/app.error.js'
import { logger } from '../shared/infrastructure/logger.js'
import { ApiResponse } from '../shared/presentation/api-response.js'
import { requestContext } from '../shared/infrastructure/logger.js'

export function errorHandler(err: Error, req: Request, res: Response, _next: NextFunction) {
  const store = requestContext.getStore()
  const requestId = store?.get('requestId') || 'unknown'
  const isDev = process.env.NODE_ENV === 'development'

  logger.error(`Request error: ${req.method} ${req.originalUrl}`, {
    error: err,
    body: req.body,
    query: req.query,
    user: (req as any).user?.id,
  })

  // Handle specific library errors
  if (err.name === 'JsonWebTokenError') {
    const apiResponse = new ApiResponse(401, 'Token không hợp lệ')
    return res.status(401).json(apiResponse)
  }

  if (err.name === 'TokenExpiredError') {
    const apiResponse = new ApiResponse(401, 'Token đã hết hạn')
    return res.status(401).json(apiResponse)
  }

  // Handle Prisma Errors
  if (err.name === 'PrismaClientInitializationError' || (err as any).code === 'P1001' || err.message?.includes("Can't reach database server")) {
    const apiResponse = new ApiResponse(
      503,
      'Không thể kết nối đến cơ sở dữ liệu (SQL Server tại localhost:1433). Vui lòng kiểm tra lại dịch vụ SQL Server.'
    )
    return res.status(503).json(apiResponse)
  }

  if (err.name === 'PrismaClientKnownRequestError') {
    const prismaError = err as any
    if (prismaError.code === 'P2002') {
      const apiResponse = new ApiResponse(409, 'Dữ liệu đã tồn tại')
      return res.status(409).json(apiResponse)
    }
    if (prismaError.code === 'P2025') {
      const apiResponse = new ApiResponse(404, 'Không tìm thấy dữ liệu')
      return res.status(404).json(apiResponse)
    }
  }

  // Handle custom AppError
  if (err instanceof AppError) {
    let statusCode = err.statusCode;
    let message = err.message;
    if (statusCode === 429 || message.includes('429') || message.includes('no body')) {
      statusCode = 503;
      message = 'Hệ thống AI đang quá tải lượt gọi (Rate Limit 429). Vui lòng thử lại sau 5–10 giây.';
    }
    const errorDetails = isDev ? { ...err.details, stack: err.stack } : err.details;
    const apiResponse = new ApiResponse(statusCode, message, errorDetails);
    return res.status(statusCode).json(apiResponse);
  }

  // Handle Zod Validation Error
  if (err instanceof ZodError) {
    const details = err.flatten();
    const apiResponse = new ApiResponse(400, 'Dữ liệu không hợp lệ', details);
    return res.status(400).json(apiResponse);
  }

  // Fallback for unexpected errors
  let statusCode = (err as any).statusCode ?? (err as any).status ?? 500;
  let message = isDev ? err.message || String(err) : 'Lỗi hệ thống';
  if (statusCode === 429 || String(message).includes('429') || String(message).includes('no body')) {
    statusCode = 503;
    message = 'Hệ thống AI đang quá tải lượt gọi (Rate Limit 429). Vui lòng thử lại sau 5–10 giây.';
  }
  const details = isDev ? { stack: err.stack, requestId } : { requestId };

  const apiResponse = new ApiResponse(statusCode, message, details);
  return res.status(statusCode).json(apiResponse);
}
