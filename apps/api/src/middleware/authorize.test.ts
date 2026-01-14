/**
 * Authorization Middleware Tests
 *
 * Tests for RBAC middleware functionality.
 * **Feature: 08-security, Property 2: Authorization Enforcement**
 * **Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7**
 */

import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import express, { type Express, type Request, type Response } from 'express';
import request from 'supertest';
import { db } from '../lib/db.js';
import { authenticate } from './auth.js';
import { requireMembership, requireRole, authorize, preventPrivilegeEscalation } from './authorize.js';
import { errorHandler } from './error-handler.js';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET ?? 'development-secret-change-me';

/**
 * Generate a valid JWT token for a user
 */
function generateTestToken(userId: string, walletAddress: string): string {
  return jwt.sign(
    { sub: userId, wallet: walletAddress },
    JWT_SECRET,
    { expiresIn: '15m' }
  );
}

describe('Authorization Middleware', () => {
  // Test users
  let ownerUser: { id: string; walletAddress: string };
  let operatorUser: { id: string; walletAddress: string };
  let nonMemberUser: { id: string; walletAddress: string };
  let ownerToken: string;
  let operatorToken: string;
  let nonMemberToken: string;
  let testOrg: { id: string };

  beforeAll(async () => {
    // Create test users
    ownerUser = await db.user.create({
      data: { walletAddress: '0xauth' + '1'.repeat(36) },
    });
    operatorUser = await db.user.create({
      data: { walletAddress: '0xauth' + '2'.repeat(36) },
    });
    nonMemberUser = await db.user.create({
      data: { walletAddress: '0xauth' + '3'.repeat(36) },
    });

    // Generate tokens
    ownerToken = generateTestToken(ownerUser.id, ownerUser.walletAddress);
    operatorToken = generateTestToken(operatorUser.id, operatorUser.walletAddress);
    nonMemberToken = generateTestToken(nonMemberUser.id, nonMemberUser.walletAddress);

    // Create test organization with members
    testOrg = await db.organization.create({
      data: {
        name: 'Auth Test Org',
        treasuryAddress: '0x' + '0'.repeat(40),
        ownerId: ownerUser.id,
        members: {
          createMany: {
            data: [
              { userId: ownerUser.id, role: 'OWNER_ADMIN' },
              { userId: operatorUser.id, role: 'FINANCE_OPERATOR' },
            ],
          },
        },
      },
    });
  });

  afterAll(async () => {
    // Clean up test data
    await db.orgMember.deleteMany({
      where: { orgId: testOrg.id },
    });
    await db.organization.delete({ where: { id: testOrg.id } }).catch(() => {});
    await db.user.deleteMany({
      where: {
        id: { in: [ownerUser.id, operatorUser.id, nonMemberUser.id] },
      },
    });
    await db.$disconnect();
  });

  describe('requireMembership', () => {
    function createMembershipTestApp(): Express {
      const app = express();
      app.use(express.json());
      app.get(
        '/orgs/:id/test',
        authenticate,
        requireMembership('id'),
        (req: Request, res: Response) => {
          res.json({ success: true, membership: req.membership });
        }
      );
      app.use(errorHandler);
      return app;
    }

    it('should allow access for organization members', async () => {
      const app = createMembershipTestApp();
      const res = await request(app)
        .get(`/orgs/${testOrg.id}/test`)
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.membership).toBeDefined();
      expect(res.body.membership.role).toBe('OWNER_ADMIN');
    });

    it('should reject non-members with 403', async () => {
      const app = createMembershipTestApp();
      const res = await request(app)
        .get(`/orgs/${testOrg.id}/test`)
        .set('Authorization', `Bearer ${nonMemberToken}`);

      expect(res.status).toBe(403);
      expect(res.body.code).toBe('ORG_002');
    });

    it('should return 404 for non-existent organization', async () => {
      const app = createMembershipTestApp();
      const fakeOrgId = '00000000-0000-0000-0000-000000000000';
      const res = await request(app)
        .get(`/orgs/${fakeOrgId}/test`)
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(res.status).toBe(404);
      expect(res.body.code).toBe('ORG_004');
    });

    it('should reject unauthenticated requests', async () => {
      const app = createMembershipTestApp();
      const res = await request(app).get(`/orgs/${testOrg.id}/test`);

      expect(res.status).toBe(401);
    });
  });

  describe('requireRole', () => {
    function createRoleTestApp(roles: ('OWNER_ADMIN' | 'FINANCE_OPERATOR')[]): Express {
      const app = express();
      app.use(express.json());
      app.get(
        '/orgs/:id/admin-action',
        authenticate,
        requireMembership('id'),
        requireRole(...roles),
        (req: Request, res: Response) => {
          res.json({ success: true, role: req.membership?.role });
        }
      );
      app.use(errorHandler);
      return app;
    }

    it('should allow OWNER_ADMIN for admin-only actions', async () => {
      const app = createRoleTestApp(['OWNER_ADMIN']);
      const res = await request(app)
        .get(`/orgs/${testOrg.id}/admin-action`)
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should reject FINANCE_OPERATOR for admin-only actions with 403', async () => {
      const app = createRoleTestApp(['OWNER_ADMIN']);
      const res = await request(app)
        .get(`/orgs/${testOrg.id}/admin-action`)
        .set('Authorization', `Bearer ${operatorToken}`);

      expect(res.status).toBe(403);
      expect(res.body.code).toBe('ORG_003');
    });

    it('should allow FINANCE_OPERATOR for operator-level actions', async () => {
      const app = createRoleTestApp(['FINANCE_OPERATOR']);
      const res = await request(app)
        .get(`/orgs/${testOrg.id}/admin-action`)
        .set('Authorization', `Bearer ${operatorToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should allow OWNER_ADMIN for operator-level actions (higher role)', async () => {
      const app = createRoleTestApp(['FINANCE_OPERATOR']);
      const res = await request(app)
        .get(`/orgs/${testOrg.id}/admin-action`)
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should allow access when user has any of multiple allowed roles', async () => {
      const app = createRoleTestApp(['OWNER_ADMIN', 'FINANCE_OPERATOR']);
      
      const ownerRes = await request(app)
        .get(`/orgs/${testOrg.id}/admin-action`)
        .set('Authorization', `Bearer ${ownerToken}`);
      expect(ownerRes.status).toBe(200);

      const operatorRes = await request(app)
        .get(`/orgs/${testOrg.id}/admin-action`)
        .set('Authorization', `Bearer ${operatorToken}`);
      expect(operatorRes.status).toBe(200);
    });
  });

  describe('authorize (combined middleware)', () => {
    function createAuthorizeTestApp(roles: ('OWNER_ADMIN' | 'FINANCE_OPERATOR')[]): Express {
      const app = express();
      app.use(express.json());
      app.get(
        '/orgs/:id/protected',
        authenticate,
        authorize(roles, 'id'),
        (req: Request, res: Response) => {
          res.json({ success: true, membership: req.membership });
        }
      );
      app.use(errorHandler);
      return app;
    }

    it('should allow authorized users in one middleware call', async () => {
      const app = createAuthorizeTestApp(['OWNER_ADMIN']);
      const res = await request(app)
        .get(`/orgs/${testOrg.id}/protected`)
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.membership.role).toBe('OWNER_ADMIN');
    });

    it('should reject unauthorized users', async () => {
      const app = createAuthorizeTestApp(['OWNER_ADMIN']);
      const res = await request(app)
        .get(`/orgs/${testOrg.id}/protected`)
        .set('Authorization', `Bearer ${operatorToken}`);

      expect(res.status).toBe(403);
      expect(res.body.code).toBe('ORG_003');
    });

    it('should reject non-members', async () => {
      const app = createAuthorizeTestApp(['FINANCE_OPERATOR']);
      const res = await request(app)
        .get(`/orgs/${testOrg.id}/protected`)
        .set('Authorization', `Bearer ${nonMemberToken}`);

      expect(res.status).toBe(403);
      expect(res.body.code).toBe('ORG_002');
    });
  });

  describe('preventPrivilegeEscalation', () => {
    function createEscalationTestApp(): Express {
      const app = express();
      app.use(express.json());
      app.post(
        '/orgs/:id/members',
        authenticate,
        requireMembership('id'),
        requireRole('OWNER_ADMIN', 'FINANCE_OPERATOR'),
        preventPrivilegeEscalation('role'),
        (req: Request, res: Response) => {
          res.json({ success: true, targetRole: req.body.role });
        }
      );
      app.use(errorHandler);
      return app;
    }

    it('should allow OWNER_ADMIN to assign any role', async () => {
      const app = createEscalationTestApp();
      
      // Owner can assign OWNER_ADMIN
      const res1 = await request(app)
        .post(`/orgs/${testOrg.id}/members`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ role: 'OWNER_ADMIN' });
      expect(res1.status).toBe(200);

      // Owner can assign FINANCE_OPERATOR
      const res2 = await request(app)
        .post(`/orgs/${testOrg.id}/members`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ role: 'FINANCE_OPERATOR' });
      expect(res2.status).toBe(200);
    });

    it('should prevent FINANCE_OPERATOR from assigning OWNER_ADMIN role', async () => {
      const app = createEscalationTestApp();
      const res = await request(app)
        .post(`/orgs/${testOrg.id}/members`)
        .set('Authorization', `Bearer ${operatorToken}`)
        .send({ role: 'OWNER_ADMIN' });

      expect(res.status).toBe(403);
      expect(res.body.code).toBe('ORG_003');
    });

    it('should allow FINANCE_OPERATOR to assign FINANCE_OPERATOR role', async () => {
      const app = createEscalationTestApp();
      const res = await request(app)
        .post(`/orgs/${testOrg.id}/members`)
        .set('Authorization', `Bearer ${operatorToken}`)
        .send({ role: 'FINANCE_OPERATOR' });

      expect(res.status).toBe(200);
      expect(res.body.targetRole).toBe('FINANCE_OPERATOR');
    });

    it('should allow requests without role field', async () => {
      const app = createEscalationTestApp();
      const res = await request(app)
        .post(`/orgs/${testOrg.id}/members`)
        .set('Authorization', `Bearer ${operatorToken}`)
        .send({ name: 'Test' });

      expect(res.status).toBe(200);
    });
  });

  describe('Authorization Logging', () => {
    it('should log authorization failures', async () => {
      // This test verifies that logging happens by checking the middleware executes
      // without errors. Actual log verification would require mocking the logger.
      const app = express();
      app.use(express.json());
      app.get(
        '/orgs/:id/test',
        authenticate,
        authorize(['OWNER_ADMIN'], 'id'),
        (req: Request, res: Response) => {
          res.json({ success: true });
        }
      );
      app.use(errorHandler);

      // Non-member access should be logged
      const res = await request(app)
        .get(`/orgs/${testOrg.id}/test`)
        .set('Authorization', `Bearer ${nonMemberToken}`);

      expect(res.status).toBe(403);
    });
  });
});
