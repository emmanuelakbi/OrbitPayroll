/**
 * Contractor Service Tests
 *
 * Unit tests for CRUD operations and validation logic.
 * **Feature: 09-testing, Task 2.2: Contractor Service Tests**
 * **Validates: Requirements 2.3**
 *
 * Property-based tests for contractor wallet uniqueness.
 * **Feature: 03-backend, Property 6: Contractor Wallet Uniqueness**
 * **Validates: Requirements 4.9**
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import fc from 'fast-check';
import { db } from '../lib/db.js';
import { 
  createContractor, 
  listContractors, 
  getContractor, 
  updateContractor, 
  archiveContractor 
} from './contractor.service.js';
import type { PayCycle } from '@orbitpayroll/database';

/**
 * Generate valid Ethereum addresses (42 characters, lowercase)
 */
const ethereumAddressArb = fc
  .hexaString({ minLength: 40, maxLength: 40 })
  .map((hex) => `0x${hex.toLowerCase()}`);

/**
 * Generate valid contractor names (alphanumeric to avoid DB issues)
 */
const contractorNameArb = fc
  .stringOf(fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz0123456789 '.split('')), { minLength: 1, maxLength: 50 })
  .filter((s) => s.trim().length > 0);

/**
 * Generate valid rate amounts (use integers to avoid floating point issues)
 */
const rateAmountArb = fc.integer({ min: 1, max: 100000 });

/**
 * Generate valid pay cycles
 */
const payCycleArb = fc.constantFrom<PayCycle>('WEEKLY', 'BI_WEEKLY', 'MONTHLY');

// Test fixtures
let testUserId: string;
let testOrgId: string;
let testOrg2Id: string;

// Use unique wallet prefix to avoid conflicts with other tests
const TEST_WALLET_PREFIX = 'contractor_test_';
const TEST_USER_WALLET = '0x' + TEST_WALLET_PREFIX + 'a'.repeat(40 - TEST_WALLET_PREFIX.length);
const TEST_TREASURY_WALLET_1 = '0x' + TEST_WALLET_PREFIX + 'b'.repeat(40 - TEST_WALLET_PREFIX.length);
const TEST_TREASURY_WALLET_2 = '0x' + TEST_WALLET_PREFIX + 'c'.repeat(40 - TEST_WALLET_PREFIX.length);

beforeAll(async () => {
  // Clean up only test-specific data (not all data)
  const existingUser = await db.user.findUnique({
    where: { walletAddress: TEST_USER_WALLET },
  });

  if (existingUser) {
    // Delete in correct order respecting foreign keys
    await db.contractor.deleteMany({
      where: { org: { ownerId: existingUser.id } },
    });
    await db.orgMember.deleteMany({
      where: { userId: existingUser.id },
    });
    await db.organization.deleteMany({
      where: { ownerId: existingUser.id },
    });
    await db.user.delete({
      where: { id: existingUser.id },
    });
  }

  // Create test user with unique wallet
  const testUser = await db.user.create({
    data: {
      walletAddress: TEST_USER_WALLET,
    },
  });
  testUserId = testUser.id;

  // Create test organization 1
  const testOrg = await db.organization.create({
    data: {
      name: 'Contractor Test Org 1',
      treasuryAddress: TEST_TREASURY_WALLET_1,
      ownerId: testUserId,
      members: {
        create: {
          userId: testUserId,
          role: 'OWNER_ADMIN',
        },
      },
    },
  });
  testOrgId = testOrg.id;

  // Create test organization 2
  const testOrg2 = await db.organization.create({
    data: {
      name: 'Contractor Test Org 2',
      treasuryAddress: TEST_TREASURY_WALLET_2,
      ownerId: testUserId,
      members: {
        create: {
          userId: testUserId,
          role: 'OWNER_ADMIN',
        },
      },
    },
  });
  testOrg2Id = testOrg2.id;
});

afterAll(async () => {
  // Clean up test data in correct order (respect foreign keys)
  try {
    await db.contractor.deleteMany({
      where: { orgId: { in: [testOrgId, testOrg2Id] } },
    });
    await db.orgMember.deleteMany({
      where: { orgId: { in: [testOrgId, testOrg2Id] } },
    });
    await db.organization.deleteMany({
      where: { id: { in: [testOrgId, testOrg2Id] } },
    });
    await db.user.deleteMany({
      where: { walletAddress: TEST_USER_WALLET },
    });
  } catch {
    // Ignore cleanup errors - other tests may have already cleaned up
  }
  await db.$disconnect();
});

describe('Property 6: Contractor Wallet Uniqueness', () => {
  /**
   * Property 6a: Duplicate Wallet Rejection Within Organization
   *
   * *For any* contractor creation or update within an organization,
   * if the wallet address already exists for another active contractor
   * in that org, the request SHALL be rejected.
   *
   * **Validates: Requirements 4.9**
   */
  it('should reject duplicate wallet addresses within the same organization', async () => {
    await fc.assert(
      fc.asyncProperty(
        ethereumAddressArb,
        contractorNameArb,
        contractorNameArb,
        rateAmountArb,
        rateAmountArb,
        payCycleArb,
        payCycleArb,
        async (
          walletAddress,
          name1,
          name2,
          rateAmount1,
          rateAmount2,
          payCycle1,
          payCycle2
        ) => {
          // Clean up before this iteration
          await db.contractor.deleteMany({ where: { orgId: testOrgId } });

          // Create first contractor with the wallet address
          await createContractor(testOrgId, testUserId, {
            name: name1,
            walletAddress,
            rateAmount: rateAmount1,
            rateCurrency: 'MNEE',
            payCycle: payCycle1,
          });

          // Attempt to create second contractor with same wallet in same org
          let duplicateRejected = false;
          try {
            await createContractor(testOrgId, testUserId, {
              name: name2,
              walletAddress,
              rateAmount: rateAmount2,
              rateCurrency: 'MNEE',
              payCycle: payCycle2,
            });
          } catch (error) {
            // Should throw ContractorError.duplicateWallet()
            if (
              error instanceof Error &&
              error.message.includes('wallet address already exists')
            ) {
              duplicateRejected = true;
            }
          }

          return duplicateRejected;
        }
      ),
      { numRuns: 25 }
    );
  }, 60000);

  /**
   * Property 6b: Same Wallet Allowed Across Different Organizations
   *
   * *For any* wallet address, it SHALL be allowed to exist as an active
   * contractor in multiple different organizations.
   *
   * **Validates: Requirements 4.9**
   */
  it('should allow same wallet address in different organizations', async () => {
    await fc.assert(
      fc.asyncProperty(
        ethereumAddressArb,
        contractorNameArb,
        contractorNameArb,
        rateAmountArb,
        rateAmountArb,
        payCycleArb,
        payCycleArb,
        async (
          walletAddress,
          name1,
          name2,
          rateAmount1,
          rateAmount2,
          payCycle1,
          payCycle2
        ) => {
          // Clean up before this iteration
          await db.contractor.deleteMany({
            where: { orgId: { in: [testOrgId, testOrg2Id] } },
          });

          // Create contractor in org 1
          const contractor1 = await createContractor(testOrgId, testUserId, {
            name: name1,
            walletAddress,
            rateAmount: rateAmount1,
            rateCurrency: 'MNEE',
            payCycle: payCycle1,
          });

          // Create contractor with same wallet in org 2 (should succeed)
          let secondCreationSucceeded = false;
          try {
            const contractor2 = await createContractor(testOrg2Id, testUserId, {
              name: name2,
              walletAddress,
              rateAmount: rateAmount2,
              rateCurrency: 'MNEE',
              payCycle: payCycle2,
            });
            secondCreationSucceeded = contractor2.id !== contractor1.id;
          } catch {
            secondCreationSucceeded = false;
          }

          return secondCreationSucceeded;
        }
      ),
      { numRuns: 25 }
    );
  }, 60000);

  /**
   * Property 6c: Archived Contractors Don't Block Wallet Reuse
   *
   * *For any* wallet address with an archived (inactive) contractor,
   * creating a new active contractor with the same wallet SHALL succeed.
   *
   * **Validates: Requirements 4.9**
   */
  it('should allow wallet reuse after contractor is archived', async () => {
    await fc.assert(
      fc.asyncProperty(
        ethereumAddressArb,
        contractorNameArb,
        contractorNameArb,
        rateAmountArb,
        rateAmountArb,
        payCycleArb,
        payCycleArb,
        async (
          walletAddress,
          name1,
          name2,
          rateAmount1,
          rateAmount2,
          payCycle1,
          payCycle2
        ) => {
          // Clean up before this iteration
          await db.contractor.deleteMany({ where: { orgId: testOrgId } });

          // Create first contractor
          const contractor1 = await createContractor(testOrgId, testUserId, {
            name: name1,
            walletAddress,
            rateAmount: rateAmount1,
            rateCurrency: 'MNEE',
            payCycle: payCycle1,
          });

          // Archive the contractor (soft delete)
          await db.contractor.update({
            where: { id: contractor1.id },
            data: { active: false },
          });

          // Create new contractor with same wallet (should succeed)
          let reuseSucceeded = false;
          try {
            const contractor2 = await createContractor(testOrgId, testUserId, {
              name: name2,
              walletAddress,
              rateAmount: rateAmount2,
              rateCurrency: 'MNEE',
              payCycle: payCycle2,
            });
            reuseSucceeded = contractor2.id !== contractor1.id;
          } catch {
            reuseSucceeded = false;
          }

          return reuseSucceeded;
        }
      ),
      { numRuns: 25 }
    );
  }, 60000);

  /**
   * Property 6d: Case Insensitive Wallet Comparison
   *
   * *For any* wallet address, variations in case (uppercase/lowercase)
   * SHALL be treated as the same address and rejected as duplicates.
   *
   * **Validates: Requirements 4.9**
   */
  it('should treat wallet addresses as case-insensitive', async () => {
    await fc.assert(
      fc.asyncProperty(
        ethereumAddressArb,
        contractorNameArb,
        contractorNameArb,
        rateAmountArb,
        rateAmountArb,
        payCycleArb,
        payCycleArb,
        async (
          walletAddress,
          name1,
          name2,
          rateAmount1,
          rateAmount2,
          payCycle1,
          payCycle2
        ) => {
          // Clean up before this iteration
          await db.contractor.deleteMany({ where: { orgId: testOrgId } });

          // Create first contractor with lowercase wallet
          await createContractor(testOrgId, testUserId, {
            name: name1,
            walletAddress: walletAddress.toLowerCase(),
            rateAmount: rateAmount1,
            rateCurrency: 'MNEE',
            payCycle: payCycle1,
          });

          // Attempt to create second contractor with uppercase wallet
          let duplicateRejected = false;
          try {
            await createContractor(testOrgId, testUserId, {
              name: name2,
              walletAddress: walletAddress.toUpperCase(),
              rateAmount: rateAmount2,
              rateCurrency: 'MNEE',
              payCycle: payCycle2,
            });
          } catch (error) {
            if (
              error instanceof Error &&
              error.message.includes('wallet address already exists')
            ) {
              duplicateRejected = true;
            }
          }

          return duplicateRejected;
        }
      ),
      { numRuns: 25 }
    );
  }, 60000);
});

// =============================================================================
// Unit Tests for CRUD Operations
// =============================================================================
describe('Unit Tests: Contractor CRUD Operations', () => {
  // Use unique wallet prefix for unit tests
  const UNIT_TEST_PREFIX = 'unit_test_';
  const UNIT_USER_WALLET = '0x' + UNIT_TEST_PREFIX + 'd'.repeat(40 - UNIT_TEST_PREFIX.length);
  const UNIT_TREASURY_WALLET = '0x' + UNIT_TEST_PREFIX + 'e'.repeat(40 - UNIT_TEST_PREFIX.length);
  
  let unitTestUserId: string;
  let unitTestOrgId: string;

  beforeAll(async () => {
    // Clean up any existing test data
    const existingUser = await db.user.findUnique({
      where: { walletAddress: UNIT_USER_WALLET },
    });

    if (existingUser) {
      await db.contractor.deleteMany({
        where: { org: { ownerId: existingUser.id } },
      });
      await db.orgMember.deleteMany({
        where: { userId: existingUser.id },
      });
      await db.organization.deleteMany({
        where: { ownerId: existingUser.id },
      });
      await db.user.delete({
        where: { id: existingUser.id },
      });
    }

    // Create test user
    const testUser = await db.user.create({
      data: { walletAddress: UNIT_USER_WALLET },
    });
    unitTestUserId = testUser.id;

    // Create test organization
    const testOrg = await db.organization.create({
      data: {
        name: 'Unit Test Org',
        treasuryAddress: UNIT_TREASURY_WALLET,
        ownerId: unitTestUserId,
        members: {
          create: {
            userId: unitTestUserId,
            role: 'OWNER_ADMIN',
          },
        },
      },
    });
    unitTestOrgId = testOrg.id;
  });

  afterAll(async () => {
    try {
      await db.contractor.deleteMany({ where: { orgId: unitTestOrgId } });
      await db.orgMember.deleteMany({ where: { orgId: unitTestOrgId } });
      await db.organization.deleteMany({ where: { id: unitTestOrgId } });
      await db.user.deleteMany({ where: { walletAddress: UNIT_USER_WALLET } });
    } catch {
      // Ignore cleanup errors
    }
  });

  beforeEach(async () => {
    // Clean up contractors before each test
    await db.contractor.deleteMany({ where: { orgId: unitTestOrgId } });
  });

  describe('createContractor', () => {
    it('should create a contractor with valid data', async () => {
      const contractorData = {
        name: 'Test Contractor',
        walletAddress: '0x1234567890123456789012345678901234567890',
        rateAmount: 1000,
        rateCurrency: 'MNEE',
        payCycle: 'MONTHLY' as PayCycle,
      };

      const result = await createContractor(unitTestOrgId, unitTestUserId, contractorData);

      expect(result.id).toBeDefined();
      expect(result.name).toBe(contractorData.name);
      expect(result.walletAddress).toBe(contractorData.walletAddress.toLowerCase());
      expect(result.rateAmount).toBe('1000');
      expect(result.rateCurrency).toBe('MNEE');
      expect(result.payCycle).toBe('MONTHLY');
      expect(result.active).toBe(true);
    });

    it('should normalize wallet address to lowercase', async () => {
      const contractorData = {
        name: 'Test Contractor',
        walletAddress: '0xABCDEF1234567890ABCDEF1234567890ABCDEF12',
        rateAmount: 500,
        rateCurrency: 'MNEE',
        payCycle: 'WEEKLY' as PayCycle,
      };

      const result = await createContractor(unitTestOrgId, unitTestUserId, contractorData);

      expect(result.walletAddress).toBe(contractorData.walletAddress.toLowerCase());
    });

    it('should throw error for non-existent organization', async () => {
      const contractorData = {
        name: 'Test Contractor',
        walletAddress: '0x1234567890123456789012345678901234567890',
        rateAmount: 1000,
        rateCurrency: 'MNEE',
        payCycle: 'MONTHLY' as PayCycle,
      };

      await expect(
        createContractor('non-existent-org-id', unitTestUserId, contractorData)
      ).rejects.toThrow();
    });

    it('should throw error for non-member user', async () => {
      // Create a non-member user
      const nonMemberUser = await db.user.create({
        data: { walletAddress: '0x' + 'f'.repeat(40) },
      });

      const contractorData = {
        name: 'Test Contractor',
        walletAddress: '0x1234567890123456789012345678901234567890',
        rateAmount: 1000,
        rateCurrency: 'MNEE',
        payCycle: 'MONTHLY' as PayCycle,
      };

      await expect(
        createContractor(unitTestOrgId, nonMemberUser.id, contractorData)
      ).rejects.toThrow();

      // Cleanup
      await db.user.delete({ where: { id: nonMemberUser.id } });
    });
  });

  describe('listContractors', () => {
    it('should return paginated list of contractors', async () => {
      // Create multiple contractors
      for (let i = 0; i < 5; i++) {
        await createContractor(unitTestOrgId, unitTestUserId, {
          name: `Contractor ${i}`,
          walletAddress: `0x${i.toString().padStart(40, '0')}`,
          rateAmount: 1000 + i * 100,
          rateCurrency: 'MNEE',
          payCycle: 'MONTHLY',
        });
      }

      const result = await listContractors(unitTestOrgId, unitTestUserId, {
        page: 1,
        limit: 3,
      });

      expect(result.data).toHaveLength(3);
      expect(result.meta.page).toBe(1);
      expect(result.meta.limit).toBe(3);
      expect(result.meta.total).toBe(5);
      expect(result.meta.totalPages).toBe(2);
    });

    it('should filter by active status', async () => {
      // Create active and inactive contractors
      const activeContractor = await createContractor(unitTestOrgId, unitTestUserId, {
        name: 'Active Contractor',
        walletAddress: '0x1111111111111111111111111111111111111111',
        rateAmount: 1000,
        rateCurrency: 'MNEE',
        payCycle: 'MONTHLY',
      });

      const inactiveContractor = await createContractor(unitTestOrgId, unitTestUserId, {
        name: 'Inactive Contractor',
        walletAddress: '0x2222222222222222222222222222222222222222',
        rateAmount: 2000,
        rateCurrency: 'MNEE',
        payCycle: 'MONTHLY',
      });

      // Archive the inactive contractor
      await db.contractor.update({
        where: { id: inactiveContractor.id },
        data: { active: false },
      });

      const activeResult = await listContractors(unitTestOrgId, unitTestUserId, {
        page: 1,
        limit: 10,
        active: true,
      });

      expect(activeResult.data).toHaveLength(1);
      expect(activeResult.data[0].id).toBe(activeContractor.id);
    });

    it('should search by name', async () => {
      await createContractor(unitTestOrgId, unitTestUserId, {
        name: 'Alice Developer',
        walletAddress: '0x1111111111111111111111111111111111111111',
        rateAmount: 1000,
        rateCurrency: 'MNEE',
        payCycle: 'MONTHLY',
      });

      await createContractor(unitTestOrgId, unitTestUserId, {
        name: 'Bob Designer',
        walletAddress: '0x2222222222222222222222222222222222222222',
        rateAmount: 2000,
        rateCurrency: 'MNEE',
        payCycle: 'MONTHLY',
      });

      const result = await listContractors(unitTestOrgId, unitTestUserId, {
        page: 1,
        limit: 10,
        search: 'Alice',
      });

      expect(result.data).toHaveLength(1);
      expect(result.data[0].name).toBe('Alice Developer');
    });
  });

  describe('getContractor', () => {
    it('should return a contractor by ID', async () => {
      const created = await createContractor(unitTestOrgId, unitTestUserId, {
        name: 'Test Contractor',
        walletAddress: '0x1234567890123456789012345678901234567890',
        rateAmount: 1000,
        rateCurrency: 'MNEE',
        payCycle: 'MONTHLY',
      });

      const result = await getContractor(unitTestOrgId, created.id, unitTestUserId);

      expect(result.id).toBe(created.id);
      expect(result.name).toBe('Test Contractor');
    });

    it('should throw error for non-existent contractor', async () => {
      await expect(
        getContractor(unitTestOrgId, 'non-existent-id', unitTestUserId)
      ).rejects.toThrow();
    });
  });

  describe('updateContractor', () => {
    it('should update contractor name', async () => {
      const created = await createContractor(unitTestOrgId, unitTestUserId, {
        name: 'Original Name',
        walletAddress: '0x1234567890123456789012345678901234567890',
        rateAmount: 1000,
        rateCurrency: 'MNEE',
        payCycle: 'MONTHLY',
      });

      const result = await updateContractor(unitTestOrgId, created.id, unitTestUserId, {
        name: 'Updated Name',
      });

      expect(result.name).toBe('Updated Name');
      expect(result.walletAddress).toBe(created.walletAddress);
    });

    it('should update contractor rate', async () => {
      const created = await createContractor(unitTestOrgId, unitTestUserId, {
        name: 'Test Contractor',
        walletAddress: '0x1234567890123456789012345678901234567890',
        rateAmount: 1000,
        rateCurrency: 'MNEE',
        payCycle: 'MONTHLY',
      });

      const result = await updateContractor(unitTestOrgId, created.id, unitTestUserId, {
        rateAmount: 2000,
      });

      expect(result.rateAmount).toBe('2000');
    });

    it('should update contractor pay cycle', async () => {
      const created = await createContractor(unitTestOrgId, unitTestUserId, {
        name: 'Test Contractor',
        walletAddress: '0x1234567890123456789012345678901234567890',
        rateAmount: 1000,
        rateCurrency: 'MNEE',
        payCycle: 'MONTHLY',
      });

      const result = await updateContractor(unitTestOrgId, created.id, unitTestUserId, {
        payCycle: 'WEEKLY',
      });

      expect(result.payCycle).toBe('WEEKLY');
    });

    it('should throw error for non-existent contractor', async () => {
      await expect(
        updateContractor(unitTestOrgId, 'non-existent-id', unitTestUserId, { name: 'New Name' })
      ).rejects.toThrow();
    });
  });

  describe('archiveContractor', () => {
    it('should archive (soft delete) a contractor', async () => {
      const created = await createContractor(unitTestOrgId, unitTestUserId, {
        name: 'Test Contractor',
        walletAddress: '0x1234567890123456789012345678901234567890',
        rateAmount: 1000,
        rateCurrency: 'MNEE',
        payCycle: 'MONTHLY',
      });

      await archiveContractor(unitTestOrgId, created.id, unitTestUserId);

      // Verify contractor is archived
      const archived = await db.contractor.findUnique({ where: { id: created.id } });
      expect(archived?.active).toBe(false);
    });

    it('should throw error for non-existent contractor', async () => {
      await expect(
        archiveContractor(unitTestOrgId, 'non-existent-id', unitTestUserId)
      ).rejects.toThrow();
    });
  });
});

// =============================================================================
// Unit Tests for Validation Logic
// =============================================================================
describe('Unit Tests: Contractor Validation', () => {
  const VALIDATION_PREFIX = 'validation_';
  const VALIDATION_USER_WALLET = '0x' + VALIDATION_PREFIX + 'a'.repeat(40 - VALIDATION_PREFIX.length);
  const VALIDATION_TREASURY_WALLET = '0x' + VALIDATION_PREFIX + 'b'.repeat(40 - VALIDATION_PREFIX.length);
  
  let validationUserId: string;
  let validationOrgId: string;

  beforeAll(async () => {
    // Clean up any existing test data
    const existingUser = await db.user.findUnique({
      where: { walletAddress: VALIDATION_USER_WALLET },
    });

    if (existingUser) {
      await db.contractor.deleteMany({
        where: { org: { ownerId: existingUser.id } },
      });
      await db.orgMember.deleteMany({
        where: { userId: existingUser.id },
      });
      await db.organization.deleteMany({
        where: { ownerId: existingUser.id },
      });
      await db.user.delete({
        where: { id: existingUser.id },
      });
    }

    // Create test user
    const testUser = await db.user.create({
      data: { walletAddress: VALIDATION_USER_WALLET },
    });
    validationUserId = testUser.id;

    // Create test organization
    const testOrg = await db.organization.create({
      data: {
        name: 'Validation Test Org',
        treasuryAddress: VALIDATION_TREASURY_WALLET,
        ownerId: validationUserId,
        members: {
          create: {
            userId: validationUserId,
            role: 'OWNER_ADMIN',
          },
        },
      },
    });
    validationOrgId = testOrg.id;
  });

  afterAll(async () => {
    try {
      await db.contractor.deleteMany({ where: { orgId: validationOrgId } });
      await db.orgMember.deleteMany({ where: { orgId: validationOrgId } });
      await db.organization.deleteMany({ where: { id: validationOrgId } });
      await db.user.deleteMany({ where: { walletAddress: VALIDATION_USER_WALLET } });
    } catch {
      // Ignore cleanup errors
    }
  });

  beforeEach(async () => {
    await db.contractor.deleteMany({ where: { orgId: validationOrgId } });
  });

  it('should reject duplicate wallet address in same org', async () => {
    const walletAddress = '0x1234567890123456789012345678901234567890';

    await createContractor(validationOrgId, validationUserId, {
      name: 'First Contractor',
      walletAddress,
      rateAmount: 1000,
      rateCurrency: 'MNEE',
      payCycle: 'MONTHLY',
    });

    await expect(
      createContractor(validationOrgId, validationUserId, {
        name: 'Second Contractor',
        walletAddress,
        rateAmount: 2000,
        rateCurrency: 'MNEE',
        payCycle: 'MONTHLY',
      })
    ).rejects.toThrow('wallet address already exists');
  });

  it('should reject update to duplicate wallet address', async () => {
    const contractor1 = await createContractor(validationOrgId, validationUserId, {
      name: 'Contractor 1',
      walletAddress: '0x1111111111111111111111111111111111111111',
      rateAmount: 1000,
      rateCurrency: 'MNEE',
      payCycle: 'MONTHLY',
    });

    const contractor2 = await createContractor(validationOrgId, validationUserId, {
      name: 'Contractor 2',
      walletAddress: '0x2222222222222222222222222222222222222222',
      rateAmount: 2000,
      rateCurrency: 'MNEE',
      payCycle: 'MONTHLY',
    });

    // Try to update contractor2's wallet to contractor1's wallet
    await expect(
      updateContractor(validationOrgId, contractor2.id, validationUserId, {
        walletAddress: '0x1111111111111111111111111111111111111111',
      })
    ).rejects.toThrow('wallet address already exists');
  });

  it('should allow updating to same wallet address (no change)', async () => {
    const contractor = await createContractor(validationOrgId, validationUserId, {
      name: 'Test Contractor',
      walletAddress: '0x1234567890123456789012345678901234567890',
      rateAmount: 1000,
      rateCurrency: 'MNEE',
      payCycle: 'MONTHLY',
    });

    // Update with same wallet address should succeed
    const result = await updateContractor(validationOrgId, contractor.id, validationUserId, {
      walletAddress: '0x1234567890123456789012345678901234567890',
      name: 'Updated Name',
    });

    expect(result.name).toBe('Updated Name');
  });

  it('should store rate amount with correct precision', async () => {
    const contractor = await createContractor(validationOrgId, validationUserId, {
      name: 'Test Contractor',
      walletAddress: '0x1234567890123456789012345678901234567890',
      rateAmount: 1234.56789,
      rateCurrency: 'MNEE',
      payCycle: 'MONTHLY',
    });

    // Rate should be stored with precision
    expect(contractor.rateAmount).toBe('1234.56789');
  });

  it('should return ISO date strings for timestamps', async () => {
    const contractor = await createContractor(validationOrgId, validationUserId, {
      name: 'Test Contractor',
      walletAddress: '0x1234567890123456789012345678901234567890',
      rateAmount: 1000,
      rateCurrency: 'MNEE',
      payCycle: 'MONTHLY',
    });

    // Verify ISO date format
    expect(new Date(contractor.createdAt).toISOString()).toBe(contractor.createdAt);
    expect(new Date(contractor.updatedAt).toISOString()).toBe(contractor.updatedAt);
  });
});
