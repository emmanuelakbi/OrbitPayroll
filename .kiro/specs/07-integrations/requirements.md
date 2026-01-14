# Requirements Document: OrbitPayroll Integrations

## Introduction

This document specifies the external integration requirements for OrbitPayroll, defining how the system connects to Ethereum networks, interacts with the MNEE token contract, and optionally integrates with email services for notifications.

## Glossary

- **RPC_Provider**: External service providing Ethereum JSON-RPC access (Infura, Alchemy, etc.)
- **MNEE_Contract**: ERC20 token contract at `0x8ccedbAe4916b79da7F3F612EfB2EB93A2bFD6cF`
- **Web3_Client**: Library for Ethereum interactions (ethers.js, viem, web3.js)
- **ABI**: Application Binary Interface defining contract function signatures
- **Block_Explorer**: Service for viewing blockchain transactions (Etherscan)
- **Email_Provider**: Transactional email service (SendGrid, Mailgun, AWS SES)
- **Wallet_Provider**: Browser extension or mobile app for signing transactions

## Requirements

### Requirement 1: Ethereum RPC Provider Integration

**User Story:** As a system, I want reliable Ethereum network access, so that I can read blockchain state and broadcast transactions.

#### Acceptance Criteria

1. THE Integration_Layer SHALL support configurable RPC provider URL via environment variable
2. THE Integration_Layer SHALL support multiple RPC providers for redundancy
3. THE Integration_Layer SHALL implement automatic failover when primary RPC fails
4. THE Integration_Layer SHALL cache RPC responses where appropriate (block number, gas price)
5. THE Integration_Layer SHALL implement request timeout (30 seconds default)
6. THE Integration_Layer SHALL log all RPC errors with method name and parameters
7. THE Integration_Layer SHALL support both mainnet and testnet configurations

### Requirement 2: MNEE Token Contract Integration

**User Story:** As a system, I want to interact with the MNEE token, so that I can query balances and execute transfers.

#### Acceptance Criteria

1. THE Integration_Layer SHALL store MNEE contract address as configuration: `0x8ccedbAe4916b79da7F3F612EfB2EB93A2bFD6cF`
2. THE Integration_Layer SHALL maintain MNEE ERC20 ABI in version-controlled JSON file
3. THE Integration_Layer SHALL implement `balanceOf(address)` query for treasury balance
4. THE Integration_Layer SHALL implement `allowance(owner, spender)` query for approval checks
5. THE Integration_Layer SHALL implement `approve(spender, amount)` transaction builder
6. THE Integration_Layer SHALL implement `transfer(to, amount)` transaction builder
7. THE Integration_Layer SHALL handle MNEE decimal places correctly (query decimals() on init)

### Requirement 3: Web3 Client Module

**User Story:** As a developer, I want a shared Web3 client, so that blockchain interactions are consistent across the application.

#### Acceptance Criteria

1. THE Integration_Layer SHALL provide a singleton Web3_Client instance
2. THE Web3_Client SHALL use ethers.js v6 or viem as the underlying library
3. THE Web3_Client SHALL expose methods for: getBalance, getBlock, getTransaction, estimateGas
4. THE Web3_Client SHALL support both read-only provider and signer-connected provider
5. THE Web3_Client SHALL be usable from both frontend and backend (isomorphic where possible)
6. THE Web3_Client SHALL implement retry logic for transient RPC failures (3 retries with backoff)

### Requirement 4: Contract ABI Management

**User Story:** As a developer, I want centralized ABI management, so that contract interfaces are consistent and versioned.

#### Acceptance Criteria

1. THE Integration_Layer SHALL store all contract ABIs in `/contracts/abis/` directory
2. THE Integration_Layer SHALL include: MNEE.json, PayrollTreasury.json, PayrollManager.json
3. THE Integration_Layer SHALL store deployed contract addresses in `/contracts/addresses.json`
4. THE addresses.json SHALL support multiple networks: { mainnet: {...}, sepolia: {...}, localhost: {...} }
5. THE Integration_Layer SHALL provide TypeScript types generated from ABIs
6. THE Integration_Layer SHALL update addresses.json after each deployment

### Requirement 5: Wallet Provider Integration

**User Story:** As a frontend, I want to connect to user wallets, so that users can sign transactions.

#### Acceptance Criteria

1. THE Integration_Layer SHALL support MetaMask browser extension
2. THE Integration_Layer SHALL support WalletConnect protocol for mobile wallets
3. THE Integration_Layer SHALL support Coinbase Wallet
4. THE Integration_Layer SHALL use wagmi or RainbowKit for wallet connection abstraction
5. THE Integration_Layer SHALL detect and display current connected network
6. THE Integration_Layer SHALL prompt network switch if user is on wrong network
7. THE Integration_Layer SHALL handle wallet disconnection gracefully

### Requirement 6: Transaction Building and Signing

**User Story:** As a frontend, I want to build and sign transactions, so that users can execute on-chain operations.

#### Acceptance Criteria

1. THE Integration_Layer SHALL build transactions client-side (never on backend)
2. THE Integration_Layer SHALL estimate gas before presenting transaction to user
3. THE Integration_Layer SHALL allow gas limit override with reasonable buffer (20%)
4. THE Integration_Layer SHALL support EIP-1559 gas pricing where available
5. THE Integration_Layer SHALL track transaction status after broadcast
6. THE Integration_Layer SHALL implement transaction receipt polling with timeout
7. THE Integration_Layer SHALL parse transaction logs for event data

### Requirement 7: Block Explorer Integration

**User Story:** As a user, I want links to block explorer, so that I can verify transactions independently.

#### Acceptance Criteria

1. THE Integration_Layer SHALL generate Etherscan links for transaction hashes
2. THE Integration_Layer SHALL generate Etherscan links for contract addresses
3. THE Integration_Layer SHALL support network-specific explorer URLs (mainnet, sepolia, etc.)
4. THE Integration_Layer SHALL provide utility function: `getExplorerUrl(type, hash, network)`
5. THE Integration_Layer SHALL open explorer links in new tab

### Requirement 8: Email Provider Integration (Optional)

**User Story:** As a system, I want to send email notifications, so that users receive alerts outside the application.

#### Acceptance Criteria

1. WHERE email notifications are enabled THEN the Integration_Layer SHALL support SendGrid or Mailgun
2. THE Integration_Layer SHALL use environment variables for email API credentials
3. THE Integration_Layer SHALL implement email templates for: payroll_scheduled, payroll_executed, low_balance
4. THE Integration_Layer SHALL queue emails for async sending (not blocking API responses)
5. THE Integration_Layer SHALL log email send failures without crashing
6. THE Integration_Layer SHALL support disabling email via feature flag for MVP

### Requirement 9: Environment Configuration

**User Story:** As a DevOps engineer, I want clear environment configuration, so that I can deploy to different environments.

#### Acceptance Criteria

1. THE Integration_Layer SHALL use environment variables for all external service configuration
2. THE Integration_Layer SHALL provide `.env.example` with all required variables documented
3. THE Integration_Layer SHALL validate required environment variables at startup
4. THE Integration_Layer SHALL support these variables at minimum:
   - `ETHEREUM_RPC_URL`: Primary RPC endpoint
   - `ETHEREUM_RPC_URL_FALLBACK`: Backup RPC endpoint (optional)
   - `ETHEREUM_NETWORK`: Network name (mainnet, sepolia, localhost)
   - `MNEE_CONTRACT_ADDRESS`: MNEE token address
   - `EMAIL_API_KEY`: Email provider API key (optional)
   - `EMAIL_FROM_ADDRESS`: Sender email address (optional)
5. IF required variable is missing THEN the Integration_Layer SHALL fail fast with descriptive error

### Requirement 10: Error Handling and Logging

**User Story:** As a developer, I want comprehensive error handling, so that I can debug integration issues.

#### Acceptance Criteria

1. THE Integration_Layer SHALL wrap all external calls in try-catch
2. THE Integration_Layer SHALL log RPC errors with: method, params, error message, timestamp
3. THE Integration_Layer SHALL implement circuit breaker for repeated RPC failures
4. THE Integration_Layer SHALL expose health check endpoint for RPC connectivity
5. THE Integration_Layer SHALL distinguish between user errors and system errors
6. THE Integration_Layer SHALL provide meaningful error messages for common failures:
   - "Network unavailable" for RPC timeout
   - "Insufficient MNEE balance" for transfer failures
   - "Transaction rejected" for user cancellation
