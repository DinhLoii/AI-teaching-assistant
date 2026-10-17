import type { Request, Response, NextFunction } from 'express'
import { ZodError } from 'zod'
import { AppError } from '../shared/application/app.error.js'
import { logger } from '../shared/infrastructure/logger.js'
import { ApiResponse } from '../shared/presentation/api-response.js'
import { requestContext } from '../shared/infrastructure/logger.js'
import { safeUrl, safeLogData } from '../shared/infrastructure/redact-secrets.js'

export function errorHandler(err: Error, req: Request, res: Response, _next: NextFunction) {
  const store = requestContext.getStore()
  const requestId = store?.get('requestId') || 'unknown'
  const isDev = process.env.NODE_ENV === 'development'

  logger.error(`Request error: ${req.method} ${safeUrl(req.originalUrl)}`, {
    error: err,
    body: safeLogData(req.body),
    query: safeLogData(req.query),
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
      'Không thể kết nối đến cơ sở dữ liệu. Vui lòng thử lại sau.'
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

  // Helper to detect actual AI rate limit errors
  const isAiRateLimit = (code: number, msg: string) =>
    code === 429 ||
    (/(\b429\b|too many requests|resource_exhausted|quota exceeded)/i.test(msg) &&
     /(ai|gemini|openai|rate limit|exhausted)/i.test(msg));

  // Helper to detect AI API key expired / invalid errors
  const isAiKeyExpired = (code: number, msg: string) =>
    code === 401 ||
    (/invalid_api_key|expired_api_key|api_key_invalid|invalid api key|incorrect api key|key expired|insufficient_quota|credit_expired/i.test(msg) &&
     /(ai|groq|gemini|openai|key|quota)/i.test(msg));

  // Handle custom AppError
  if (err instanceof AppError) {
    let statusCode = err.statusCode;
    let message = err.message;
    if (isAiRateLimit(statusCode, message)) {
      statusCode = 503;
      message = 'Hệ thống AI đang quá tải lượt gọi (Rate Limit 429). Vui lòng thử lại sau 5–10 giây.';
    } else if (isAiKeyExpired(statusCode, message) || err.code === 'AI_API_KEY_EXPIRED') {
      statusCode = 401;
      message = message || 'Khóa API của hệ thống AI (Groq / Gemini) đã hết hạn hoặc không hợp lệ. Vui lòng kiểm tra và cập nhật lại API Key mới trong file cấu hình .env (GROQ_API_KEY).';
    }
    const errorDetails = isDev ? { ...err.details, code: err.code, stack: err.stack } : { ...err.details, code: err.code };
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
  if (isAiRateLimit(statusCode, String(message))) {
    statusCode = 503;
    message = 'Hệ thống AI đang quá tải lượt gọi (Rate Limit 429). Vui lòng thử lại sau 5–10 giây.';
  } else if (isAiKeyExpired(statusCode, String(message))) {
    statusCode = 401;
    message = 'Khóa API của hệ thống AI (Groq / Gemini) đã hết hạn hoặc không hợp lệ. Vui lòng kiểm tra và cập nhật lại API Key mới trong file cấu hình .env (GROQ_API_KEY).';
  }
  const details = isDev ? { stack: err.stack, requestId, code: 'INTERNAL_ERROR' } : { requestId, code: 'INTERNAL_ERROR' };

  const apiResponse = new ApiResponse(statusCode, message, details);
  return res.status(statusCode).json(apiResponse);
}
