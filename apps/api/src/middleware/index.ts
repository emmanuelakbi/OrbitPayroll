/**
 * Middleware Stack Configuration
 *
 * Implements security layers:
 * - Security headers (helmet with CSP)
 * - CORS with explicit allowed origins
 * - Rate limiting (auth and API tiers)
 * - Request size limits
 * - Input sanitization
 * - Correlation ID generation
 * - Structured request logging
 */

import express, { type Express, type Request, type Response, type NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import type { ApiConfig } from '@orbitpayroll/config';
import { requestLogger, correlationIdMiddleware } from './request-logger.js';
import { createRateLimiters } from './rate-limiter.js';

// Re-export validation middleware
export { validate, validateMultiple, type ValidatedRequest } from './validate.js';

// Re-export error handler
export { errorHandler } from './error-handler.js';

// Re-export auth middleware
export { authenticate } from './auth.js';

// Re-export authorization middleware (RBAC)
export {
  requireMembership,
  requireRole,
  authorize,
  preventPrivilegeEscalation,
} from './authorize.js';

// Re-export request logger utilities
export { correlationIdMiddleware, getCorrelationId } from './request-logger.js';

/**
 * Configure security headers using helmet
 * Requirements: 4.4, 4.6
 */
function configureSecurityHeaders(config: ApiConfig) {
  return helmet({
    // Content Security Policy - prevents XSS attacks
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'https:'],
        connectSrc: [
          "'self'",
          // Allow RPC connections for blockchain
          'https://*.alchemy.com',
          'https://*.infura.io',
          'wss://*.alchemy.com',
          'wss://*.infura.io',
        ],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        mediaSrc: ["'none'"],
        frameSrc: ["'none'"],
        // Prevent form submissions to external sites
        formAction: ["'self'"],
        // Prevent embedding in iframes (clickjacking protection)
        frameAncestors: ["'none'"],
        // Upgrade insecure requests in production
        upgradeInsecureRequests: config.NODE_ENV === 'production' ? [] : null,
      },
    },
    // X-Frame-Options: DENY - prevents clickjacking
    frameguard: { action: 'deny' },
    // X-Content-Type-Options: nosniff - prevents MIME type sniffing
    noSniff: true,
    // X-XSS-Protection: 1; mode=block - legacy XSS protection
    xssFilter: true,
    // Strict-Transport-Security - enforces HTTPS
    hsts: {
      maxAge: 31536000, // 1 year
      includeSubDomains: true,
      preload: true,
    },
    // X-DNS-Prefetch-Control: off - prevents DNS prefetching
    dnsPrefetchControl: { allow: false },
    // X-Download-Options: noopen - prevents IE from executing downloads
    ieNoOpen: true,
    // X-Permitted-Cross-Domain-Policies: none - prevents Adobe Flash/PDF cross-domain
    permittedCrossDomainPolicies: { permittedPolicies: 'none' },
    // Referrer-Policy: strict-origin-when-cross-origin
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  });
}

/**
 * Configure CORS with explicit allowed origins
 * Requirements: 4.5
 */
function configureCors(config: ApiConfig) {
  return cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, curl, etc.)
      if (!origin) {
        callback(null, true);
        return;
      }
      // Check if origin is in allowed list
      if (config.CORS_ORIGINS.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    exposedHeaders: ['X-RateLimit-Limit', 'X-RateLimit-Remaining', 'X-RateLimit-Reset'],
    maxAge: 86400, // 24 hours - cache preflight requests
  });
}

/**
 * HTTPS redirect middleware for production
 * Requirements: 4.7
 */
function httpsRedirect(req: Request, res: Response, next: NextFunction) {
  // Check X-Forwarded-Proto header (set by load balancers/proxies)
  const proto = req.headers['x-forwarded-proto'];
  if (proto === 'http') {
    const host = req.headers.host || '';
    return res.redirect(301, `https://${host}${req.url}`);
  }
  next();
}

export function setupMiddleware(app: Express, config: ApiConfig): void {
  // Trust proxy for correct IP detection behind load balancers
  app.set('trust proxy', 1);

  // HTTPS redirect in production (Requirements: 4.7)
  if (config.NODE_ENV === 'production') {
    app.use(httpsRedirect);
  }

  // Security headers with CSP (Requirements: 4.4, 4.6)
  app.use(configureSecurityHeaders(config));

  // CORS configuration with explicit origins (Requirements: 4.5)
  app.use(configureCors(config));

  // Response compression
  app.use(compression());

  // Body parsing with size limits (Requirements: 4.8)
  // 1MB default as per requirements
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));

  // Correlation ID generation (Requirements: 2.3)
  // Must be before request logging
  app.use(correlationIdMiddleware);

  // Request logging (Requirements: 2.1, 2.2, 2.7)
  app.use(requestLogger);

  // Rate limiting (Requirements: 4.1, 4.2)
  const { authLimiter, apiLimiter } = createRateLimiters(config);

  // Apply auth rate limiter to auth routes
  app.use('/api/v1/auth', authLimiter);

  // Apply general API rate limiter to all other routes
  app.use('/api/v1', apiLimiter);
}
