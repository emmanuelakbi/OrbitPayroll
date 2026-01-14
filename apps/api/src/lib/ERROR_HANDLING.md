# Error Handling Implementation

This document describes the user-friendly error handling implementation for OrbitPayroll.

## Overview

The error handling system provides clear, actionable error messages to users without technical jargon, following Requirements 3.1, 3.2, 3.3, 3.4, 3.5, and 3.6.

## Backend Error Messages

All error messages in `errors.ts` have been updated to be user-friendly:

### Authentication Errors
- **AUTH_001**: "Your session has expired. Please reconnect your wallet to continue."
- **AUTH_002**: "We couldn't verify your wallet signature. Please try signing the message again."
- **AUTH_003**: "Your session has ended. Please reconnect your wallet to continue."
- **AUTH_004**: "Your authentication is invalid. Please reconnect your wallet."

### Organization Errors
- **ORG_001**: "Organization name must be between 1 and 100 characters. Please choose a valid name."
- **ORG_002**: "You don't have access to this organization. Please contact the organization owner."
- **ORG_003**: "You don't have permission to perform this action. Contact your organization admin for access."
- **ORG_004**: "We couldn't find this organization. It may have been removed or you may not have access."

### Contractor Errors
- **CONT_001**: "The wallet address format is invalid. Please check and enter a valid Ethereum address (0x followed by 40 characters)."
- **CONT_002**: "A contractor with this wallet address already exists in your organization. Please use a different wallet address."
- **CONT_003**: "The payment rate must be a positive number greater than zero."
- **CONT_004**: "We couldn't find this contractor. They may have been removed from your organization."

### Payroll Errors
- **PAY_001**: "The transaction hash format is invalid. Please check and try again."
- **PAY_002**: "We couldn't find this payroll run. It may have been removed or you may not have access."

## Frontend Error Handling

### Error Message Mapping

The `error-messages.ts` file provides comprehensive error code to human-readable message mapping with:
- Clear, non-technical titles
- Descriptive explanations
- Suggested recovery actions

### Key Features

1. **User-Friendly Messages** (Requirement 3.1)
   - All error messages avoid technical jargon
   - Messages are written in plain language
   - Titles start with capital letters

2. **Recovery Actions** (Requirement 3.2)
   - Most errors include suggested actions (e.g., "Try Again", "Reconnect Wallet")
   - Actions are contextual and actionable

3. **Retry Logic** (Requirement 3.3)
   - API client automatically retries transient failures (network, timeout, rate limit)
   - Uses exponential backoff (1s, 2s, 4s)
   - Maximum 3 retry attempts
   - Handles 429 (rate limit) responses with backoff

4. **Input Preservation** (Requirement 3.4)
   - Form components preserve user input on errors
   - `shouldPreserveInput()` helper determines when to preserve input
   - Auth errors clear input (user needs to reconnect)

5. **Error Pattern Detection**
   - Automatically detects common error patterns:
     - Network errors (fetch failed, offline)
     - Timeout errors
     - Transaction rejections
     - Insufficient gas
     - RPC errors

### Helper Functions

```typescript
// Get human-readable error message
getErrorMessage(error: ApiError | Error | unknown): ErrorMessage

// Check if error is retryable
isRetryableError(error: ApiError | Error | unknown): boolean

// Check if form input should be preserved
shouldPreserveInput(error: ApiError | Error | unknown): boolean

// Get suggested action for error
getErrorAction(error: ApiError | Error | unknown): string | undefined

// Check if error matches specific code
isErrorCode(error: unknown, code: string): boolean
```

### Toast Notifications

The `useAppToast` hook provides enhanced error display:

```typescript
// Show error with automatic message mapping
toast.error(error)

// Show error with custom action
toast.error(error, undefined, () => handleRetry())

// Show error with automatic retry for retryable errors
toast.errorWithRetry(error, () => handleRetry())

// Show transaction error with retry
toast.transaction.error(error, () => handleRetry())
```

## API Client Retry Logic

The API client implements automatic retry with exponential backoff:

```typescript
// Retryable errors:
- Network errors (fetch failed)
- Timeout errors
- RPC errors
- Rate limit (429)
- Server errors (500)

// Retry configuration:
- Maximum 3 attempts
- Exponential backoff: 1s, 2s, 4s
- Maximum backoff: 10s
```

## Testing

All error handling is covered by property-based tests in `error-messages.property.test.ts`:

- Property 4.1: All predefined error messages are human-readable
- Property 4.2: getErrorMessage always returns a valid message
- Property 4.3: Error codes are correctly identified
- Property 4.4: Action suggestions are provided where applicable
- Property 4.5: Error message consistency

## Usage Examples

### Backend

```typescript
// Throw user-friendly error
throw ContractorError.duplicateWallet();
// Returns: "A contractor with this wallet address already exists in your organization. Please use a different wallet address."
```

### Frontend

```typescript
// Display error in toast
try {
  await api.contractors.create(orgId, data);
} catch (error) {
  toast.error(error); // Automatically maps to user-friendly message
}

// Display error with retry
try {
  await api.contractors.create(orgId, data);
} catch (error) {
  toast.errorWithRetry(error, () => handleRetry());
}
```

## Requirements Coverage

- ✅ **3.1**: Display user-friendly error messages (no technical jargon)
- ✅ **3.2**: Provide suggested actions for common errors
- ✅ **3.3**: Allow retry for transient failures (network, RPC)
- ✅ **3.4**: Preserve user input on form submission errors
- ✅ **3.5**: Implement optimistic updates with rollback on failure (existing)
- ✅ **3.6**: Not crash on unexpected errors (catch and log) (existing)
