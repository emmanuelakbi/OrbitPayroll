import type { ApiError } from "./api/types";

/**
 * Human-readable error messages mapped from API error codes.
 * Each message avoids technical jargon and provides actionable guidance.
 */
export interface ErrorMessage {
  title: string;
  description: string;
  action?: string;
}

/**
 * Error code to human-readable message mapping.
 * Follows Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6 for clear, non-technical error messages with recovery actions.
 */
export const errorMessages: Record<string, ErrorMessage> = {
  // Authentication errors
  AUTH_001: {
    title: "Session Expired",
    description: "Your session has ended. Please reconnect your wallet to continue.",
    action: "Reconnect Wallet",
  },
  AUTH_002: {
    title: "Signature Verification Failed",
    description: "We couldn't verify your wallet signature. Please try signing the message again.",
    action: "Try Again",
  },
  AUTH_003: {
    title: "Session Expired",
    description: "Your session has ended. Please reconnect your wallet to continue.",
    action: "Reconnect Wallet",
  },
  AUTH_004: {
    title: "Authentication Invalid",
    description: "Your authentication is invalid. Please reconnect your wallet.",
    action: "Reconnect Wallet",
  },

  // Organization errors
  ORG_001: {
    title: "Invalid Organization Name",
    description: "Organization name must be between 1 and 100 characters. Please choose a valid name.",
    action: "Try Again",
  },
  ORG_002: {
    title: "Access Denied",
    description: "You don't have access to this organization. Please contact the organization owner.",
  },
  ORG_003: {
    title: "Permission Denied",
    description: "You don't have permission to perform this action. Contact your organization admin for access.",
  },
  ORG_004: {
    title: "Organization Not Found",
    description: "We couldn't find this organization. It may have been removed or you may not have access.",
  },

  // Contractor errors
  CONT_001: {
    title: "Invalid Wallet Address",
    description: "The wallet address format is invalid. Please check and enter a valid Ethereum address.",
    action: "Check Address",
  },
  CONT_002: {
    title: "Duplicate Wallet Address",
    description: "A contractor with this wallet address already exists in your organization. Please use a different wallet address.",
    action: "Use Different Address",
  },
  CONT_003: {
    title: "Invalid Payment Rate",
    description: "The payment rate must be a positive number greater than zero.",
    action: "Enter Valid Rate",
  },
  CONT_004: {
    title: "Contractor Not Found",
    description: "We couldn't find this contractor. They may have been removed from your organization.",
  },

  // Payroll errors
  PAY_001: {
    title: "Insufficient Balance",
    description: "Your treasury doesn't have enough MNEE to run this payroll. Please deposit more funds.",
    action: "Deposit MNEE",
  },
  PAY_002: {
    title: "Payroll Run Not Found",
    description: "We couldn't find this payroll run. It may have been removed or you may not have access.",
  },

  // Notification errors
  NOTIF_001: {
    title: "Notification Not Found",
    description: "We couldn't find this notification. It may have been removed.",
  },

  // Treasury errors
  TREAS_001: {
    title: "Treasury Not Configured",
    description: "Your organization's treasury hasn't been set up yet. Please configure it in organization settings.",
    action: "Configure Treasury",
  },
  TREAS_002: {
    title: "Deposit Failed",
    description: "The deposit couldn't be completed. Please check your wallet balance and try again.",
    action: "Try Again",
  },
  TREAS_003: {
    title: "Withdrawal Failed",
    description: "The withdrawal couldn't be completed. Please check the amount and try again.",
    action: "Try Again",
  },

  // Transaction errors
  TX_REJECTED: {
    title: "Transaction Rejected",
    description: "You cancelled the transaction in your wallet. No changes were made.",
  },
  TX_FAILED: {
    title: "Transaction Failed",
    description: "The transaction couldn't be completed on the blockchain. This may be due to insufficient gas or network issues.",
    action: "Try Again",
  },
  TX_TIMEOUT: {
    title: "Transaction Timeout",
    description: "The transaction is taking longer than expected. Check your wallet or block explorer for the current status.",
    action: "Check Status",
  },
  TX_INSUFFICIENT_GAS: {
    title: "Insufficient Gas",
    description: "You don't have enough ETH to pay for transaction fees. Please add ETH to your wallet.",
    action: "Add ETH",
  },
  TX_UNDERPRICED: {
    title: "Gas Price Too Low",
    description: "The transaction gas price is too low. Please try again with a higher gas price.",
    action: "Retry with Higher Gas",
  },

  // Network errors
  NETWORK_ERROR: {
    title: "Connection Error",
    description: "Unable to reach the server. Please check your internet connection and try again.",
    action: "Retry",
  },
  NETWORK_OFFLINE: {
    title: "You're Offline",
    description: "Please check your internet connection and try again.",
    action: "Retry",
  },
  NETWORK_TIMEOUT: {
    title: "Request Timeout",
    description: "The request took too long to complete. Please try again.",
    action: "Retry",
  },
  RPC_ERROR: {
    title: "Blockchain Connection Error",
    description: "Unable to connect to the blockchain network. Please check your network settings or try again later.",
    action: "Retry",
  },

  // Validation errors
  VALIDATION_ERROR: {
    title: "Invalid Input",
    description: "Please check your input and correct any errors before submitting.",
    action: "Review Input",
  },
  CONFLICT: {
    title: "Duplicate Entry",
    description: "A record with this information already exists. Please use different values.",
    action: "Try Different Values",
  },
  NOT_FOUND: {
    title: "Not Found",
    description: "The requested resource was not found. It may have been removed or you may not have access.",
  },
  INVALID_REFERENCE: {
    title: "Invalid Reference",
    description: "The referenced item doesn't exist. Please check and try again.",
    action: "Check Reference",
  },

  // Rate limiting
  RATE_LIMIT: {
    title: "Too Many Requests",
    description: "You're making requests too quickly. Please wait a moment before trying again.",
    action: "Wait and Retry",
  },

  // Generic errors
  UNKNOWN_ERROR: {
    title: "Something Went Wrong",
    description: "An unexpected error occurred. Please try again or contact support if the problem persists.",
    action: "Try Again",
  },
  SERVER_ERROR: {
    title: "Server Error",
    description: "We're having trouble processing your request. Please try again later.",
    action: "Try Again Later",
  },
  INTERNAL_ERROR: {
    title: "Internal Error",
    description: "An internal error occurred. Our team has been notified. Please try again later.",
  },
};

/**
 * Get a human-readable error message from an API error.
 * Falls back to generic message if error code is not mapped.
 * Follows Requirements 3.1, 3.2 for user-friendly error messages.
 */
export function getErrorMessage(error: ApiError | Error | unknown): ErrorMessage {
  // Handle ApiError with code
  if (error && typeof error === "object" && "code" in error) {
    const apiError = error as ApiError;
    const mapped = errorMessages[apiError.code];
    if (mapped) {
      return mapped;
    }
    // Use the API message if no mapping exists
    return {
      title: "Error",
      description: apiError.message || "An error occurred. Please try again.",
      action: "Try Again",
    };
  }

  // Handle standard Error
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    
    // Check for common error patterns
    if (message.includes("network") || message.includes("fetch failed") || message.includes("failed to fetch")) {
      return errorMessages.NETWORK_ERROR;
    }
    if (message.includes("offline") || message.includes("no internet")) {
      return errorMessages.NETWORK_OFFLINE;
    }
    if (message.includes("timeout") || message.includes("timed out")) {
      return errorMessages.NETWORK_TIMEOUT;
    }
    if (message.includes("rejected") || message.includes("denied") || message.includes("user rejected")) {
      return errorMessages.TX_REJECTED;
    }
    if (message.includes("insufficient funds") || message.includes("insufficient balance")) {
      return errorMessages.TX_INSUFFICIENT_GAS;
    }
    if (message.includes("gas") && (message.includes("too low") || message.includes("underpriced"))) {
      return errorMessages.TX_UNDERPRICED;
    }
    if (message.includes("rpc") || message.includes("provider")) {
      return errorMessages.RPC_ERROR;
    }
    
    // Return error message with generic title
    return {
      title: "Error",
      description: error.message,
      action: "Try Again",
    };
  }

  // Fallback
  return errorMessages.UNKNOWN_ERROR;
}

/**
 * Check if an error is a specific type
 */
export function isErrorCode(error: unknown, code: string): boolean {
  return error !== null && typeof error === "object" && "code" in error && (error as ApiError).code === code;
}

/**
 * Get suggested action for an error, if any
 */
export function getErrorAction(error: ApiError | Error | unknown): string | undefined {
  const message = getErrorMessage(error);
  return message.action;
}

/**
 * Check if an error is retryable (transient failure)
 * Follows Requirement 3.3 for retry logic on transient failures.
 */
export function isRetryableError(error: ApiError | Error | unknown): boolean {
  if (error && typeof error === "object" && "code" in error) {
    const code = (error as ApiError).code;
    // Network errors, timeouts, and rate limits are retryable
    return [
      "NETWORK_ERROR",
      "NETWORK_TIMEOUT",
      "RPC_ERROR",
      "RATE_LIMIT",
      "SERVER_ERROR",
      "INTERNAL_ERROR",
    ].includes(code);
  }

  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    return (
      message.includes("network") ||
      message.includes("timeout") ||
      message.includes("fetch failed") ||
      message.includes("rpc") ||
      message.includes("rate limit")
    );
  }

  return false;
}

/**
 * Check if an error should preserve form input
 * Follows Requirement 3.4 for preserving user input on errors.
 */
export function shouldPreserveInput(error: ApiError | Error | unknown): boolean {
  if (error && typeof error === "object" && "code" in error) {
    const code = (error as ApiError).code;
    // Don't preserve input for auth errors (user needs to reconnect)
    if (code.startsWith("AUTH_")) {
      return false;
    }
    // Preserve input for validation, network, and server errors
    return true;
  }
  return true;
}
