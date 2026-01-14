# Design Document: OrbitPayroll Database

## Overview

The OrbitPayroll database uses PostgreSQL with Prisma ORM to store off-chain metadata for organizations, users, contractors, and payroll operations. The schema is designed for efficient queries, referential integrity, and audit trail preservation.

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          Application Layer                               │
│                    (Backend Services via Prisma Client)                  │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                           Prisma ORM Layer                               │
│  - Type-safe queries    - Migrations    - Connection pooling            │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                          PostgreSQL Database                             │
├─────────────────────────────────────────────────────────────────────────┤
│  ┌─────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────────┐       │
│  │  users  │ │organizations│ │ org_members │ │   contractors   │       │
│  └─────────┘ └─────────────┘ └─────────────┘ └─────────────────┘       │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────┐ ┌─────────────────┐       │
│  │payroll_runs │ │payroll_items│ │ events  │ │  notifications  │       │
│  └─────────────┘ └─────────────┘ └─────────┘ └─────────────────┘       │
│  ┌─────────┐                                                            │
│  │sessions │                                                            │
│  └─────────┘                                                            │
└─────────────────────────────────────────────────────────────────────────┘
```

## Components and Interfaces

### Prisma Schema

```prisma
// schema.prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ============================================
// User & Authentication
// ============================================

model User {
  id            String   @id @default(uuid())
  walletAddress String   @unique @map("wallet_address")
  email         String?
  createdAt     DateTime @default(now()) @map("created_at")
  updatedAt     DateTime @updatedAt @map("updated_at")

  // Relations
  ownedOrgs     Organization[] @relation("OrgOwner")
  memberships   OrgMember[]
  sessions      Session[]
  notifications Notification[]
  events        Event[]

  @@index([walletAddress])
  @@map("users")
}

model Session {
  id        String   @id @default(uuid())
  userId    String   @map("user_id")
  tokenHash String   @map("token_hash")
  expiresAt DateTime @map("expires_at")
  createdAt DateTime @default(now()) @map("created_at")

  // Relations
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([tokenHash])
  @@index([userId, expiresAt])
  @@map("sessions")
}

// ============================================
// Organization
// ============================================

model Organization {
  id              String   @id @default(uuid())
  name            String
  treasuryAddress String   @map("treasury_address")
  ownerId         String   @map("owner_id")
  createdAt       DateTime @default(now()) @map("created_at")
  updatedAt       DateTime @updatedAt @map("updated_at")

  // Relations
  owner        User          @relation("OrgOwner", fields: [ownerId], references: [id])
  members      OrgMember[]
  contractors  Contractor[]
  payrollRuns  PayrollRun[]
  events       Event[]
  notifications Notification[]

  @@index([ownerId])
  @@map("organizations")
}

model OrgMember {
  id        String   @id @default(uuid())
  orgId     String   @map("org_id")
  userId    String   @map("user_id")
  role      Role
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  // Relations
  org  Organization @relation(fields: [orgId], references: [id], onDelete: Cascade)
  user User         @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([orgId, userId])
  @@index([orgId, userId])
  @@map("org_members")
}

enum Role {
  OWNER_ADMIN
  FINANCE_OPERATOR
}

// ============================================
// Contractors
// ============================================

model Contractor {
  id            String   @id @default(uuid())
  orgId         String   @map("org_id")
  name          String
  walletAddress String   @map("wallet_address")
  rateAmount    Decimal  @map("rate_amount") @db.Decimal(18, 8)
  rateCurrency  String   @default("MNEE") @map("rate_currency")
  payCycle      PayCycle @map("pay_cycle")
  active        Boolean  @default(true)
  createdAt     DateTime @default(now()) @map("created_at")
  updatedAt     DateTime @updatedAt @map("updated_at")

  // Relations
  org          Organization  @relation(fields: [orgId], references: [id], onDelete: Cascade)
  payrollItems PayrollItem[]

  @@unique([orgId, walletAddress])
  @@index([orgId])
  @@index([orgId, active])
  @@map("contractors")
}

enum PayCycle {
  WEEKLY
  BI_WEEKLY
  MONTHLY
}

// ============================================
// Payroll
// ============================================

model PayrollRun {
  id            String        @id @default(uuid())
  orgId         String        @map("org_id")
  runLabel      String?       @map("run_label")
  scheduledDate DateTime?     @map("scheduled_date")
  executedAt    DateTime?     @map("executed_at")
  txHash        String?       @map("tx_hash")
  totalMnee     Decimal       @map("total_mnee") @db.Decimal(18, 8)
  status        PayrollStatus @default(PENDING)
  createdAt     DateTime      @default(now()) @map("created_at")
  updatedAt     DateTime      @updatedAt @map("updated_at")

  // Relations
  org   Organization  @relation(fields: [orgId], references: [id], onDelete: Cascade)
  items PayrollItem[]

  @@index([orgId, executedAt])
  @@index([txHash])
  @@map("payroll_runs")
}

model PayrollItem {
  id           String      @id @default(uuid())
  payrollRunId String      @map("payroll_run_id")
  contractorId String?     @map("contractor_id")
  amountMnee   Decimal     @map("amount_mnee") @db.Decimal(18, 8)
  status       ItemStatus  @default(PENDING)
  createdAt    DateTime    @default(now()) @map("created_at")

  // Relations
  payrollRun PayrollRun  @relation(fields: [payrollRunId], references: [id], onDelete: Cascade)
  contractor Contractor? @relation(fields: [contractorId], references: [id], onDelete: SetNull)

  @@index([payrollRunId])
  @@index([contractorId])
  @@map("payroll_items")
}

enum PayrollStatus {
  PENDING
  EXECUTED
  FAILED
}

enum ItemStatus {
  PENDING
  PAID
  FAILED
}

// ============================================
// Events & Notifications
// ============================================

model Event {
  id        String   @id @default(uuid())
  orgId     String?  @map("org_id")
  userId    String?  @map("user_id")
  eventType String   @map("event_type")
  payload   Json
  createdAt DateTime @default(now()) @map("created_at")

  // Relations
  org  Organization? @relation(fields: [orgId], references: [id], onDelete: Cascade)
  user User?         @relation(fields: [userId], references: [id], onDelete: SetNull)

  @@index([orgId, eventType, createdAt])
  @@index([createdAt])
  @@map("events")
}

model Notification {
  id        String   @id @default(uuid())
  userId    String   @map("user_id")
  orgId     String?  @map("org_id")
  type      String
  title     String
  message   String
  read      Boolean  @default(false)
  createdAt DateTime @default(now()) @map("created_at")

  // Relations
  user User          @relation(fields: [userId], references: [id], onDelete: Cascade)
  org  Organization? @relation(fields: [orgId], references: [id], onDelete: Cascade)

  @@index([userId, read, createdAt])
  @@index([orgId])
  @@map("notifications")
}
```

## Data Models

### Entity Relationship Diagram

```
┌─────────────┐       ┌─────────────────┐       ┌─────────────┐
│    users    │───────│   org_members   │───────│organizations│
│             │  1:N  │                 │  N:1  │             │
│ id (PK)     │       │ id (PK)         │       │ id (PK)     │
│ wallet_addr │       │ org_id (FK)     │       │ name        │
│ email       │       │ user_id (FK)    │       │ treasury_addr│
│ created_at  │       │ role            │       │ owner_id(FK)│
└─────────────┘       └─────────────────┘       └─────────────┘
      │                                               │
      │ 1:N                                           │ 1:N
      ▼                                               ▼
┌─────────────┐                               ┌─────────────┐
│  sessions   │                               │ contractors │
│             │                               │             │
│ id (PK)     │                               │ id (PK)     │
│ user_id(FK) │                               │ org_id (FK) │
│ token_hash  │                               │ name        │
│ expires_at  │                               │ wallet_addr │
└─────────────┘                               │ rate_amount │
                                              │ pay_cycle   │
                                              │ active      │
                                              └─────────────┘
                                                    │
                                                    │ 1:N
                                                    ▼
┌─────────────────┐       ┌─────────────────┐
│  payroll_runs   │───────│  payroll_items  │
│                 │  1:N  │                 │
│ id (PK)         │       │ id (PK)         │
│ org_id (FK)     │       │ run_id (FK)     │
│ tx_hash         │       │ contractor_id   │
│ total_mnee      │       │ amount_mnee     │
│ status          │       │ status          │
│ executed_at     │       └─────────────────┘
└─────────────────┘
```

### Index Strategy

| Table | Index | Columns | Purpose |
|-------|-------|---------|---------|
| users | PRIMARY | id | Primary key |
| users | UNIQUE | wallet_address | Lookup by wallet |
| org_members | UNIQUE | (org_id, user_id) | Prevent duplicate membership |
| org_members | INDEX | (org_id, user_id) | Fast membership lookup |
| contractors | UNIQUE | (org_id, wallet_address) | Prevent duplicate wallets per org |
| contractors | INDEX | org_id | List contractors by org |
| contractors | INDEX | (org_id, active) | List active contractors |
| payroll_runs | INDEX | (org_id, executed_at) | History queries |
| payroll_runs | INDEX | tx_hash | Lookup by transaction |
| payroll_items | INDEX | payroll_run_id | Get items for run |
| events | INDEX | (org_id, event_type, created_at) | Audit queries |
| notifications | INDEX | (user_id, read, created_at) | Unread notifications |
| sessions | INDEX | token_hash | Token validation |

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Wallet Address Uniqueness

*For any* user, their wallet_address SHALL be unique across all users in the database.

**Validates: Requirements 1.3**

### Property 2: Organization Ownership Integrity

*For any* organization, the owner_id SHALL reference a valid user, AND that user SHALL have an OWNER_ADMIN membership in the org_members table.

**Validates: Requirements 2.4**

### Property 3: Contractor Wallet Uniqueness Per Org

*For any* organization, no two active contractors SHALL have the same wallet_address.

**Validates: Requirements 4.9**

### Property 4: Payroll Total Consistency

*For any* payroll_run, the total_mnee SHALL equal the sum of amount_mnee from all associated payroll_items.

**Validates: Requirements 5.7**

### Property 5: Referential Integrity

*For any* foreign key relationship, the referenced record SHALL exist OR the referencing record SHALL be deleted/nullified according to the cascade rules.

**Validates: Requirements 10.4**

### Property 6: Soft Delete Preservation

*For any* archived contractor (active=false), their historical payroll_items SHALL be preserved with contractor_id intact.

**Validates: Requirements 4.5, 11.5**

### Property 7: Decimal Precision

*For any* monetary value (rate_amount, amount_mnee, total_mnee), the value SHALL be stored with 18 decimal places precision to match MNEE token decimals.

**Validates: Requirements 11.6**

### Property 8: Timestamp Consistency

*For any* record with created_at and updated_at, updated_at SHALL be >= created_at.

**Validates: Requirements 1.6**

## Error Handling

### Database Errors

| Error Type | Prisma Code | Handling |
|------------|-------------|----------|
| Unique constraint | P2002 | Return 409 Conflict with field info |
| Foreign key constraint | P2003 | Return 400 Bad Request |
| Record not found | P2025 | Return 404 Not Found |
| Connection error | P1001 | Retry with backoff, then 503 |
| Query timeout | P2024 | Return 504 Gateway Timeout |

### Error Handling Pattern

```typescript
async function handlePrismaError(error: unknown): never {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    switch (error.code) {
      case 'P2002':
        const field = (error.meta?.target as string[])?.[0];
        throw new ConflictError(`Duplicate ${field}`);
      case 'P2003':
        throw new BadRequestError('Invalid reference');
      case 'P2025':
        throw new NotFoundError('Record not found');
      default:
        throw new InternalError('Database error');
    }
  }
  throw error;
}
```

## Testing Strategy

### Unit Tests

```typescript
describe('Database Schema', () => {
  describe('Users', () => {
    it('should create user with valid wallet address');
    it('should reject duplicate wallet address');
    it('should cascade delete sessions on user delete');
  });
  
  describe('Organizations', () => {
    it('should create org with owner membership');
    it('should cascade delete members on org delete');
    it('should cascade delete contractors on org delete');
  });
  
  describe('Contractors', () => {
    it('should create contractor with valid data');
    it('should reject duplicate wallet in same org');
    it('should allow same wallet in different orgs');
    it('should preserve payroll items on soft delete');
  });
  
  describe('Payroll', () => {
    it('should create run with items');
    it('should calculate total from items');
    it('should set null on contractor delete');
  });
});
```

### Property-Based Tests

```typescript
import fc from 'fast-check';

describe('Database Properties', () => {
  it('Property 4: payroll total equals sum of items', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.bigInt({ min: 1n, max: 10n ** 24n }),
          { minLength: 1, maxLength: 50 }
        ),
        async (amounts) => {
          const run = await createPayrollRun(amounts);
          const items = await getPayrollItems(run.id);
          const sum = items.reduce((acc, i) => acc + BigInt(i.amountMnee), 0n);
          return BigInt(run.totalMnee) === sum;
        }
      ),
      { numRuns: 100 }
    );
  });
  
  it('Property 7: decimal precision preserved', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.bigInt({ min: 1n, max: 10n ** 26n }),
        async (amount) => {
          const contractor = await createContractor({ rateAmount: amount });
          const retrieved = await getContractor(contractor.id);
          return BigInt(retrieved.rateAmount) === amount;
        }
      ),
      { numRuns: 100 }
    );
  });
});
```

### Migration Tests

```typescript
describe('Migrations', () => {
  it('should apply all migrations successfully');
  it('should rollback migrations cleanly');
  it('should preserve data during migration');
});
```

### Seed Script

```typescript
// prisma/seed.ts
async function seed() {
  // Create test user
  const user = await prisma.user.create({
    data: {
      walletAddress: '0x1234567890123456789012345678901234567890',
      email: 'test@example.com',
    },
  });
  
  // Create test org
  const org = await prisma.organization.create({
    data: {
      name: 'Test Organization',
      treasuryAddress: '0x0987654321098765432109876543210987654321',
      ownerId: user.id,
      members: {
        create: {
          userId: user.id,
          role: 'OWNER_ADMIN',
        },
      },
    },
  });
  
  // Create test contractors
  await prisma.contractor.createMany({
    data: [
      {
        orgId: org.id,
        name: 'Alice Developer',
        walletAddress: '0xaaaa...',
        rateAmount: 5000,
        payCycle: 'MONTHLY',
      },
      {
        orgId: org.id,
        name: 'Bob Designer',
        walletAddress: '0xbbbb...',
        rateAmount: 4000,
        payCycle: 'MONTHLY',
      },
    ],
  });
  
  console.log('Seed completed');
}
```
