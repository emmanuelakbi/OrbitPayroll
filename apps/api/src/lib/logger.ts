/**
 * Pino logger configuration for OrbitPayroll API
 *
 * Implements structured logging with:
 * - JSON output format (Requirements: 1.1)
 * - Standard fields: timestamp, level, message, service (Requirements: 1.2)
 * - Correlation ID support (Requirements: 1.3)
 * - Context fields: user_id, org_id, wallet_address (Requirements: 1.4)
 * - ISO 8601 timestamps (Requirements: 1.5)
 * - Log levels: debug, info, warn, error (Requirements: 1.6)
 */

import pino, { type LoggerOptions, type Logger as PinoLogger } from 'pino';

const isDevelopment = process.env.NODE_ENV === 'development';
const isTest = process.env.NODE_ENV === 'test';

/**
 * Log context interface for structured logging
 */
export interface LogContext {
  correlationId?: string;
  userId?: string;
  orgId?: string;
  walletAddress?: string;
  [key: string]: unknown;
}

const options: LoggerOptions = {
  // Log level configurable via environment variable (Requirements: 1.6, 10.6)
  level: process.env.LOG_LEVEL ?? (isDevelopment ? 'debug' : 'info'),

  // Format level as string label (Requirements: 1.2)
  formatters: {
    level: (label) => ({ level: label }),
  },

  // ISO 8601 timestamp format (Requirements: 1.5)
  timestamp: pino.stdTimeFunctions.isoTime,

  // Base fields included in every log entry (Requirements: 1.2)
  base: {
    service: 'orbitpayroll-api',
  },

  // Redact sensitive fields (Requirements: 2.5, 3.6)
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      'password',
      'token',
      'accessToken',
      'refreshToken',
      'privateKey',
      'secret',
      'signature',
    ],
    censor: '[REDACTED]',
  },
};

// Pretty printing in development for human readability (Requirements: 10.2)
if (isDevelopment && !isTest) {
  options.transport = {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'SYS:standard',
      ignore: 'pid,hostname',
    },
  };
}

// Silence logs during tests unless explicitly enabled
if (isTest && !process.env.LOG_LEVEL) {
  options.level = 'silent';
}

export const logger = pino(options);

export type Logger = PinoLogger;

/**
 * Create a child logger with additional context
 * Useful for adding correlation IDs and user context to log entries
 *
 * @param context - Additional context to include in log entries
 * @returns Child logger with bound context
 */
export function createChildLogger(context: LogContext): PinoLogger {
  return logger.child(context);
}

/**
 * Log with correlation ID and optional context
 * Helper function for consistent structured logging
 *
 * @param level - Log level
 * @param message - Log message
 * @param context - Additional context fields
 */
export function logWithContext(
  level: 'debug' | 'info' | 'warn' | 'error',
  message: string,
  context?: LogContext
): void {
  if (context) {
    logger[level](context, message);
  } else {
    logger[level](message);
  }
}
