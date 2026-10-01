// @ts-nocheck
import { Request, Response, NextFunction } from 'express';
import { AppError } from '../errors';

/**
 * Global error-handling middleware.
 * Express recognises the 4-arg signature as an error handler.
 *
 * - Operational errors  → returns the structured JSON with the correct status.
 * - Unexpected errors   → logs the stack and returns a generic 500.
 */
export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      error: err.message,
    });
    return;
  }

  // Multer-specific errors (e.g. file too large)
  if (err.name === 'MulterError') {
    res.status(400).json({
      success: false,
      error: `Upload error: ${err.message}`,
    });
    return;
  }

  // Unknown / programmer errors
  console.error('[UnhandledError]', err);
  res.status(500).json({
    success: false,
    error: 'An unexpected error occurred',
  });
}

