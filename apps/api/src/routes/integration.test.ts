/**
 * API Integration Tests
 *
 * Comprehensive integration tests for all API endpoints.
 * Tests the full request/response cycle with real database.
 *
 * **Feature: 09-testing**
 * **Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7**
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import express, { type Express } from 'express';
import request from 'supertest';
import { Wallet } from 'ethers';
import { db } from '../lib/db.js';
import { setupRoutes } from './index.js';
import { errorHandler } from '../middleware/error-handler.js';
import { _internal } from '../services/auth.service.js';
import {
  generateTestToken,
  cleanupTestData,
  TEST_WALLETS,
  isValidUUID,
  isValidISODate,
} from '../test/helpers.js';

// =============================================================================
// Test App Setup
// =============================================================================

/**
 * Create a minimal test app without rate limiting for integration tests
 */
function createTestApp(): Express {
  const app = express();
  app.use(express.json());
  setupRoutes(app);
  app.use(errorHandler);
  return app;
}

// =============================================================================
// Integration Test Suite
// =============================================================================

describe('API Integration Tests', () => {
  let app: Express;

  // Test wallets for signing
  let ownerWallet: Wallet;
  let operatorWallet: Wallet;
  let nonMemberWallet: Wallet;

  // Test users
  let ownerUser: { id: string; walletAddress: string };
  let operatorUser: { id: string; walletAddress: string };
  let nonMemberUser: { id: string; walletAddress: string };

  // Test tokens
  let ownerToken: string;
  let operatorToken: string;
  let nonMemberToken: string;

  // Test organization
  let testOrg: { id: string; name: string; treasuryAddress: string };

  // Test contractors
  let contractor1: { id: string; name: string; walletAddress: string };
  let contractor2: { id: string; name: string; walletAddress: string };

  beforeAll(async () => {
    app = createTestApp();

    // Create test wallets
    ownerWallet = Wallet.createRandom();
    operatorWallet = Wallet.createRandom();
    nonMemberWallet = Wallet.createRandom();

    // Create test users
    ownerUser = await db.user.create({
      data: { walletAddress: ownerWallet.address.toLowerCase() },
    });
    operatorUser = await db.user.create({
      data: { walletAddress: operatorWallet.address.toLowerCase() },
    });
    nonMemberUser = await db.user.create({
      data: { walletAddress: nonMemberWallet.address.toLowerCase() },
    });

    // Generate tokens
    ownerToken = generateTestToken(ownerUser.id, ownerUser.walletAddress);
    operatorToken = generateTestToken(operatorUser.id, operatorUser.walletAddress);
    nonMemberToken = generateTestToken(nonMemberUser.id, nonMemberUser.walletAddress);

    // Create test organization with owner
    testOrg = await db.organization.create({
      data: {
        name: 'Integration Test Org',
        treasuryAddress: TEST_WALLETS.treasury,
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

    // Create test contractors
    contractor1 = await db.contractor.create({
      data: {
        orgId: testOrg.id,
        name: 'Test Contractor 1',
        walletAddress: TEST_WALLETS.contractor1,
        rateAmount: '1000.00000000',
        payCycle: 'MONTHLY',
      },
    });

    contractor2 = await db.contractor.create({
      data: {
        orgId: testOrg.id,
        name: 'Test Contractor 2',
        walletAddress: TEST_WALLETS.contractor2,
        rateAmount: '2000.00000000',
        payCycle: 'BI_WEEKLY',
      },
    });
  });

  afterAll(async () => {
    // Clean up test data
    await db.payrollItem.deleteMany({ where: { payrollRun: { orgId: testOrg.id } } });
    await db.payrollRun.deleteMany({ where: { orgId: testOrg.id } });
    await db.contractor.deleteMany({ where: { orgId: testOrg.id } });
    await db.orgMember.deleteMany({ where: { orgId: testOrg.id } });
    await db.notification.deleteMany({
      where: { userId: { in: [ownerUser.id, operatorUser.id, nonMemberUser.id] } },
    });
    await db.session.deleteMany({
      where: { userId: { in: [ownerUser.id, operatorUser.id, nonMemberUser.id] } },
    });
    await db.organization.delete({ where: { id: testOrg.id } }).catch(() => {});
    await db.user.deleteMany({
      where: { id: { in: [ownerUser.id, operatorUser.id, nonMemberUser.id] } },
    });
    await db.$disconnect();
  });

  beforeEach(() => {
    // Clear nonce store before each test
    _internal.nonceStore.clear();
  });


  // ===========================================================================
  // Health Check Endpoints
  // ===========================================================================

  describe('Health Check Endpoints', () => {
    it('GET /health should return health status with component checks', async () => {
      const res = await request(app).get('/health');

      // Health endpoint now checks database connectivity
      // In test environment with database, it should be healthy
      expect([200, 503]).toContain(res.status);
      expect(res.body).toHaveProperty('status');
      expect(['healthy', 'unhealthy']).toContain(res.body.status);
      expect(res.body).toHaveProperty('components');
      expect(res.body).toHaveProperty('timestamp');
      expect(res.body.components).toHaveProperty('database');
    });

    it('GET /ready should return ready status when database is connected', async () => {
      const res = await request(app).get('/ready');

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ready');
      expect(res.body).toHaveProperty('timestamp');
    });

    it('GET /api/v1 should return API info', async () => {
      const res = await request(app).get('/api/v1');

      expect(res.status).toBe(200);
      expect(res.body.name).toBe('OrbitPayroll API');
      expect(res.body.version).toBe('1.0.0');
      expect(res.body.endpoints).toHaveProperty('auth');
      expect(res.body.endpoints).toHaveProperty('orgs');
    });
  });

  // ===========================================================================
  // Authentication Flow Tests (Requirements 3.4)
  // ===========================================================================

  describe('Authentication Flow (Requirements 3.4)', () => {
    it('should complete full auth flow: nonce -> verify -> refresh -> logout', async () => {
      // 1. Request nonce
      const nonceRes = await request(app)
        .post('/api/v1/auth/nonce')
        .send({ walletAddress: ownerWallet.address });

      expect(nonceRes.status).toBe(200);
      expect(nonceRes.body).toHaveProperty('nonce');
      expect(nonceRes.body).toHaveProperty('message');
      expect(nonceRes.body).toHaveProperty('expiresAt');

      // 2. Sign and verify
      const signature = await ownerWallet.signMessage(nonceRes.body.message);
      const verifyRes = await request(app)
        .post('/api/v1/auth/verify')
        .send({
          walletAddress: ownerWallet.address,
          signature,
          nonce: nonceRes.body.nonce,
        });

      expect(verifyRes.status).toBe(200);
      expect(verifyRes.body).toHaveProperty('accessToken');
      expect(verifyRes.body).toHaveProperty('refreshToken');
      expect(verifyRes.body).toHaveProperty('user');
      expect(verifyRes.body.user.walletAddress).toBe(ownerWallet.address.toLowerCase());

      // 3. Refresh tokens
      const refreshRes = await request(app)
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: verifyRes.body.refreshToken });

      expect(refreshRes.status).toBe(200);
      expect(refreshRes.body).toHaveProperty('accessToken');
      expect(refreshRes.body).toHaveProperty('refreshToken');
      expect(refreshRes.body.refreshToken).not.toBe(verifyRes.body.refreshToken);

      // 4. Logout
      const logoutRes = await request(app)
        .post('/api/v1/auth/logout')
        .set('Authorization', `Bearer ${refreshRes.body.accessToken}`)
        .send({ refreshToken: refreshRes.body.refreshToken });

      expect(logoutRes.status).toBe(204);

      // 5. Verify refresh token is invalidated
      const invalidRefreshRes = await request(app)
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: refreshRes.body.refreshToken });

      expect(invalidRefreshRes.status).toBe(401);
    });

    it('should reject invalid signature', async () => {
      const nonceRes = await request(app)
        .post('/api/v1/auth/nonce')
        .send({ walletAddress: ownerWallet.address });

      const res = await request(app)
        .post('/api/v1/auth/verify')
        .send({
          walletAddress: ownerWallet.address,
          signature: '0x' + '00'.repeat(65),
          nonce: nonceRes.body.nonce,
        });

      expect(res.status).toBe(401);
      expect(res.body.code).toBe('AUTH_002');
    });

    it('should reject expired/invalid nonce', async () => {
      const res = await request(app)
        .post('/api/v1/auth/verify')
        .send({
          walletAddress: ownerWallet.address,
          signature: '0x' + '00'.repeat(65),
          nonce: 'invalid-nonce',
        });

      expect(res.status).toBe(401);
      expect(res.body.code).toBe('AUTH_001');
    });
  });


  // ===========================================================================
  // Organization Endpoints Tests (Requirements 3.1, 3.5)
  // ===========================================================================

  describe('Organization Endpoints (Requirements 3.1, 3.5)', () => {
    describe('POST /api/v1/orgs', () => {
      it('should create organization with caller as OWNER_ADMIN', async () => {
        const res = await request(app)
          .post('/api/v1/orgs')
          .set('Authorization', `Bearer ${nonMemberToken}`)
          .send({ name: 'New Test Org' });

        expect(res.status).toBe(201);
        expect(res.body.name).toBe('New Test Org');
        expect(res.body.ownerId).toBe(nonMemberUser.id);
        expect(isValidUUID(res.body.id)).toBe(true);

        // Clean up
        await db.orgMember.deleteMany({ where: { orgId: res.body.id } });
        await db.organization.delete({ where: { id: res.body.id } });
      });

      it('should reject request without authentication (401)', async () => {
        const res = await request(app)
          .post('/api/v1/orgs')
          .send({ name: 'Test Org' });

        expect(res.status).toBe(401);
      });

      it('should reject invalid organization name (400)', async () => {
        const res = await request(app)
          .post('/api/v1/orgs')
          .set('Authorization', `Bearer ${ownerToken}`)
          .send({ name: '' });

        expect(res.status).toBe(400);
        expect(res.body.code).toBe('VALIDATION_ERROR');
      });
    });

    describe('GET /api/v1/orgs', () => {
      it('should return organizations where user is a member', async () => {
        const res = await request(app)
          .get('/api/v1/orgs')
          .set('Authorization', `Bearer ${ownerToken}`);

        expect(res.status).toBe(200);
        expect(res.body.data).toBeInstanceOf(Array);
        expect(res.body.data.some((org: { id: string }) => org.id === testOrg.id)).toBe(true);
      });

      it('should return empty list for user with no memberships', async () => {
        const res = await request(app)
          .get('/api/v1/orgs')
          .set('Authorization', `Bearer ${nonMemberToken}`);

        expect(res.status).toBe(200);
        expect(res.body.data).toBeInstanceOf(Array);
        expect(res.body.data.some((org: { id: string }) => org.id === testOrg.id)).toBe(false);
      });
    });

    describe('GET /api/v1/orgs/:id', () => {
      it('should return organization for member', async () => {
        const res = await request(app)
          .get(`/api/v1/orgs/${testOrg.id}`)
          .set('Authorization', `Bearer ${ownerToken}`);

        expect(res.status).toBe(200);
        expect(res.body.id).toBe(testOrg.id);
        expect(res.body.name).toBe(testOrg.name);
      });

      it('should reject non-member with 403', async () => {
        const res = await request(app)
          .get(`/api/v1/orgs/${testOrg.id}`)
          .set('Authorization', `Bearer ${nonMemberToken}`);

        expect(res.status).toBe(403);
        expect(res.body.code).toBe('ORG_002');
      });

      it('should return 404 for non-existent organization', async () => {
        const fakeId = '00000000-0000-0000-0000-000000000000';
        const res = await request(app)
          .get(`/api/v1/orgs/${fakeId}`)
          .set('Authorization', `Bearer ${ownerToken}`);

        expect(res.status).toBe(404);
        expect(res.body.code).toBe('ORG_004');
      });

      it('should return 400 for invalid UUID', async () => {
        const res = await request(app)
          .get('/api/v1/orgs/invalid-uuid')
          .set('Authorization', `Bearer ${ownerToken}`);

        expect(res.status).toBe(400);
      });
    });

    describe('PUT /api/v1/orgs/:id', () => {
      it('should allow OWNER_ADMIN to update organization', async () => {
        const newName = 'Updated Org Name';
        const res = await request(app)
          .put(`/api/v1/orgs/${testOrg.id}`)
          .set('Authorization', `Bearer ${ownerToken}`)
          .send({ name: newName });

        expect(res.status).toBe(200);
        expect(res.body.name).toBe(newName);

        // Restore original name
        await db.organization.update({
          where: { id: testOrg.id },
          data: { name: testOrg.name },
        });
      });

      it('should reject FINANCE_OPERATOR with 403', async () => {
        const res = await request(app)
          .put(`/api/v1/orgs/${testOrg.id}`)
          .set('Authorization', `Bearer ${operatorToken}`)
          .send({ name: 'Hacked Name' });

        expect(res.status).toBe(403);
        expect(res.body.code).toBe('ORG_003');
      });

      it('should reject non-member with 403', async () => {
        const res = await request(app)
          .put(`/api/v1/orgs/${testOrg.id}`)
          .set('Authorization', `Bearer ${nonMemberToken}`)
          .send({ name: 'Hacked Name' });

        expect(res.status).toBe(403);
      });
    });
  });


  // ===========================================================================
  // Contractor Endpoints Tests (Requirements 3.1, 3.5, 3.6)
  // ===========================================================================

  describe('Contractor Endpoints (Requirements 3.1, 3.5, 3.6)', () => {
    describe('POST /api/v1/orgs/:id/contractors', () => {
      it('should create contractor as member', async () => {
        const res = await request(app)
          .post(`/api/v1/orgs/${testOrg.id}/contractors`)
          .set('Authorization', `Bearer ${ownerToken}`)
          .send({
            name: 'New Contractor',
            walletAddress: '0x' + 'a'.repeat(40),
            rateAmount: 500.00,
            payCycle: 'WEEKLY',
          });

        expect(res.status).toBe(201);
        expect(res.body.name).toBe('New Contractor');
        expect(res.body.walletAddress).toBe('0x' + 'a'.repeat(40));
        expect(isValidUUID(res.body.id)).toBe(true);

        // Clean up
        await db.contractor.delete({ where: { id: res.body.id } });
      });

      it('should reject non-member with 403', async () => {
        const res = await request(app)
          .post(`/api/v1/orgs/${testOrg.id}/contractors`)
          .set('Authorization', `Bearer ${nonMemberToken}`)
          .send({
            name: 'Hacked Contractor',
            walletAddress: '0x' + 'b'.repeat(40),
            rateAmount: 500.00,
            payCycle: 'WEEKLY',
          });

        expect(res.status).toBe(403);
      });

      it('should reject invalid wallet address (400)', async () => {
        const res = await request(app)
          .post(`/api/v1/orgs/${testOrg.id}/contractors`)
          .set('Authorization', `Bearer ${ownerToken}`)
          .send({
            name: 'Invalid Contractor',
            walletAddress: 'invalid-address',
            rateAmount: 500.00,
            payCycle: 'WEEKLY',
          });

        expect(res.status).toBe(400);
        expect(res.body.code).toBe('VALIDATION_ERROR');
      });

      it('should reject invalid pay cycle (400)', async () => {
        const res = await request(app)
          .post(`/api/v1/orgs/${testOrg.id}/contractors`)
          .set('Authorization', `Bearer ${ownerToken}`)
          .send({
            name: 'Invalid Contractor',
            walletAddress: '0x' + 'c'.repeat(40),
            rateAmount: 500.00,
            payCycle: 'INVALID',
          });

        expect(res.status).toBe(400);
      });
    });

    describe('GET /api/v1/orgs/:id/contractors', () => {
      it('should list contractors for member', async () => {
        const res = await request(app)
          .get(`/api/v1/orgs/${testOrg.id}/contractors`)
          .set('Authorization', `Bearer ${ownerToken}`);

        expect(res.status).toBe(200);
        expect(res.body.data).toBeInstanceOf(Array);
        expect(res.body.data.length).toBeGreaterThanOrEqual(2);
        expect(res.body).toHaveProperty('meta');
      });

      it('should support pagination', async () => {
        const res = await request(app)
          .get(`/api/v1/orgs/${testOrg.id}/contractors?page=1&limit=1`)
          .set('Authorization', `Bearer ${ownerToken}`);

        expect(res.status).toBe(200);
        expect(res.body.data.length).toBe(1);
        expect(res.body.meta.page).toBe(1);
        expect(res.body.meta.limit).toBe(1);
      });

      it('should reject non-member with 403', async () => {
        const res = await request(app)
          .get(`/api/v1/orgs/${testOrg.id}/contractors`)
          .set('Authorization', `Bearer ${nonMemberToken}`);

        expect(res.status).toBe(403);
      });
    });

    describe('GET /api/v1/orgs/:id/contractors/:contractorId', () => {
      it('should return contractor for member', async () => {
        const res = await request(app)
          .get(`/api/v1/orgs/${testOrg.id}/contractors/${contractor1.id}`)
          .set('Authorization', `Bearer ${ownerToken}`);

        expect(res.status).toBe(200);
        expect(res.body.id).toBe(contractor1.id);
        expect(res.body.name).toBe(contractor1.name);
      });

      it('should return 404 for non-existent contractor', async () => {
        const fakeId = '00000000-0000-0000-0000-000000000000';
        const res = await request(app)
          .get(`/api/v1/orgs/${testOrg.id}/contractors/${fakeId}`)
          .set('Authorization', `Bearer ${ownerToken}`);

        expect(res.status).toBe(404);
      });
    });

    describe('PUT /api/v1/orgs/:id/contractors/:contractorId', () => {
      it('should allow OWNER_ADMIN to update contractor', async () => {
        const res = await request(app)
          .put(`/api/v1/orgs/${testOrg.id}/contractors/${contractor1.id}`)
          .set('Authorization', `Bearer ${ownerToken}`)
          .send({ name: 'Updated Contractor Name' });

        expect(res.status).toBe(200);
        expect(res.body.name).toBe('Updated Contractor Name');

        // Restore original name
        await db.contractor.update({
          where: { id: contractor1.id },
          data: { name: contractor1.name },
        });
      });

      it('should reject FINANCE_OPERATOR with 403', async () => {
        const res = await request(app)
          .put(`/api/v1/orgs/${testOrg.id}/contractors/${contractor1.id}`)
          .set('Authorization', `Bearer ${operatorToken}`)
          .send({ name: 'Hacked Name' });

        expect(res.status).toBe(403);
      });
    });

    describe('DELETE /api/v1/orgs/:id/contractors/:contractorId', () => {
      it('should allow OWNER_ADMIN to archive contractor', async () => {
        // Create a contractor to archive
        const tempContractor = await db.contractor.create({
          data: {
            orgId: testOrg.id,
            name: 'Temp Contractor',
            walletAddress: '0x' + 'd'.repeat(40),
            rateAmount: '100.00000000',
            payCycle: 'MONTHLY',
          },
        });

        const res = await request(app)
          .delete(`/api/v1/orgs/${testOrg.id}/contractors/${tempContractor.id}`)
          .set('Authorization', `Bearer ${ownerToken}`);

        expect(res.status).toBe(204);

        // Verify contractor is archived (soft delete)
        const archived = await db.contractor.findUnique({
          where: { id: tempContractor.id },
        });
        expect(archived?.active).toBe(false);

        // Clean up
        await db.contractor.delete({ where: { id: tempContractor.id } });
      });

      it('should reject FINANCE_OPERATOR with 403', async () => {
        const res = await request(app)
          .delete(`/api/v1/orgs/${testOrg.id}/contractors/${contractor1.id}`)
          .set('Authorization', `Bearer ${operatorToken}`);

        expect(res.status).toBe(403);
      });
    });
  });


  // ===========================================================================
  // Payroll Endpoints Tests (Requirements 3.1, 3.5, 3.7)
  // ===========================================================================

  describe('Payroll Endpoints (Requirements 3.1, 3.5, 3.7)', () => {
    describe('POST /api/v1/orgs/:id/payroll-runs/preview', () => {
      it('should generate payroll preview for member', async () => {
        const res = await request(app)
          .post(`/api/v1/orgs/${testOrg.id}/payroll-runs/preview`)
          .set('Authorization', `Bearer ${ownerToken}`);

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('totalMnee');
        expect(res.body).toHaveProperty('contractors');
        expect(res.body.contractors).toBeInstanceOf(Array);
        expect(res.body.contractors.length).toBeGreaterThanOrEqual(2);
      });

      it('should reject non-member with 403', async () => {
        const res = await request(app)
          .post(`/api/v1/orgs/${testOrg.id}/payroll-runs/preview`)
          .set('Authorization', `Bearer ${nonMemberToken}`);

        expect(res.status).toBe(403);
      });
    });

    describe('POST /api/v1/orgs/:id/payroll-runs', () => {
      it('should create payroll run with valid data', async () => {
        const txHash = '0x' + 'f'.repeat(64);
        const res = await request(app)
          .post(`/api/v1/orgs/${testOrg.id}/payroll-runs`)
          .set('Authorization', `Bearer ${ownerToken}`)
          .send({
            txHash,
            items: [
              { contractorId: contractor1.id, amountMnee: '1000.00000000' },
              { contractorId: contractor2.id, amountMnee: '2000.00000000' },
            ],
          });

        expect(res.status).toBe(201);
        expect(res.body).toHaveProperty('id');
        expect(res.body.txHash).toBe(txHash);
        expect(res.body.status).toBe('EXECUTED');
        expect(isValidUUID(res.body.id)).toBe(true);

        // Clean up
        await db.payrollItem.deleteMany({ where: { payrollRunId: res.body.id } });
        await db.payrollRun.delete({ where: { id: res.body.id } });
      });

      it('should reject invalid transaction hash (400)', async () => {
        const res = await request(app)
          .post(`/api/v1/orgs/${testOrg.id}/payroll-runs`)
          .set('Authorization', `Bearer ${ownerToken}`)
          .send({
            txHash: 'invalid-hash',
            items: [{ contractorId: contractor1.id, amountMnee: '1000.00000000' }],
          });

        expect(res.status).toBe(400);
        expect(res.body.code).toBe('VALIDATION_ERROR');
      });

      it('should reject empty items array (400)', async () => {
        const res = await request(app)
          .post(`/api/v1/orgs/${testOrg.id}/payroll-runs`)
          .set('Authorization', `Bearer ${ownerToken}`)
          .send({
            txHash: '0x' + 'e'.repeat(64),
            items: [],
          });

        expect(res.status).toBe(400);
      });

      it('should reject non-member with 403', async () => {
        const res = await request(app)
          .post(`/api/v1/orgs/${testOrg.id}/payroll-runs`)
          .set('Authorization', `Bearer ${nonMemberToken}`)
          .send({
            txHash: '0x' + 'e'.repeat(64),
            items: [{ contractorId: contractor1.id, amountMnee: '1000.00000000' }],
          });

        expect(res.status).toBe(403);
      });
    });

    describe('GET /api/v1/orgs/:id/payroll-runs', () => {
      let testPayrollRun: { id: string };

      beforeAll(async () => {
        // Create a test payroll run
        testPayrollRun = await db.payrollRun.create({
          data: {
            orgId: testOrg.id,
            txHash: '0x' + '1'.repeat(64),
            totalMnee: '3000.00000000',
            status: 'EXECUTED',
            items: {
              createMany: {
                data: [
                  { contractorId: contractor1.id, amountMnee: '1000.00000000', status: 'PAID' },
                  { contractorId: contractor2.id, amountMnee: '2000.00000000', status: 'PAID' },
                ],
              },
            },
          },
        });
      });

      afterAll(async () => {
        await db.payrollItem.deleteMany({ where: { payrollRunId: testPayrollRun.id } });
        await db.payrollRun.delete({ where: { id: testPayrollRun.id } }).catch(() => {});
      });

      it('should list payroll runs for member', async () => {
        const res = await request(app)
          .get(`/api/v1/orgs/${testOrg.id}/payroll-runs`)
          .set('Authorization', `Bearer ${ownerToken}`);

        expect(res.status).toBe(200);
        expect(res.body.data).toBeInstanceOf(Array);
        expect(res.body).toHaveProperty('meta');
      });

      it('should support pagination', async () => {
        const res = await request(app)
          .get(`/api/v1/orgs/${testOrg.id}/payroll-runs?page=1&limit=1`)
          .set('Authorization', `Bearer ${ownerToken}`);

        expect(res.status).toBe(200);
        expect(res.body.meta.page).toBe(1);
        expect(res.body.meta.limit).toBe(1);
      });

      it('should reject non-member with 403', async () => {
        const res = await request(app)
          .get(`/api/v1/orgs/${testOrg.id}/payroll-runs`)
          .set('Authorization', `Bearer ${nonMemberToken}`);

        expect(res.status).toBe(403);
      });
    });

    describe('GET /api/v1/orgs/:id/payroll-runs/:runId', () => {
      let testPayrollRun: { id: string };

      beforeAll(async () => {
        testPayrollRun = await db.payrollRun.create({
          data: {
            orgId: testOrg.id,
            txHash: '0x' + '2'.repeat(64),
            totalMnee: '3000.00000000',
            status: 'EXECUTED',
            items: {
              createMany: {
                data: [
                  { contractorId: contractor1.id, amountMnee: '1000.00000000', status: 'PAID' },
                  { contractorId: contractor2.id, amountMnee: '2000.00000000', status: 'PAID' },
                ],
              },
            },
          },
        });
      });

      afterAll(async () => {
        await db.payrollItem.deleteMany({ where: { payrollRunId: testPayrollRun.id } });
        await db.payrollRun.delete({ where: { id: testPayrollRun.id } }).catch(() => {});
      });

      it('should return payroll run with items for member', async () => {
        const res = await request(app)
          .get(`/api/v1/orgs/${testOrg.id}/payroll-runs/${testPayrollRun.id}`)
          .set('Authorization', `Bearer ${ownerToken}`);

        expect(res.status).toBe(200);
        expect(res.body.id).toBe(testPayrollRun.id);
        expect(res.body).toHaveProperty('items');
        expect(res.body.items).toBeInstanceOf(Array);
      });

      it('should return 404 for non-existent payroll run', async () => {
        const fakeId = '00000000-0000-0000-0000-000000000000';
        const res = await request(app)
          .get(`/api/v1/orgs/${testOrg.id}/payroll-runs/${fakeId}`)
          .set('Authorization', `Bearer ${ownerToken}`);

        expect(res.status).toBe(404);
      });

      it('should reject non-member with 403', async () => {
        const res = await request(app)
          .get(`/api/v1/orgs/${testOrg.id}/payroll-runs/${testPayrollRun.id}`)
          .set('Authorization', `Bearer ${nonMemberToken}`);

        expect(res.status).toBe(403);
      });
    });
  });


  // ===========================================================================
  // Error Response Tests (Requirements 3.6)
  // ===========================================================================

  describe('Error Responses (Requirements 3.6)', () => {
    it('should return 400 for validation errors', async () => {
      const res = await request(app)
        .post('/api/v1/auth/nonce')
        .send({ walletAddress: 'invalid' });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('code');
      expect(res.body).toHaveProperty('message');
    });

    it('should return 401 for missing authentication', async () => {
      const res = await request(app).get('/api/v1/orgs');

      expect(res.status).toBe(401);
      expect(res.body).toHaveProperty('code');
    });

    it('should return 401 for invalid token', async () => {
      const res = await request(app)
        .get('/api/v1/orgs')
        .set('Authorization', 'Bearer invalid-token');

      expect(res.status).toBe(401);
    });

    it('should return 403 for unauthorized access', async () => {
      const res = await request(app)
        .get(`/api/v1/orgs/${testOrg.id}`)
        .set('Authorization', `Bearer ${nonMemberToken}`);

      expect(res.status).toBe(403);
      expect(res.body).toHaveProperty('code');
    });

    it('should return 404 for non-existent resources', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const res = await request(app)
        .get(`/api/v1/orgs/${fakeId}`)
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(res.status).toBe(404);
      expect(res.body).toHaveProperty('code');
    });

    it('should return 404 for unknown endpoints', async () => {
      const res = await request(app)
        .get('/api/v1/unknown-endpoint')
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(res.status).toBe(404);
      expect(res.body.code).toBe('NOT_FOUND');
    });
  });

  // ===========================================================================
  // Response Shape Tests (Requirements 3.7)
  // ===========================================================================

  describe('Response Shapes (Requirements 3.7)', () => {
    it('should return correct shape for organization', async () => {
      const res = await request(app)
        .get(`/api/v1/orgs/${testOrg.id}`)
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('id');
      expect(res.body).toHaveProperty('name');
      expect(res.body).toHaveProperty('treasuryAddress');
      expect(res.body).toHaveProperty('ownerId');
      expect(res.body).toHaveProperty('createdAt');
      expect(isValidUUID(res.body.id)).toBe(true);
      expect(isValidISODate(res.body.createdAt)).toBe(true);
    });

    it('should return correct shape for contractor', async () => {
      const res = await request(app)
        .get(`/api/v1/orgs/${testOrg.id}/contractors/${contractor1.id}`)
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('id');
      expect(res.body).toHaveProperty('name');
      expect(res.body).toHaveProperty('walletAddress');
      expect(res.body).toHaveProperty('rateAmount');
      expect(res.body).toHaveProperty('payCycle');
      expect(res.body).toHaveProperty('active');
      expect(res.body).toHaveProperty('createdAt');
      expect(isValidUUID(res.body.id)).toBe(true);
    });

    it('should return correct shape for paginated list', async () => {
      const res = await request(app)
        .get(`/api/v1/orgs/${testOrg.id}/contractors`)
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('data');
      expect(res.body).toHaveProperty('meta');
      expect(res.body.meta).toHaveProperty('page');
      expect(res.body.meta).toHaveProperty('limit');
      expect(res.body.meta).toHaveProperty('total');
      expect(res.body.meta).toHaveProperty('totalPages');
    });

    it('should return correct shape for auth tokens', async () => {
      const nonceRes = await request(app)
        .post('/api/v1/auth/nonce')
        .send({ walletAddress: ownerWallet.address });

      const signature = await ownerWallet.signMessage(nonceRes.body.message);
      const res = await request(app)
        .post('/api/v1/auth/verify')
        .send({
          walletAddress: ownerWallet.address,
          signature,
          nonce: nonceRes.body.nonce,
        });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('accessToken');
      expect(res.body).toHaveProperty('refreshToken');
      expect(res.body).toHaveProperty('user');
      expect(res.body.user).toHaveProperty('id');
      expect(res.body.user).toHaveProperty('walletAddress');
      expect(typeof res.body.accessToken).toBe('string');
      expect(typeof res.body.refreshToken).toBe('string');
    });
  });
});
