# Requirements Document: OrbitPayroll Smart Contracts

## Introduction

This document specifies the smart contract requirements for OrbitPayroll, defining the on-chain components that enable secure treasury management and batch payroll execution using the MNEE ERC20 token.

## Glossary

- **PayrollTreasury**: Smart contract holding MNEE tokens for an organization's payroll fund
- **PayrollManager**: Smart contract executing batch payments to contractors
- **MNEE_Token**: ERC20 token at address `0x8ccedbAe4916b79da7F3F612EfB2EB93A2bFD6cF`
- **Org_Admin**: Ethereum address authorized to manage treasury and execute payroll
- **Recipient**: Contractor wallet address receiving payment
- **Batch_Payment**: Single transaction distributing tokens to multiple recipients
- **Off_Chain_Run_ID**: Bytes32 identifier linking on-chain transaction to off-chain payroll run record
- **Allowance**: ERC20 approval amount permitting contract to transfer tokens

## Requirements

### Requirement 1: Treasury Contract Deployment

**User Story:** As an organization owner, I want a dedicated treasury contract, so that my payroll funds are securely held on-chain.

#### Acceptance Criteria

1. WHEN PayrollTreasury is deployed THEN the contract SHALL set deployer as initial Org_Admin
2. THE PayrollTreasury SHALL store the MNEE_Token address as immutable
3. THE PayrollTreasury SHALL emit an event `TreasuryCreated(address indexed admin, address indexed mneeToken)`
4. THE PayrollTreasury SHALL be deployed using Solidity version 0.8.0 or higher
5. THE PayrollTreasury SHALL implement a constructor accepting admin address and MNEE token address

### Requirement 2: Treasury Deposit Functionality

**User Story:** As an organization admin, I want to deposit MNEE into the treasury, so that funds are available for payroll.

#### Acceptance Criteria

1. WHEN a user calls `deposit(uint256 amount)` THEN the PayrollTreasury SHALL transfer MNEE from caller to contract
2. THE PayrollTreasury SHALL require caller to have approved sufficient MNEE allowance
3. IF allowance is insufficient THEN the PayrollTreasury SHALL revert with descriptive error
4. IF transfer fails THEN the PayrollTreasury SHALL revert the transaction
5. WHEN deposit succeeds THEN the PayrollTreasury SHALL emit `Deposited(address indexed depositor, uint256 amount)`
6. THE PayrollTreasury SHALL allow any address to deposit (not restricted to admin)

### Requirement 3: Treasury Balance Query

**User Story:** As a user, I want to query treasury balance, so that I can verify available funds.

#### Acceptance Criteria

1. THE PayrollTreasury SHALL implement `getBalance()` returning current MNEE balance
2. THE `getBalance()` function SHALL be a view function (no gas cost for calls)
3. THE PayrollTreasury SHALL query MNEE_Token.balanceOf(address(this)) for accurate balance

### Requirement 4: Payroll Execution

**User Story:** As an organization admin, I want to execute batch payroll, so that all contractors receive payment in a single transaction.

#### Acceptance Criteria

1. WHEN Org_Admin calls `runPayroll(address[] recipients, uint256[] amounts, bytes32 offchainRunId)` THEN the PayrollManager SHALL distribute MNEE
2. THE PayrollManager SHALL require caller to be Org_Admin
3. IF caller is not Org_Admin THEN the PayrollManager SHALL revert with "Unauthorized"
4. THE PayrollManager SHALL require recipients and amounts arrays have equal length
5. IF array lengths differ THEN the PayrollManager SHALL revert with "Array length mismatch"
6. THE PayrollManager SHALL require all amounts are greater than zero
7. IF any amount is zero THEN the PayrollManager SHALL revert with "Invalid amount"
8. THE PayrollManager SHALL calculate total amount and verify treasury has sufficient balance
9. IF balance is insufficient THEN the PayrollManager SHALL revert with "Insufficient treasury balance"
10. WHEN payroll executes THEN the PayrollManager SHALL transfer MNEE to each recipient
11. WHEN payroll completes THEN the PayrollManager SHALL emit `PayrollExecuted(bytes32 indexed offchainRunId, uint256 totalAmount, uint256 recipientCount, uint256 timestamp)`

### Requirement 5: Access Control

**User Story:** As an organization owner, I want secure access control, so that only authorized addresses can manage the treasury.

#### Acceptance Criteria

1. THE PayrollTreasury SHALL implement `setAdmin(address newAdmin)` callable only by current Org_Admin
2. WHEN admin is changed THEN the PayrollTreasury SHALL emit `AdminChanged(address indexed previousAdmin, address indexed newAdmin)`
3. THE PayrollTreasury SHALL prevent setting admin to zero address
4. THE PayrollTreasury SHALL implement `getAdmin()` view function returning current admin
5. THE PayrollTreasury MAY implement multi-sig or timelock for admin changes (optional for MVP)

### Requirement 6: Emergency Withdrawal

**User Story:** As an organization admin, I want emergency withdrawal capability, so that I can recover funds if needed.

#### Acceptance Criteria

1. THE PayrollTreasury SHALL implement `emergencyWithdraw(uint256 amount, address recipient)` callable only by Org_Admin
2. THE PayrollTreasury SHALL transfer specified amount to recipient
3. IF amount exceeds balance THEN the PayrollTreasury SHALL revert with "Insufficient balance"
4. WHEN withdrawal executes THEN the PayrollTreasury SHALL emit `EmergencyWithdrawal(address indexed admin, address indexed recipient, uint256 amount)`
5. THE PayrollTreasury SHALL prevent withdrawal to zero address

### Requirement 7: Gas Optimization

**User Story:** As a user, I want gas-efficient contracts, so that payroll execution is cost-effective.

#### Acceptance Criteria

1. THE PayrollManager SHALL minimize storage operations during payroll execution
2. THE PayrollManager SHALL use unchecked arithmetic where overflow is impossible (Solidity 0.8+)
3. THE PayrollManager SHALL batch all transfers in a single transaction
4. THE PayrollManager SHALL avoid storing recipient arrays on-chain (accept as calldata)
5. THE PayrollManager SHALL use events for audit trail instead of storage where possible

### Requirement 8: Security Patterns

**User Story:** As a security auditor, I want secure contract patterns, so that funds are protected from attacks.

#### Acceptance Criteria

1. THE PayrollTreasury SHALL implement checks-effects-interactions pattern
2. THE PayrollManager SHALL implement reentrancy guard on payroll execution
3. THE contracts SHALL use SafeERC20 or equivalent for token transfers
4. THE contracts SHALL validate all external inputs
5. THE contracts SHALL not use delegatecall to untrusted contracts
6. THE contracts SHALL emit events for all state changes

### Requirement 9: Contract Events

**User Story:** As a developer, I want comprehensive events, so that I can track contract activity off-chain.

#### Acceptance Criteria

1. THE PayrollTreasury SHALL emit `TreasuryCreated(address indexed admin, address indexed mneeToken)` on deployment
2. THE PayrollTreasury SHALL emit `Deposited(address indexed depositor, uint256 amount)` on deposit
3. THE PayrollTreasury SHALL emit `AdminChanged(address indexed previousAdmin, address indexed newAdmin)` on admin change
4. THE PayrollTreasury SHALL emit `EmergencyWithdrawal(address indexed admin, address indexed recipient, uint256 amount)` on withdrawal
5. THE PayrollManager SHALL emit `PayrollExecuted(bytes32 indexed offchainRunId, uint256 totalAmount, uint256 recipientCount, uint256 timestamp)` on payroll
6. THE PayrollManager MAY emit individual `PaymentSent(address indexed recipient, uint256 amount)` events per recipient

### Requirement 10: Testing and Deployment

**User Story:** As a developer, I want testable contracts, so that I can verify correctness before deployment.

#### Acceptance Criteria

1. THE contracts SHALL include comprehensive unit tests using Hardhat or Foundry
2. THE tests SHALL cover: deployment, deposit, payroll execution, access control, edge cases
3. THE tests SHALL verify event emissions
4. THE tests SHALL test failure cases (unauthorized, insufficient balance, invalid inputs)
5. THE contracts SHALL be deployable to testnet for integration testing
6. THE contracts SHALL be verified on block explorer after deployment
7. THE deployment scripts SHALL output contract addresses and ABIs to JSON files
