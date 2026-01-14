/**
 * Authorization Middleware (RBAC)
 *
 * Implements Role-Based Access Control for organization-scoped endpoints.
 * Validates org membership and role permissions.
 *
 * Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7
 */

import type { Request, Response, NextFunction } from 'express';
import type { Role } from '@orbitpayroll/database';
import { db } from '../lib/db.js';
import { OrgError } from '../lib/errors.js';
import { logger } from '../lib/logger.js';
import { auditLogger } from '../lib/audit-logger.js';

// Extend Express Request type to include membership
declare global {
  namespace Express {
    interface Request {
      membership?: {
        id: string;
        orgId: string;
        userId: string;
        role: Role;
      };
    }
  }
}

/**
 * Role hierarchy for permission checks.
 * OWNER_ADMIN has all permissions, FINANCE_OPERATOR has limited permissions.
 */
const ROLE_HIERARCHY: Record<Role, number> = {
  OWNER_ADMIN: 100,
  FINANCE_OPERATOR: 50,
};

/**
 * Check if a user's role satisfies the required role.
 * OWNER_ADMIN can perform any action.
 * FINANCE_OPERATOR can only perform actions requiring FINANCE_OPERATOR or lower.
 */
function hasPermission(userRole: Role, requiredRole: Role): boolean {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[requiredRole];
}

/**
 * Middleware factory to require organization membership.
 * Attaches membership info to req.membership if valid.
 *
 * @param orgIdParam - The name of the route parameter containing the org ID (default: 'id')
 */
export function requireMembership(orgIdParam: string = 'id') {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      const orgId = req.params[orgIdParam];
      const userId = req.user?.id;

      // User must be authenticated
      if (!userId) {
        logger.warn(
          { action: 'membership_check', orgId, reason: 'unauthenticated' },
          'Authorization failed: user not authenticated'
        );
        return next(OrgError.notMember());
      }

      // Org ID must be provided
      if (!orgId) {
        logger.warn(
          { action: 'membership_check', userId, reason: 'missing_org_id' },
          'Authorization failed: org ID not provided'
        );
        return next(OrgError.notFound());
      }

      // Check if org exists
      const org = await db.organization.findUnique({
        where: { id: orgId },
        select: { id: true },
      });

      if (!org) {
        logger.warn(
          { action: 'membership_check', userId, orgId, reason: 'org_not_found' },
          'Authorization failed: organization not found'
        );
        return next(OrgError.notFound());
      }

      // Check membership
      const membership = await db.orgMember.findUnique({
        where: {
          orgId_userId: {
            orgId,
            userId,
          },
        },
        select: {
          id: true,
          orgId: true,
          userId: true,
          role: true,
        },
      });

      if (!membership) {
        logger.warn(
          { action: 'membership_check', userId, orgId, reason: 'not_member' },
          'Authorization failed: user is not a member of organization'
        );
        return next(OrgError.notMember());
      }

      // Attach membership to request
      req.membership = membership;

      next();
    } catch (error) {
      next(error);
    }
  };
}

/**
 * Middleware factory to require a specific role (or higher).
 * Must be used after requireMembership or authenticate middleware.
 *
 * @param roles - One or more roles that are allowed to access the endpoint.
 *                If multiple roles are provided, user must have at least one of them.
 * @returns Express middleware that checks role permissions
 */
export function requireRole(...roles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      const membership = req.membership;
      const userId = req.user?.id;
      const orgId = req.params.id || req.params.orgId;

      // Membership must be attached (requireMembership should be called first)
      if (!membership) {
        logger.warn(
          { action: 'role_check', userId, orgId, requiredRoles: roles, reason: 'no_membership' },
          'Authorization failed: membership not found in request'
        );
        next(OrgError.notMember());
        return;
      }

      // Check if user has any of the required roles
      const hasRequiredRole = roles.some((role) => hasPermission(membership.role, role));

      if (!hasRequiredRole) {
        logger.warn(
          {
            action: 'role_check',
            userId: membership.userId,
            orgId: membership.orgId,
            userRole: membership.role,
            requiredRoles: roles,
            reason: 'insufficient_role',
          },
          'Authorization failed: insufficient role permissions'
        );
        // Audit log: authorization failure (Requirement 5.2)
        auditLogger.authorizationFailure(
          {
            action: req.method + ' ' + req.path,
            resource: req.path,
            requiredRole: roles.join(', '),
            actualRole: membership.role,
          },
          {
            userId: membership.userId,
            orgId: membership.orgId,
          }
        );
        next(OrgError.insufficientRole());
        return;
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}

/**
 * Combined middleware that checks both membership and role in one step.
 * Convenience function for common use case.
 *
 * @param roles - One or more roles that are allowed to access the endpoint.
 * @param orgIdParam - The name of the route parameter containing the org ID (default: 'id')
 */
export function authorize(roles: Role[], orgIdParam: string = 'id') {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      const orgId = req.params[orgIdParam];
      const userId = req.user?.id;

      // User must be authenticated
      if (!userId) {
        logger.warn(
          { action: 'authorize', orgId, requiredRoles: roles, reason: 'unauthenticated' },
          'Authorization failed: user not authenticated'
        );
        return next(OrgError.notMember());
      }

      // Org ID must be provided
      if (!orgId) {
        logger.warn(
          { action: 'authorize', userId, requiredRoles: roles, reason: 'missing_org_id' },
          'Authorization failed: org ID not provided'
        );
        return next(OrgError.notFound());
      }

      // Check if org exists
      const org = await db.organization.findUnique({
        where: { id: orgId },
        select: { id: true },
      });

      if (!org) {
        logger.warn(
          { action: 'authorize', userId, orgId, requiredRoles: roles, reason: 'org_not_found' },
          'Authorization failed: organization not found'
        );
        return next(OrgError.notFound());
      }

      // Check membership
      const membership = await db.orgMember.findUnique({
        where: {
          orgId_userId: {
            orgId,
            userId,
          },
        },
        select: {
          id: true,
          orgId: true,
          userId: true,
          role: true,
        },
      });

      if (!membership) {
        logger.warn(
          { action: 'authorize', userId, orgId, requiredRoles: roles, reason: 'not_member' },
          'Authorization failed: user is not a member of organization'
        );
        return next(OrgError.notMember());
      }

      // Check if user has any of the required roles
      const hasRequiredRole = roles.some((role) => hasPermission(membership.role, role));

      if (!hasRequiredRole) {
        logger.warn(
          {
            action: 'authorize',
            userId: membership.userId,
            orgId: membership.orgId,
            userRole: membership.role,
            requiredRoles: roles,
            reason: 'insufficient_role',
          },
          'Authorization failed: insufficient role permissions'
        );
        // Audit log: authorization failure (Requirement 5.2)
        auditLogger.authorizationFailure(
          {
            action: req.method + ' ' + req.path,
            resource: req.path,
            requiredRole: roles.join(', '),
            actualRole: membership.role,
          },
          {
            userId: membership.userId,
            orgId: membership.orgId,
          }
        );
        return next(OrgError.insufficientRole());
      }

      // Attach membership to request
      req.membership = membership;

      next();
    } catch (error) {
      next(error);
    }
  };
}

/**
 * Middleware to prevent privilege escalation.
 * Users cannot grant roles higher than their own.
 *
 * @param roleField - The name of the body field containing the target role (default: 'role')
 * @returns Express middleware that prevents privilege escalation
 * @see Requirements: 3.5
 */
export function preventPrivilegeEscalation(roleField: string = 'role') {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      const membership = req.membership;
      const body = req.body as Record<string, unknown>;
      const targetRole = body[roleField] as Role | undefined;

      if (!membership) {
        next(OrgError.notMember());
        return;
      }

      // If no role is being set, allow the request
      if (!targetRole) {
        next();
        return;
      }

      // Check if user is trying to grant a higher role than their own
      if (ROLE_HIERARCHY[targetRole] > ROLE_HIERARCHY[membership.role]) {
        logger.warn(
          {
            action: 'privilege_escalation_check',
            userId: membership.userId,
            orgId: membership.orgId,
            userRole: membership.role,
            targetRole,
            reason: 'privilege_escalation_attempt',
          },
          'Authorization failed: attempted privilege escalation'
        );
        // Audit log: authorization failure (Requirement 5.2)
        auditLogger.authorizationFailure(
          {
            action: 'privilege_escalation',
            resource: req.path,
            requiredRole: targetRole,
            actualRole: membership.role,
          },
          {
            userId: membership.userId,
            orgId: membership.orgId,
          }
        );
        next(OrgError.insufficientRole());
        return;
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}
