/**
 * Request Logging Middleware using Pino
 *
 * Provides structured HTTP request/response logging with:
 * - Correlation ID generation and propagation (Requirements: 2.3)
 * - Method, path, status, duration logging (Requirements: 2.2)
 * - User context inclusion (Requirements: 2.4)
 * - Sensitive header filtering (Requirements: 2.5)
 * - Log level based on status code (Requirements: 2.7)
 *
 * @module middleware/request-logger
 */

import pinoHttp from 'pino-http';
import type { IncomingMessage, ServerResponse } from 'http';
import type { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { logger } from '../lib/logger.js';

// Correlation ID header name
const CORRELATION_ID_HEADER = 'x-correlation-id';

/**
 * Extended request type with correlation ID and user context
 */
interface ExtendedRequest extends IncomingMessage {
  correlationId?: string;
  user?: {
    id: string;
    walletAddress: string;
  };
  query?: Record<string, unknown>;
  params?: Record<string, unknown>;
}

/**
 * Request object type for serialization (Requirements: 2.2, 2.5)
 */
interface SerializedRequest {
  method: string;
  path: string;
  query: Record<string, unknown>;
  headers: {
    'user-agent': string | undefined;
    'content-type': string | undefined;
  };
}

/**
 * Response object type for serialization
 */
interface SerializedResponse {
  statusCode: number;
}

/**
 * Middleware to generate or extract correlation ID (Requirements: 2.3)
 * Must be applied before requestLogger
 */
export function correlationIdMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Use existing correlation ID from header or generate new one
  const correlationId =
    (req.headers[CORRELATION_ID_HEADER] as string) || crypto.randomUUID();

  // Attach to request for downstream use
  (req as ExtendedRequest).correlationId = correlationId;

  // Set response header for client tracing
  res.setHeader(CORRELATION_ID_HEADER, correlationId);

  next();
}

/**
 * Pino HTTP middleware for request logging (Requirements: 2.1, 2.2, 2.7)
 * Automatically logs all HTTP requests with appropriate log levels.
 */
export const requestLogger = pinoHttp({
  logger,

  // Generate request ID from correlation ID (Requirements: 2.3)
  genReqId: (req: IncomingMessage) => {
    const extReq = req as ExtendedRequest;
    return (
      extReq.correlationId ||
      (req.headers[CORRELATION_ID_HEADER] as string) ||
      crypto.randomUUID()
    );
  },

  autoLogging: {
    ignore: (req: IncomingMessage) => {
      // Skip health check endpoints to reduce noise
      return req.url === '/health' || req.url === '/ready';
    },
  },

  // Log level based on status code (Requirements: 2.7)
  customLogLevel: (_req: IncomingMessage, res: ServerResponse, err?: Error) => {
    if (res.statusCode >= 500 || err) {
      return 'error';
    }
    if (res.statusCode >= 400) {
      return 'warn';
    }
    return 'info';
  },

  customSuccessMessage: (req: IncomingMessage, res: ServerResponse) => {
    return `${req.method ?? 'UNKNOWN'} ${req.url ?? '/'} ${res.statusCode}`;
  },

  customErrorMessage: (req: IncomingMessage, res: ServerResponse) => {
    return `${req.method ?? 'UNKNOWN'} ${req.url ?? '/'} ${res.statusCode}`;
  },

  // Custom attribute keys for cleaner log output
  customAttributeKeys: {
    req: 'request',
    res: 'response',
    err: 'error',
    responseTime: 'durationMs',
    reqId: 'correlationId',
  },

  // Add user context to log entries (Requirements: 2.4)
  customProps: (req: IncomingMessage) => {
    const extReq = req as ExtendedRequest;
    const props: Record<string, unknown> = {};

    // Include user context if authenticated
    if (extReq.user) {
      props.userId = extReq.user.id;
      props.walletAddress = extReq.user.walletAddress;
    }

    return props;
  },

  serializers: {
    // Request serializer - excludes sensitive headers (Requirements: 2.5)
    req: (req: IncomingMessage): SerializedRequest => {
      const extReq = req as ExtendedRequest;
      return {
        method: req.method ?? 'UNKNOWN',
        path: req.url ?? '/',
        query: extReq.query ?? {},
        // Only log safe headers (Requirements: 2.5)
        headers: {
          'user-agent': req.headers['user-agent'],
          'content-type': req.headers['content-type'],
        },
      };
    },
    res: (res: ServerResponse): SerializedResponse => ({
      statusCode: res.statusCode,
    }),
  },
});

/**
 * Get correlation ID from request
 * Utility function for use in other parts of the application
 */
export function getCorrelationId(req: Request): string {
  return (
    (req as ExtendedRequest).correlationId ||
    (req.headers[CORRELATION_ID_HEADER] as string) ||
    'unknown'
  );
}
