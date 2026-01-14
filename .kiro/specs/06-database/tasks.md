# Implementation Plan: OrbitPayroll Database

## Overview

This task list covers the database schema implementation using Prisma ORM with PostgreSQL.

## Tasks

- [x] 1. Database Setup
  - [x] 1.1 Initialize Prisma
    - Install prisma and @prisma/client
    - Configure datasource for PostgreSQL
    - Set up DATABASE_URL environment variable
    - _Requirements: 10.1, 10.2_

- [x] 2. Schema Implementation
  - [x] 2.1 Create User and Session models
    - Define User with wallet_address unique index
    - Define Session with token_hash index
    - Set up cascade delete
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 9.7_

  - [x] 2.2 Create Organization and OrgMember models
    - Define Organization with owner relation
    - Define OrgMember with unique constraint
    - Define Role enum
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7_

  - [x] 2.3 Create Contractor model
    - Define with Decimal for rate_amount
    - Add unique constraint on (org_id, wallet_address)
    - Define PayCycle enum
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8, 4.9, 4.10_

  - [x] 2.4 Create PayrollRun and PayrollItem models
    - Define with Decimal for amounts
    - Set up cascade delete
    - Define status enums
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8, 5.9, 5.10, 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 6.8_

  - [x] 2.5 Create Event and Notification models
    - Define Event with JSONB payload
    - Define Notification with read flag
    - Add appropriate indexes
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7, 7.8, 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7, 8.8, 8.9_

- [x] 3. Migrations
  - [x] 3.1 Generate and run initial migration
    - Run `prisma migrate dev`
    - Verify tables created correctly
    - _Requirements: 10.3_

- [x] 4. Seed Script
  - [x] 4.1 Create seed script
    - Create test user
    - Create test organization
    - Create test contractors
    - _Requirements: 10.6_

- [x] 5. Property Tests
  - [x] 5.1 Write property test for wallet uniqueness
    - **Property 3: Contractor Wallet Uniqueness Per Org**
    - **Validates: Requirements 4.9**

  - [x] 5.2 Write property test for payroll total consistency
    - **Property 4: Payroll Total Consistency**
    - **Validates: Requirements 5.7**

  - [x] 5.3 Write property test for decimal precision
    - **Property 7: Decimal Precision**
    - **Validates: Requirements 11.6**

- [x] 6. Final Checkpoint
  - Verify all tables and indexes created
  - Run seed script successfully
  - Test Prisma Studio access

## Notes

- All tasks including property-based tests are required
- Use DECIMAL(18,8) for all monetary values
- Ensure proper indexing for query performance
