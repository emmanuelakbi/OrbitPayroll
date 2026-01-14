/**
 * Test Helpers for OrbitPayroll API Tests
 *
 * This module provides utility functions for setting up and tearing down
 * test data, creating test fixtures, and common test operations.
 *
 * **Feature: 09-testing**
 * **Validates: Requirements 7.1, 7.2, 7.3, 7.4, 7.5, 7.6**
 */

import jwt from 'jsonwebtoken';
import { db } from '../lib/db.js';

const JWT_SECRET = process.env.JWT_SECRET ?? 'test-secret-key-for-testing-minimum-32-characters-long';

// =============================================================================
// Token Generation
// =============================================================================

/**
 * Generates a valid JWT access token for testing.
 */
export function generateTestToken(
  userId: string,
  walletAddress: string,
  expiresIn: string = '15m'
): string {
  return jwt.sign({ sub: userId, wallet: walletAddress }, JWT_SECRET, { expiresIn });
}

/**
 * Generates an expired JWT token for testing.
 */
export function generateExpiredToken(userId: string, walletAddress: string): string {
  return jwt.sign({ sub: userId, wallet: walletAddress }, JWT_SECRET, { expiresIn: '-1s' });
}

/**
 * Generates a token with invalid signature.
 */
export function generateInvalidToken(userId: string, walletAddress: string): string {
  return jwt.sign({ sub: userId, wallet: walletAddress }, 'wrong-secret-key-that-is-long-enough', {
    expiresIn: '15m',
  });
}

// =============================================================================
// Test Data Creation
// =============================================================================

/**
 * Creates a test user in the database.
 */
export async function createTestUser(walletAddress: string, email?: string) {
  return db.user.create({
    data: {
      walletAddress: walletAddress.toLowerCase(),
      email,
    },
  });
}

/**
 * Creates a test organization with an owner.
 */
export async function createTestOrg(
  name: string,
  treasuryAddress: string,
  ownerId: string
) {
  return db.organization.create({
    data: {
      name,
      treasuryAddress: treasuryAddress.toLowerCase(),
      ownerId,
      members: {
        create: {
          userId: ownerId,
          role: 'OWNER_ADMIN',
        },
      },
    },
    include: {
      members: true,
    },
  });
}

/**
 * Creates a test contractor in an organization.
 */
export async function createTestContractor(
  orgId: string,
  name: string,
  walletAddress: string,
  rateAmount: string = '1000.00000000',
  payCycle: 'WEEKLY' | 'BI_WEEKLY' | 'MONTHLY' = 'MONTHLY'
) {
  return db.contractor.create({
    data: {
      orgId,
      name,
      walletAddress: walletAddress.toLowerCase(),
      rateAmount,
      payCycle,
    },
  });
}

/**
 * Adds a member to an organization.
 */
export async function addOrgMember(
  orgId: string,
  userId: string,
  role: 'OWNER_ADMIN' | 'FINANCE_OPERATOR'
) {
  return db.orgMember.create({
    data: {
      orgId,
      userId,
      role,
    },
  });
}

// =============================================================================
// Test Data Cleanup
// =============================================================================

/**
 * Cleans up all test data from the database.
 * Use with caution - only in test environment!
 */
export async function cleanupTestData() {
  if (process.env.NODE_ENV !== 'test') {
    throw new Error('cleanupTestData can only be called in test environment');
  }

  // Delete in order of dependencies
  await db.payrollItem.deleteMany({});
  await db.payrollRun.deleteMany({});
  await db.contractor.deleteMany({});
  await db.orgMember.deleteMany({});
  await db.notification.deleteMany({});
  await db.organization.deleteMany({});
  await db.user.deleteMany({});
}

/**
 * Cleans up data for a specific organization.
 */
export async function cleanupOrgData(orgId: string) {
  await db.payrollItem.deleteMany({
    where: { payrollRun: { orgId } },
  });
  await db.payrollRun.deleteMany({ where: { orgId } });
  await db.contractor.deleteMany({ where: { orgId } });
  await db.orgMember.deleteMany({ where: { orgId } });
  await db.organization.delete({ where: { id: orgId } }).catch(() => {});
}

/**
 * Cleans up a specific user and their data.
 */
export async function cleanupUserData(userId: string) {
  await db.orgMember.deleteMany({ where: { userId } });
  await db.notification.deleteMany({ where: { userId } });
  await db.user.delete({ where: { id: userId } }).catch(() => {});
}

// =============================================================================
// Test Fixtures
// =============================================================================

/**
 * Standard test wallet addresses.
 */
export const TEST_WALLETS = {
  owner: '0x' + '1'.repeat(40),
  operator: '0x' + '2'.repeat(40),
  contractor1: '0x' + '3'.repeat(40),
  contractor2: '0x' + '4'.repeat(40),
  treasury: '0x' + '5'.repeat(40),
  nonMember: '0x' + '6'.repeat(40),
};

/**
 * Creates a complete test environment with user, org, and contractors.
 */
export async function createTestEnvironment() {
  const owner = await createTestUser(TEST_WALLETS.owner, 'owner@test.com');
  const operator = await createTestUser(TEST_WALLETS.operator, 'operator@test.com');
  const nonMember = await createTestUser(TEST_WALLETS.nonMember);

  const org = await createTestOrg('Test Organization', TEST_WALLETS.treasury, owner.id);

  await addOrgMember(org.id, operator.id, 'FINANCE_OPERATOR');

  const contractor1 = await createTestContractor(
    org.id,
    'Contractor One',
    TEST_WALLETS.contractor1,
    '1000.00000000',
    'MONTHLY'
  );

  const contractor2 = await createTestContractor(
    org.id,
    'Contractor Two',
    TEST_WALLETS.contractor2,
    '2000.00000000',
    'BI_WEEKLY'
  );

  return {
    owner,
    operator,
    nonMember,
    org,
    contractors: [contractor1, contractor2],
    tokens: {
      owner: generateTestToken(owner.id, owner.walletAddress),
      operator: generateTestToken(operator.id, operator.walletAddress),
      nonMember: generateTestToken(nonMember.id, nonMember.walletAddress),
    },
  };
}

// =============================================================================
// Assertion Helpers
// =============================================================================

/**
 * Checks if a value is a valid UUID.
 */
export function isValidUUID(value: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(value);
}

/**
 * Checks if a value is a valid Ethereum address.
 */
export function isValidEthereumAddress(value: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(value);
}

/**
 * Checks if a value is a valid ISO date string.
 */
export function isValidISODate(value: string): boolean {
  const date = new Date(value);
  return !isNaN(date.getTime()) && value === date.toISOString();
}
