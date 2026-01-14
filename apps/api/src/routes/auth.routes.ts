/**
 * Authentication Routes
 *
 * Handles wallet-based authentication using SIWE (Sign-In with Ethereum).
 *
 * Security Features:
 * - Rate limiting on nonce requests (10 per minute per IP)
 * - Comprehensive authentication logging with IP addresses
 * - Single-use nonces with 5-minute expiration
 *
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7
 */

import { Router, type Request, type Response, type NextFunction } from 'express';
import {
  nonceRequestSchema,
  verifyRequestSchema,
  refreshRequestSchema,
} from '../schemas/auth.js';
import {
  generateNonce,
  verifySignature,
  refreshTokens,
  logout,
  type AuthContext,
} from '../services/auth.service.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

/**
 * Extract authentication context from request
 * Used for logging and rate limiting
 */
function getAuthContext(req: Request): AuthContext {
  // Get IP from X-Forwarded-For header (if behind proxy) or req.ip
  const forwardedFor = req.headers['x-forwarded-for'];
  const ip = typeof forwardedFor === 'string'
    ? forwardedFor.split(',')[0]?.trim() ?? req.ip ?? 'unknown'
    : req.ip ?? 'unknown';

  const userAgent = req.headers['user-agent'];
  
  // Only include userAgent if it's defined (exactOptionalPropertyTypes compliance)
  if (userAgent !== undefined) {
    return { ip, userAgent };
  }
  return { ip };
}

/**
 * POST /api/v1/auth/nonce
 *
 * Generate a nonce for wallet authentication.
 * Returns a SIWE message to be signed by the wallet.
 *
 * Rate limited to 10 requests per minute per IP (Requirement 1.6)
 */
router.post('/nonce', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { walletAddress } = nonceRequestSchema.parse(req.body);
    const context = getAuthContext(req);
    const result = await generateNonce(walletAddress, context);

    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/v1/auth/verify
 *
 * Verify a signed SIWE message and issue JWT tokens.
 * Logs all authentication attempts with IP and wallet address (Requirement 1.7)
 */
router.post('/verify', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { walletAddress, signature, nonce } = verifyRequestSchema.parse(req.body);
    const context = getAuthContext(req);
    const result = await verifySignature(walletAddress, signature, nonce, context);

    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/v1/auth/refresh
 *
 * Refresh access token using a valid refresh token.
 * Implements token rotation for security.
 */
router.post('/refresh', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { refreshToken } = refreshRequestSchema.parse(req.body);
    const result = await refreshTokens(refreshToken);

    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/v1/auth/logout
 *
 * Invalidate the current session.
 * Requires authentication.
 */
router.post('/logout', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const body = req.body as { refreshToken?: string };
    const refreshToken = body.refreshToken;

    await logout(userId, refreshToken);

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

export default router;
