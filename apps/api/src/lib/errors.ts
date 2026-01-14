/**
 * Custom Error Classes and Error Codes
 */

export const ErrorCode = {
  // Authentication errors
  AUTH_001: 'AUTH_001', // Nonce expired
  AUTH_002: 'AUTH_002', // Invalid signature
  AUTH_003: 'AUTH_003', // Token expired
  AUTH_004: 'AUTH_004', // Invalid token

  // Organization errors
  ORG_001: 'ORG_001', // Invalid org name
  ORG_002: 'ORG_002', // Not a member
  ORG_003: 'ORG_003', // Insufficient role
  ORG_004: 'ORG_004', // Org not found

  // Contractor errors
  CONT_001: 'CONT_001', // Invalid wallet address
  CONT_002: 'CONT_002', // Duplicate wallet
  CONT_003: 'CONT_003', // Invalid rate
  CONT_004: 'CONT_004', // Contractor not found

  // Payroll errors
  PAY_001: 'PAY_001', // Invalid tx hash
  PAY_002: 'PAY_002', // Payroll run not found

  // Notification errors
  NOTIF_001: 'NOTIF_001', // Notification not found

  // General errors
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  RATE_LIMIT: 'RATE_LIMIT',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
} as const;

export type ErrorCodeType = (typeof ErrorCode)[keyof typeof ErrorCode];

export class AppError extends Error {
  constructor(
    public readonly code: ErrorCodeType,
    message: string,
    public readonly statusCode: number = 400,
    public readonly details?: Record<string, string[]>
  ) {
    super(message);
    this.name = 'AppError';
    Error.captureStackTrace(this, this.constructor);
  }
}

// Convenience factory functions
export const AuthError = {
  nonceExpired: () =>
    new AppError(ErrorCode.AUTH_001, 'Your session has expired. Please reconnect your wallet to continue.', 401),
  invalidSignature: () =>
    new AppError(ErrorCode.AUTH_002, 'We couldn\'t verify your wallet signature. Please try signing the message again.', 401),
  tokenExpired: () =>
    new AppError(ErrorCode.AUTH_003, 'Your session has ended. Please reconnect your wallet to continue.', 401),
  invalidToken: () =>
    new AppError(ErrorCode.AUTH_004, 'Your authentication is invalid. Please reconnect your wallet.', 401),
};

export const OrgError = {
  invalidName: () =>
    new AppError(ErrorCode.ORG_001, 'Organization name must be between 1 and 100 characters. Please choose a valid name.', 400),
  notMember: () =>
    new AppError(ErrorCode.ORG_002, 'You don\'t have access to this organization. Please contact the organization owner.', 403),
  insufficientRole: () =>
    new AppError(ErrorCode.ORG_003, 'You don\'t have permission to perform this action. Contact your organization admin for access.', 403),
  notFound: () =>
    new AppError(ErrorCode.ORG_004, 'We couldn\'t find this organization. It may have been removed or you may not have access.', 404),
};

export const ContractorError = {
  invalidWallet: () =>
    new AppError(ErrorCode.CONT_001, 'The wallet address format is invalid. Please check and enter a valid Ethereum address (0x followed by 40 characters).', 400),
  duplicateWallet: () =>
    new AppError(ErrorCode.CONT_002, 'A contractor with this wallet address already exists in your organization. Please use a different wallet address.', 409),
  invalidRate: () =>
    new AppError(ErrorCode.CONT_003, 'The payment rate must be a positive number greater than zero.', 400),
  notFound: () =>
    new AppError(ErrorCode.CONT_004, 'We couldn\'t find this contractor. They may have been removed from your organization.', 404),
};

export const PayrollError = {
  invalidTxHash: () =>
    new AppError(ErrorCode.PAY_001, 'The transaction hash format is invalid. Please check and try again.', 400),
  notFound: () =>
    new AppError(ErrorCode.PAY_002, 'We couldn\'t find this payroll run. It may have been removed or you may not have access.', 404),
};

export const NotificationError = {
  notFound: () =>
    new AppError(ErrorCode.NOTIF_001, 'We couldn\'t find this notification. It may have been removed.', 404),
};
