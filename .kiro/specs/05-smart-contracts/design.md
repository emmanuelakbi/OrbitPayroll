# Design Document: OrbitPayroll Smart Contracts

## Overview

The OrbitPayroll smart contract system provides on-chain treasury management and batch payroll execution using the MNEE ERC20 token. The architecture prioritizes security, gas efficiency, and simplicity while enabling programmable payroll operations for distributed teams.

The system consists of two primary contracts:
1. **PayrollTreasury**: Holds MNEE tokens for an organization and manages access control
2. **PayrollManager**: Executes batch payments to multiple recipients in a single transaction

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           User Wallet (EOA)                              │
│                    (Organization Admin / Finance Operator)               │
└─────────────────────────────────────────────────────────────────────────┘
         │                              │                        │
         │ approve()                    │ deposit()              │ runPayroll()
         ▼                              ▼                        ▼
┌─────────────────┐           ┌─────────────────────────────────────────────┐
│   MNEE Token    │◄──────────│              PayrollTreasury                │
│    (ERC20)      │           │  - Holds organization funds                 │
│                 │           │  - Admin-controlled access                  │
│  0x8cced...cF   │           │  - deposit(), emergencyWithdraw()          │
└─────────────────┘           │  - getBalance(), getAdmin()                │
         │                    └─────────────────────────────────────────────┘
         │                                        │
         │ transfer()                             │ internal call or
         │                                        │ same contract
         ▼                                        ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                          PayrollManager                                  │
│  - Executes batch payments                                              │
│  - runPayroll(recipients[], amounts[], runId)                           │
│  - Emits PayrollExecuted event                                          │
└─────────────────────────────────────────────────────────────────────────┘
         │
         │ transfer() to each recipient
         ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                      Contractor Wallets                                  │
│                   (Receive MNEE payments)                                │
└─────────────────────────────────────────────────────────────────────────┘
```

## Components and Interfaces

### PayrollTreasury Contract

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

interface IPayrollTreasury {
    // Events
    event TreasuryCreated(address indexed admin, address indexed mneeToken);
    event Deposited(address indexed depositor, uint256 amount);
    event AdminChanged(address indexed previousAdmin, address indexed newAdmin);
    event EmergencyWithdrawal(address indexed admin, address indexed recipient, uint256 amount);
    event PayrollExecuted(bytes32 indexed offchainRunId, uint256 totalAmount, uint256 recipientCount, uint256 timestamp);
    
    // Admin Management
    function getAdmin() external view returns (address);
    function setAdmin(address newAdmin) external;
    
    // Treasury Operations
    function deposit(uint256 amount) external;
    function getBalance() external view returns (uint256);
    function emergencyWithdraw(uint256 amount, address recipient) external;
    
    // Payroll Execution
    function runPayroll(
        address[] calldata recipients,
        uint256[] calldata amounts,
        bytes32 offchainRunId
    ) external;
}
```

### Contract State Variables

```solidity
contract PayrollTreasury is IPayrollTreasury, ReentrancyGuard {
    using SafeERC20 for IERC20;
    
    // Immutable state
    IERC20 public immutable mneeToken;
    
    // Mutable state
    address public admin;
    
    // Constants
    uint256 public constant MAX_RECIPIENTS = 100; // Gas limit safety
}
```

### Constructor

```solidity
constructor(address _admin, address _mneeToken) {
    require(_admin != address(0), "Invalid admin address");
    require(_mneeToken != address(0), "Invalid token address");
    
    admin = _admin;
    mneeToken = IERC20(_mneeToken);
    
    emit TreasuryCreated(_admin, _mneeToken);
}
```

### Deposit Function

```solidity
function deposit(uint256 amount) external nonReentrant {
    require(amount > 0, "Amount must be greater than zero");
    
    // Transfer MNEE from caller to treasury
    // SafeERC20 handles allowance check and reverts on failure
    mneeToken.safeTransferFrom(msg.sender, address(this), amount);
    
    emit Deposited(msg.sender, amount);
}
```

### Payroll Execution Function

```solidity
function runPayroll(
    address[] calldata recipients,
    uint256[] calldata amounts,
    bytes32 offchainRunId
) external nonReentrant {
    // Access control
    require(msg.sender == admin, "Unauthorized");
    
    // Input validation
    require(recipients.length == amounts.length, "Array length mismatch");
    require(recipients.length > 0, "No recipients");
    require(recipients.length <= MAX_RECIPIENTS, "Too many recipients");
    
    // Calculate total and validate amounts
    uint256 totalAmount = 0;
    for (uint256 i = 0; i < amounts.length; ) {
        require(amounts[i] > 0, "Invalid amount");
        require(recipients[i] != address(0), "Invalid recipient");
        totalAmount += amounts[i];
        unchecked { ++i; }
    }
    
    // Check balance
    require(mneeToken.balanceOf(address(this)) >= totalAmount, "Insufficient treasury balance");
    
    // Execute transfers
    for (uint256 i = 0; i < recipients.length; ) {
        mneeToken.safeTransfer(recipients[i], amounts[i]);
        unchecked { ++i; }
    }
    
    emit PayrollExecuted(offchainRunId, totalAmount, recipients.length, block.timestamp);
}
```

### Admin Management Functions

```solidity
function setAdmin(address newAdmin) external {
    require(msg.sender == admin, "Unauthorized");
    require(newAdmin != address(0), "Invalid admin address");
    
    address previousAdmin = admin;
    admin = newAdmin;
    
    emit AdminChanged(previousAdmin, newAdmin);
}

function getAdmin() external view returns (address) {
    return admin;
}
```

### Emergency Withdrawal Function

```solidity
function emergencyWithdraw(uint256 amount, address recipient) external nonReentrant {
    require(msg.sender == admin, "Unauthorized");
    require(recipient != address(0), "Invalid recipient");
    require(amount > 0, "Amount must be greater than zero");
    require(mneeToken.balanceOf(address(this)) >= amount, "Insufficient balance");
    
    mneeToken.safeTransfer(recipient, amount);
    
    emit EmergencyWithdrawal(msg.sender, recipient, amount);
}

function getBalance() external view returns (uint256) {
    return mneeToken.balanceOf(address(this));
}
```

## Data Models

### On-Chain State

The contract maintains minimal on-chain state for gas efficiency:

| Variable | Type | Storage Slot | Description |
|----------|------|--------------|-------------|
| admin | address | 0 | Current organization admin |
| mneeToken | IERC20 | immutable | MNEE token contract reference |

### Event Data

Events provide the audit trail without storage costs:

```solidity
// Deployment tracking
event TreasuryCreated(
    address indexed admin,      // Searchable by admin
    address indexed mneeToken   // Searchable by token
);

// Deposit tracking
event Deposited(
    address indexed depositor,  // Searchable by depositor
    uint256 amount              // Amount deposited
);

// Admin changes
event AdminChanged(
    address indexed previousAdmin,
    address indexed newAdmin
);

// Payroll execution
event PayrollExecuted(
    bytes32 indexed offchainRunId,  // Links to off-chain record
    uint256 totalAmount,             // Total MNEE distributed
    uint256 recipientCount,          // Number of recipients
    uint256 timestamp                // Block timestamp
);

// Emergency operations
event EmergencyWithdrawal(
    address indexed admin,
    address indexed recipient,
    uint256 amount
);
```

### Off-Chain Run ID Format

The `offchainRunId` is a bytes32 value generated off-chain to link on-chain transactions to database records:

```typescript
// Generate run ID from database UUID
function generateRunId(dbRunId: string): string {
  // Convert UUID to bytes32
  return ethers.utils.id(dbRunId);
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Deployment Initialization

*For any* deployment with valid admin and token addresses, the contract SHALL set the admin correctly AND store the MNEE token address as immutable AND emit TreasuryCreated event.

**Validates: Requirements 1.1, 1.2, 1.3**

### Property 2: Deposit Round-Trip

*For any* deposit of amount X with sufficient allowance, the treasury balance SHALL increase by exactly X AND the depositor's balance SHALL decrease by exactly X AND a Deposited event SHALL be emitted with the correct amount.

**Validates: Requirements 2.1, 2.5**

### Property 3: Deposit Access Control

*For any* address (admin or non-admin), calling deposit with valid amount and allowance SHALL succeed. The deposit function has no access restrictions.

**Validates: Requirements 2.6**

### Property 4: Deposit Failure Conditions

*For any* deposit attempt where allowance is insufficient OR transfer fails, the transaction SHALL revert with no state changes.

**Validates: Requirements 2.2, 2.3, 2.4**

### Property 5: Balance Query Accuracy

*For any* state of the treasury, getBalance() SHALL return the exact MNEE balance held by the contract address.

**Validates: Requirements 3.1, 3.3**

### Property 6: Payroll Access Control

*For any* address that is not the current admin, calling runPayroll SHALL revert with "Unauthorized".

**Validates: Requirements 4.2, 4.3**

### Property 7: Payroll Input Validation

*For any* runPayroll call where recipients.length != amounts.length, the transaction SHALL revert with "Array length mismatch". *For any* amount that equals zero, the transaction SHALL revert with "Invalid amount".

**Validates: Requirements 4.4, 4.5, 4.6, 4.7**

### Property 8: Payroll Balance Check

*For any* runPayroll call where the sum of amounts exceeds treasury balance, the transaction SHALL revert with "Insufficient treasury balance".

**Validates: Requirements 4.8, 4.9**

### Property 9: Payroll Distribution Correctness

*For any* successful runPayroll execution with recipients R and amounts A, each recipient R[i] SHALL receive exactly A[i] MNEE tokens AND the treasury balance SHALL decrease by sum(A).

**Validates: Requirements 4.10**

### Property 10: Payroll Event Emission

*For any* successful runPayroll execution, a PayrollExecuted event SHALL be emitted with the correct offchainRunId, totalAmount equal to sum of amounts, correct recipientCount, and current block timestamp.

**Validates: Requirements 4.11**

### Property 11: Admin Change Access Control

*For any* address that is not the current admin, calling setAdmin SHALL revert with "Unauthorized".

**Validates: Requirements 5.1**

### Property 12: Admin Change Validity

*For any* setAdmin call with zero address, the transaction SHALL revert. *For any* valid setAdmin call, the admin SHALL be updated AND AdminChanged event SHALL be emitted.

**Validates: Requirements 5.2, 5.3**

### Property 13: Emergency Withdrawal Access Control

*For any* address that is not the current admin, calling emergencyWithdraw SHALL revert with "Unauthorized".

**Validates: Requirements 6.1**

### Property 14: Emergency Withdrawal Correctness

*For any* valid emergencyWithdraw call with amount X and recipient R, exactly X MNEE SHALL be transferred to R AND EmergencyWithdrawal event SHALL be emitted.

**Validates: Requirements 6.2, 6.4**

### Property 15: Emergency Withdrawal Validation

*For any* emergencyWithdraw call where amount exceeds balance, the transaction SHALL revert. *For any* call with zero address recipient, the transaction SHALL revert.

**Validates: Requirements 6.3, 6.5**

### Property 16: Reentrancy Protection

*For any* external call during deposit, runPayroll, or emergencyWithdraw, reentrant calls to these functions SHALL revert.

**Validates: Requirements 8.1, 8.2**

### Property 17: Total Conservation

*For any* sequence of deposits D and payrolls P and withdrawals W, the final treasury balance SHALL equal sum(D) - sum(P) - sum(W).

**Validates: Requirements 4.10, 6.2 (invariant)**

## Error Handling

### Revert Messages

| Function | Condition | Revert Message |
|----------|-----------|----------------|
| constructor | _admin == address(0) | "Invalid admin address" |
| constructor | _mneeToken == address(0) | "Invalid token address" |
| deposit | amount == 0 | "Amount must be greater than zero" |
| deposit | insufficient allowance | ERC20 error (from SafeERC20) |
| runPayroll | msg.sender != admin | "Unauthorized" |
| runPayroll | recipients.length != amounts.length | "Array length mismatch" |
| runPayroll | recipients.length == 0 | "No recipients" |
| runPayroll | recipients.length > MAX_RECIPIENTS | "Too many recipients" |
| runPayroll | any amount == 0 | "Invalid amount" |
| runPayroll | any recipient == address(0) | "Invalid recipient" |
| runPayroll | balance < total | "Insufficient treasury balance" |
| setAdmin | msg.sender != admin | "Unauthorized" |
| setAdmin | newAdmin == address(0) | "Invalid admin address" |
| emergencyWithdraw | msg.sender != admin | "Unauthorized" |
| emergencyWithdraw | recipient == address(0) | "Invalid recipient" |
| emergencyWithdraw | amount == 0 | "Amount must be greater than zero" |
| emergencyWithdraw | balance < amount | "Insufficient balance" |

### Gas Considerations

| Operation | Estimated Gas | Notes |
|-----------|---------------|-------|
| Deploy | ~500,000 | One-time cost |
| deposit | ~65,000 | Includes ERC20 transfer |
| runPayroll (10 recipients) | ~250,000 | ~25k per recipient |
| runPayroll (50 recipients) | ~1,100,000 | Near block limit consideration |
| runPayroll (100 recipients) | ~2,200,000 | Maximum recommended |
| setAdmin | ~30,000 | Storage update + event |
| emergencyWithdraw | ~65,000 | Includes ERC20 transfer |
| getBalance | ~2,600 | View function (free when called externally) |
| getAdmin | ~2,400 | View function (free when called externally) |

## Testing Strategy

### Unit Tests (Hardhat/Foundry)

```typescript
describe("PayrollTreasury", () => {
  describe("Deployment", () => {
    it("should set admin correctly");
    it("should store MNEE token address");
    it("should emit TreasuryCreated event");
    it("should revert with zero admin address");
    it("should revert with zero token address");
  });
  
  describe("Deposit", () => {
    it("should transfer MNEE to treasury");
    it("should emit Deposited event");
    it("should allow any address to deposit");
    it("should revert with zero amount");
    it("should revert with insufficient allowance");
  });
  
  describe("RunPayroll", () => {
    it("should distribute MNEE to all recipients");
    it("should emit PayrollExecuted event");
    it("should revert for non-admin caller");
    it("should revert with mismatched array lengths");
    it("should revert with zero amount");
    it("should revert with insufficient balance");
    it("should revert with zero address recipient");
  });
  
  describe("Admin Management", () => {
    it("should allow admin to change admin");
    it("should emit AdminChanged event");
    it("should revert for non-admin caller");
    it("should revert with zero address");
  });
  
  describe("Emergency Withdrawal", () => {
    it("should transfer MNEE to recipient");
    it("should emit EmergencyWithdrawal event");
    it("should revert for non-admin caller");
    it("should revert with insufficient balance");
    it("should revert with zero address recipient");
  });
});
```

### Property-Based Tests

Using Foundry's fuzzing or a property testing library:

```solidity
// Property 2: Deposit Round-Trip
function testFuzz_depositRoundTrip(uint256 amount) public {
    vm.assume(amount > 0 && amount <= type(uint128).max);
    
    uint256 treasuryBefore = treasury.getBalance();
    uint256 userBefore = mnee.balanceOf(user);
    
    vm.startPrank(user);
    mnee.approve(address(treasury), amount);
    treasury.deposit(amount);
    vm.stopPrank();
    
    assertEq(treasury.getBalance(), treasuryBefore + amount);
    assertEq(mnee.balanceOf(user), userBefore - amount);
}

// Property 9: Payroll Distribution Correctness
function testFuzz_payrollDistribution(
    address[] calldata recipients,
    uint256[] calldata amounts
) public {
    vm.assume(recipients.length == amounts.length);
    vm.assume(recipients.length > 0 && recipients.length <= 10);
    
    // Filter valid inputs
    for (uint i = 0; i < recipients.length; i++) {
        vm.assume(recipients[i] != address(0));
        vm.assume(amounts[i] > 0 && amounts[i] <= 1e24);
    }
    
    // Fund treasury
    uint256 total = sumAmounts(amounts);
    fundTreasury(total);
    
    // Record balances before
    uint256[] memory balancesBefore = new uint256[](recipients.length);
    for (uint i = 0; i < recipients.length; i++) {
        balancesBefore[i] = mnee.balanceOf(recipients[i]);
    }
    
    // Execute payroll
    vm.prank(admin);
    treasury.runPayroll(recipients, amounts, bytes32(0));
    
    // Verify each recipient received correct amount
    for (uint i = 0; i < recipients.length; i++) {
        assertEq(
            mnee.balanceOf(recipients[i]),
            balancesBefore[i] + amounts[i]
        );
    }
}

// Property 17: Total Conservation
function testFuzz_totalConservation(
    uint256 depositAmount,
    uint256 withdrawAmount
) public {
    vm.assume(depositAmount > withdrawAmount);
    vm.assume(depositAmount <= 1e24);
    
    // Deposit
    fundTreasury(depositAmount);
    
    // Withdraw
    vm.prank(admin);
    treasury.emergencyWithdraw(withdrawAmount, recipient);
    
    // Verify conservation
    assertEq(treasury.getBalance(), depositAmount - withdrawAmount);
}
```

### Integration Tests

Test contract interactions with real MNEE token on testnet:

1. Deploy treasury with testnet MNEE address
2. Approve and deposit real MNEE tokens
3. Execute payroll to multiple test wallets
4. Verify balances on block explorer
5. Test admin transfer and emergency withdrawal

### Security Tests

1. **Reentrancy**: Attempt reentrant calls during transfers
2. **Access Control Bypass**: Try all admin functions from non-admin
3. **Integer Overflow**: Test with maximum uint256 values
4. **Array Bounds**: Test with empty and maximum-size arrays
5. **Zero Address**: Test all functions with zero addresses
