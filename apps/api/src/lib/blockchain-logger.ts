/**
 * Blockchain Operation Logger
 *
 * Provides structured logging for blockchain/RPC operations including:
 * - RPC calls with method and duration (Requirements: 4.1)
 * - RPC errors with method, params (sanitized), error (Requirements: 4.2)
 * - Transaction submissions with tx_hash (Requirements: 4.3)
 * - Transaction confirmations with block_number (Requirements: 4.4)
 * - Contract events received (Requirements: 4.5)
 * - Sanitization of sensitive data (Requirements: 4.6)
 *
 * @module lib/blockchain-logger
 */

import { logger, type LogContext } from './logger.js';

/**
 * Sensitive fields that should be redacted from logs
 * Requirements: 4.6 - SHALL NOT log private keys or signatures
 */
const SENSITIVE_FIELDS = [
  'privateKey',
  'private_key',
  'signature',
  'sig',
  'signedTransaction',
  'signed_transaction',
  'mnemonic',
  'seed',
  'secret',
  'password',
  'apiKey',
  'api_key',
];

/**
 * Sanitize parameters by redacting sensitive fields
 * Requirements: 4.6
 *
 * @param params - Parameters to sanitize
 * @returns Sanitized parameters safe for logging
 */
export function sanitizeParams(params: unknown): unknown {
  if (params === null || params === undefined) {
    return params;
  }

  if (typeof params !== 'object') {
    return params;
  }

  if (Array.isArray(params)) {
    return params.map(sanitizeParams);
  }

  const sanitized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(params as Record<string, unknown>)) {
    const lowerKey = key.toLowerCase();
    if (SENSITIVE_FIELDS.some((field) => lowerKey.includes(field.toLowerCase()))) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeParams(value);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

/**
 * RPC call log context
 */
export interface RpcCallContext extends LogContext {
  rpcMethod: string;
  durationMs: number;
  params?: unknown;
  result?: unknown;
}

/**
 * RPC error log context
 */
export interface RpcErrorContext extends LogContext {
  rpcMethod: string;
  durationMs: number;
  params?: unknown;
  errorCode?: string | number;
  errorMessage: string;
}

/**
 * Transaction submission log context
 */
export interface TxSubmissionContext extends LogContext {
  txHash: string;
  from?: string;
  to?: string;
  value?: string;
  gasLimit?: string;
  nonce?: number;
}

/**
 * Transaction confirmation log context
 */
export interface TxConfirmationContext extends LogContext {
  txHash: string;
  blockNumber: number;
  blockHash?: string;
  confirmations?: number;
  status?: 'success' | 'reverted';
  gasUsed?: string;
}

/**
 * Contract event log context
 */
export interface ContractEventContext extends LogContext {
  eventName: string;
  contractAddress: string;
  blockNumber: number;
  txHash: string;
  args?: Record<string, unknown>;
}

/**
 * Blockchain logger with specialized methods for RPC operations
 */
export const blockchainLogger = {
  /**
   * Log an RPC call with method and duration
   * Requirements: 4.1
   *
   * @param context - RPC call context including method and duration
   * @param message - Optional custom message
   */
  rpcCall(context: RpcCallContext, message?: string): void {
    const sanitizedContext = {
      ...context,
      params: context.params ? sanitizeParams(context.params) : undefined,
      result: context.result ? sanitizeParams(context.result) : undefined,
    };

    logger.info(
      {
        type: 'rpc_call',
        ...sanitizedContext,
      },
      message ?? `RPC call: ${context.rpcMethod}`
    );
  },

  /**
   * Log an RPC error with method, params (sanitized), and error details
   * Requirements: 4.2
   *
   * @param context - RPC error context
   * @param message - Optional custom message
   */
  rpcError(context: RpcErrorContext, message?: string): void {
    const sanitizedContext = {
      ...context,
      params: context.params ? sanitizeParams(context.params) : undefined,
    };

    logger.error(
      {
        type: 'rpc_error',
        ...sanitizedContext,
      },
      message ?? `RPC error: ${context.rpcMethod} - ${context.errorMessage}`
    );
  },

  /**
   * Log a transaction submission with tx_hash
   * Requirements: 4.3
   *
   * @param context - Transaction submission context
   * @param message - Optional custom message
   */
  txSubmission(context: TxSubmissionContext, message?: string): void {
    logger.info(
      {
        type: 'tx_submission',
        ...context,
      },
      message ?? `Transaction submitted: ${context.txHash}`
    );
  },

  /**
   * Log a transaction confirmation with block_number
   * Requirements: 4.4
   *
   * @param context - Transaction confirmation context
   * @param message - Optional custom message
   */
  txConfirmation(context: TxConfirmationContext, message?: string): void {
    const logLevel = context.status === 'reverted' ? 'warn' : 'info';

    logger[logLevel](
      {
        type: 'tx_confirmation',
        ...context,
      },
      message ?? `Transaction confirmed: ${context.txHash} at block ${context.blockNumber}`
    );
  },

  /**
   * Log a contract event received
   * Requirements: 4.5
   *
   * @param context - Contract event context
   * @param message - Optional custom message
   */
  contractEvent(context: ContractEventContext, message?: string): void {
    const sanitizedContext = {
      ...context,
      args: context.args ? sanitizeParams(context.args) : undefined,
    };

    logger.info(
      {
        type: 'contract_event',
        ...sanitizedContext,
      },
      message ?? `Contract event: ${context.eventName} from ${context.contractAddress}`
    );
  },
};

/**
 * Wrapper to execute and log an RPC call with timing
 * Requirements: 4.1, 4.2
 *
 * @param method - RPC method name
 * @param fn - Async function to execute
 * @param params - Optional parameters for logging
 * @param context - Optional additional context
 * @returns Promise resolving to the function result
 */
export async function withRpcLogging<T>(
  method: string,
  fn: () => Promise<T>,
  params?: unknown,
  context?: LogContext
): Promise<T> {
  const start = Date.now();

  try {
    const result = await fn();
    const durationMs = Date.now() - start;

    blockchainLogger.rpcCall({
      rpcMethod: method,
      durationMs,
      params,
      ...context,
    });

    return result;
  } catch (error) {
    const durationMs = Date.now() - start;
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorCode = (error as { code?: string | number })?.code;

    blockchainLogger.rpcError({
      rpcMethod: method,
      durationMs,
      params,
      errorCode,
      errorMessage,
      ...context,
    });

    throw error;
  }
}

/**
 * Log transaction lifecycle from submission to confirmation
 * Requirements: 4.3, 4.4
 *
 * @param txHash - Transaction hash
 * @param submissionContext - Context for submission log
 * @param waitForConfirmation - Function to wait for confirmation
 * @param context - Optional additional context
 * @returns Promise resolving to the confirmation receipt
 */
export async function logTransactionLifecycle<T extends { blockNumber: number; status?: number }>(
  txHash: string,
  submissionContext: Omit<TxSubmissionContext, 'txHash'>,
  waitForConfirmation: () => Promise<T>,
  context?: LogContext
): Promise<T> {
  // Log submission
  blockchainLogger.txSubmission({
    txHash,
    ...submissionContext,
    ...context,
  });

  // Wait for and log confirmation
  const receipt = await waitForConfirmation();

  blockchainLogger.txConfirmation({
    txHash,
    blockNumber: receipt.blockNumber,
    status: receipt.status === 1 ? 'success' : 'reverted',
    ...context,
  });

  return receipt;
}

export default blockchainLogger;
