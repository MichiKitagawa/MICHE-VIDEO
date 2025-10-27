/**
 * Global Error Handler
 *
 * Handles all uncaught errors and provides structured error responses.
 */

import { FastifyError, FastifyReply, FastifyRequest } from 'fastify';
import logger from './logger';

/**
 * Standard error response format
 */
interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: any;
    requestId?: string;
  };
}

/**
 * Error codes mapping
 */
export const ErrorCodes = {
  // Authentication & Authorization
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  INVALID_TOKEN: 'INVALID_TOKEN',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',

  // Validation
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INVALID_INPUT: 'INVALID_INPUT',
  MISSING_REQUIRED_FIELD: 'MISSING_REQUIRED_FIELD',

  // Resources
  NOT_FOUND: 'NOT_FOUND',
  ALREADY_EXISTS: 'ALREADY_EXISTS',
  CONFLICT: 'CONFLICT',

  // Business Logic
  INSUFFICIENT_PERMISSIONS: 'INSUFFICIENT_PERMISSIONS',
  OPERATION_NOT_ALLOWED: 'OPERATION_NOT_ALLOWED',
  QUOTA_EXCEEDED: 'QUOTA_EXCEEDED',

  // External Services
  PAYMENT_FAILED: 'PAYMENT_FAILED',
  EXTERNAL_SERVICE_ERROR: 'EXTERNAL_SERVICE_ERROR',
  STORAGE_ERROR: 'STORAGE_ERROR',

  // Server Errors
  INTERNAL_SERVER_ERROR: 'INTERNAL_SERVER_ERROR',
  DATABASE_ERROR: 'DATABASE_ERROR',
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
} as const;

/**
 * Custom application error class
 */
export class AppError extends Error {
  constructor(
    public code: string,
    public message: string,
    public statusCode: number = 500,
    public details?: any
  ) {
    super(message);
    this.name = 'AppError';
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Global error handler for Fastify
 */
export function errorHandler(
  error: FastifyError | AppError | Error,
  request: FastifyRequest,
  reply: FastifyReply
): void {
  const requestId = request.id;

  // Log error with context
  const errorContext = {
    requestId,
    method: request.method,
    url: request.url,
    userId: (request as any).user?.id || 'anonymous',
    ip: request.ip,
    userAgent: request.headers['user-agent'],
    error: {
      name: error.name,
      message: error.message,
      stack: error.stack,
    },
  };

  // Determine status code and error code
  let statusCode: number;
  let errorCode: string;
  let errorMessage: string;
  let details: any = undefined;

  if (error instanceof AppError) {
    // Custom application error
    statusCode = error.statusCode;
    errorCode = error.code;
    errorMessage = error.message;
    details = error.details;

    if (statusCode >= 500) {
      logger.error('Application Error', { ...errorContext, details });
    } else {
      logger.warn('Application Warning', { ...errorContext, details });
    }
  } else if ('statusCode' in error && typeof error.statusCode === 'number') {
    // Fastify error
    statusCode = error.statusCode;

    switch (statusCode) {
      case 400:
        errorCode = ErrorCodes.VALIDATION_ERROR;
        errorMessage = 'Validation failed';
        details = (error as any).validation || undefined;
        break;
      case 401:
        errorCode = ErrorCodes.UNAUTHORIZED;
        errorMessage = 'Authentication required';
        break;
      case 403:
        errorCode = ErrorCodes.FORBIDDEN;
        errorMessage = 'Access denied';
        break;
      case 404:
        errorCode = ErrorCodes.NOT_FOUND;
        errorMessage = 'Resource not found';
        break;
      case 409:
        errorCode = ErrorCodes.CONFLICT;
        errorMessage = 'Resource conflict';
        break;
      case 429:
        errorCode = ErrorCodes.RATE_LIMIT_EXCEEDED;
        errorMessage = 'Too many requests';
        break;
      default:
        errorCode = ErrorCodes.INTERNAL_SERVER_ERROR;
        errorMessage = 'Internal server error';
    }

    if (statusCode >= 500) {
      logger.error('Fastify Error', errorContext);
    } else {
      logger.warn('Fastify Warning', errorContext);
    }
  } else {
    // Unknown error
    statusCode = 500;
    errorCode = ErrorCodes.INTERNAL_SERVER_ERROR;
    errorMessage = process.env.NODE_ENV === 'production'
      ? 'An unexpected error occurred'
      : error.message;

    logger.error('Unexpected Error', errorContext);
  }

  // Send error response
  const response: ErrorResponse = {
    success: false,
    error: {
      code: errorCode,
      message: errorMessage,
      ...(details && { details }),
      ...(process.env.NODE_ENV !== 'production' && { requestId }),
    },
  };

  // Don't send stack traces in production
  if (process.env.NODE_ENV !== 'production' && error.stack) {
    (response.error as any).stack = error.stack;
  }

  reply.status(statusCode).send(response);
}

/**
 * Handle uncaught exceptions
 */
export function setupUncaughtExceptionHandler(): void {
  process.on('uncaughtException', (error: Error) => {
    logger.error('Uncaught Exception', {
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack,
      },
    });

    // Give time for logs to write, then exit
    setTimeout(() => {
      process.exit(1);
    }, 1000);
  });

  process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
    logger.error('Unhandled Promise Rejection', {
      reason: reason instanceof Error ? {
        name: reason.name,
        message: reason.message,
        stack: reason.stack,
      } : reason,
      promise: String(promise),
    });
  });
}

/**
 * Helper function to throw application errors
 */
export function throwError(
  code: string,
  message: string,
  statusCode: number = 500,
  details?: any
): never {
  throw new AppError(code, message, statusCode, details);
}

/**
 * Validation error helper
 */
export function throwValidationError(message: string, details?: any): never {
  throw new AppError(ErrorCodes.VALIDATION_ERROR, message, 400, details);
}

/**
 * Not found error helper
 */
export function throwNotFoundError(resource: string, id?: string): never {
  const message = id
    ? `${resource} with ID '${id}' not found`
    : `${resource} not found`;
  throw new AppError(ErrorCodes.NOT_FOUND, message, 404);
}

/**
 * Unauthorized error helper
 */
export function throwUnauthorizedError(message: string = 'Authentication required'): never {
  throw new AppError(ErrorCodes.UNAUTHORIZED, message, 401);
}

/**
 * Forbidden error helper
 */
export function throwForbiddenError(message: string = 'Access denied'): never {
  throw new AppError(ErrorCodes.FORBIDDEN, message, 403);
}

/**
 * Conflict error helper
 */
export function throwConflictError(message: string, details?: any): never {
  throw new AppError(ErrorCodes.CONFLICT, message, 409, details);
}
