# Implementation Plan: OrbitPayroll Integrations

## Overview

This task list covers external service integrations including RPC providers, wallet connectivity, and optional email.

## Tasks

- [x] 1. RPC Provider Integration
  - [x] 1.1 Configure viem public client
    - Set up primary RPC URL
    - Configure fallback provider
    - Implement retry logic
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7_

- [x] 2. Contract Integration
  - [x] 2.1 Set up contract ABIs
    - Create contracts/abis directory
    - Add MNEE ERC20 ABI
    - Add PayrollTreasury ABI
    - _Requirements: 2.1, 2.2, 4.1, 4.2, 4.3, 4.4, 4.5, 4.6_

  - [x] 2.2 Create addresses configuration
    - Create addresses.json for each network
    - Include MNEE address: 0x8ccedbAe4916b79da7F3F612EfB2EB93A2bFD6cF
    - _Requirements: 4.4_

- [x] 3. Wallet Integration
  - [x] 3.1 Configure wagmi connectors
    - Set up MetaMask (injected)
    - Set up WalletConnect
    - Set up Coinbase Wallet
    - _Requirements: 5.1, 5.2, 5.3, 5.4_

  - [x] 3.2 Implement network switching
    - Detect wrong network
    - Prompt user to switch
    - _Requirements: 5.5, 5.6_

- [x] 4. Block Explorer Integration
  - [x] 4.1 Create explorer URL utilities
    - Implement getTxUrl function
    - Implement getAddressUrl function
    - Support mainnet and testnet
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

- [x] 5. Email Integration (Optional)
  - [x] 5.1 Configure SendGrid client
    - Set up API key from env
    - Create email templates
    - Implement send function
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6_

- [x] 6. Final Checkpoint
  - Test RPC connectivity
  - Test wallet connection
  - Verify contract interactions work

## Notes

- Email integration is optional for MVP
- MNEE contract address is fixed: 0x8ccedbAe4916b79da7F3F612EfB2EB93A2bFD6cF
