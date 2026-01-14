/**
 * Request Validation Middleware
 *
 * Provides reusable middleware for validating request body, params, and query
 * using Zod schemas. Includes input sanitization to prevent injection attacks.
 * Validation errors are automatically handled by the error-handler middleware.
 *
 * @module middleware/validate
 * @see Requirements: 4.3, 4.4
 */

import type { Request, Response, NextFunction, RequestHandler } from 'express';
import type { ZodSchema } from 'zod';

/**
 * Validation target - which part of the request to validate
 */
type ValidationTarget = 'body' | 'params' | 'query';

/**
 * Control character regex pattern for sanitization.
 * Matches control characters except newline (\n), carriage return (\r), and tab (\t).
 */
// eslint-disable-next-line no-control-regex
const CONTROL_CHAR_REGEX = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g;

/**
 * Sanitizes a string value to prevent injection attacks.
 * - Removes null bytes
 * - Trims whitespace
 * - Removes control characters (except newlines and tabs)
 *
 * Note: SQL injection is prevented by Prisma's parameterized queries.
 * This sanitization provides defense-in-depth for XSS and other attacks.
 *
 * @param value - The string to sanitize
 * @returns The sanitized string
 */
function sanitizeString(value: string): string {
  return value
    // Remove null bytes (can cause issues in some systems)
    .replace(/\0/g, '')
    // Remove control characters except newline, carriage return, and tab
    .replace(CONTROL_CHAR_REGEX, '')
    // Trim whitespace
    .trim();
}

/**
 * Recursively sanitizes all string values in an object.
 * Handles nested objects and arrays.
 *
 * @typeParam T - The type of the input object
 * @param obj - The object to sanitize
 * @returns The sanitized object with the same structure
 */
function sanitizeObject<T>(obj: T): T {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (typeof obj === 'string') {
    return sanitizeString(obj) as T;
  }

  if (Array.isArray(obj)) {
    return obj.map((item: unknown) => sanitizeObject(item)) as T;
  }

  if (typeof obj === 'object') {
    const sanitized: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      sanitized[key] = sanitizeObject(value);
    }
    return sanitized as T;
  }

  return obj;
}

/**
 * Creates a validation middleware for the specified request target.
 * Sanitizes input before validation to prevent injection attacks.
 *
 * @typeParam T - The expected type after validation
 * @param schema - Zod schema to validate against
 * @param target - Which part of the request to validate (body, params, or query)
 * @returns Express middleware that sanitizes, validates, and transforms the request data
 *
 * @example
 * // Validate request body
 * router.post('/', validate(createOrgSchema, 'body'), handler);
 *
 * // Validate URL params
 * router.get('/:id', validate(uuidParamSchema, 'params'), handler);
 *
 * // Validate query string
 * router.get('/', validate(listQuerySchema, 'query'), handler);
 */
export function validate<T>(
  schema: ZodSchema<T>,
  target: ValidationTarget = 'body'
): RequestHandler {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      // Sanitize input before validation (Requirements: 4.3)
      const rawData = req[target] as unknown;
      const sanitizedData = sanitizeObject(rawData);
      // Validate and transform with Zod
      const data = schema.parse(sanitizedData);
      // Replace with parsed/transformed data
      if (target === 'body') {
        req.body = data;
      } else if (target === 'params') {
        req.params = data as typeof req.params;
      } else {
        req.query = data as typeof req.query;
      }
      next();
    } catch (error) {
      // Let the error handler middleware handle ZodErrors
      next(error);
    }
  };
}

/**
 * Validates multiple targets in a single middleware.
 * Sanitizes all inputs before validation.
 *
 * @param schemas - Object mapping targets to their schemas
 * @returns Express middleware that sanitizes and validates all specified targets
 *
 * @example
 * router.put('/:id',
 *   validateMultiple({
 *     params: uuidParamSchema,
 *     body: updateOrgSchema,
 *   }),
 *   handler
 * );
 */
export function validateMultiple(
  schemas: Partial<Record<ValidationTarget, ZodSchema>>
): RequestHandler {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      for (const [target, schema] of Object.entries(schemas)) {
        if (schema) {
          const validationTarget = target as ValidationTarget;
          // Sanitize input before validation (Requirements: 4.3)
          const rawData = req[validationTarget] as unknown;
          const sanitizedData = sanitizeObject(rawData);
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          const data = schema.parse(sanitizedData);
          // Replace with parsed/transformed data
          if (validationTarget === 'body') {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            req.body = data;
          } else if (validationTarget === 'params') {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            req.params = data as typeof req.params;
          } else {
            req.query = data as typeof req.query;
          }
        }
      }
      next();
    } catch (error) {
      next(error);
    }
  };
}

/**
 * Type helper to extract the validated type from a schema.
 * Use this to type your route handlers.
 *
 * @typeParam T - The Zod schema type
 * @example
 * type CreateOrgBody = ValidatedRequest<typeof createOrgSchema>;
 */
export type ValidatedRequest<T extends ZodSchema> = T extends ZodSchema<infer U> ? U : never;
