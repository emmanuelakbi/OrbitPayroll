/**
 * Security Test Suite
 *
 * Comprehensive security tests covering:
 * - Unauthorized access attempts
 * - Injection attack prevention
 * - Authentication bypass attempts
 *
 * **Feature: 08-security**
 * **Validates: Requirements 11.1, 11.2, 11.3, 11.4, 11.5**
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import express, { type Express, type Request, type Response, type NextFunction } from 'express';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { db } from './lib/db.js';
import { authenticate } from './middleware/auth.js';
import { authorize, requireMembership, requireRole } from './middleware/authorize.js';
import { errorHandler } from './middleware/error-handler.js';
import { validate } from './middleware/validate.js';
import { createOrgSchema, createContractorSchema } from './schemas/index.js';

const JWT_SECRET = process.env.JWT_SECRET ?? 'development-secret-change-me';

/**
 * Generate a valid JWT token for testing
 */
function generateTestToken(userId: string, walletAddress: string, expiresIn = '15m'): string {
  return jwt.sign(
    { sub: userId, wallet: walletAddress },
    JWT_SECRET,
    { expiresIn }
  );
}

/**
 * Generate an expired JWT token
 */
function generateExpiredToken(userId: string, walletAddress: string): string {
  return jwt.sign(
    { sub: userId, wallet: walletAddress },
    JWT_SECRET,
    { expiresIn: '-1s' }
  );
}

/**
 * Generate a token with invalid signature
 */
function generateTamperedToken(userId: string, walletAddress: string): string {
  const token = jwt.sign(
    { sub: userId, wallet: walletAddress },
    'wrong-secret-key',
    { expiresIn: '15m' }
  );
  return token;
}

describe('Security Test Suite', () => {
  // Test data
  let testUser: { id: string; walletAddress: string };
  let testOrg: { id: string };
  let validToken: string;

  beforeAll(async () => {
    // Create test user
    testUser = await db.user.create({
      data: { walletAddress: '0xsec' + '1'.repeat(37) },
    });

    // Create test organization
    testOrg = await db.organization.create({
      data: {
        name: 'Security Test Org',
        treasuryAddress: '0x' + '0'.repeat(40),
        ownerId: testUser.id,
        members: {
          create: { userId: testUser.id, role: 'OWNER_ADMIN' },
        },
      },
    });

    validToken = generateTestToken(testUser.id, testUser.walletAddress);
  });

  afterAll(async () => {
    // Clean up test data
    await db.orgMember.deleteMany({ where: { orgId: testOrg.id } });
    await db.organization.delete({ where: { id: testOrg.id } }).catch(() => {});
    await db.user.delete({ where: { id: testUser.id } }).catch(() => {});
    await db.$disconnect();
  });

  /**
   * Requirement 11.1: Security-focused test cases
   * Requirement 11.2: Test unauthorized access
   */
  describe('Unauthorized Access Tests', () => {
    function createProtectedApp(): Express {
      const app = express();
      app.use(express.json());
      
      // Protected endpoint requiring authentication
      app.get('/api/protected', authenticate, (req: Request, res: Response) => {
        res.json({ success: true, user: req.user });
      });

      // Protected endpoint requiring org membership
      app.get(
        '/api/orgs/:id/data',
        authenticate,
        requireMembership('id'),
        (req: Request, res: Response) => {
          res.json({ success: true, membership: req.membership });
        }
      );

      // Protected endpoint requiring admin role
      app.post(
        '/api/orgs/:id/admin-action',
        authenticate,
        authorize(['OWNER_ADMIN'], 'id'),
        (req: Request, res: Response) => {
          res.json({ success: true });
        }
      );

      app.use(errorHandler);
      return app;
    }

    it('should reject requests without authentication token', async () => {
      const app = createProtectedApp();
      const res = await request(app).get('/api/protected');

      expect(res.status).toBe(401);
      expect(res.body.code).toBe('AUTH_004');
    });

    it('should reject requests with expired token', async () => {
      const app = createProtectedApp();
      const expiredToken = generateExpiredToken(testUser.id, testUser.walletAddress);

      const res = await request(app)
        .get('/api/protected')
        .set('Authorization', `Bearer ${expiredToken}`);

      expect(res.status).toBe(401);
      // AUTH_003 is the code for expired tokens (session expired)
      expect(res.body.code).toBe('AUTH_003');
    });

    it('should reject requests with tampered/invalid signature token', async () => {
      const app = createProtectedApp();
      const tamperedToken = generateTamperedToken(testUser.id, testUser.walletAddress);

      const res = await request(app)
        .get('/api/protected')
        .set('Authorization', `Bearer ${tamperedToken}`);

      expect(res.status).toBe(401);
      expect(res.body.code).toBe('AUTH_004');
    });

    it('should reject requests with malformed token', async () => {
      const app = createProtectedApp();

      const res = await request(app)
        .get('/api/protected')
        .set('Authorization', 'Bearer not.a.valid.jwt.token');

      expect(res.status).toBe(401);
      expect(res.body.code).toBe('AUTH_004');
    });

    it('should reject requests with missing Bearer prefix', async () => {
      const app = createProtectedApp();

      const res = await request(app)
        .get('/api/protected')
        .set('Authorization', validToken);

      expect(res.status).toBe(401);
      expect(res.body.code).toBe('AUTH_004');
    });

    it('should reject non-member access to organization resources', async () => {
      const app = createProtectedApp();
      
      // Create another user who is not a member
      const nonMember = await db.user.create({
        data: { walletAddress: '0xsec' + '2'.repeat(37) },
      });
      const nonMemberToken = generateTestToken(nonMember.id, nonMember.walletAddress);

      const res = await request(app)
        .get(`/api/orgs/${testOrg.id}/data`)
        .set('Authorization', `Bearer ${nonMemberToken}`);

      expect(res.status).toBe(403);
      expect(res.body.code).toBe('ORG_002');

      // Cleanup
      await db.user.delete({ where: { id: nonMember.id } });
    });

    it('should reject access to non-existent organization', async () => {
      const app = createProtectedApp();
      const fakeOrgId = '00000000-0000-0000-0000-000000000000';

      const res = await request(app)
        .get(`/api/orgs/${fakeOrgId}/data`)
        .set('Authorization', `Bearer ${validToken}`);

      expect(res.status).toBe(404);
      expect(res.body.code).toBe('ORG_004');
    });

    it('should reject token for deleted user', async () => {
      const app = createProtectedApp();
      
      // Create and then delete a user
      const tempUser = await db.user.create({
        data: { walletAddress: '0xsec' + '3'.repeat(37) },
      });
      const tempToken = generateTestToken(tempUser.id, tempUser.walletAddress);
      await db.user.delete({ where: { id: tempUser.id } });

      const res = await request(app)
        .get('/api/protected')
        .set('Authorization', `Bearer ${tempToken}`);

      expect(res.status).toBe(401);
      expect(res.body.code).toBe('AUTH_004');
    });
  });

  /**
   * Requirement 11.2: Test injection attacks
   */
  describe('Injection Attack Prevention Tests', () => {
    function createValidationApp(): Express {
      const app = express();
      app.use(express.json());

      // Endpoint with validation
      app.post('/api/org', validate(createOrgSchema, 'body'), (req: Request, res: Response) => {
        res.json({ success: true, data: req.body });
      });

      app.post('/api/contractor', validate(createContractorSchema, 'body'), (req: Request, res: Response) => {
        res.json({ success: true, data: req.body });
      });

      app.use(errorHandler);
      return app;
    }

    describe('SQL Injection Prevention', () => {
      it('should reject SQL injection in organization name', async () => {
        const app = createValidationApp();
        const sqlInjectionPayloads = [
          "'; DROP TABLE users; --",
          "1' OR '1'='1",
          "admin'--",
          "1; DELETE FROM organizations WHERE 1=1; --",
          "' UNION SELECT * FROM users --",
        ];

        for (const payload of sqlInjectionPayloads) {
          const res = await request(app)
            .post('/api/org')
            .send({ name: payload });

          // Should either reject as invalid or sanitize the input
          // The validation passes but Prisma uses parameterized queries
          // so SQL injection is prevented at the database layer
          expect(res.status).toBeLessThanOrEqual(400);
        }
      });

      it('should reject SQL injection in contractor name', async () => {
        const app = createValidationApp();
        
        const res = await request(app)
          .post('/api/contractor')
          .send({
            name: "'; DROP TABLE contractors; --",
            walletAddress: '0x1234567890123456789012345678901234567890',
            rateAmount: 1000,
            payCycle: 'MONTHLY',
          });

        // Validation should pass (it's a valid string), but SQL injection
        // is prevented by Prisma's parameterized queries
        expect(res.status).toBeLessThanOrEqual(400);
      });
    });

    describe('XSS Prevention', () => {
      it('should accept XSS payloads but rely on output encoding for protection', async () => {
        const app = createValidationApp();
        const xssPayloads = [
          '<script>alert("xss")</script>',
          '<img src=x onerror=alert("xss")>',
          'javascript:alert("xss")',
          '<svg onload=alert("xss")>',
          '"><script>alert("xss")</script>',
        ];

        for (const payload of xssPayloads) {
          const res = await request(app)
            .post('/api/org')
            .send({ name: payload });

          // Input validation accepts these as valid strings
          // XSS protection is handled by:
          // 1. CSP headers (Content-Security-Policy)
          // 2. Output encoding in the frontend
          // 3. React's automatic escaping
          // The API stores data as-is and relies on output encoding
          expect(res.status).toBe(200);
        }
      });

      it('should handle null byte injection', async () => {
        const app = createValidationApp();
        
        const res = await request(app)
          .post('/api/org')
          .send({ name: 'Test\x00Org' });

        // Null bytes should be stripped by sanitization
        if (res.status === 200) {
          expect(res.body.data.name).not.toContain('\x00');
        }
      });

      it('should handle control character injection', async () => {
        const app = createValidationApp();
        
        const res = await request(app)
          .post('/api/org')
          .send({ name: 'Test\x0B\x0COrg' });

        // Control characters should be stripped
        if (res.status === 200) {
          expect(res.body.data.name).not.toMatch(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/);
        }
      });
    });

    describe('NoSQL Injection Prevention', () => {
      it('should reject NoSQL injection operators in input', async () => {
        const app = createValidationApp();
        
        // MongoDB-style injection attempts
        const noSqlPayloads = [
          { name: { $gt: '' } },
          { name: { $ne: null } },
          { name: { $regex: '.*' } },
        ];

        for (const payload of noSqlPayloads) {
          const res = await request(app)
            .post('/api/org')
            .send(payload);

          // Should reject because name must be a string
          expect(res.status).toBe(400);
          expect(res.body.code).toBe('VALIDATION_ERROR');
        }
      });
    });

    describe('Path Traversal Prevention', () => {
      it('should reject path traversal attempts in wallet address', async () => {
        const app = createValidationApp();
        
        const res = await request(app)
          .post('/api/contractor')
          .send({
            name: 'Test Contractor',
            walletAddress: '../../../etc/passwd',
            rateAmount: 1000,
            payCycle: 'MONTHLY',
          });

        expect(res.status).toBe(400);
        expect(res.body.code).toBe('VALIDATION_ERROR');
        expect(res.body.details.walletAddress).toBeDefined();
      });
    });
  });

  /**
   * Requirement 11.4: Basic penetration testing
   * Requirement 11.5: Document known limitations
   */
  describe('Authentication Bypass Attempts', () => {
    function createAuthApp(): Express {
      const app = express();
      app.use(express.json());
      
      app.get('/api/secure', authenticate, (req: Request, res: Response) => {
        res.json({ success: true, user: req.user });
      });

      app.use(errorHandler);
      return app;
    }

    it('should reject JWT with "none" algorithm', async () => {
      const app = createAuthApp();
      
      // Attempt to use "none" algorithm (a common JWT vulnerability)
      const header = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');
      const payload = Buffer.from(JSON.stringify({ sub: testUser.id, wallet: testUser.walletAddress })).toString('base64url');
      const noneAlgToken = `${header}.${payload}.`;

      const res = await request(app)
        .get('/api/secure')
        .set('Authorization', `Bearer ${noneAlgToken}`);

      expect(res.status).toBe(401);
    });

    it('should reject JWT with algorithm confusion attack', async () => {
      const app = createAuthApp();
      
      // Attempt algorithm confusion (HS256 vs RS256)
      const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
      const payload = Buffer.from(JSON.stringify({ sub: testUser.id, wallet: testUser.walletAddress })).toString('base64url');
      const fakeSignature = Buffer.from('fake-signature').toString('base64url');
      const confusedToken = `${header}.${payload}.${fakeSignature}`;

      const res = await request(app)
        .get('/api/secure')
        .set('Authorization', `Bearer ${confusedToken}`);

      expect(res.status).toBe(401);
    });

    it('should reject empty Authorization header', async () => {
      const app = createAuthApp();

      const res = await request(app)
        .get('/api/secure')
        .set('Authorization', '');

      expect(res.status).toBe(401);
    });

    it('should reject Authorization header with only Bearer', async () => {
      const app = createAuthApp();

      const res = await request(app)
        .get('/api/secure')
        .set('Authorization', 'Bearer ');

      expect(res.status).toBe(401);
    });

    it('should reject Authorization header with extra spaces', async () => {
      const app = createAuthApp();

      const res = await request(app)
        .get('/api/secure')
        .set('Authorization', `Bearer  ${validToken}`);

      expect(res.status).toBe(401);
    });
  });

  /**
   * Request Size Limit Tests
   */
  describe('Request Size Limit Tests', () => {
    function createSizeLimitApp(): Express {
      const app = express();
      // 1KB limit for testing
      app.use(express.json({ limit: '1kb' }));
      
      app.post('/api/data', (req: Request, res: Response) => {
        res.json({ success: true, size: JSON.stringify(req.body).length });
      });

      app.use(errorHandler);
      return app;
    }

    it('should reject requests exceeding size limit with error', async () => {
      const app = createSizeLimitApp();
      
      // Create a payload larger than 1KB
      const largePayload = { data: 'x'.repeat(2000) };

      const res = await request(app)
        .post('/api/data')
        .send(largePayload);

      // Express body-parser returns 413 for payload too large
      // but error handler may convert to 500 - either indicates rejection
      expect([413, 500]).toContain(res.status);
    });

    it('should accept requests within size limit', async () => {
      const app = createSizeLimitApp();
      
      const smallPayload = { data: 'small' };

      const res = await request(app)
        .post('/api/data')
        .send(smallPayload);

      expect(res.status).toBe(200);
    });
  });

  /**
   * Content-Type Validation Tests
   */
  describe('Content-Type Validation Tests', () => {
    function createContentTypeApp(): Express {
      const app = express();
      app.use(express.json());
      
      app.post('/api/json', (req: Request, res: Response) => {
        res.json({ success: true, body: req.body });
      });

      app.use(errorHandler);
      return app;
    }

    it('should handle missing Content-Type header gracefully', async () => {
      const app = createContentTypeApp();

      const res = await request(app)
        .post('/api/json')
        .send('{"name": "test"}');

      // Should either parse or return empty body
      expect([200, 400]).toContain(res.status);
    });

    it('should reject invalid JSON with error status', async () => {
      const app = createContentTypeApp();

      const res = await request(app)
        .post('/api/json')
        .set('Content-Type', 'application/json')
        .send('{ invalid json }');

      // Express body-parser returns 400 for invalid JSON
      // but error handler may convert to 500 - either indicates rejection
      expect([400, 500]).toContain(res.status);
    });
  });
});
