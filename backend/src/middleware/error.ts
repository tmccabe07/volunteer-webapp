/**
 * Error Handling Middleware
 * 
 * Centralized error handling for consistent API error responses
 */

import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';

/**
 * Custom application error class
 */
export class AppError extends Error {
  constructor(
    public message: string,
    public statusCode: number = 500,
    public code?: string
  ) {
    super(message);
    this.name = 'AppError';
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Standard error response structure
 */
interface ErrorResponse {
  error: string;
  code?: string;
  details?: any;
  stack?: string;
}

/**
 * Global error handling middleware
 * 
 * Catches all errors and returns consistent JSON responses
 * 
 * @param err Error object
 * @param req Express request
 * @param res Express response
 * @param next Express next function
 */
export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // Default error response
  let statusCode = 500;
  let message = 'Internal server error';
  let code: string | undefined;
  let details: any;

  // Handle known error types
  if (err instanceof AppError) {
    // Custom application errors
    statusCode = err.statusCode;
    message = err.message;
    code = err.code;
  } else if (err instanceof ZodError) {
    // Zod validation errors
    statusCode = 400;
    message = 'Validation error';
    code = 'VALIDATION_ERROR';
    details = err.issues.map((e) => ({
      path: e.path.join('.'),
      message: e.message,
    }));
  } else if (err instanceof Prisma.PrismaClientKnownRequestError) {
    // Prisma database errors
    switch (err.code) {
      case 'P2002':
        // Unique constraint violation
        statusCode = 409;
        message = 'Resource already exists';
        code = 'DUPLICATE_RESOURCE';
        details = {
          target: err.meta?.target,
        };
        break;
      case 'P2025':
        // Record not found
        statusCode = 404;
        message = 'Resource not found';
        code = 'NOT_FOUND';
        break;
      case 'P2003':
        // Foreign key constraint failed
        statusCode = 400;
        message = 'Invalid reference';
        code = 'INVALID_REFERENCE';
        details = {
          field: err.meta?.field_name,
        };
        break;
      default:
        statusCode = 500;
        message = 'Database error';
        code = err.code;
    }
  } else if (err instanceof Prisma.PrismaClientValidationError) {
    // Prisma validation errors
    statusCode = 400;
    message = 'Invalid data format';
    code = 'VALIDATION_ERROR';
  }

  // Build error response
  const response: ErrorResponse = {
    error: message,
  };

  if (code) {
    response.code = code;
  }

  if (details) {
    response.details = details;
  }

  // Include stack trace in development
  if (process.env.NODE_ENV === 'development') {
    response.stack = err.stack;
  }

  // Log error for debugging
  console.error('[Error Handler]', {
    statusCode,
    message,
    code,
    path: req.path,
    method: req.method,
    stack: err.stack,
  });

  res.status(statusCode).json(response);
};

/**
 * 404 Not Found handler
 * 
 * Catches requests to undefined routes
 * 
 * @param req Express request
 * @param res Express response
 */
export const notFoundHandler = (req: Request, res: Response): void => {
  res.status(404).json({
    error: 'Route not found',
    code: 'NOT_FOUND',
    path: req.path,
  });
};

/**
 * Async handler wrapper
 * 
 * Wraps async route handlers to catch errors and pass to error middleware
 * 
 * @param fn Async route handler function
 * @returns Express middleware function
 * 
 * @example
 * router.get('/volunteers', asyncHandler(async (req, res) => {
 *   const volunteers = await prisma.volunteer.findMany();
 *   res.json(volunteers);
 * }));
 */
export const asyncHandler = (
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
