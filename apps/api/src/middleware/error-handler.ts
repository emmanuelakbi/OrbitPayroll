/**
 * Global Error Handler Middleware
 *
 * Provides consistent error response format for all API errors:
 * - Zod validation errors → 400 with field-level details
 * - AppError instances → Custom status codes with error codes
 * - Prisma errors → Mapped to appropriate HTTP status codes
 * - SIWE errors → 401 authentication errors
 * - Unknown errors → 500 with correlation ID for tracking
 *
 * All errors are logged with request context for debugging.
 *
 * Error Logging Requirements (3.1-3.6):
 * - 3.1: Log all errors with ERROR level
 * - 3.2: Include error message, error code, stack trace (in development)
 * - 3.3: Include request context: path, method, user_id, org_id
 * - 3.4: NOT include stack traces in production (security)
 * - 3.5: Include correlation_id for tracing
 * - 3.6: Sanitize error messages (no sensitive data)
 *
 * @see Requirements 9.3, 9.4, 9.5, 9.6, 9.7, 9.8
 */

import type { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { logger } from '../lib/logger.js';
import { AppError, ErrorCode } from '../lib/errors.js';
import { getCorrelationId } from './request-logger.js';

const isDevelopment = process.env.NODE_ENV === 'development';

/**
 * Patterns for sensitive data that should be sanitized from error messages
 * @see Requirement 3.6: Sanitize error messages
 */
const SENSITIVE_PATTERNS = [
  // Private keys (Ethereum format)
  /0x[a-fA-F0-9]{64}/g,
  // JWT tokens
  /eyJ[a-zA-Z0-9_-]*\.eyJ[a-zA-Z0-9_-]*\.[a-zA-Z0-9_-]*/g,
  // Bearer tokens
  /Bearer\s+[a-zA-Z0-9_-]+/gi,
  // API keys (common formats)
  /[a-zA-Z0-9_-]{32,}/g,
  // Email addresses
  /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
  // Password fields in JSON
  /"password"\s*:\s*"[^"]*"/gi,
  // Secret fields in JSON
  /"secret"\s*:\s*"[^"]*"/gi,
];

/**
 * Sanitize error message by removing sensitive data
 * @see Requirement 3.6: Sanitize error messages
 */
function sanitizeErrorMessage(message: string): string {
  let sanitized = message;
  for (const pattern of SENSITIVE_PATTERNS) {
    sanitized = sanitized.replace(pattern, '[REDACTED]');
  }
  return sanitized;
}

/**
 * Standard error response format
 * @see Requirement 9.3: Consistent error format
 */
interface ErrorResponse {
  code: string;
  message: string;
  details?: Record<string, string[]>;
  correlationId?: string;
}

/**
 * Error log context interface
 * @see Requirements 3.2, 3.3, 3.5
 */
interface ErrorLogContext {
  correlationId: string;
  errorCode?: string;
  errorMessage: string;
  path: string;
  method: string;
  userId?: string;
  orgId?: string;
  statusCode: number;
  stack?: string;
}

/**
 * Log error with full context
 * @see Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6
 */
function logError(
  err: Error,
  req: Request,
  statusCode: number,
  errorCode?: string
): void {
  // Get correlation ID from request (Requirement 3.5)
  const correlationId = getCorrelationId(req);

  // Build error log context (Requirements 3.2, 3.3)
  const logContext: ErrorLogContext = {
    correlationId,
    errorCode,
    errorMessage: sanitizeErrorMessage(err.message),
    path: req.path,
    method: req.method,
    statusCode,
  };

  // Include user context if available (Requirement 3.3)
  if (req.user?.id) {
    logContext.userId = req.user.id;
  }

  // Include org context if available (Requirement 3.3)
  // orgId may be in params or body depending on the route
  const orgId = req.params?.orgId || (req.body as { orgId?: string })?.orgId;
  if (orgId) {
    logContext.orgId = orgId;
  }

  // Include stack trace only in development (Requirements 3.2, 3.4)
  if (isDevelopment && err.stack) {
    logContext.stack = err.stack;
  }

  // Log at ERROR level (Requirement 3.1)
  logger.error(logContext, `Error: ${sanitizeErrorMessage(err.message)}`);
}

/**
 * Prisma error codes we handle
 * @see https://www.prisma.io/docs/reference/api-reference/error-reference
 */
const PRISMA_ERROR_CODES = {
  P2002: 'P2002', // Unique constraint violation
  P2025: 'P2025', // Record not found
  P2003: 'P2003', // Foreign key constraint violation
  P2014: 'P2014', // Required relation violation
  P2016: 'P2016', // Query interpretation error
  P2021: 'P2021', // Table does not exist
  P2022: 'P2022', // Column does not exist
} as const;

function isPrismaError(err: unknown): err is { code: string; meta?: { target?: string[] } } {
  return (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    typeof (err as { code: unknown }).code === 'string' &&
    (err as { code: string }).code.startsWith('P')
  );
}

/**
 * Check if error is a ZodError (handles different module instances)
 */
function isZodError(err: unknown): err is ZodError {
  return (
    err instanceof ZodError ||
    (err !== null &&
      typeof err === 'object' &&
      'name' in err &&
      (err as { name: string }).name === 'ZodError' &&
      'issues' in err &&
      Array.isArray((err as { issues: unknown[] }).issues))
  );
}

/**
 * Check if error is a SiweError
 */
function isSiweError(err: unknown): err is Error & { type: string } {
  return (
    err !== null &&
    typeof err === 'object' &&
    'name' in err &&
    (err as { name: string }).name === 'SiweError'
  );
}

/**
 * Global error handler middleware
 *
 * @see Requirement 9.8: Log all errors with request context
 */
export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  // Get correlation ID from request for tracking (Requirement 3.5)
  const correlationId = getCorrelationId(req);

  // Handle known error types
  // @see Requirements 9.4, 9.5, 9.6: Return appropriate status codes
  if (err instanceof AppError) {
    // Log AppError with context (Requirements 3.1-3.6)
    logError(err, req, err.statusCode, err.code);

    const response: ErrorResponse = {
      code: err.code,
      message: err.message,
    };
    if (err.details) {
      response.details = err.details;
    }
    res.status(err.statusCode).json(response);
    return;
  }

  // Handle Zod validation errors
  // @see Requirement 9.2: Return 400 with field-level error details
  if (isZodError(err)) {
    // Log validation error (Requirements 3.1-3.6)
    logError(err, req, 400, ErrorCode.VALIDATION_ERROR);

    const details: Record<string, string[]> = {};
    for (const issue of err.issues) {
      const path = issue.path.length > 0 ? issue.path.join('.') : '_root';
      if (!details[path]) {
        details[path] = [];
      }
      details[path].push(issue.message);
    }

    const response: ErrorResponse = {
      code: ErrorCode.VALIDATION_ERROR,
      message: 'Invalid request body',
      details,
    };
    res.status(400).json(response);
    return;
  }

  // Handle SIWE errors
  // @see Requirement 9.4: Return 401 for invalid authentication
  if (isSiweError(err)) {
    // Log auth error (Requirements 3.1-3.6)
    logError(err, req, 401, ErrorCode.AUTH_002);

    const response: ErrorResponse = {
      code: ErrorCode.AUTH_002,
      message: 'Invalid signature or wallet address',
    };
    res.status(401).json(response);
    return;
  }

  // Handle Prisma errors
  // @see Requirement 9.6: Return 404 for non-existent resources
  if (isPrismaError(err)) {
    const prismaResponse = handlePrismaError(err);
    // Log Prisma error (Requirements 3.1-3.6)
    logError(
      new Error(prismaResponse.body.message),
      req,
      prismaResponse.status,
      prismaResponse.body.code
    );
    res.status(prismaResponse.status).json(prismaResponse.body);
    return;
  }

  // Handle unknown errors
  // @see Requirement 9.7: Return 500 for unexpected errors with correlation ID
  // Log unknown error (Requirements 3.1-3.6)
  logError(err, req, 500, ErrorCode.INTERNAL_ERROR);

  const response: ErrorResponse = {
    code: ErrorCode.INTERNAL_ERROR,
    message: 'An unexpected error occurred',
    correlationId,
  };

  res.status(500).json(response);
}

/**
 * Handle Prisma-specific errors and map to HTTP responses
 * @see Requirement 9.6: Return 404 for non-existent resources
 */
function handlePrismaError(err: { code: string; meta?: { target?: string[] } }): {
  status: number;
  body: ErrorResponse;
} {
  switch (err.code) {
    case PRISMA_ERROR_CODES.P2002: {
      // Unique constraint violation → 409 Conflict
      const target = err.meta?.target ?? ['field'];
      return {
        status: 409,
        body: {
          code: 'CONFLICT',
          message: `A record with this ${target.join(', ')} already exists`,
        },
      };
    }
    case PRISMA_ERROR_CODES.P2025: {
      // Record not found → 404 Not Found
      return {
        status: 404,
        body: {
          code: 'NOT_FOUND',
          message: 'The requested resource was not found',
        },
      };
    }
    case PRISMA_ERROR_CODES.P2003: {
      // Foreign key constraint violation → 400 Bad Request
      return {
        status: 400,
        body: {
          code: 'INVALID_REFERENCE',
          message: 'Referenced record does not exist',
        },
      };
    }
    case PRISMA_ERROR_CODES.P2014: {
      // Required relation violation → 400 Bad Request
      return {
        status: 400,
        body: {
          code: 'RELATION_VIOLATION',
          message: 'Required related record is missing',
        },
      };
    }
    case PRISMA_ERROR_CODES.P2016:
    case PRISMA_ERROR_CODES.P2021:
    case PRISMA_ERROR_CODES.P2022: {
      // Query/schema errors → 500 Internal Server Error
      return {
        status: 500,
        body: {
          code: ErrorCode.INTERNAL_ERROR,
          message: 'A database configuration error occurred',
        },
      };
    }
    default: {
      // Unknown Prisma error → 500 Internal Server Error
      return {
        status: 500,
        body: {
          code: ErrorCode.INTERNAL_ERROR,
          message: 'A database error occurred',
        },
      };
    }
  }
}
