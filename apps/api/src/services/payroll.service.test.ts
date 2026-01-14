/**
 * Payroll Service Tests
 *
 * Unit tests for preview calculation and run creation.
 * **Feature: 09-testing, Task 2.3: Payroll Service Tests**
 * **Validates: Requirements 2.3**
 *
 * Property-based tests for payroll preview calculation.
 * **Feature: 03-backend, Property 8: Payroll Preview Calculation**
 * **Validates: Requirements 5.1, 5.2, 5.3**
 */

import { describe, it, beforeAll, afterAll, beforeEach, expect } from 'vitest';
import fc from 'fast-check';
import { db } from '../lib/db.js';
import { previewPayroll, createPayrollRun, listPayrollRuns, getPayrollRun } from './payroll.service.js';
import { Decimal } from '@prisma/client/runtime/library';
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
  .stringOf(fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz0123456789 '.split('')), {
    minLength: 1,
    maxLength: 50,
  })
  .filter((s) => s.trim().length > 0);

/**
 * Generate valid rate amounts as strings
 * Database has precision 18, scale 8, so max integer part is 10^10 - 1
 * Using values up to 9,999,999,999 (10 digits) to stay within bounds
 */
const rateAmountArb = fc.integer({ min: 1, max: 9999999999 }).map((n) => n.toString());

/**
 * Generate valid pay cycles
 */
const payCycleArb = fc.constantFrom<PayCycle>('WEEKLY', 'BI_WEEKLY', 'MONTHLY');

/**
 * Generate a contractor data object
 */
const contractorDataArb = fc.record({
  name: contractorNameArb,
  walletAddress: ethereumAddressArb,
  rateAmount: rateAmountArb,
  payCycle: payCycleArb,
});

// Test fixtures
let testUserId: string;
let testOrgId: string;

// Use unique wallet prefix to avoid conflicts with other tests
const TEST_WALLET_PREFIX = 'payroll_test_';
const TEST_USER_WALLET = '0x' + TEST_WALLET_PREFIX + 'a'.repeat(40 - TEST_WALLET_PREFIX.length);
const TEST_TREASURY_WALLET = '0x' + TEST_WALLET_PREFIX + 'b'.repeat(40 - TEST_WALLET_PREFIX.length);

beforeAll(async () => {
  // Clean up only test-specific data (not all data)
  // First find and delete any existing test user's data
  const existingUser = await db.user.findUnique({
    where: { walletAddress: TEST_USER_WALLET },
  });

  if (existingUser) {
    // Delete in correct order respecting foreign keys
    await db.payrollItem.deleteMany({
      where: { payrollRun: { org: { ownerId: existingUser.id } } },
    });
    await db.payrollRun.deleteMany({
      where: { org: { ownerId: existingUser.id } },
    });
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

  // Create test organization
  const testOrg = await db.organization.create({
    data: {
      name: 'Payroll Test Org',
      treasuryAddress: TEST_TREASURY_WALLET,
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
});

afterAll(async () => {
  // Clean up test data in correct order (respect foreign keys)
  try {
    await db.payrollItem.deleteMany({
      where: { payrollRun: { orgId: testOrgId } },
    });
    await db.payrollRun.deleteMany({
      where: { orgId: testOrgId },
    });
    await db.contractor.deleteMany({
      where: { orgId: testOrgId },
    });
    await db.orgMember.deleteMany({
      where: { orgId: testOrgId },
    });
    await db.organization.deleteMany({
      where: { id: testOrgId },
    });
    await db.user.deleteMany({
      where: { walletAddress: TEST_USER_WALLET },
    });
  } catch {
    // Ignore cleanup errors
  }
  await db.$disconnect();
});

describe('Property 8: Payroll Preview Calculation', () => {
  /**
   * Property 8a: Total Equals Sum of Individual Amounts
   *
   * *For any* payroll preview request, the totalMnee SHALL equal
   * the sum of all individual contractor amounts.
   *
   * **Validates: Requirements 5.1, 5.2, 5.3**
   */
  it('should calculate totalMnee as sum of all contractor amounts', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(contractorDataArb, { minLength: 0, maxLength: 20 }),
        async (contractorsData) => {
          // Clean up contractors before this iteration
          await db.contractor.deleteMany({ where: { orgId: testOrgId } });

          // Create contractors with unique wallet addresses
          const usedWallets = new Set<string>();
          for (const data of contractorsData) {
            // Skip if wallet already used in this iteration
            if (usedWallets.has(data.walletAddress)) continue;
            usedWallets.add(data.walletAddress);

            await db.contractor.create({
              data: {
                orgId: testOrgId,
                name: data.name,
                walletAddress: data.walletAddress,
                rateAmount: new Decimal(data.rateAmount),
                rateCurrency: 'MNEE',
                payCycle: data.payCycle,
                active: true,
              },
            });
          }

          // Get preview
          const preview = await previewPayroll(testOrgId, testUserId);

          // Calculate expected sum from preview contractors
          const expectedSum = preview.contractors.reduce(
            (sum, c) => sum.plus(new Decimal(c.amount)),
            new Decimal(0)
          );

          // totalMnee should equal the sum
          return new Decimal(preview.totalMnee).equals(expectedSum);
        }
      ),
      { numRuns: 100 }
    );
  }, 120000);

  /**
   * Property 8b: Empty Preview Returns Zero Total
   *
   * *For any* organization with no active contractors,
   * the preview SHALL return zero total and empty contractors array.
   *
   * **Validates: Requirements 5.5**
   */
  it('should return zero total when no active contractors exist', async () => {
    // Clean up all contractors
    await db.contractor.deleteMany({ where: { orgId: testOrgId } });

    const preview = await previewPayroll(testOrgId, testUserId);

    expect(preview.contractors).toHaveLength(0);
    expect(preview.totalMnee).toBe('0');
  });

  /**
   * Property 8c: Archived Contractors Excluded
   *
   * *For any* set of contractors where some are archived,
   * the preview SHALL only include active contractors.
   *
   * **Validates: Requirements 5.4**
   */
  it('should exclude archived contractors from preview', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(contractorDataArb, { minLength: 1, maxLength: 10 }),
        fc.array(contractorDataArb, { minLength: 1, maxLength: 10 }),
        async (activeContractors, archivedContractors) => {
          // Clean up contractors before this iteration
          await db.contractor.deleteMany({ where: { orgId: testOrgId } });

          const usedWallets = new Set<string>();

          // Create active contractors
          for (const data of activeContractors) {
            if (usedWallets.has(data.walletAddress)) continue;
            usedWallets.add(data.walletAddress);

            await db.contractor.create({
              data: {
                orgId: testOrgId,
                name: data.name,
                walletAddress: data.walletAddress,
                rateAmount: new Decimal(data.rateAmount),
                rateCurrency: 'MNEE',
                payCycle: data.payCycle,
                active: true,
              },
            });
          }

          const activeCount = usedWallets.size;

          // Create archived contractors
          for (const data of archivedContractors) {
            if (usedWallets.has(data.walletAddress)) continue;
            usedWallets.add(data.walletAddress);

            await db.contractor.create({
              data: {
                orgId: testOrgId,
                name: data.name,
                walletAddress: data.walletAddress,
                rateAmount: new Decimal(data.rateAmount),
                rateCurrency: 'MNEE',
                payCycle: data.payCycle,
                active: false,
              },
            });
          }

          // Get preview
          const preview = await previewPayroll(testOrgId, testUserId);

          // Preview should only contain active contractors
          return preview.contractors.length === activeCount;
        }
      ),
      { numRuns: 50 }
    );
  }, 120000);

  /**
   * Property 8d: isSufficient Correctness
   *
   * *For any* payroll preview, isSufficient SHALL correctly reflect
   * whether treasuryBalance >= totalMnee.
   *
   * Note: Since treasury balance is currently hardcoded to 0,
   * isSufficient should be true only when totalMnee is 0.
   *
   * **Validates: Requirements 5.3**
   */
  it('should correctly calculate isSufficient based on treasury balance', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(contractorDataArb, { minLength: 0, maxLength: 10 }),
        async (contractorsData) => {
          // Clean up contractors before this iteration
          await db.contractor.deleteMany({ where: { orgId: testOrgId } });

          const usedWallets = new Set<string>();
          for (const data of contractorsData) {
            if (usedWallets.has(data.walletAddress)) continue;
            usedWallets.add(data.walletAddress);

            await db.contractor.create({
              data: {
                orgId: testOrgId,
                name: data.name,
                walletAddress: data.walletAddress,
                rateAmount: new Decimal(data.rateAmount),
                rateCurrency: 'MNEE',
                payCycle: data.payCycle,
                active: true,
              },
            });
          }

          const preview = await previewPayroll(testOrgId, testUserId);

          const totalMnee = new Decimal(preview.totalMnee);
          const treasuryBalance = new Decimal(preview.treasuryBalance);

          // isSufficient should be true when treasuryBalance >= totalMnee
          const expectedSufficient = treasuryBalance.greaterThanOrEqualTo(totalMnee);

          return preview.isSufficient === expectedSufficient;
        }
      ),
      { numRuns: 50 }
    );
  }, 120000);

  /**
   * Property 8e: Deficit Calculation Correctness
   *
   * *For any* payroll preview, deficit SHALL equal max(0, totalMnee - treasuryBalance).
   *
   * **Validates: Requirements 5.3**
   */
  it('should correctly calculate deficit', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(contractorDataArb, { minLength: 0, maxLength: 10 }),
        async (contractorsData) => {
          // Clean up contractors before this iteration
          await db.contractor.deleteMany({ where: { orgId: testOrgId } });

          const usedWallets = new Set<string>();
          for (const data of contractorsData) {
            if (usedWallets.has(data.walletAddress)) continue;
            usedWallets.add(data.walletAddress);

            await db.contractor.create({
              data: {
                orgId: testOrgId,
                name: data.name,
                walletAddress: data.walletAddress,
                rateAmount: new Decimal(data.rateAmount),
                rateCurrency: 'MNEE',
                payCycle: data.payCycle,
                active: true,
              },
            });
          }

          const preview = await previewPayroll(testOrgId, testUserId);

          const totalMnee = new Decimal(preview.totalMnee);
          const treasuryBalance = new Decimal(preview.treasuryBalance);
          const deficit = new Decimal(preview.deficit);

          // Expected deficit is max(0, totalMnee - treasuryBalance)
          const expectedDeficit = totalMnee.greaterThan(treasuryBalance)
            ? totalMnee.minus(treasuryBalance)
            : new Decimal(0);

          return deficit.equals(expectedDeficit);
        }
      ),
      { numRuns: 50 }
    );
  }, 120000);

  /**
   * Property 8f: Preview Contains Contractor Details
   *
   * *For any* active contractor, the preview SHALL include
   * their id, name, walletAddress, and amount.
   *
   * **Validates: Requirements 5.6**
   */
  it('should include contractor details in preview', async () => {
    await fc.assert(
      fc.asyncProperty(contractorDataArb, async (data) => {
        // Clean up contractors before this iteration
        await db.contractor.deleteMany({ where: { orgId: testOrgId } });

        // Create a single contractor
        const contractor = await db.contractor.create({
          data: {
            orgId: testOrgId,
            name: data.name,
            walletAddress: data.walletAddress,
            rateAmount: new Decimal(data.rateAmount),
            rateCurrency: 'MNEE',
            payCycle: data.payCycle,
            active: true,
          },
        });

        const preview = await previewPayroll(testOrgId, testUserId);

        // Should have exactly one contractor
        if (preview.contractors.length !== 1) return false;

        const previewContractor = preview.contractors[0]!;

        // Verify all required fields are present and correct
        return (
          previewContractor.id === contractor.id &&
          previewContractor.name === contractor.name &&
          previewContractor.walletAddress === contractor.walletAddress &&
          previewContractor.amount === contractor.rateAmount.toString()
        );
      }),
      { numRuns: 50 }
    );
  }, 120000);
});

// =============================================================================
// Unit Tests for Preview Calculation
// =============================================================================
describe('Unit Tests: Payroll Preview Calculation', () => {
  const PREVIEW_PREFIX = 'preview_unit_';
  const PREVIEW_USER_WALLET = '0x' + PREVIEW_PREFIX + 'a'.repeat(40 - PREVIEW_PREFIX.length);
  const PREVIEW_TREASURY_WALLET = '0x' + PREVIEW_PREFIX + 'b'.repeat(40 - PREVIEW_PREFIX.length);
  
  let previewUserId: string;
  let previewOrgId: string;

  beforeAll(async () => {
    // Clean up any existing test data
    const existingUser = await db.user.findUnique({
      where: { walletAddress: PREVIEW_USER_WALLET },
    });

    if (existingUser) {
      await db.payrollItem.deleteMany({
        where: { payrollRun: { org: { ownerId: existingUser.id } } },
      });
      await db.payrollRun.deleteMany({
        where: { org: { ownerId: existingUser.id } },
      });
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
      data: { walletAddress: PREVIEW_USER_WALLET },
    });
    previewUserId = testUser.id;

    // Create test organization
    const testOrg = await db.organization.create({
      data: {
        name: 'Preview Unit Test Org',
        treasuryAddress: PREVIEW_TREASURY_WALLET,
        ownerId: previewUserId,
        members: {
          create: {
            userId: previewUserId,
            role: 'OWNER_ADMIN',
          },
        },
      },
    });
    previewOrgId = testOrg.id;
  });

  afterAll(async () => {
    try {
      await db.payrollItem.deleteMany({
        where: { payrollRun: { orgId: previewOrgId } },
      });
      await db.payrollRun.deleteMany({ where: { orgId: previewOrgId } });
      await db.contractor.deleteMany({ where: { orgId: previewOrgId } });
      await db.orgMember.deleteMany({ where: { orgId: previewOrgId } });
      await db.organization.deleteMany({ where: { id: previewOrgId } });
      await db.user.deleteMany({ where: { walletAddress: PREVIEW_USER_WALLET } });
    } catch {
      // Ignore cleanup errors
    }
  });

  beforeEach(async () => {
    await db.contractor.deleteMany({ where: { orgId: previewOrgId } });
  });

  it('should return preview with correct structure', async () => {
    // Create a contractor
    await db.contractor.create({
      data: {
        orgId: previewOrgId,
        name: 'Test Contractor',
        walletAddress: '0x1234567890123456789012345678901234567890',
        rateAmount: new Decimal('1000'),
        rateCurrency: 'MNEE',
        payCycle: 'MONTHLY',
        active: true,
      },
    });

    const preview = await previewPayroll(previewOrgId, previewUserId);

    expect(preview).toHaveProperty('contractors');
    expect(preview).toHaveProperty('totalMnee');
    expect(preview).toHaveProperty('treasuryBalance');
    expect(preview).toHaveProperty('isSufficient');
    expect(preview).toHaveProperty('deficit');
  });

  it('should calculate total from multiple contractors', async () => {
    // Create multiple contractors
    await db.contractor.create({
      data: {
        orgId: previewOrgId,
        name: 'Contractor 1',
        walletAddress: '0x1111111111111111111111111111111111111111',
        rateAmount: new Decimal('1000'),
        rateCurrency: 'MNEE',
        payCycle: 'MONTHLY',
        active: true,
      },
    });

    await db.contractor.create({
      data: {
        orgId: previewOrgId,
        name: 'Contractor 2',
        walletAddress: '0x2222222222222222222222222222222222222222',
        rateAmount: new Decimal('2500'),
        rateCurrency: 'MNEE',
        payCycle: 'MONTHLY',
        active: true,
      },
    });

    await db.contractor.create({
      data: {
        orgId: previewOrgId,
        name: 'Contractor 3',
        walletAddress: '0x3333333333333333333333333333333333333333',
        rateAmount: new Decimal('1500'),
        rateCurrency: 'MNEE',
        payCycle: 'MONTHLY',
        active: true,
      },
    });

    const preview = await previewPayroll(previewOrgId, previewUserId);

    expect(preview.contractors).toHaveLength(3);
    expect(preview.totalMnee).toBe('5000'); // 1000 + 2500 + 1500
  });

  it('should sort contractors by name', async () => {
    await db.contractor.create({
      data: {
        orgId: previewOrgId,
        name: 'Charlie',
        walletAddress: '0x1111111111111111111111111111111111111111',
        rateAmount: new Decimal('1000'),
        rateCurrency: 'MNEE',
        payCycle: 'MONTHLY',
        active: true,
      },
    });

    await db.contractor.create({
      data: {
        orgId: previewOrgId,
        name: 'Alice',
        walletAddress: '0x2222222222222222222222222222222222222222',
        rateAmount: new Decimal('2000'),
        rateCurrency: 'MNEE',
        payCycle: 'MONTHLY',
        active: true,
      },
    });

    await db.contractor.create({
      data: {
        orgId: previewOrgId,
        name: 'Bob',
        walletAddress: '0x3333333333333333333333333333333333333333',
        rateAmount: new Decimal('1500'),
        rateCurrency: 'MNEE',
        payCycle: 'MONTHLY',
        active: true,
      },
    });

    const preview = await previewPayroll(previewOrgId, previewUserId);

    expect(preview.contractors[0]?.name).toBe('Alice');
    expect(preview.contractors[1]?.name).toBe('Bob');
    expect(preview.contractors[2]?.name).toBe('Charlie');
  });

  it('should throw error for non-existent organization', async () => {
    await expect(
      previewPayroll('non-existent-org-id', previewUserId)
    ).rejects.toThrow();
  });

  it('should throw error for non-member user', async () => {
    // Create a non-member user
    const nonMemberUser = await db.user.create({
      data: { walletAddress: '0x' + 'f'.repeat(40) },
    });

    await expect(
      previewPayroll(previewOrgId, nonMemberUser.id)
    ).rejects.toThrow();

    // Cleanup
    await db.user.delete({ where: { id: nonMemberUser.id } });
  });
});

// =============================================================================
// Unit Tests for Payroll Run Creation
// =============================================================================
describe('Unit Tests: Payroll Run Creation', () => {
  const RUN_PREFIX = 'run_unit_';
  const RUN_USER_WALLET = '0x' + RUN_PREFIX + 'a'.repeat(40 - RUN_PREFIX.length);
  const RUN_TREASURY_WALLET = '0x' + RUN_PREFIX + 'b'.repeat(40 - RUN_PREFIX.length);
  
  let runUserId: string;
  let runOrgId: string;
  let contractorId: string;

  beforeAll(async () => {
    // Clean up any existing test data
    const existingUser = await db.user.findUnique({
      where: { walletAddress: RUN_USER_WALLET },
    });

    if (existingUser) {
      await db.payrollItem.deleteMany({
        where: { payrollRun: { org: { ownerId: existingUser.id } } },
      });
      await db.payrollRun.deleteMany({
        where: { org: { ownerId: existingUser.id } },
      });
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
      data: { walletAddress: RUN_USER_WALLET },
    });
    runUserId = testUser.id;

    // Create test organization
    const testOrg = await db.organization.create({
      data: {
        name: 'Run Unit Test Org',
        treasuryAddress: RUN_TREASURY_WALLET,
        ownerId: runUserId,
        members: {
          create: {
            userId: runUserId,
            role: 'OWNER_ADMIN',
          },
        },
      },
    });
    runOrgId = testOrg.id;

    // Create a contractor for payroll runs
    const contractor = await db.contractor.create({
      data: {
        orgId: runOrgId,
        name: 'Test Contractor',
        walletAddress: '0x1234567890123456789012345678901234567890',
        rateAmount: new Decimal('1000'),
        rateCurrency: 'MNEE',
        payCycle: 'MONTHLY',
        active: true,
      },
    });
    contractorId = contractor.id;
  });

  afterAll(async () => {
    try {
      await db.payrollItem.deleteMany({
        where: { payrollRun: { orgId: runOrgId } },
      });
      await db.payrollRun.deleteMany({ where: { orgId: runOrgId } });
      await db.contractor.deleteMany({ where: { orgId: runOrgId } });
      await db.orgMember.deleteMany({ where: { orgId: runOrgId } });
      await db.organization.deleteMany({ where: { id: runOrgId } });
      await db.user.deleteMany({ where: { walletAddress: RUN_USER_WALLET } });
    } catch {
      // Ignore cleanup errors
    }
  });

  beforeEach(async () => {
    // Clean up payroll runs before each test
    await db.payrollItem.deleteMany({
      where: { payrollRun: { orgId: runOrgId } },
    });
    await db.payrollRun.deleteMany({ where: { orgId: runOrgId } });
  });

  it('should create a payroll run with valid data', async () => {
    const txHash = '0x' + 'a'.repeat(64);
    const result = await createPayrollRun(runOrgId, runUserId, {
      txHash,
      items: [
        { contractorId, amountMnee: '1000' },
      ],
      runLabel: 'January 2026 Payroll',
    });

    expect(result.id).toBeDefined();
    expect(result.txHash).toBe(txHash);
    expect(result.runLabel).toBe('January 2026 Payroll');
    expect(result.totalMnee).toBe('1000');
    expect(result.contractorCount).toBe(1);
    expect(result.status).toBe('EXECUTED');
    expect(result.executedAt).toBeDefined();
  });

  it('should calculate total from multiple items', async () => {
    // Create additional contractors
    const contractor2 = await db.contractor.create({
      data: {
        orgId: runOrgId,
        name: 'Contractor 2',
        walletAddress: '0x2222222222222222222222222222222222222222',
        rateAmount: new Decimal('2000'),
        rateCurrency: 'MNEE',
        payCycle: 'MONTHLY',
        active: true,
      },
    });

    const txHash = '0x' + 'b'.repeat(64);
    const result = await createPayrollRun(runOrgId, runUserId, {
      txHash,
      items: [
        { contractorId, amountMnee: '1000' },
        { contractorId: contractor2.id, amountMnee: '2500' },
      ],
    });

    expect(result.totalMnee).toBe('3500'); // 1000 + 2500
    expect(result.contractorCount).toBe(2);
  });

  it('should create payroll run without label', async () => {
    const txHash = '0x' + 'c'.repeat(64);
    const result = await createPayrollRun(runOrgId, runUserId, {
      txHash,
      items: [
        { contractorId, amountMnee: '1000' },
      ],
    });

    expect(result.runLabel).toBeNull();
  });

  it('should throw error for non-existent organization', async () => {
    await expect(
      createPayrollRun('non-existent-org-id', runUserId, {
        txHash: '0x' + 'd'.repeat(64),
        items: [{ contractorId, amountMnee: '1000' }],
      })
    ).rejects.toThrow();
  });

  it('should return ISO date strings for timestamps', async () => {
    const txHash = '0x' + 'e'.repeat(64);
    const result = await createPayrollRun(runOrgId, runUserId, {
      txHash,
      items: [{ contractorId, amountMnee: '1000' }],
    });

    expect(new Date(result.createdAt).toISOString()).toBe(result.createdAt);
    expect(new Date(result.executedAt!).toISOString()).toBe(result.executedAt);
  });
});

// =============================================================================
// Unit Tests for Payroll Run Listing and Retrieval
// =============================================================================
describe('Unit Tests: Payroll Run Listing', () => {
  const LIST_PREFIX = 'list_unit_';
  const LIST_USER_WALLET = '0x' + LIST_PREFIX + 'a'.repeat(40 - LIST_PREFIX.length);
  const LIST_TREASURY_WALLET = '0x' + LIST_PREFIX + 'b'.repeat(40 - LIST_PREFIX.length);
  
  let listUserId: string;
  let listOrgId: string;
  let listContractorId: string;

  beforeAll(async () => {
    // Clean up any existing test data
    const existingUser = await db.user.findUnique({
      where: { walletAddress: LIST_USER_WALLET },
    });

    if (existingUser) {
      await db.payrollItem.deleteMany({
        where: { payrollRun: { org: { ownerId: existingUser.id } } },
      });
      await db.payrollRun.deleteMany({
        where: { org: { ownerId: existingUser.id } },
      });
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
      data: { walletAddress: LIST_USER_WALLET },
    });
    listUserId = testUser.id;

    // Create test organization
    const testOrg = await db.organization.create({
      data: {
        name: 'List Unit Test Org',
        treasuryAddress: LIST_TREASURY_WALLET,
        ownerId: listUserId,
        members: {
          create: {
            userId: listUserId,
            role: 'OWNER_ADMIN',
          },
        },
      },
    });
    listOrgId = testOrg.id;

    // Create a contractor
    const contractor = await db.contractor.create({
      data: {
        orgId: listOrgId,
        name: 'Test Contractor',
        walletAddress: '0x1234567890123456789012345678901234567890',
        rateAmount: new Decimal('1000'),
        rateCurrency: 'MNEE',
        payCycle: 'MONTHLY',
        active: true,
      },
    });
    listContractorId = contractor.id;
  });

  afterAll(async () => {
    try {
      await db.payrollItem.deleteMany({
        where: { payrollRun: { orgId: listOrgId } },
      });
      await db.payrollRun.deleteMany({ where: { orgId: listOrgId } });
      await db.contractor.deleteMany({ where: { orgId: listOrgId } });
      await db.orgMember.deleteMany({ where: { orgId: listOrgId } });
      await db.organization.deleteMany({ where: { id: listOrgId } });
      await db.user.deleteMany({ where: { walletAddress: LIST_USER_WALLET } });
    } catch {
      // Ignore cleanup errors
    }
  });

  beforeEach(async () => {
    await db.payrollItem.deleteMany({
      where: { payrollRun: { orgId: listOrgId } },
    });
    await db.payrollRun.deleteMany({ where: { orgId: listOrgId } });
  });

  it('should return paginated list of payroll runs', async () => {
    // Create multiple payroll runs
    for (let i = 0; i < 5; i++) {
      await createPayrollRun(listOrgId, listUserId, {
        txHash: '0x' + i.toString().repeat(64),
        items: [{ contractorId: listContractorId, amountMnee: (1000 + i * 100).toString() }],
        runLabel: `Run ${i + 1}`,
      });
    }

    const result = await listPayrollRuns(listOrgId, listUserId, {
      page: 1,
      limit: 3,
    });

    expect(result.data).toHaveLength(3);
    expect(result.meta.page).toBe(1);
    expect(result.meta.limit).toBe(3);
    expect(result.meta.total).toBe(5);
    expect(result.meta.totalPages).toBe(2);
  });

  it('should return empty list when no payroll runs exist', async () => {
    const result = await listPayrollRuns(listOrgId, listUserId, {
      page: 1,
      limit: 10,
    });

    expect(result.data).toHaveLength(0);
    expect(result.meta.total).toBe(0);
  });

  it('should order payroll runs by creation date descending', async () => {
    // Create payroll runs with slight delay to ensure different timestamps
    await createPayrollRun(listOrgId, listUserId, {
      txHash: '0x' + '1'.repeat(64),
      items: [{ contractorId: listContractorId, amountMnee: '1000' }],
      runLabel: 'First Run',
    });

    await createPayrollRun(listOrgId, listUserId, {
      txHash: '0x' + '2'.repeat(64),
      items: [{ contractorId: listContractorId, amountMnee: '2000' }],
      runLabel: 'Second Run',
    });

    const result = await listPayrollRuns(listOrgId, listUserId, {
      page: 1,
      limit: 10,
    });

    // Most recent should be first
    expect(result.data[0]?.runLabel).toBe('Second Run');
    expect(result.data[1]?.runLabel).toBe('First Run');
  });

  it('should get payroll run details with items', async () => {
    const run = await createPayrollRun(listOrgId, listUserId, {
      txHash: '0x' + 'a'.repeat(64),
      items: [{ contractorId: listContractorId, amountMnee: '1000' }],
      runLabel: 'Detail Test Run',
    });

    const detail = await getPayrollRun(listOrgId, run.id, listUserId);

    expect(detail.id).toBe(run.id);
    expect(detail.runLabel).toBe('Detail Test Run');
    expect(detail.items).toHaveLength(1);
    expect(detail.items[0]?.amountMnee).toBe('1000');
    expect(detail.items[0]?.contractorName).toBe('Test Contractor');
  });

  it('should throw error for non-existent payroll run', async () => {
    await expect(
      getPayrollRun(listOrgId, 'non-existent-run-id', listUserId)
    ).rejects.toThrow();
  });
});
