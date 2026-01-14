/**
 * Audit Logger for OrbitPayroll API
 *
 * Implements audit logging for security-relevant actions.
 * Stores audit events in the database events table for persistence.
 *
 * Requirements:
 * - 5.1: Log authentication events: login_success, login_failure, logout
 * - 5.2: Log authorization failures with user, action, resource
 * - 5.3: Log data modifications: contractor_created, contractor_updated, contractor_archived
 * - 5.4: Log payroll events: payroll_previewed, payroll_executed
 * - 5.5: Log admin actions: member_added, member_removed, role_changed
 * - 5.6: Store audit logs in database events table for persistence
 */

import { db } from './db.js';
import { logger } from './logger.js';

/**
 * Audit event types for security-relevant actions
 */
export type AuditEventType =
  // Authentication events (Requirement 5.1)
  | 'user.login_success'
  | 'user.login_failure'
  | 'user.logout'
  // Authorization events (Requirement 5.2)
  | 'auth.authorization_failure'
  // Contractor events (Requirement 5.3)
  | 'contractor.created'
  | 'contractor.updated'
  | 'contractor.archived'
  // Payroll events (Requirement 5.4)
  | 'payroll.previewed'
  | 'payroll.executed'
  // Admin/Member events (Requirement 5.5)
  | 'org.created'
  | 'member.added'
  | 'member.removed'
  | 'member.role_changed';

/**
 * Base payload interface for audit events
 */
export interface AuditPayload {
  [key: string]: unknown;
}

/**
 * Authentication event payloads
 */
export interface AuthEventPayload extends AuditPayload {
  walletAddress: string;
  ip?: string;
  userAgent?: string;
  reason?: string;
}

/**
 * Authorization failure payload
 */
export interface AuthorizationFailurePayload extends AuditPayload {
  action: string;
  resource: string;
  requiredRole?: string;
  actualRole?: string;
}

/**
 * Contractor event payloads
 */
export interface ContractorEventPayload extends AuditPayload {
  contractorId: string;
  contractorName?: string;
  walletAddress?: string;
  changes?: Record<string, { from: unknown; to: unknown }>;
}

/**
 * Payroll event payloads
 */
export interface PayrollEventPayload extends AuditPayload {
  payrollRunId?: string;
  txHash?: string;
  totalMnee?: string;
  contractorCount?: number;
}

/**
 * Member event payloads
 */
export interface MemberEventPayload extends AuditPayload {
  memberId?: string;
  memberWalletAddress: string;
  role?: string;
  previousRole?: string;
}

/**
 * Organization event payloads
 */
export interface OrgEventPayload extends AuditPayload {
  orgName: string;
  treasuryAddress?: string;
}

/**
 * Context for audit events
 */
export interface AuditContext {
  userId?: string;
  orgId?: string;
  correlationId?: string;
  ip?: string;
}

/**
 * Log an audit event to both the database and structured logs
 *
 * @param eventType - The type of audit event
 * @param payload - Event-specific data
 * @param context - User and organization context
 */
export async function logAuditEvent(
  eventType: AuditEventType,
  payload: AuditPayload,
  context: AuditContext
): Promise<void> {
  const { userId, orgId, correlationId, ip } = context;

  // Sanitize payload to remove sensitive data
  const sanitizedPayload = sanitizePayload(payload);

  // Add metadata to payload
  const enrichedPayload = {
    ...sanitizedPayload,
    timestamp: new Date().toISOString(),
    correlationId,
    ip,
  };

  try {
    // Requirement 5.6: Store audit log in database events table
    await db.event.create({
      data: {
        eventType,
        payload: enrichedPayload,
        userId: userId ?? null,
        orgId: orgId ?? null,
      },
    });

    // Also log to structured logs for real-time monitoring
    logger.info(
      {
        event: 'audit',
        eventType,
        userId,
        orgId,
        correlationId,
        ...sanitizedPayload,
      },
      `Audit: ${eventType}`
    );
  } catch (error) {
    // Log error but don't throw - audit logging should not break the main flow
    logger.error(
      {
        error: error instanceof Error ? error.message : 'Unknown error',
        eventType,
        userId,
        orgId,
      },
      'Failed to log audit event'
    );
  }
}

/**
 * Sanitize payload to remove sensitive data
 */
function sanitizePayload(payload: AuditPayload): AuditPayload {
  const sensitiveKeys = [
    'password',
    'token',
    'accessToken',
    'refreshToken',
    'privateKey',
    'secret',
    'signature',
    'nonce',
  ];

  const sanitized: AuditPayload = {};

  for (const [key, value] of Object.entries(payload)) {
    if (sensitiveKeys.includes(key.toLowerCase())) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizePayload(value as AuditPayload);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

/**
 * Audit logger helper object with typed methods for each event category
 */
export const auditLogger = {
  /**
   * Log successful authentication (Requirement 5.1)
   */
  loginSuccess: (
    payload: AuthEventPayload,
    context: AuditContext
  ): Promise<void> => {
    return logAuditEvent('user.login_success', payload, context);
  },

  /**
   * Log failed authentication (Requirement 5.1)
   */
  loginFailure: (
    payload: AuthEventPayload,
    context: AuditContext
  ): Promise<void> => {
    return logAuditEvent('user.login_failure', payload, context);
  },

  /**
   * Log user logout (Requirement 5.1)
   */
  logout: (
    payload: AuthEventPayload,
    context: AuditContext
  ): Promise<void> => {
    return logAuditEvent('user.logout', payload, context);
  },

  /**
   * Log authorization failure (Requirement 5.2)
   */
  authorizationFailure: (
    payload: AuthorizationFailurePayload,
    context: AuditContext
  ): Promise<void> => {
    return logAuditEvent('auth.authorization_failure', payload, context);
  },

  /**
   * Log contractor creation (Requirement 5.3)
   */
  contractorCreated: (
    payload: ContractorEventPayload,
    context: AuditContext
  ): Promise<void> => {
    return logAuditEvent('contractor.created', payload, context);
  },

  /**
   * Log contractor update (Requirement 5.3)
   */
  contractorUpdated: (
    payload: ContractorEventPayload,
    context: AuditContext
  ): Promise<void> => {
    return logAuditEvent('contractor.updated', payload, context);
  },

  /**
   * Log contractor archival (Requirement 5.3)
   */
  contractorArchived: (
    payload: ContractorEventPayload,
    context: AuditContext
  ): Promise<void> => {
    return logAuditEvent('contractor.archived', payload, context);
  },

  /**
   * Log payroll preview (Requirement 5.4)
   */
  payrollPreviewed: (
    payload: PayrollEventPayload,
    context: AuditContext
  ): Promise<void> => {
    return logAuditEvent('payroll.previewed', payload, context);
  },

  /**
   * Log payroll execution (Requirement 5.4)
   */
  payrollExecuted: (
    payload: PayrollEventPayload,
    context: AuditContext
  ): Promise<void> => {
    return logAuditEvent('payroll.executed', payload, context);
  },

  /**
   * Log organization creation (Requirement 5.5)
   */
  orgCreated: (
    payload: OrgEventPayload,
    context: AuditContext
  ): Promise<void> => {
    return logAuditEvent('org.created', payload, context);
  },

  /**
   * Log member addition (Requirement 5.5)
   */
  memberAdded: (
    payload: MemberEventPayload,
    context: AuditContext
  ): Promise<void> => {
    return logAuditEvent('member.added', payload, context);
  },

  /**
   * Log member removal (Requirement 5.5)
   */
  memberRemoved: (
    payload: MemberEventPayload,
    context: AuditContext
  ): Promise<void> => {
    return logAuditEvent('member.removed', payload, context);
  },

  /**
   * Log member role change (Requirement 5.5)
   */
  memberRoleChanged: (
    payload: MemberEventPayload,
    context: AuditContext
  ): Promise<void> => {
    return logAuditEvent('member.role_changed', payload, context);
  },
};
