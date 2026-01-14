/**
 * Test Fixtures for OrbitPayroll API Tests
 *
 * This module provides deterministic test fixtures for consistent, reproducible tests.
 * All fixtures use predefined data (not random) to ensure test reproducibility.
 *
 * **Feature: 09-testing**
 * **Validates: Requirements 7.1, 7.2, 7.3, 7.4, 7.5, 7.6**
 */

import { Role, PayCycle, PayrollStatus, ItemStatus } from '@prisma/client';

// =============================================================================
// User Fixtures
// =============================================================================

/**
 * Deterministic user fixtures for testing.
 * Each user has a unique, predictable wallet address and optional email.
 */
export const USER_FIXTURES = {
  /** Organization owner with full admin privileges */
  owner: {
    id: 'user-owner-001',
    walletAddress: '0x1111111111111111111111111111111111111111',
    email: 'owner@orbitpayroll.test',
  },
  /** Finance operator with limited privileges */
  operator: {
    id: 'user-operator-001',
    walletAddress: '0x2222222222222222222222222222222222222222',
    email: 'operator@orbitpayroll.test',
  },
  /** User not belonging to any organization */
  nonMember: {
    id: 'user-nonmember-001',
    walletAddress: '0x3333333333333333333333333333333333333333',
    email: 'nonmember@orbitpayroll.test',
  },
  /** User without email (wallet-only auth) */
  walletOnly: {
    id: 'user-walletonly-001',
    walletAddress: '0x4444444444444444444444444444444444444444',
    email: undefined,
  },
  /** Secondary owner for multi-org testing */
  secondOwner: {
    id: 'user-owner-002',
    walletAddress: '0x5555555555555555555555555555555555555555',
    email: 'owner2@orbitpayroll.test',
  },
} as const;

export type UserFixtureKey = keyof typeof USER_FIXTURES;
export type UserFixture = (typeof USER_FIXTURES)[UserFixtureKey];

// =============================================================================
// Organization Fixtures
// =============================================================================

/**
 * Deterministic organization fixtures for testing.
 */
export const ORG_FIXTURES = {
  /** Primary test organization */
  primary: {
    id: 'org-primary-001',
    name: 'Acme Test Corp',
    treasuryAddress: '0xaaaa111111111111111111111111111111111111',
    ownerId: USER_FIXTURES.owner.id,
  },
  /** Secondary organization for multi-org testing */
  secondary: {
    id: 'org-secondary-001',
    name: 'Beta Test Inc',
    treasuryAddress: '0xbbbb222222222222222222222222222222222222',
    ownerId: USER_FIXTURES.secondOwner.id,
  },
  /** Organization with no contractors */
  empty: {
    id: 'org-empty-001',
    name: 'Empty Org LLC',
    treasuryAddress: '0xcccc333333333333333333333333333333333333',
    ownerId: USER_FIXTURES.owner.id,
  },
} as const;

export type OrgFixtureKey = keyof typeof ORG_FIXTURES;
export type OrgFixture = (typeof ORG_FIXTURES)[OrgFixtureKey];

// =============================================================================
// Organization Member Fixtures
// =============================================================================

/**
 * Deterministic org member fixtures for testing role-based access.
 */
export const ORG_MEMBER_FIXTURES = {
  /** Owner membership in primary org */
  ownerPrimary: {
    id: 'member-owner-primary',
    orgId: ORG_FIXTURES.primary.id,
    userId: USER_FIXTURES.owner.id,
    role: 'OWNER_ADMIN' as Role,
  },
  /** Operator membership in primary org */
  operatorPrimary: {
    id: 'member-operator-primary',
    orgId: ORG_FIXTURES.primary.id,
    userId: USER_FIXTURES.operator.id,
    role: 'FINANCE_OPERATOR' as Role,
  },
  /** Second owner membership in secondary org */
  ownerSecondary: {
    id: 'member-owner-secondary',
    orgId: ORG_FIXTURES.secondary.id,
    userId: USER_FIXTURES.secondOwner.id,
    role: 'OWNER_ADMIN' as Role,
  },
} as const;

export type OrgMemberFixtureKey = keyof typeof ORG_MEMBER_FIXTURES;
export type OrgMemberFixture = (typeof ORG_MEMBER_FIXTURES)[OrgMemberFixtureKey];

// =============================================================================
// Contractor Fixtures
// =============================================================================

/**
 * Deterministic contractor fixtures for testing.
 */
export const CONTRACTOR_FIXTURES = {
  /** Monthly contractor with standard rate */
  monthly: {
    id: 'contractor-monthly-001',
    orgId: ORG_FIXTURES.primary.id,
    name: 'Monthly Developer',
    walletAddress: '0xc001111111111111111111111111111111111111',
    rateAmount: '5000.00000000',
    rateCurrency: 'MNEE',
    payCycle: 'MONTHLY' as PayCycle,
    active: true,
  },
  /** Bi-weekly contractor */
  biweekly: {
    id: 'contractor-biweekly-001',
    orgId: ORG_FIXTURES.primary.id,
    name: 'Biweekly Designer',
    walletAddress: '0xc002222222222222222222222222222222222222',
    rateAmount: '2500.00000000',
    rateCurrency: 'MNEE',
    payCycle: 'BI_WEEKLY' as PayCycle,
    active: true,
  },
  /** Weekly contractor */
  weekly: {
    id: 'contractor-weekly-001',
    orgId: ORG_FIXTURES.primary.id,
    name: 'Weekly Consultant',
    walletAddress: '0xc003333333333333333333333333333333333333',
    rateAmount: '1000.00000000',
    rateCurrency: 'MNEE',
    payCycle: 'WEEKLY' as PayCycle,
    active: true,
  },
  /** Inactive (archived) contractor */
  inactive: {
    id: 'contractor-inactive-001',
    orgId: ORG_FIXTURES.primary.id,
    name: 'Former Contractor',
    walletAddress: '0xc004444444444444444444444444444444444444',
    rateAmount: '3000.00000000',
    rateCurrency: 'MNEE',
    payCycle: 'MONTHLY' as PayCycle,
    active: false,
  },
  /** High-value contractor for edge case testing */
  highValue: {
    id: 'contractor-highvalue-001',
    orgId: ORG_FIXTURES.primary.id,
    name: 'Senior Architect',
    walletAddress: '0xc005555555555555555555555555555555555555',
    rateAmount: '25000.00000000',
    rateCurrency: 'MNEE',
    payCycle: 'MONTHLY' as PayCycle,
    active: true,
  },
  /** Contractor in secondary org */
  secondaryOrg: {
    id: 'contractor-secondary-001',
    orgId: ORG_FIXTURES.secondary.id,
    name: 'Beta Contractor',
    walletAddress: '0xc006666666666666666666666666666666666666',
    rateAmount: '4000.00000000',
    rateCurrency: 'MNEE',
    payCycle: 'MONTHLY' as PayCycle,
    active: true,
  },
} as const;

export type ContractorFixtureKey = keyof typeof CONTRACTOR_FIXTURES;
export type ContractorFixture = (typeof CONTRACTOR_FIXTURES)[ContractorFixtureKey];

// =============================================================================
// Payroll Run Fixtures
// =============================================================================

/**
 * Deterministic payroll run fixtures for testing.
 */
export const PAYROLL_RUN_FIXTURES = {
  /** Completed payroll run */
  completed: {
    id: 'payroll-completed-001',
    orgId: ORG_FIXTURES.primary.id,
    runLabel: 'January 2026 Payroll',
    scheduledDate: new Date('2026-01-15T00:00:00Z'),
    executedAt: new Date('2026-01-15T10:30:00Z'),
    txHash: '0xabcd111111111111111111111111111111111111111111111111111111111111',
    totalMnee: '8500.00000000',
    status: 'EXECUTED' as PayrollStatus,
  },
  /** Pending payroll run */
  pending: {
    id: 'payroll-pending-001',
    orgId: ORG_FIXTURES.primary.id,
    runLabel: 'February 2026 Payroll',
    scheduledDate: new Date('2026-02-15T00:00:00Z'),
    executedAt: null,
    txHash: null,
    totalMnee: '8500.00000000',
    status: 'PENDING' as PayrollStatus,
  },
  /** Failed payroll run */
  failed: {
    id: 'payroll-failed-001',
    orgId: ORG_FIXTURES.primary.id,
    runLabel: 'Failed Payroll',
    scheduledDate: new Date('2026-01-01T00:00:00Z'),
    executedAt: new Date('2026-01-01T10:00:00Z'),
    txHash: null,
    totalMnee: '5000.00000000',
    status: 'FAILED' as PayrollStatus,
  },
} as const;

export type PayrollRunFixtureKey = keyof typeof PAYROLL_RUN_FIXTURES;
export type PayrollRunFixture = (typeof PAYROLL_RUN_FIXTURES)[PayrollRunFixtureKey];

// =============================================================================
// Payroll Item Fixtures
// =============================================================================

/**
 * Deterministic payroll item fixtures for testing.
 */
export const PAYROLL_ITEM_FIXTURES = {
  /** Paid item for monthly contractor */
  paidMonthly: {
    id: 'item-paid-monthly-001',
    payrollRunId: PAYROLL_RUN_FIXTURES.completed.id,
    contractorId: CONTRACTOR_FIXTURES.monthly.id,
    amountMnee: '5000.00000000',
    status: 'PAID' as ItemStatus,
  },
  /** Paid item for biweekly contractor */
  paidBiweekly: {
    id: 'item-paid-biweekly-001',
    payrollRunId: PAYROLL_RUN_FIXTURES.completed.id,
    contractorId: CONTRACTOR_FIXTURES.biweekly.id,
    amountMnee: '2500.00000000',
    status: 'PAID' as ItemStatus,
  },
  /** Paid item for weekly contractor */
  paidWeekly: {
    id: 'item-paid-weekly-001',
    payrollRunId: PAYROLL_RUN_FIXTURES.completed.id,
    contractorId: CONTRACTOR_FIXTURES.weekly.id,
    amountMnee: '1000.00000000',
    status: 'PAID' as ItemStatus,
  },
  /** Pending item for monthly contractor */
  pendingMonthly: {
    id: 'item-pending-monthly-001',
    payrollRunId: PAYROLL_RUN_FIXTURES.pending.id,
    contractorId: CONTRACTOR_FIXTURES.monthly.id,
    amountMnee: '5000.00000000',
    status: 'PENDING' as ItemStatus,
  },
  /** Failed item */
  failed: {
    id: 'item-failed-001',
    payrollRunId: PAYROLL_RUN_FIXTURES.failed.id,
    contractorId: CONTRACTOR_FIXTURES.monthly.id,
    amountMnee: '5000.00000000',
    status: 'FAILED' as ItemStatus,
  },
} as const;

export type PayrollItemFixtureKey = keyof typeof PAYROLL_ITEM_FIXTURES;
export type PayrollItemFixture = (typeof PAYROLL_ITEM_FIXTURES)[PayrollItemFixtureKey];

// =============================================================================
// Notification Fixtures
// =============================================================================

/**
 * Deterministic notification fixtures for testing.
 */
export const NOTIFICATION_FIXTURES = {
  /** Unread payroll notification */
  unreadPayroll: {
    id: 'notif-unread-001',
    userId: USER_FIXTURES.owner.id,
    orgId: ORG_FIXTURES.primary.id,
    type: 'PAYROLL_COMPLETE',
    title: 'Payroll Executed',
    message: 'January 2026 payroll has been executed successfully.',
    read: false,
  },
  /** Read notification */
  readNotification: {
    id: 'notif-read-001',
    userId: USER_FIXTURES.owner.id,
    orgId: ORG_FIXTURES.primary.id,
    type: 'MEMBER_ADDED',
    title: 'New Team Member',
    message: 'A new finance operator has joined your organization.',
    read: true,
  },
  /** Notification for operator */
  operatorNotification: {
    id: 'notif-operator-001',
    userId: USER_FIXTURES.operator.id,
    orgId: ORG_FIXTURES.primary.id,
    type: 'PAYROLL_SCHEDULED',
    title: 'Payroll Scheduled',
    message: 'February 2026 payroll is scheduled for execution.',
    read: false,
  },
} as const;

export type NotificationFixtureKey = keyof typeof NOTIFICATION_FIXTURES;
export type NotificationFixture = (typeof NOTIFICATION_FIXTURES)[NotificationFixtureKey];

// =============================================================================
// Event Fixtures
// =============================================================================

/**
 * Deterministic event fixtures for audit logging tests.
 */
export const EVENT_FIXTURES = {
  /** Organization created event */
  orgCreated: {
    id: 'event-org-created-001',
    orgId: ORG_FIXTURES.primary.id,
    userId: USER_FIXTURES.owner.id,
    eventType: 'ORG_CREATED',
    payload: { orgName: ORG_FIXTURES.primary.name },
  },
  /** Contractor added event */
  contractorAdded: {
    id: 'event-contractor-added-001',
    orgId: ORG_FIXTURES.primary.id,
    userId: USER_FIXTURES.owner.id,
    eventType: 'CONTRACTOR_ADDED',
    payload: { contractorName: CONTRACTOR_FIXTURES.monthly.name },
  },
  /** Payroll executed event */
  payrollExecuted: {
    id: 'event-payroll-executed-001',
    orgId: ORG_FIXTURES.primary.id,
    userId: USER_FIXTURES.owner.id,
    eventType: 'PAYROLL_EXECUTED',
    payload: {
      runId: PAYROLL_RUN_FIXTURES.completed.id,
      totalMnee: PAYROLL_RUN_FIXTURES.completed.totalMnee,
    },
  },
} as const;

export type EventFixtureKey = keyof typeof EVENT_FIXTURES;
export type EventFixture = (typeof EVENT_FIXTURES)[EventFixtureKey];

// =============================================================================
// Session Fixtures
// =============================================================================

/**
 * Deterministic session fixtures for auth testing.
 */
export const SESSION_FIXTURES = {
  /** Valid active session */
  validSession: {
    id: 'session-valid-001',
    userId: USER_FIXTURES.owner.id,
    tokenHash: 'a'.repeat(64),
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
  },
  /** Expired session */
  expiredSession: {
    id: 'session-expired-001',
    userId: USER_FIXTURES.owner.id,
    tokenHash: 'b'.repeat(64),
    expiresAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
  },
} as const;

export type SessionFixtureKey = keyof typeof SESSION_FIXTURES;
export type SessionFixture = (typeof SESSION_FIXTURES)[SessionFixtureKey];

// =============================================================================
// Fixture Collections
// =============================================================================

/**
 * All user fixtures as an array for bulk operations.
 */
export const ALL_USER_FIXTURES = Object.values(USER_FIXTURES);

/**
 * All org fixtures as an array for bulk operations.
 */
export const ALL_ORG_FIXTURES = Object.values(ORG_FIXTURES);

/**
 * All contractor fixtures as an array for bulk operations.
 */
export const ALL_CONTRACTOR_FIXTURES = Object.values(CONTRACTOR_FIXTURES);

/**
 * Active contractors only.
 */
export const ACTIVE_CONTRACTOR_FIXTURES = ALL_CONTRACTOR_FIXTURES.filter((c) => c.active);

/**
 * Primary org contractors only.
 */
export const PRIMARY_ORG_CONTRACTORS = ALL_CONTRACTOR_FIXTURES.filter(
  (c) => c.orgId === ORG_FIXTURES.primary.id
);


// =============================================================================
// Factory Functions
// =============================================================================

/**
 * Factory function to create a user fixture with custom overrides.
 */
export function createUserFixture(
  overrides: Partial<UserFixture> & { walletAddress: string }
): UserFixture {
  return {
    id: `user-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    email: undefined,
    ...overrides,
  };
}

/**
 * Factory function to create an org fixture with custom overrides.
 */
export function createOrgFixture(
  overrides: Partial<OrgFixture> & { name: string; treasuryAddress: string; ownerId: string }
): OrgFixture {
  return {
    id: `org-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    ...overrides,
  };
}

/**
 * Factory function to create a contractor fixture with custom overrides.
 */
export function createContractorFixture(
  overrides: Partial<ContractorFixture> & {
    orgId: string;
    name: string;
    walletAddress: string;
  }
): ContractorFixture {
  return {
    id: `contractor-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    rateAmount: '1000.00000000',
    rateCurrency: 'MNEE',
    payCycle: 'MONTHLY' as PayCycle,
    active: true,
    ...overrides,
  };
}

/**
 * Factory function to create a payroll run fixture with custom overrides.
 */
export function createPayrollRunFixture(
  overrides: Partial<PayrollRunFixture> & { orgId: string; totalMnee: string }
): PayrollRunFixture {
  return {
    id: `payroll-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    runLabel: null,
    scheduledDate: null,
    executedAt: null,
    txHash: null,
    status: 'PENDING' as PayrollStatus,
    ...overrides,
  } as PayrollRunFixture;
}

/**
 * Factory function to create a payroll item fixture with custom overrides.
 */
export function createPayrollItemFixture(
  overrides: Partial<PayrollItemFixture> & {
    payrollRunId: string;
    contractorId: string;
    amountMnee: string;
  }
): PayrollItemFixture {
  return {
    id: `item-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    status: 'PENDING' as ItemStatus,
    ...overrides,
  };
}

/**
 * Factory function to create a notification fixture with custom overrides.
 */
export function createNotificationFixture(
  overrides: Partial<NotificationFixture> & {
    userId: string;
    type: string;
    title: string;
    message: string;
  }
): NotificationFixture {
  return {
    id: `notif-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    orgId: null,
    read: false,
    ...overrides,
  } as NotificationFixture;
}

// =============================================================================
// Bulk Factory Functions
// =============================================================================

/**
 * Creates multiple contractor fixtures for an organization.
 */
export function createContractorBatch(
  orgId: string,
  count: number,
  baseWalletPrefix = '0xbatch'
): ContractorFixture[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `contractor-batch-${i + 1}`,
    orgId,
    name: `Batch Contractor ${i + 1}`,
    walletAddress: `${baseWalletPrefix}${(i + 1).toString().padStart(34, '0')}`,
    rateAmount: `${(i + 1) * 1000}.00000000`,
    rateCurrency: 'MNEE',
    payCycle: (['WEEKLY', 'BI_WEEKLY', 'MONTHLY'] as PayCycle[])[i % 3],
    active: true,
  }));
}

/**
 * Creates a complete test scenario with users, org, and contractors.
 */
export function createTestScenario(scenarioName: string) {
  const owner = createUserFixture({
    walletAddress: `0x${scenarioName}owner${'0'.repeat(26)}`,
    email: `${scenarioName}-owner@test.com`,
  });

  const operator = createUserFixture({
    walletAddress: `0x${scenarioName}oper${'0'.repeat(27)}`,
    email: `${scenarioName}-operator@test.com`,
  });

  const org = createOrgFixture({
    name: `${scenarioName} Organization`,
    treasuryAddress: `0x${scenarioName}treas${'0'.repeat(25)}`,
    ownerId: owner.id,
  });

  const contractors = createContractorBatch(org.id, 3, `0x${scenarioName}c`);

  return {
    owner,
    operator,
    org,
    contractors,
  };
}

// =============================================================================
// Test Data Validation Helpers
// =============================================================================

/**
 * Validates that a wallet address matches expected format.
 */
export function isValidWalletAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

/**
 * Validates that a rate amount is properly formatted.
 */
export function isValidRateAmount(amount: string): boolean {
  return /^\d+\.\d{8}$/.test(amount);
}

/**
 * Validates that a transaction hash matches expected format.
 */
export function isValidTxHash(hash: string): boolean {
  return /^0x[a-fA-F0-9]{64}$/.test(hash);
}
