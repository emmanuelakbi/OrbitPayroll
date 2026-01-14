# Requirements Document: OrbitPayroll Database

## Introduction

This document specifies the database requirements for OrbitPayroll, defining the schema, relationships, and data management patterns for storing off-chain metadata about organizations, users, contractors, and payroll operations.

## Glossary

- **Database**: PostgreSQL relational database instance
- **Prisma_ORM**: Type-safe database client and migration tool
- **Schema**: Database table definitions and relationships
- **Migration**: Version-controlled database schema change
- **Soft_Delete**: Marking records inactive instead of physical deletion
- **Audit_Log**: Record of data changes for compliance and debugging
- **Index**: Database optimization structure for query performance
- **Foreign_Key**: Constraint ensuring referential integrity between tables

## Requirements

### Requirement 1: Users Table

**User Story:** As a system, I want to store user information, so that I can associate wallets with accounts and sessions.

#### Acceptance Criteria

1. THE Database SHALL define a `users` table with columns: id, wallet_address, email, created_at, updated_at
2. THE `id` column SHALL be UUID primary key
3. THE `wallet_address` column SHALL be unique and indexed
4. THE `wallet_address` column SHALL store lowercase Ethereum address (42 characters)
5. THE `email` column SHALL be optional (nullable)
6. THE `created_at` and `updated_at` columns SHALL be timestamps with timezone

### Requirement 2: Organizations Table

**User Story:** As a system, I want to store organization data, so that I can manage multi-tenant payroll operations.

#### Acceptance Criteria

1. THE Database SHALL define an `organizations` table with columns: id, name, treasury_address, owner_user_id, created_at, updated_at
2. THE `id` column SHALL be UUID primary key
3. THE `name` column SHALL be VARCHAR(100) not null
4. THE `treasury_address` column SHALL store the deployed treasury contract address
5. THE `owner_user_id` column SHALL be foreign key to users.id
6. THE Database SHALL create index on `owner_user_id`

### Requirement 3: Organization Members Table

**User Story:** As a system, I want to store organization membership, so that I can enforce role-based access control.

#### Acceptance Criteria

1. THE Database SHALL define an `org_members` table with columns: id, org_id, user_id, role, created_at, updated_at
2. THE `id` column SHALL be UUID primary key
3. THE `org_id` column SHALL be foreign key to organizations.id with cascade delete
4. THE `user_id` column SHALL be foreign key to users.id with cascade delete
5. THE `role` column SHALL be ENUM('OWNER_ADMIN', 'FINANCE_OPERATOR')
6. THE Database SHALL enforce unique constraint on (org_id, user_id)
7. THE Database SHALL create composite index on (org_id, user_id)

### Requirement 4: Contractors Table

**User Story:** As a system, I want to store contractor information, so that I can calculate and execute payroll.

#### Acceptance Criteria

1. THE Database SHALL define a `contractors` table with columns: id, org_id, name, wallet_address, rate_amount, rate_currency, pay_cycle, active, created_at, updated_at
2. THE `id` column SHALL be UUID primary key
3. THE `org_id` column SHALL be foreign key to organizations.id with cascade delete
4. THE `name` column SHALL be VARCHAR(100) not null
5. THE `wallet_address` column SHALL be VARCHAR(42) not null (Ethereum address)
6. THE `rate_amount` column SHALL be DECIMAL(18,8) not null for precision
7. THE `rate_currency` column SHALL be VARCHAR(10) default 'MNEE'
8. THE `pay_cycle` column SHALL be ENUM('WEEKLY', 'BI_WEEKLY', 'MONTHLY')
9. THE `active` column SHALL be BOOLEAN default true for soft delete support
10. THE Database SHALL enforce unique constraint on (org_id, wallet_address)
11. THE Database SHALL create index on org_id

### Requirement 5: Payroll Runs Table

**User Story:** As a system, I want to store payroll run records, so that I can maintain payment history and audit trail.

#### Acceptance Criteria

1. THE Database SHALL define a `payroll_runs` table with columns: id, org_id, run_label, scheduled_date, executed_date, tx_hash, total_mnee, status, created_at, updated_at
2. THE `id` column SHALL be UUID primary key
3. THE `org_id` column SHALL be foreign key to organizations.id with cascade delete
4. THE `run_label` column SHALL be VARCHAR(100) optional for user reference
5. THE `scheduled_date` column SHALL be timestamp nullable (for scheduled runs)
6. THE `executed_date` column SHALL be timestamp nullable (set when executed)
7. THE `tx_hash` column SHALL be VARCHAR(66) nullable (Ethereum tx hash)
8. THE `total_mnee` column SHALL be DECIMAL(18,8) not null
9. THE `status` column SHALL be ENUM('PENDING', 'EXECUTED', 'FAILED')
10. THE Database SHALL create index on (org_id, executed_date)
11. THE Database SHALL create index on tx_hash

### Requirement 6: Payroll Items Table

**User Story:** As a system, I want to store individual payment records, so that I can track contractor-level payment details.

#### Acceptance Criteria

1. THE Database SHALL define a `payroll_items` table with columns: id, payroll_run_id, contractor_id, amount_mnee, status, created_at
2. THE `id` column SHALL be UUID primary key
3. THE `payroll_run_id` column SHALL be foreign key to payroll_runs.id with cascade delete
4. THE `contractor_id` column SHALL be foreign key to contractors.id with set null on delete
5. THE `amount_mnee` column SHALL be DECIMAL(18,8) not null
6. THE `status` column SHALL be ENUM('PENDING', 'PAID', 'FAILED')
7. THE Database SHALL create index on payroll_run_id
8. THE Database SHALL create index on contractor_id

### Requirement 7: Events/Audit Log Table

**User Story:** As a system, I want to store audit events, so that I can track changes and debug issues.

#### Acceptance Criteria

1. THE Database SHALL define an `events` table with columns: id, org_id, user_id, event_type, payload, created_at
2. THE `id` column SHALL be UUID primary key
3. THE `org_id` column SHALL be foreign key to organizations.id nullable (for system events)
4. THE `user_id` column SHALL be foreign key to users.id nullable (for system events)
5. THE `event_type` column SHALL be VARCHAR(50) not null
6. THE `payload` column SHALL be JSONB for flexible event data
7. THE `created_at` column SHALL be timestamp with timezone indexed
8. THE Database SHALL create index on (org_id, event_type, created_at)

### Requirement 8: Notifications Table

**User Story:** As a system, I want to store notifications, so that users can view and manage alerts.

#### Acceptance Criteria

1. THE Database SHALL define a `notifications` table with columns: id, user_id, org_id, type, title, message, read, created_at
2. THE `id` column SHALL be UUID primary key
3. THE `user_id` column SHALL be foreign key to users.id with cascade delete
4. THE `org_id` column SHALL be foreign key to organizations.id nullable
5. THE `type` column SHALL be VARCHAR(50) not null
6. THE `title` column SHALL be VARCHAR(200) not null
7. THE `message` column SHALL be TEXT not null
8. THE `read` column SHALL be BOOLEAN default false
9. THE Database SHALL create index on (user_id, read, created_at)

### Requirement 9: Sessions Table

**User Story:** As a system, I want to store session data, so that I can manage authentication state.

#### Acceptance Criteria

1. THE Database SHALL define a `sessions` table with columns: id, user_id, token_hash, expires_at, created_at
2. THE `id` column SHALL be UUID primary key
3. THE `user_id` column SHALL be foreign key to users.id with cascade delete
4. THE `token_hash` column SHALL be VARCHAR(64) for hashed refresh token
5. THE `expires_at` column SHALL be timestamp with timezone
6. THE Database SHALL create index on token_hash
7. THE Database SHALL create index on (user_id, expires_at)

### Requirement 10: Database Operations

**User Story:** As a developer, I want reliable database operations, so that data integrity is maintained.

#### Acceptance Criteria

1. THE Database SHALL use Prisma ORM for all database operations
2. THE Database SHALL use migrations for all schema changes
3. THE Database SHALL enforce foreign key constraints
4. THE Database SHALL use transactions for multi-table operations
5. THE Database SHALL implement connection pooling for performance
6. THE Database SHALL provide seed script for development data
7. THE Database SHALL support Prisma Studio for visual inspection

### Requirement 11: Data Integrity and Performance

**User Story:** As a system administrator, I want optimized database performance, so that queries execute efficiently.

#### Acceptance Criteria

1. THE Database SHALL avoid N+1 queries through proper eager loading
2. THE Database SHALL paginate all list queries with configurable page size
3. THE Database SHALL use appropriate indexes for common query patterns
4. THE Database SHALL implement soft deletes for contractors (active flag)
5. THE Database SHALL retain payroll history indefinitely (no hard deletes)
6. THE Database SHALL use DECIMAL type for all monetary values to prevent precision loss
