/**
 * Property-Based Tests for Payroll Calculation
 *
 * **Feature: 09-testing, Task 6.1: Property Tests for Payroll Calculation**
 * **Validates: Requirements 5.1, 5.2, 5.3, 5.4, 5.5**
 *
 * These tests verify invariants that must hold across all valid inputs:
 * - Total equals sum of individual amounts (5.2)
 * - Valid addresses always accepted (5.3)
 * - Non-negative rates produce non-negative payments (5.4)
 * - Minimum 100 iterations per property (5.5)
 */

import { describe, it, beforeAll, afterAll, beforeEach, expect } from 'vitest';
import fc from 'fast-check';
import { db } from '../lib/db.js';
import { previewPayroll } from './payroll.service.js';
import { createContractor } from './contractor.service.js';
import { Decimal } from '@prisma/client/runtime/library';
import type { PayCycle } from '@orbitpayroll/database';

// =============================================================================
// Arbitraries (Random Data Generators)
// =============================================================================

/**
 * Generate valid Ethereum addresses (42 characters, lowercase)
 * Requirement 5.3: Valid addresses always accepted
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
 * Generate valid non-negative rate amounts as strings
 * Requirement 5.4: Non-negative rates produce non-negative payments
 * Database has precision 18, scale 8, so max integer part is 10^10 - 1
 */
const nonNegativeRateArb = fc.integer({ min: 0, max: 9999999999 }).map((n) => n.toString());

/**
 * Generate positive rate amounts (non-zero)
 */
const positiveRateArb = fc.integer({ min: 1, max: 9999999999 }).map((n) => n.toString());

/**
 * Generate valid pay cycles
 */
const payCycleArb = fc.constantFrom<PayCycle>('WEEKLY', 'BI_WEEKLY', 'MONTHLY');

/**
 * Generate a contractor data object with non-negative rate
 */
const contractorDataArb = fc.record({
  name: contractorNameArb,
  walletAddress: ethereumAddressArb,
  rateAmount: positiveRateArb,
  payCycle: payCycleArb,
});

/**
 * Generate a contractor data object with explicitly non-negative rate (including zero)
 */
const contractorWithNonNegativeRateArb = fc.record({
  name: contractorNameArb,
  walletAddress: ethereumAddressArb,
  rateAmount: nonNegativeRateArb,
  payCycle: payCycleArb,
});

// =============================================================================
// Test Fixtures
// =============================================================================

// Use unique wallet prefix to avoid conflicts with other tests
const TEST_WALLET_PREFIX = 'payroll_prop_';
const TEST_USER_WALLET = '0x' + TEST_WALLET_PREFIX + 'a'.repeat(40 - TEST_WALLET_PREFIX.length);
const TEST_TREASURY_WALLET = '0x' + TEST_WALLET_PREFIX + 'b'.repeat(40 - TEST_WALLET_PREFIX.length);

let testUserId: string;
let testOrgId: string;

beforeAll(async () => {
  // Clean up only test-specific data
  const existingUser = await db.user.findUnique({
    where: { walletAddress: TEST_USER_WALLET },
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
      name: 'Payroll Property Test Org',
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

// =============================================================================
// Property-Based Tests
// =============================================================================

describe('Property Tests: Payroll Calculation', () => {
  /**
   * Property 1: Total Equals Sum of Individual Amounts
   *
   * *For any* set of contractors with valid rates, the payroll preview
   * totalMnee SHALL equal the sum of all individual contractor amounts.
   *
   * **Validates: Requirements 5.2**
   */
  it('Property 1: totalMnee equals sum of contractor amounts', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(contractorDataArb, { minLength: 0, maxLength: 20 }),
        async (contractorsData) => {
          // Clean up contractors before this iteration
          await db.contractor.deleteMany({ where: { orgId: testOrgId } });

          // Create contractors with unique wallet addresses
          const usedWallets = new Set<string>();
          const createdRates: string[] = [];

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
            createdRates.push(data.rateAmount);
          }

          // Get preview
          const preview = await previewPayroll(testOrgId, testUserId);

          // Calculate expected sum from created rates
          const expectedSum = createdRates.reduce(
            (sum, rate) => sum.plus(new Decimal(rate)),
            new Decimal(0)
          );

          // totalMnee should equal the sum
          return new Decimal(preview.totalMnee).equals(expectedSum);
        }
      ),
      { numRuns: 100 }
    );
  }, 180000);

  /**
   * Property 2: Valid Ethereum Addresses Always Accepted
   *
   * *For any* valid Ethereum address (0x followed by 40 hex characters),
   * creating a contractor with that address SHALL succeed.
   *
   * **Validates: Requirements 5.3**
   */
  it('Property 2: valid Ethereum addresses always accepted', async () => {
    await fc.assert(
      fc.asyncProperty(
        ethereumAddressArb,
        contractorNameArb,
        positiveRateArb,
        payCycleArb,
        async (walletAddress, name, rateAmount, payCycle) => {
          // Clean up contractors before this iteration
          await db.contractor.deleteMany({ where: { orgId: testOrgId } });

          // Attempt to create contractor with valid address
          let creationSucceeded = false;
          try {
            const contractor = await createContractor(testOrgId, testUserId, {
              name,
              walletAddress,
              rateAmount: parseInt(rateAmount, 10),
              rateCurrency: 'MNEE',
              payCycle,
            });
            creationSucceeded = contractor.id !== undefined;
          } catch {
            creationSucceeded = false;
          }

          return creationSucceeded;
        }
      ),
      { numRuns: 100 }
    );
  }, 180000);

  /**
   * Property 3: Non-Negative Rates Produce Non-Negative Payments
   *
   * *For any* contractor with a non-negative rate amount,
   * the payment amount in the preview SHALL be non-negative.
   *
   * **Validates: Requirements 5.4**
   */
  it('Property 3: non-negative rates produce non-negative payments', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(contractorWithNonNegativeRateArb, { minLength: 1, maxLength: 20 }),
        async (contractorsData) => {
          // Clean up contractors before this iteration
          await db.contractor.deleteMany({ where: { orgId: testOrgId } });

          // Create contractors with unique wallet addresses
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

          // Get preview
          const preview = await previewPayroll(testOrgId, testUserId);

          // All contractor amounts should be non-negative
          const allNonNegative = preview.contractors.every(
            (c) => new Decimal(c.amount).greaterThanOrEqualTo(0)
          );

          // Total should also be non-negative
          const totalNonNegative = new Decimal(preview.totalMnee).greaterThanOrEqualTo(0);

          return allNonNegative && totalNonNegative;
        }
      ),
      { numRuns: 100 }
    );
  }, 180000);

  /**
   * Property 4: Random Contractor Sets Produce Consistent Results
   *
   * *For any* random set of contractors, the preview SHALL:
   * - Return the correct number of contractors
   * - Have totalMnee equal to sum of amounts
   * - Have consistent deficit calculation
   *
   * **Validates: Requirements 5.2, 5.4**
   */
  it('Property 4: random contractor sets produce consistent results', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(contractorDataArb, { minLength: 0, maxLength: 30 }),
        async (contractorsData) => {
          // Clean up contractors before this iteration
          await db.contractor.deleteMany({ where: { orgId: testOrgId } });

          // Create contractors with unique wallet addresses
          const usedWallets = new Set<string>();
          let expectedCount = 0;
          let expectedTotal = new Decimal(0);

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
            expectedCount++;
            expectedTotal = expectedTotal.plus(new Decimal(data.rateAmount));
          }

          // Get preview
          const preview = await previewPayroll(testOrgId, testUserId);

          // Verify contractor count
          const countMatches = preview.contractors.length === expectedCount;

          // Verify total
          const totalMatches = new Decimal(preview.totalMnee).equals(expectedTotal);

          // Verify deficit calculation (deficit = max(0, total - balance))
          const treasuryBalance = new Decimal(preview.treasuryBalance);
          const expectedDeficit = expectedTotal.greaterThan(treasuryBalance)
            ? expectedTotal.minus(treasuryBalance)
            : new Decimal(0);
          const deficitMatches = new Decimal(preview.deficit).equals(expectedDeficit);

          return countMatches && totalMatches && deficitMatches;
        }
      ),
      { numRuns: 100 }
    );
  }, 180000);

  /**
   * Property 5: Empty Contractor Set Returns Zero Total
   *
   * *For any* organization with no active contractors,
   * the preview SHALL return zero total and empty contractors array.
   *
   * **Validates: Requirements 5.2**
   */
  it('Property 5: empty contractor set returns zero total', async () => {
    // Clean up all contractors
    await db.contractor.deleteMany({ where: { orgId: testOrgId } });

    const preview = await previewPayroll(testOrgId, testUserId);

    expect(preview.contractors).toHaveLength(0);
    expect(preview.totalMnee).toBe('0');
    expect(new Decimal(preview.deficit).equals(new Decimal(0))).toBe(true);
  });
});
