# Design Document: OrbitPayroll Backend API

## Overview

The OrbitPayroll backend provides REST APIs for managing organizations, contractors, and payroll metadata. It implements wallet-based authentication using SIWE (Sign-In with Ethereum), role-based access control, and integrates with PostgreSQL for data persistence. The backend does not custody funds or sign transactions—all on-chain operations are initiated client-side.

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           API Gateway Layer                              │
│  - Rate Limiting    - CORS    - Request Logging    - Error Handling     │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         Middleware Layer                                 │
│  - JWT Validation   - Role Authorization   - Input Validation           │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                          Route Handlers                                  │
├─────────────┬─────────────┬──────────────┬──────────────┬──────────────┤
│    Auth     │    Orgs     │ Contractors  │   Payroll    │ Notifications│
└─────────────┴─────────────┴──────────────┴──────────────┴──────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                          Service Layer                                   │
├─────────────┬─────────────┬──────────────┬──────────────┬──────────────┤
│ AuthService │  OrgService │ContractorSvc │ PayrollSvc   │NotificationSvc│
└─────────────┴─────────────┴──────────────┴──────────────┴──────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                          Data Access Layer                               │
│                         Prisma ORM + PostgreSQL                          │
└─────────────────────────────────────────────────────────────────────────┘
```

## Components and Interfaces

### Authentication Routes

```typescript
// POST /api/v1/auth/nonce
interface NonceRequest {
  walletAddress: string;  // 0x-prefixed, 42 chars
}

interface NonceResponse {
  nonce: string;          // Random 32-byte hex string
  expiresAt: string;      // ISO 8601 timestamp
  message: string;        // SIWE message to sign
}

// POST /api/v1/auth/verify
interface VerifyRequest {
  walletAddress: string;
  signature: string;      // 0x-prefixed signature
  nonce: string;
}

interface VerifyResponse {
  accessToken: string;    // JWT, 15 min expiry
  refreshToken: string;   // Opaque token, 7 day expiry
  user: {
    id: string;
    walletAddress: string;
    createdAt: string;
  };
}

// POST /api/v1/auth/refresh
interface RefreshRequest {
  refreshToken: string;
}

interface RefreshResponse {
  accessToken: string;
  refreshToken: string;   // Rotated token
}

// POST /api/v1/auth/logout
// Requires: Authorization header
// Response: 204 No Content
```

### Organization Routes

```typescript
// POST /api/v1/orgs
interface CreateOrgRequest {
  name: string;           // 1-100 chars
}

interface OrgResponse {
  id: string;
  name: string;
  treasuryAddress: string;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
}

// GET /api/v1/orgs
interface ListOrgsResponse {
  data: OrgResponse[];
  meta: {
    total: number;
  };
}

// GET /api/v1/orgs/:id
// Response: OrgResponse

// PUT /api/v1/orgs/:id
interface UpdateOrgRequest {
  name?: string;
}
// Response: OrgResponse
```

### Organization Member Routes

```typescript
// POST /api/v1/orgs/:id/members
interface AddMemberRequest {
  walletAddress: string;
  role: 'OWNER_ADMIN' | 'FINANCE_OPERATOR';
}

interface MemberResponse {
  id: string;
  userId: string;
  walletAddress: string;
  role: string;
  createdAt: string;
}

// GET /api/v1/orgs/:id/members
interface ListMembersResponse {
  data: MemberResponse[];
}

// PUT /api/v1/orgs/:id/members/:memberId
interface UpdateMemberRequest {
  role: 'OWNER_ADMIN' | 'FINANCE_OPERATOR';
}

// DELETE /api/v1/orgs/:id/members/:memberId
// Response: 204 No Content
```

### Contractor Routes

```typescript
// POST /api/v1/orgs/:id/contractors
interface CreateContractorRequest {
  name: string;           // 1-100 chars
  walletAddress: string;  // Valid Ethereum address
  rateAmount: number;     // Positive number
  rateCurrency: string;   // Default: 'MNEE'
  payCycle: 'WEEKLY' | 'BI_WEEKLY' | 'MONTHLY';
}

interface ContractorResponse {
  id: string;
  orgId: string;
  name: string;
  walletAddress: string;
  rateAmount: string;     // String for precision
  rateCurrency: string;
  payCycle: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

// GET /api/v1/orgs/:id/contractors
interface ListContractorsParams {
  page?: number;          // Default: 1
  limit?: number;         // Default: 20, max: 100
  search?: string;        // Search by name or wallet
  active?: boolean;       // Filter by status
}

interface PaginatedResponse<T> {
  data: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// GET /api/v1/orgs/:id/contractors/:contractorId
// Response: ContractorResponse

// PUT /api/v1/orgs/:id/contractors/:contractorId
interface UpdateContractorRequest {
  name?: string;
  walletAddress?: string;
  rateAmount?: number;
  rateCurrency?: string;
  payCycle?: 'WEEKLY' | 'BI_WEEKLY' | 'MONTHLY';
}

// DELETE /api/v1/orgs/:id/contractors/:contractorId
// Response: 204 No Content (soft delete - sets active=false)
```

### Payroll Routes

```typescript
// POST /api/v1/orgs/:id/payroll-runs/preview
interface PayrollPreviewResponse {
  contractors: Array<{
    id: string;
    name: string;
    walletAddress: string;
    amount: string;       // MNEE amount as string
  }>;
  totalMnee: string;
  treasuryBalance: string;
  isSufficient: boolean;
  deficit: string;        // "0" if sufficient
}

// POST /api/v1/orgs/:id/payroll-runs
interface CreatePayrollRunRequest {
  txHash: string;         // 0x-prefixed, 66 chars
  items: Array<{
    contractorId: string;
    amountMnee: string;
  }>;
  runLabel?: string;      // Optional description
}

interface PayrollRunResponse {
  id: string;
  orgId: string;
  runLabel: string | null;
  executedAt: string;
  txHash: string;
  totalMnee: string;
  contractorCount: number;
  status: 'PENDING' | 'EXECUTED' | 'FAILED';
  createdAt: string;
}

// GET /api/v1/orgs/:id/payroll-runs
interface ListPayrollRunsParams {
  page?: number;
  limit?: number;
}
// Response: PaginatedResponse<PayrollRunResponse>

// GET /api/v1/orgs/:id/payroll-runs/:runId
interface PayrollRunDetailResponse extends PayrollRunResponse {
  items: Array<{
    id: string;
    contractorId: string;
    contractorName: string;
    walletAddress: string;
    amountMnee: string;
    status: string;
  }>;
}
```

### Treasury Routes

```typescript
// GET /api/v1/orgs/:id/treasury
interface TreasuryResponse {
  contractAddress: string;
  mneeBalance: string;        // From contract, cached
  upcomingPayrollTotal: string;
  nextPayrollDate: string | null;
  isSufficient: boolean;
  deficit: string;
  lastUpdated: string;        // Cache timestamp
}
```

### Notification Routes

```typescript
// GET /api/v1/notifications
interface ListNotificationsParams {
  page?: number;
  limit?: number;
  orgId?: string;         // Filter by org
  unreadOnly?: boolean;
}

interface NotificationResponse {
  id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  orgId: string | null;
  createdAt: string;
}

interface ListNotificationsResponse {
  data: NotificationResponse[];
  meta: {
    page: number;
    limit: number;
    total: number;
    unreadCount: number;
  };
}

// PUT /api/v1/notifications/:id/read
// Response: 204 No Content

// PUT /api/v1/notifications/read-all
// Response: 204 No Content
```

## Data Models

### Zod Validation Schemas

```typescript
import { z } from 'zod';

// Ethereum address validation
const ethereumAddress = z.string()
  .regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid Ethereum address')
  .transform(s => s.toLowerCase());

// Transaction hash validation
const txHash = z.string()
  .regex(/^0x[a-fA-F0-9]{64}$/, 'Invalid transaction hash');

// Auth schemas
export const nonceRequestSchema = z.object({
  walletAddress: ethereumAddress,
});

export const verifyRequestSchema = z.object({
  walletAddress: ethereumAddress,
  signature: z.string().regex(/^0x[a-fA-F0-9]+$/),
  nonce: z.string().min(1),
});

// Org schemas
export const createOrgSchema = z.object({
  name: z.string().min(1).max(100),
});

// Contractor schemas
export const createContractorSchema = z.object({
  name: z.string().min(1).max(100),
  walletAddress: ethereumAddress,
  rateAmount: z.number().positive(),
  rateCurrency: z.string().default('MNEE'),
  payCycle: z.enum(['WEEKLY', 'BI_WEEKLY', 'MONTHLY']),
});

// Payroll schemas
export const createPayrollRunSchema = z.object({
  txHash: txHash,
  items: z.array(z.object({
    contractorId: z.string().uuid(),
    amountMnee: z.string().regex(/^\d+$/),
  })).min(1),
  runLabel: z.string().max(100).optional(),
});
```

### JWT Token Structure

```typescript
interface JWTPayload {
  sub: string;            // User ID
  wallet: string;         // Wallet address
  iat: number;            // Issued at
  exp: number;            // Expiration
}

// Token generation
function generateAccessToken(user: User): string {
  return jwt.sign(
    { sub: user.id, wallet: user.walletAddress },
    process.env.JWT_SECRET,
    { expiresIn: '15m' }
  );
}
```

### Error Response Format

```typescript
interface ErrorResponse {
  code: string;           // Machine-readable code
  message: string;        // Human-readable message
  details?: Record<string, string[]>;  // Field-level errors
}

// Example validation error
{
  "code": "VALIDATION_ERROR",
  "message": "Invalid request body",
  "details": {
    "walletAddress": ["Invalid Ethereum address"],
    "rateAmount": ["Must be a positive number"]
  }
}

// Example auth error
{
  "code": "AUTH_001",
  "message": "Session expired. Please reconnect your wallet."
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Nonce Uniqueness and Expiration

*For any* two nonce requests, the generated nonces SHALL be unique, AND *for any* nonce, it SHALL expire after 5 minutes and be rejected for verification.

**Validates: Requirements 1.1, 1.2**

### Property 2: Signature Verification Correctness

*For any* valid SIWE signature matching the wallet address and nonce, verification SHALL succeed and return tokens. *For any* invalid signature, verification SHALL fail with 401.

**Validates: Requirements 1.3, 1.4, 1.5**

### Property 3: Token Refresh Rotation

*For any* valid refresh token, refreshing SHALL return new tokens AND invalidate the old refresh token.

**Validates: Requirements 1.6**

### Property 4: Organization Membership Enforcement

*For any* API request to an organization endpoint, the requesting user SHALL be a member of that organization, OR the request SHALL be rejected with 403.

**Validates: Requirements 2.3, 2.4, 2.5**

### Property 5: Role-Based Authorization

*For any* action restricted to OWNER_ADMIN, a FINANCE_OPERATOR attempting that action SHALL receive 403. *For any* action permitted to FINANCE_OPERATOR, they SHALL succeed.

**Validates: Requirements 3.1, 3.2, 3.3, 3.4**

### Property 6: Contractor Wallet Uniqueness

*For any* contractor creation or update within an organization, if the wallet address already exists for another active contractor in that org, the request SHALL be rejected.

**Validates: Requirements 4.9**

### Property 7: Input Validation Completeness

*For any* API request with invalid input (per zod schema), the request SHALL be rejected with 400 and field-level error details.

**Validates: Requirements 9.1, 9.2**

### Property 8: Payroll Preview Calculation

*For any* payroll preview request, the totalMnee SHALL equal the sum of all individual contractor amounts, AND isSufficient SHALL correctly reflect whether treasuryBalance >= totalMnee.

**Validates: Requirements 5.1, 5.2, 5.3**

### Property 9: Payroll Run Recording

*For any* valid payroll run creation, the system SHALL store the txHash, calculate totalMnee from items, and create payroll_items records for each contractor.

**Validates: Requirements 6.1, 6.2, 6.3, 6.4, 6.7**

### Property 10: Pagination Correctness

*For any* paginated list request, the response SHALL contain at most `limit` items, AND meta.total SHALL reflect the true count, AND meta.totalPages SHALL equal ceil(total/limit).

**Validates: Requirements 4.2, 6.5**

### Property 11: Rate Limiting Enforcement

*For any* IP address exceeding 100 auth requests/minute OR 1000 authenticated requests/minute, subsequent requests SHALL be rejected with 429.

**Validates: Requirements 10.2**

## Error Handling

### HTTP Status Codes

| Status | Usage |
|--------|-------|
| 200 | Successful GET, PUT |
| 201 | Successful POST (resource created) |
| 204 | Successful DELETE, logout |
| 400 | Validation error |
| 401 | Authentication required or failed |
| 403 | Insufficient permissions |
| 404 | Resource not found |
| 409 | Conflict (duplicate wallet) |
| 429 | Rate limit exceeded |
| 500 | Internal server error |

### Error Codes

| Code | HTTP | Description |
|------|------|-------------|
| AUTH_001 | 401 | Nonce expired |
| AUTH_002 | 401 | Invalid signature |
| AUTH_003 | 401 | Token expired |
| AUTH_004 | 401 | Invalid token |
| ORG_001 | 400 | Invalid org name |
| ORG_002 | 403 | Not a member |
| ORG_003 | 403 | Insufficient role |
| ORG_004 | 404 | Org not found |
| CONT_001 | 400 | Invalid wallet address |
| CONT_002 | 409 | Duplicate wallet |
| CONT_003 | 400 | Invalid rate |
| CONT_004 | 404 | Contractor not found |
| PAY_001 | 400 | Invalid tx hash |
| PAY_002 | 404 | Payroll run not found |
| VALIDATION_ERROR | 400 | Schema validation failed |
| RATE_LIMIT | 429 | Too many requests |
| INTERNAL_ERROR | 500 | Unexpected error |

## Testing Strategy

### Unit Tests

```typescript
describe('AuthService', () => {
  describe('generateNonce', () => {
    it('should generate unique nonces');
    it('should set expiration 5 minutes in future');
    it('should store nonce in database');
  });
  
  describe('verifySignature', () => {
    it('should verify valid SIWE signature');
    it('should reject invalid signature');
    it('should reject expired nonce');
    it('should reject reused nonce');
    it('should create user if not exists');
    it('should return valid JWT tokens');
  });
});

describe('ContractorService', () => {
  describe('createContractor', () => {
    it('should create contractor with valid data');
    it('should reject duplicate wallet in same org');
    it('should allow same wallet in different orgs');
    it('should validate wallet address format');
  });
});

describe('PayrollService', () => {
  describe('previewPayroll', () => {
    it('should calculate total from active contractors');
    it('should exclude archived contractors');
    it('should return correct deficit when insufficient');
  });
});
```

### Integration Tests

```typescript
describe('API Integration', () => {
  describe('Auth Flow', () => {
    it('should complete full auth flow: nonce -> sign -> verify');
    it('should refresh tokens successfully');
    it('should reject requests after logout');
  });
  
  describe('Org + Contractor Flow', () => {
    it('should create org and add contractors');
    it('should enforce role permissions');
    it('should paginate contractor list');
  });
  
  describe('Payroll Flow', () => {
    it('should preview and record payroll run');
    it('should retrieve payroll history');
  });
});
```

### Property-Based Tests

```typescript
import fc from 'fast-check';

describe('Property Tests', () => {
  it('Property 1: nonces are unique', () => {
    fc.assert(
      fc.asyncProperty(
        fc.array(fc.hexaString({ minLength: 40, maxLength: 40 }), { minLength: 2, maxLength: 100 }),
        async (wallets) => {
          const nonces = await Promise.all(
            wallets.map(w => authService.generateNonce(`0x${w}`))
          );
          const nonceSet = new Set(nonces.map(n => n.nonce));
          return nonceSet.size === nonces.length;
        }
      ),
      { numRuns: 100 }
    );
  });
  
  it('Property 8: payroll preview total equals sum', () => {
    fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.record({
            name: fc.string({ minLength: 1, maxLength: 50 }),
            rateAmount: fc.float({ min: 0.01, max: 10000 }),
          }),
          { minLength: 1, maxLength: 50 }
        ),
        async (contractors) => {
          // Setup contractors in test org
          const preview = await payrollService.previewPayroll(testOrgId);
          const sum = preview.contractors.reduce(
            (acc, c) => acc + BigInt(c.amount), 
            BigInt(0)
          );
          return BigInt(preview.totalMnee) === sum;
        }
      ),
      { numRuns: 100 }
    );
  });
});
```
