# Design Document: OrbitPayroll Product

## Overview

OrbitPayroll is a Web3-native payroll platform that enables distributed teams to manage contractors and execute batch payments using MNEE stablecoin. The system provides a non-custodial approach where organizations maintain full control of their treasury through smart contracts, while the platform handles the complexity of contractor management, payroll calculations, and transaction orchestration.

The product targets three primary user personas:
1. **Organization Owners**: Founders/admins who set up the organization and manage team access
2. **Finance Operators**: Team members responsible for executing payroll operations
3. **Contractors**: Recipients of payments (passive users who receive MNEE)

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         User Interface Layer                         │
├─────────────────────────────────────────────────────────────────────┤
│  Landing  │  Auth  │  Dashboard  │  Contractors  │  Payroll  │ History│
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      Application Logic Layer                         │
├─────────────────────────────────────────────────────────────────────┤
│  Auth Service  │  Org Service  │  Contractor Service  │  Payroll Svc │
└─────────────────────────────────────────────────────────────────────┘
                    │                               │
                    ▼                               ▼
┌──────────────────────────────┐    ┌──────────────────────────────────┐
│      Data Persistence        │    │       Blockchain Layer           │
├──────────────────────────────┤    ├──────────────────────────────────┤
│  PostgreSQL via Prisma       │    │  PayrollTreasury + PayrollManager│
│  - Users, Orgs, Contractors  │    │  - MNEE Token Interactions       │
│  - Payroll Runs, Events      │    │  - On-chain State                │
└──────────────────────────────┘    └──────────────────────────────────┘
```

## Components and Interfaces

### Authentication Component

```typescript
interface AuthService {
  // Generate unique nonce for wallet signature
  generateNonce(walletAddress: string): Promise<{ nonce: string; expiresAt: Date }>;
  
  // Verify signature and create session
  verifySignature(params: {
    walletAddress: string;
    signature: string;
    nonce: string;
  }): Promise<{ accessToken: string; refreshToken: string; user: User }>;
  
  // Refresh access token
  refreshToken(refreshToken: string): Promise<{ accessToken: string; refreshToken: string }>;
  
  // Terminate session
  logout(userId: string): Promise<void>;
}

interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  walletAddress: string | null;
}
```

### Organization Component

```typescript
interface OrgService {
  // Create new organization with treasury
  createOrg(params: {
    name: string;
    ownerWallet: string;
  }): Promise<Organization>;
  
  // Get organization by ID
  getOrg(orgId: string, userId: string): Promise<Organization>;
  
  // Update organization settings
  updateOrg(orgId: string, params: Partial<OrgSettings>): Promise<Organization>;
  
  // Manage members
  addMember(orgId: string, params: { wallet: string; role: Role }): Promise<OrgMember>;
  removeMember(orgId: string, memberId: string): Promise<void>;
  updateMemberRole(orgId: string, memberId: string, role: Role): Promise<OrgMember>;
}

type Role = 'OWNER_ADMIN' | 'FINANCE_OPERATOR';

interface Organization {
  id: string;
  name: string;
  treasuryAddress: string;
  ownerId: string;
  createdAt: Date;
}
```

### Contractor Component

```typescript
interface ContractorService {
  // CRUD operations
  createContractor(orgId: string, params: ContractorInput): Promise<Contractor>;
  getContractor(orgId: string, contractorId: string): Promise<Contractor>;
  listContractors(orgId: string, params: ListParams): Promise<PaginatedResult<Contractor>>;
  updateContractor(orgId: string, contractorId: string, params: Partial<ContractorInput>): Promise<Contractor>;
  archiveContractor(orgId: string, contractorId: string): Promise<void>;
}

interface ContractorInput {
  name: string;
  walletAddress: string;  // Must be valid Ethereum address
  rateAmount: number;     // Must be positive
  rateCurrency: string;   // Display currency (default: 'MNEE')
  payCycle: 'WEEKLY' | 'BI_WEEKLY' | 'MONTHLY';
}

interface Contractor {
  id: string;
  orgId: string;
  name: string;
  walletAddress: string;
  rateAmount: number;
  rateCurrency: string;
  payCycle: PayCycle;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}
```

### Treasury Component

```typescript
interface TreasuryService {
  // Get treasury info from contract
  getTreasuryInfo(orgId: string): Promise<TreasuryInfo>;
  
  // Build deposit transaction
  buildDepositTx(orgId: string, amount: bigint): Promise<TransactionRequest>;
  
  // Get transaction history
  getTransactionHistory(orgId: string, params: ListParams): Promise<PaginatedResult<TreasuryTx>>;
}

interface TreasuryInfo {
  contractAddress: string;
  mneeBalance: bigint;
  upcomingPayrollTotal: bigint;
  nextPayrollDate: Date | null;
  isBalanceSufficient: boolean;
  deficit: bigint;
}
```

### Payroll Component

```typescript
interface PayrollService {
  // Calculate payroll preview
  previewPayroll(orgId: string): Promise<PayrollPreview>;
  
  // Record executed payroll
  recordPayrollRun(orgId: string, params: {
    txHash: string;
    items: PayrollItem[];
  }): Promise<PayrollRun>;
  
  // Get payroll history
  listPayrollRuns(orgId: string, params: ListParams): Promise<PaginatedResult<PayrollRun>>;
  getPayrollRun(orgId: string, runId: string): Promise<PayrollRunDetail>;
  
  // Export data
  exportPayrollData(orgId: string, runId: string): Promise<CSVData>;
}

interface PayrollPreview {
  contractors: Array<{
    id: string;
    name: string;
    walletAddress: string;
    amount: bigint;
  }>;
  totalMnee: bigint;
  treasuryBalance: bigint;
  isSufficient: boolean;
}

interface PayrollRun {
  id: string;
  orgId: string;
  executedAt: Date;
  txHash: string;
  totalMnee: bigint;
  contractorCount: number;
  status: 'PENDING' | 'EXECUTED' | 'FAILED';
}
```

### Notification Component

```typescript
interface NotificationService {
  // Create notification
  createNotification(params: {
    userId: string;
    orgId?: string;
    type: NotificationType;
    title: string;
    message: string;
  }): Promise<Notification>;
  
  // Get user notifications
  listNotifications(userId: string, params: ListParams): Promise<PaginatedResult<Notification>>;
  
  // Mark as read
  markAsRead(notificationId: string): Promise<void>;
  markAllAsRead(userId: string): Promise<void>;
  
  // Get unread count
  getUnreadCount(userId: string): Promise<number>;
}

type NotificationType = 
  | 'PAYROLL_SCHEDULED'
  | 'PAYROLL_EXECUTED'
  | 'LOW_BALANCE'
  | 'MEMBER_ADDED'
  | 'MEMBER_REMOVED';
```

## Data Models

### User Flow State Machine

```
┌─────────────┐     connect      ┌─────────────┐     sign       ┌─────────────┐
│  Anonymous  │ ───────────────► │  Connected  │ ─────────────► │Authenticated│
└─────────────┘                  └─────────────┘                └─────────────┘
       ▲                               │                              │
       │                               │ reject                       │ disconnect
       │                               ▼                              │
       │                         ┌─────────────┐                      │
       └─────────────────────────│   Error     │◄─────────────────────┘
                                 └─────────────┘
```

### Payroll Execution State Machine

```
┌─────────────┐    preview     ┌─────────────┐    confirm    ┌─────────────┐
│    Idle     │ ─────────────► │  Previewing │ ────────────► │  Confirming │
└─────────────┘                └─────────────┘               └─────────────┘
                                      │                            │
                                      │ cancel                     │ sign
                                      ▼                            ▼
                               ┌─────────────┐              ┌─────────────┐
                               │    Idle     │              │   Pending   │
                               └─────────────┘              └─────────────┘
                                                                   │
                                      ┌────────────────────────────┼────────────────────────────┐
                                      │                            │                            │
                                      ▼                            ▼                            ▼
                               ┌─────────────┐              ┌─────────────┐              ┌─────────────┐
                               │   Success   │              │   Failed    │              │   Timeout   │
                               └─────────────┘              └─────────────┘              └─────────────┘
```

### Role Permission Matrix

| Action | Owner_Admin | Finance_Operator |
|--------|-------------|------------------|
| View Dashboard | ✓ | ✓ |
| View Treasury | ✓ | ✓ |
| Deposit to Treasury | ✓ | ✗ |
| View Contractors | ✓ | ✓ |
| Add/Edit Contractors | ✓ | ✗ |
| Archive Contractors | ✓ | ✗ |
| Preview Payroll | ✓ | ✓ |
| Execute Payroll | ✓ | ✓ |
| View History | ✓ | ✓ |
| Manage Members | ✓ | ✗ |
| Update Org Settings | ✓ | ✗ |

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Authentication Flow Integrity

*For any* wallet address and valid signature, verifying the signature with the correct nonce SHALL result in a valid session being created, AND *for any* invalid signature or expired nonce, verification SHALL fail with an appropriate error.

**Validates: Requirements 1.2, 1.3, 1.4**

### Property 2: Session Lifecycle Consistency

*For any* authenticated session, disconnecting the wallet SHALL terminate the session completely, AND subsequent requests with the old token SHALL be rejected.

**Validates: Requirements 1.5**

### Property 3: Organization Creation Completeness

*For any* valid organization creation request, the system SHALL create an organization record with the creator as Owner_Admin AND assign a treasury contract address.

**Validates: Requirements 2.1, 2.2**

### Property 4: Organization Ownership Invariant

*For any* organization at any point in time, there SHALL be exactly one user with the Owner_Admin role.

**Validates: Requirements 2.5, 2.6**

### Property 5: Contractor Data Integrity

*For any* contractor creation or update operation with valid data, all provided fields SHALL be persisted correctly, AND *for any* invalid wallet address format, the operation SHALL be rejected.

**Validates: Requirements 3.1, 3.2, 3.4**

### Property 6: Contractor Wallet Uniqueness

*For any* organization, no two active contractors SHALL have the same wallet address.

**Validates: Requirements 3.5**

### Property 7: Archived Contractor Exclusion

*For any* archived contractor, they SHALL NOT appear in payroll preview calculations or payroll execution.

**Validates: Requirements 3.3**

### Property 8: Treasury Balance Accuracy

*For any* treasury view request, the displayed MNEE balance SHALL match the actual on-chain balance of the treasury contract.

**Validates: Requirements 4.1, 4.3**

### Property 9: Payroll Calculation Correctness

*For any* payroll preview, the total MNEE amount SHALL equal the sum of all individual contractor payment amounts.

**Validates: Requirements 5.3**

### Property 10: Insufficient Balance Detection

*For any* payroll preview where treasury balance is less than total required, the system SHALL indicate insufficient funds AND calculate the correct deficit amount.

**Validates: Requirements 4.4, 4.5**

### Property 11: Payroll Execution Atomicity

*For any* confirmed payroll execution, either ALL contractors receive their payments (transaction succeeds) OR NO contractors receive payments (transaction fails/reverts).

**Validates: Requirements 5.4, 5.5, 5.6**

### Property 12: Role-Based Access Control Enforcement

*For any* action restricted to Owner_Admin, a Finance_Operator attempting that action SHALL receive a 403 Forbidden response, AND *for any* action permitted to Finance_Operator, they SHALL be able to execute it successfully.

**Validates: Requirements 7.2, 7.4, 7.5, 7.6**

### Property 13: Notification Delivery Completeness

*For any* payroll-related event (scheduled, executed, low balance), the appropriate notification SHALL be created for all relevant users.

**Validates: Requirements 8.1, 8.2, 8.3**

### Property 14: Payroll History Completeness

*For any* executed payroll run, the system SHALL store and be able to retrieve the transaction hash, total amount, and individual contractor payment details.

**Validates: Requirements 6.2, 6.4**

### Property 15: Destructive Action Confirmation

*For any* destructive action (archive contractor, execute payroll), the system SHALL require explicit user confirmation before proceeding.

**Validates: Requirements 9.7**

## Error Handling

### Authentication Errors

| Error Code | Condition | User Message | Recovery Action |
|------------|-----------|--------------|-----------------|
| AUTH_001 | Nonce expired | "Session expired. Please try again." | Retry connection |
| AUTH_002 | Invalid signature | "Signature verification failed." | Retry signing |
| AUTH_003 | Wallet not connected | "Please connect your wallet first." | Connect wallet |
| AUTH_004 | Token expired | "Session expired. Please reconnect." | Refresh or reconnect |

### Organization Errors

| Error Code | Condition | User Message | Recovery Action |
|------------|-----------|--------------|-----------------|
| ORG_001 | Name too long | "Organization name must be under 100 characters." | Shorten name |
| ORG_002 | Not a member | "You don't have access to this organization." | Request access |
| ORG_003 | Insufficient permissions | "You don't have permission for this action." | Contact admin |

### Contractor Errors

| Error Code | Condition | User Message | Recovery Action |
|------------|-----------|--------------|-----------------|
| CONT_001 | Invalid wallet address | "Please enter a valid Ethereum address." | Fix address format |
| CONT_002 | Duplicate wallet | "A contractor with this wallet already exists." | Use different wallet |
| CONT_003 | Invalid rate | "Rate must be a positive number." | Fix rate value |

### Payroll Errors

| Error Code | Condition | User Message | Recovery Action |
|------------|-----------|--------------|-----------------|
| PAY_001 | Insufficient balance | "Treasury balance is insufficient. Deposit X MNEE to proceed." | Deposit funds |
| PAY_002 | No active contractors | "No active contractors to pay." | Add contractors |
| PAY_003 | Transaction failed | "Transaction failed: [reason]. Please try again." | Retry with adjusted gas |
| PAY_004 | Transaction timeout | "Transaction is taking longer than expected." | Check block explorer |

## Testing Strategy

### Unit Tests

Unit tests verify individual components in isolation:

- **Auth Service**: Nonce generation uniqueness, signature verification logic, token generation
- **Org Service**: CRUD operations, role assignment, ownership transfer
- **Contractor Service**: Validation logic, uniqueness checks, archival behavior
- **Payroll Service**: Preview calculation, total computation, CSV export format

### Property-Based Tests

Property tests verify invariants across many generated inputs:

1. **Property 4 (Ownership Invariant)**: Generate random sequences of member operations, verify exactly one owner always exists
2. **Property 6 (Wallet Uniqueness)**: Generate random contractor additions, verify no duplicates accepted
3. **Property 9 (Calculation Correctness)**: Generate random contractor sets, verify total equals sum
4. **Property 12 (RBAC)**: Generate random user/action combinations, verify correct access decisions

### Integration Tests

Integration tests verify component interactions:

- Auth flow: nonce → sign → verify → session
- Org creation: create org → treasury assigned → owner set
- Payroll flow: add contractors → preview → execute → history updated

### E2E Tests

End-to-end tests verify complete user journeys:

1. New user onboarding: connect → create org → add contractor
2. Payroll execution: fund treasury → preview → execute → verify on-chain
3. Role delegation: add member → assign role → verify permissions
