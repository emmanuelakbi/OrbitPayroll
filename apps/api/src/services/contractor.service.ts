/**
 * Contractor Service
 *
 * Handles contractor CRUD operations within organizations.
 * Contractors are recipients of payroll payments with defined rates and pay cycles.
 *
 * @module services/contractor
 * @see Requirements: Contractor management with configurable pay cycles
 */

import { db } from '../lib/db.js';
import { ContractorError, OrgError } from '../lib/errors.js';
import { logger } from '../lib/logger.js';
import { auditLogger } from '../lib/audit-logger.js';
import { verifyRole, isMember } from './org.service.js';
import type { PayCycle } from '@orbitpayroll/database';
import { Decimal } from '@prisma/client/runtime/library';

/**
 * Response type for contractor data
 */
export interface ContractorResponse {
  id: string;
  orgId: string;
  name: string;
  walletAddress: string;
  rateAmount: string;
  rateCurrency: string;
  payCycle: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * Generic paginated response wrapper
 * @typeParam T - The type of items in the data array
 */
export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

/**
 * Data required to create a new contractor
 */
export interface CreateContractorData {
  name: string;
  walletAddress: string;
  rateAmount: number;
  rateCurrency: string;
  payCycle: PayCycle;
}

/**
 * Data for updating an existing contractor (all fields optional)
 */
export interface UpdateContractorData {
  name?: string | undefined;
  walletAddress?: string | undefined;
  rateAmount?: number | undefined;
  rateCurrency?: string | undefined;
  payCycle?: PayCycle | undefined;
}

/**
 * Parameters for listing contractors with pagination and filtering
 */
export interface ListContractorsParams {
  page: number;
  limit: number;
  search?: string | undefined;
  active?: boolean | undefined;
}


/**
 * Create a new contractor in an organization.
 * Any organization member can create contractors.
 *
 * @param orgId - The organization ID
 * @param userId - The ID of the user creating the contractor
 * @param data - The contractor data
 * @returns The created contractor
 * @throws {OrgError} If organization not found or user is not a member
 * @throws {ContractorError} If wallet address already exists in the organization
 */
export async function createContractor(
  orgId: string,
  userId: string,
  data: CreateContractorData
): Promise<ContractorResponse> {
  // Verify org exists
  const org = await db.organization.findUnique({
    where: { id: orgId },
  });

  if (!org) {
    throw OrgError.notFound();
  }

  // Verify user is a member
  const memberCheck = await isMember(orgId, userId);
  if (!memberCheck) {
    throw OrgError.notMember();
  }

  // Check for duplicate wallet address within the org (only active contractors)
  const existingContractor = await db.contractor.findFirst({
    where: {
      orgId,
      walletAddress: data.walletAddress.toLowerCase(),
      active: true,
    },
  });

  if (existingContractor) {
    throw ContractorError.duplicateWallet();
  }

  // Create the contractor
  const contractor = await db.contractor.create({
    data: {
      orgId,
      name: data.name,
      walletAddress: data.walletAddress.toLowerCase(),
      rateAmount: new Decimal(data.rateAmount),
      rateCurrency: data.rateCurrency,
      payCycle: data.payCycle,
    },
  });

  logger.info({ orgId, contractorId: contractor.id }, 'Contractor created');

  // Audit log: contractor created (Requirement 5.3)
  await auditLogger.contractorCreated(
    {
      contractorId: contractor.id,
      contractorName: contractor.name,
      walletAddress: contractor.walletAddress,
    },
    {
      userId,
      orgId,
    }
  );

  return formatContractorResponse(contractor);
}

/**
 * List contractors in an organization with pagination, search, and filtering.
 *
 * @param orgId - The organization ID
 * @param userId - The ID of the user requesting the list
 * @param params - Pagination and filter parameters
 * @returns Paginated list of contractors
 * @throws {OrgError} If organization not found or user is not a member
 */
export async function listContractors(
  orgId: string,
  userId: string,
  params: ListContractorsParams
): Promise<PaginatedResponse<ContractorResponse>> {
  // Verify org exists
  const org = await db.organization.findUnique({
    where: { id: orgId },
  });

  if (!org) {
    throw OrgError.notFound();
  }

  // Verify user is a member
  const memberCheck = await isMember(orgId, userId);
  if (!memberCheck) {
    throw OrgError.notMember();
  }

  const { page, limit, search, active } = params;
  const skip = (page - 1) * limit;

  // Build where clause
  const where: {
    orgId: string;
    active?: boolean;
    OR?: Array<{ name: { contains: string; mode: 'insensitive' } } | { walletAddress: { contains: string; mode: 'insensitive' } }>;
  } = { orgId };

  if (active !== undefined) {
    where.active = active;
  }

  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { walletAddress: { contains: search, mode: 'insensitive' } },
    ];
  }

  // Get total count and contractors
  const [total, contractors] = await Promise.all([
    db.contractor.count({ where }),
    db.contractor.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
    }),
  ]);

  return {
    data: contractors.map(formatContractorResponse),
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}


/**
 * Get a single contractor by ID.
 *
 * @param orgId - The organization ID
 * @param contractorId - The contractor ID
 * @param userId - The ID of the user requesting the contractor
 * @returns The contractor data
 * @throws {OrgError} If organization not found or user is not a member
 * @throws {ContractorError} If contractor not found
 */
export async function getContractor(
  orgId: string,
  contractorId: string,
  userId: string
): Promise<ContractorResponse> {
  // Verify org exists
  const org = await db.organization.findUnique({
    where: { id: orgId },
  });

  if (!org) {
    throw OrgError.notFound();
  }

  // Verify user is a member
  const memberCheck = await isMember(orgId, userId);
  if (!memberCheck) {
    throw OrgError.notMember();
  }

  // Get the contractor
  const contractor = await db.contractor.findFirst({
    where: {
      id: contractorId,
      orgId,
    },
  });

  if (!contractor) {
    throw ContractorError.notFound();
  }

  return formatContractorResponse(contractor);
}

/**
 * Update a contractor.
 * Requires OWNER_ADMIN role.
 *
 * @param orgId - The organization ID
 * @param contractorId - The contractor ID
 * @param userId - The ID of the user updating the contractor
 * @param data - The fields to update
 * @returns The updated contractor
 * @throws {OrgError} If organization not found or user lacks permission
 * @throws {ContractorError} If contractor not found or wallet address is duplicate
 */
export async function updateContractor(
  orgId: string,
  contractorId: string,
  userId: string,
  data: UpdateContractorData
): Promise<ContractorResponse> {
  // Verify org exists
  const org = await db.organization.findUnique({
    where: { id: orgId },
  });

  if (!org) {
    throw OrgError.notFound();
  }

  // Verify user has OWNER_ADMIN role
  await verifyRole(orgId, userId, 'OWNER_ADMIN');

  // Get the contractor
  const contractor = await db.contractor.findFirst({
    where: {
      id: contractorId,
      orgId,
    },
  });

  if (!contractor) {
    throw ContractorError.notFound();
  }

  // If updating wallet address, check for duplicates
  if (data.walletAddress && data.walletAddress.toLowerCase() !== contractor.walletAddress) {
    const existingContractor = await db.contractor.findFirst({
      where: {
        orgId,
        walletAddress: data.walletAddress.toLowerCase(),
        active: true,
        NOT: { id: contractorId },
      },
    });

    if (existingContractor) {
      throw ContractorError.duplicateWallet();
    }
  }

  // Update the contractor
  const updated = await db.contractor.update({
    where: { id: contractorId },
    data: {
      ...(data.name && { name: data.name }),
      ...(data.walletAddress && { walletAddress: data.walletAddress.toLowerCase() }),
      ...(data.rateAmount !== undefined && { rateAmount: new Decimal(data.rateAmount) }),
      ...(data.rateCurrency && { rateCurrency: data.rateCurrency }),
      ...(data.payCycle && { payCycle: data.payCycle }),
    },
  });

  logger.info({ orgId, contractorId }, 'Contractor updated');

  // Build changes object for audit log
  const changes: Record<string, { from: unknown; to: unknown }> = {};
  if (data.name && data.name !== contractor.name) {
    changes.name = { from: contractor.name, to: data.name };
  }
  if (data.walletAddress && data.walletAddress.toLowerCase() !== contractor.walletAddress) {
    changes.walletAddress = { from: contractor.walletAddress, to: data.walletAddress.toLowerCase() };
  }
  if (data.rateAmount !== undefined && !new Decimal(data.rateAmount).equals(contractor.rateAmount)) {
    changes.rateAmount = { from: contractor.rateAmount.toString(), to: data.rateAmount.toString() };
  }
  if (data.rateCurrency && data.rateCurrency !== contractor.rateCurrency) {
    changes.rateCurrency = { from: contractor.rateCurrency, to: data.rateCurrency };
  }
  if (data.payCycle && data.payCycle !== contractor.payCycle) {
    changes.payCycle = { from: contractor.payCycle, to: data.payCycle };
  }

  // Audit log: contractor updated (Requirement 5.3)
  await auditLogger.contractorUpdated(
    {
      contractorId,
      contractorName: updated.name,
      walletAddress: updated.walletAddress,
      changes,
    },
    {
      userId,
      orgId,
    }
  );

  return formatContractorResponse(updated);
}

/**
 * Archive (soft delete) a contractor.
 * Requires OWNER_ADMIN role.
 *
 * @param orgId - The organization ID
 * @param contractorId - The contractor ID
 * @param userId - The ID of the user archiving the contractor
 * @throws {OrgError} If organization not found or user lacks permission
 * @throws {ContractorError} If contractor not found
 */
export async function archiveContractor(
  orgId: string,
  contractorId: string,
  userId: string
): Promise<void> {
  // Verify org exists
  const org = await db.organization.findUnique({
    where: { id: orgId },
  });

  if (!org) {
    throw OrgError.notFound();
  }

  // Verify user has OWNER_ADMIN role
  await verifyRole(orgId, userId, 'OWNER_ADMIN');

  // Get the contractor
  const contractor = await db.contractor.findFirst({
    where: {
      id: contractorId,
      orgId,
    },
  });

  if (!contractor) {
    throw ContractorError.notFound();
  }

  // Soft delete by setting active=false
  await db.contractor.update({
    where: { id: contractorId },
    data: { active: false },
  });

  logger.info({ orgId, contractorId }, 'Contractor archived');

  // Audit log: contractor archived (Requirement 5.3)
  await auditLogger.contractorArchived(
    {
      contractorId,
      contractorName: contractor.name,
      walletAddress: contractor.walletAddress,
    },
    {
      userId,
      orgId,
    }
  );
}

// ============================================
// Helper Functions
// ============================================

function formatContractorResponse(contractor: {
  id: string;
  orgId: string;
  name: string;
  walletAddress: string;
  rateAmount: Decimal;
  rateCurrency: string;
  payCycle: PayCycle;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}): ContractorResponse {
  return {
    id: contractor.id,
    orgId: contractor.orgId,
    name: contractor.name,
    walletAddress: contractor.walletAddress,
    rateAmount: contractor.rateAmount.toString(),
    rateCurrency: contractor.rateCurrency,
    payCycle: contractor.payCycle,
    active: contractor.active,
    createdAt: contractor.createdAt.toISOString(),
    updatedAt: contractor.updatedAt.toISOString(),
  };
}
