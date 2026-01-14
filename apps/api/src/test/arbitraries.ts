/**
 * Fast-check Arbitraries for OrbitPayroll API Tests
 *
 * This module provides reusable arbitrary generators for property-based testing.
 * These generators create random but valid test data that conforms to the
 * domain constraints of OrbitPayroll.
 *
 * **Feature: 09-testing, Property Tests**
 * **Validates: Requirements 5.1, 5.2**
 */

import fc from 'fast-check';
import { getAddress } from 'ethers';

// =============================================================================
// Ethereum Address Arbitraries
// =============================================================================

/**
 * Generates valid checksummed Ethereum addresses.
 * Uses ethers.js getAddress to ensure proper checksum format.
 */
export const validEthereumAddressArb = fc
  .hexaString({ minLength: 40, maxLength: 40 })
  .map((hex) => {
    try {
      return getAddress(`0x${hex}`);
    } catch {
      // Fallback to a known valid address if checksum fails
      return '0x0000000000000000000000000000000000000001';
    }
  });

/**
 * Generates lowercase Ethereum addresses (non-checksummed).
 */
export const lowercaseEthereumAddressArb = fc
  .hexaString({ minLength: 40, maxLength: 40 })
  .map((hex) => `0x${hex.toLowerCase()}`);

/**
 * Generates invalid Ethereum addresses for error testing.
 */
export const invalidEthereumAddressArb = fc.oneof(
  fc.constant('0x'),
  fc.constant('0x123'),
  fc.constant('not-an-address'),
  fc.hexaString({ minLength: 1, maxLength: 39 }).map((hex) => `0x${hex}`),
  fc.hexaString({ minLength: 41, maxLength: 50 }).map((hex) => `0x${hex}`)
);

// =============================================================================
// Monetary Value Arbitraries
// =============================================================================

/**
 * Generates valid MNEE token amounts (positive, up to 18 decimal places).
 * Returns string representation to maintain precision.
 */
export const mneeAmountArb = fc
  .tuple(
    fc.integer({ min: 0, max: 999999999 }), // Integer part
    fc.integer({ min: 0, max: 99999999 }) // Decimal part (8 digits)
  )
  .map(([intPart, decPart]) => {
    const decStr = decPart.toString().padStart(8, '0');
    return `${intPart}.${decStr}`;
  });

/**
 * Generates positive MNEE amounts (non-zero).
 */
export const positiveMneeAmountArb = fc
  .tuple(
    fc.integer({ min: 1, max: 999999999 }),
    fc.integer({ min: 0, max: 99999999 })
  )
  .map(([intPart, decPart]) => {
    const decStr = decPart.toString().padStart(8, '0');
    return `${intPart}.${decStr}`;
  });

/**
 * Generates an array of MNEE amounts for payroll testing.
 */
export const payrollAmountsArb = fc.array(positiveMneeAmountArb, {
  minLength: 1,
  maxLength: 50,
});

// =============================================================================
// User and Organization Arbitraries
// =============================================================================

/**
 * Generates valid organization names.
 */
export const orgNameArb = fc
  .string({ minLength: 1, maxLength: 100 })
  .filter((s) => s.trim().length > 0);

/**
 * Generates valid contractor names.
 */
export const contractorNameArb = fc
  .string({ minLength: 1, maxLength: 100 })
  .filter((s) => s.trim().length > 0);

/**
 * Generates valid email addresses.
 */
export const emailArb = fc
  .tuple(
    fc.stringOf(fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz0123456789'), {
      minLength: 1,
      maxLength: 20,
    }),
    fc.constantFrom('example.com', 'test.org', 'mail.io')
  )
  .map(([local, domain]) => `${local}@${domain}`);

// =============================================================================
// Pay Cycle Arbitraries
// =============================================================================

/**
 * Generates valid pay cycle values.
 */
export const payCycleArb = fc.constantFrom('WEEKLY', 'BI_WEEKLY', 'MONTHLY');

// =============================================================================
// JWT and Authentication Arbitraries
// =============================================================================

/**
 * Generates valid JWT secrets (minimum 32 characters).
 */
export const validJwtSecretArb = fc.string({ minLength: 32, maxLength: 128 });

/**
 * Generates invalid JWT secrets (less than 32 characters).
 */
export const invalidJwtSecretArb = fc.string({ minLength: 0, maxLength: 31 });

/**
 * Generates valid expiry strings (e.g., "15m", "1h", "7d").
 */
export const expiryStringArb = fc
  .tuple(
    fc.integer({ min: 1, max: 1000 }),
    fc.constantFrom('s', 'm', 'h', 'd')
  )
  .map(([value, unit]) => `${value}${unit}`);

// =============================================================================
// Nonce Arbitraries
// =============================================================================

/**
 * Generates valid nonce strings (alphanumeric, 32 characters).
 */
export const nonceArb = fc.stringOf(
  fc.constantFrom(...'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'),
  { minLength: 32, maxLength: 32 }
);

// =============================================================================
// IP Address Arbitraries
// =============================================================================

/**
 * Generates valid IPv4 addresses.
 */
export const ipv4Arb = fc
  .tuple(
    fc.integer({ min: 0, max: 255 }),
    fc.integer({ min: 0, max: 255 }),
    fc.integer({ min: 0, max: 255 }),
    fc.integer({ min: 0, max: 255 })
  )
  .map(([a, b, c, d]) => `${a}.${b}.${c}.${d}`);

// =============================================================================
// Composite Arbitraries
// =============================================================================

/**
 * Generates a complete contractor object for testing.
 */
export const contractorArb = fc.record({
  name: contractorNameArb,
  walletAddress: validEthereumAddressArb,
  rateAmount: positiveMneeAmountArb,
  payCycle: payCycleArb,
  email: fc.option(emailArb, { nil: undefined }),
});

/**
 * Generates a list of contractors for payroll testing.
 */
export const contractorListArb = fc.array(contractorArb, {
  minLength: 1,
  maxLength: 20,
});

/**
 * Generates a payroll preview request.
 */
export const payrollPreviewArb = fc.record({
  contractorIds: fc.array(fc.uuid(), { minLength: 1, maxLength: 50 }),
  runLabel: fc.option(fc.string({ minLength: 1, maxLength: 100 }), { nil: undefined }),
});
