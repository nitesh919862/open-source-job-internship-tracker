import type { NextFunction, Request, Response } from 'express';

export class ApiError extends Error {
  statusCode: number;
  errors?: string[];

  constructor(statusCode: number, message: string, errors?: string[]) {
    super(message);
    this.statusCode = statusCode;
    this.errors = errors;
  }
}

export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

export function errorHandler(
  err: Error | ApiError,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  let statusCode = err instanceof ApiError ? err.statusCode : 500;
  let message = err.message || 'Internal Server Error';
  const errors = err instanceof ApiError ? err.errors : undefined;

  if (!(err instanceof ApiError)) {
    const anyErr = err as { name?: string; code?: number; errors?: Record<string, { message: string }> };
    if (anyErr.name === 'ValidationError' && anyErr.errors) {
      statusCode = 400;
      message = Object.values(anyErr.errors)[0]?.message || 'Validation failed.';
    } else if (anyErr.name === 'CastError') {
      statusCode = 400;
      message = 'Invalid identifier format.';
    } else if (anyErr.code === 11000) {
      statusCode = 409;
      message = 'A duplicate record already exists.';
    }
  }

  if (statusCode >= 500) {
    console.error('[Server Error]', err);
  }

  res.status(statusCode).json({
    success: false,
    message,
    ...(errors ? { errors } : {}),
  });
}
