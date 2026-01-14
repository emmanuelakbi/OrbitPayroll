# Implementation Plan: OrbitPayroll Smart Contracts

## Overview

This task list covers the implementation of PayrollTreasury smart contract using Solidity, including security patterns, comprehensive testing, and deployment to testnet.

## Tasks

- [x] 1. Smart Contract Project Setup
  - [x] 1.1 Initialize Hardhat project
    - Create `packages/contracts` directory
    - Install hardhat, @openzeppelin/contracts, ethers
    - Configure hardhat.config.ts for Sepolia and mainnet
    - _Requirements: 10.1_

  - [x] 1.2 Create mock MNEE token for testing
    - Implement simple ERC20 mock
    - Add mint function for testing
    - _Requirements: 10.6_

- [x] 2. PayrollTreasury Contract Implementation
  - [x] 2.1 Implement contract skeleton and constructor
    - Define state variables (admin, mneeToken)
    - Implement constructor with validation
    - Emit TreasuryCreated event
    - _Requirements: 1.1, 1.2, 1.3, 1.5_

  - [x] 2.2 Implement deposit function
    - Use SafeERC20 for transfers
    - Add nonReentrant modifier
    - Emit Deposited event
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6_

  - [x] 2.3 Implement getBalance function
    - Query MNEE balanceOf
    - Make it a view function
    - _Requirements: 3.1, 3.2, 3.3_

  - [x] 2.4 Implement runPayroll function
    - Add onlyAdmin modifier
    - Validate array inputs
    - Calculate and verify total
    - Execute batch transfers
    - Emit PayrollExecuted event
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8, 4.9, 4.10, 4.11_

  - [x] 2.5 Implement admin management functions
    - Implement setAdmin with validation
    - Implement getAdmin view function
    - Emit AdminChanged event
    - _Requirements: 5.1, 5.2, 5.3, 5.4_

  - [x] 2.6 Implement emergencyWithdraw function
    - Add onlyAdmin modifier
    - Validate recipient and amount
    - Execute transfer
    - Emit EmergencyWithdrawal event
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

- [x] 3. Checkpoint - Contract Implementation Complete
  - Review contract code for security issues
  - Ensure all functions are implemented

- [x] 4. Unit Tests
  - [x] 4.1 Write deployment tests
    - Test constructor sets admin correctly
    - Test constructor stores MNEE address
    - Test TreasuryCreated event emission
    - Test revert on zero addresses
    - _Requirements: 1.1, 1.2, 1.3_

  - [x] 4.2 Write deposit tests
    - Test successful deposit
    - Test Deposited event emission
    - Test revert on zero amount
    - Test revert on insufficient allowance
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6_

  - [x] 4.3 Write runPayroll tests
    - Test successful payroll execution
    - Test PayrollExecuted event emission
    - Test revert for non-admin
    - Test revert on array mismatch
    - Test revert on zero amount
    - Test revert on insufficient balance
    - _Requirements: 4.1 through 4.11_

  - [x] 4.4 Write admin management tests
    - Test setAdmin by admin
    - Test revert setAdmin by non-admin
    - Test revert setAdmin to zero address
    - Test AdminChanged event
    - _Requirements: 5.1, 5.2, 5.3_

  - [x] 4.5 Write emergencyWithdraw tests
    - Test successful withdrawal
    - Test EmergencyWithdrawal event
    - Test revert for non-admin
    - Test revert on insufficient balance
    - Test revert on zero recipient
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

- [x] 5. Property-Based Tests
  - [x] 5.1 Write property test for deposit round-trip
    - **Property 2: Deposit Round-Trip**
    - Fuzz test with random amounts
    - Verify balance changes correctly
    - **Validates: Requirements 2.1, 2.5**

  - [x] 5.2 Write property test for payroll distribution
    - **Property 9: Payroll Distribution Correctness**
    - Fuzz test with random recipients/amounts
    - Verify each recipient receives correct amount
    - **Validates: Requirements 4.10**

  - [x] 5.3 Write property test for total conservation
    - **Property 17: Total Conservation**
    - Fuzz test deposit/withdraw sequences
    - Verify final balance equals deposits - withdrawals
    - **Validates: Requirements 4.10, 6.2**

- [x] 6. Security Tests
  - [x] 6.1 Write reentrancy tests
    - Create malicious contract attempting reentrancy
    - Verify all functions are protected
    - _Requirements: 8.1, 8.2_

  - [x] 6.2 Write access control tests
    - Test all admin functions from non-admin
    - Verify consistent "Unauthorized" revert
    - _Requirements: 4.2, 4.3, 5.1, 6.1_

- [x] 7. Checkpoint - All Tests Pass
  - Run full test suite
  - Verify 90%+ coverage
  - Ask the user if questions arise

- [x] 8. Deployment
  - [x] 8.1 Create deployment script
    - Deploy to local Hardhat network
    - Deploy to Sepolia testnet
    - Output addresses to JSON file
    - _Requirements: 10.2, 10.3, 10.4_

  - [x] 8.2 Verify contract on Etherscan
    - Submit source code for verification
    - Confirm verification successful
    - _Requirements: 10.5_

  - [x] 8.3 Update contract addresses in frontend/backend
    - Update addresses.json
    - Export ABIs for frontend
    - _Requirements: 10.6_

- [x] 9. Final Checkpoint
  - Ensure contract is deployed and verified
  - Test deposit and payroll on testnet
  - Document contract addresses

## Notes

- All tasks including property-based tests are required
- Use Hardhat's built-in fuzzing or Foundry for property tests
- All monetary values use 18 decimals to match MNEE
- Contract address: MNEE at 0x8ccedbAe4916b79da7F3F612EfB2EB93A2bFD6cF
