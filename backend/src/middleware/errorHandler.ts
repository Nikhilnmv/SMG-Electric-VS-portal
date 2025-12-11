import { Request, Response, NextFunction } from 'express';
import { ApiError } from '@vs-platform/types';
import { ZodError } from 'zod';

/**
 * Global error handler with structured JSON format
 */
export function errorHandler(
  err: Error | ApiError | ZodError,
  req: Request,
  res: Response,
  next: NextFunction
) {
  // Handle Zod validation errors
  if (err instanceof ZodError) {
    const errors = err.errors.map((error) => ({
      path: error.path.join('.'),
      message: error.message,
    }));

    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: errors,
      timestamp: new Date().toISOString(),
    });
  }

  // Handle custom API errors
  if ('statusCode' in err) {
    const statusCode = err.statusCode || 500;
    const message = err.message || 'Internal server error';

    // Don't log client errors (4xx), only server errors (5xx)
    if (statusCode >= 500) {
      console.error('[Error Handler] Server error:', {
        message: err.message,
        stack: err instanceof Error ? err.stack : undefined,
        code: 'code' in err ? err.code : undefined,
        details: 'details' in err ? err.details : undefined,
        path: req.path,
        method: req.method,
        ip: req.ip,
        timestamp: new Date().toISOString(),
      });
    }

    return res.status(statusCode).json({
      success: false,
      error: message,
      code: 'code' in err ? err.code : undefined,
      details: 'details' in err ? err.details : undefined,
      timestamp: new Date().toISOString(),
    });
  }

  // Handle unexpected errors
  console.error('[Error Handler] Unexpected error:', {
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    ip: req.ip,
    timestamp: new Date().toISOString(),
  });

  // Don't expose internal error details in production
  const isProduction = process.env.NODE_ENV === 'production';
  const message = isProduction
    ? 'Internal server error'
    : err.message || 'Internal server error';

  res.status(500).json({
    success: false,
    error: message,
    ...(isProduction ? {} : { stack: err.stack }),
    timestamp: new Date().toISOString(),
  });
}

