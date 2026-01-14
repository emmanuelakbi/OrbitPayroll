# Implementation Plan: OrbitPayroll Backend API

## Overview

This task list covers the implementation of the REST API backend using Node.js, Express, TypeScript, and Prisma ORM.

## Tasks

- [x] 1. Backend Project Setup
  - [x] 1.1 Initialize Express application
    - Create `apps/backend` directory structure
    - Configure TypeScript with strict mode
    - Set up ESLint and Prettier
    - _Requirements: Technical setup_

  - [x] 1.2 Configure Prisma and database
    - Install Prisma and PostgreSQL driver
    - Create initial schema from design
    - Run initial migration
    - _Requirements: Database setup_

  - [x] 1.3 Set up middleware stack
    - Configure CORS, helmet, compression
    - Set up request logging
    - Configure rate limiting
    - _Requirements: 10.1, 10.2, 10.5_

- [x] 2. Authentication Endpoints
  - [x] 2.1 Implement nonce generation endpoint
    - Create POST /api/v1/auth/nonce
    - Generate cryptographic nonce
    - Store with 5-minute expiration
    - Return SIWE message
    - _Requirements: 1.1, 1.2_

  - [x] 2.2 Implement signature verification endpoint
    - Create POST /api/v1/auth/verify
    - Verify SIWE signature
    - Create/update user record
    - Issue JWT tokens
    - _Requirements: 1.3, 1.4, 1.5_

  - [x] 2.3 Implement token refresh endpoint
    - Create POST /api/v1/auth/refresh
    - Validate refresh token
    - Rotate tokens
    - _Requirements: 1.6_

  - [x] 2.4 Implement logout endpoint
    - Create POST /api/v1/auth/logout
    - Invalidate session
    - _Requirements: 1.7_

  - [x] 2.5 Write property test for nonce uniqueness
    - **Property 1: Nonce Uniqueness and Expiration**
    - **Validates: Requirements 1.1, 1.2**

- [x] 3. Checkpoint - Auth Complete
  - Test full auth flow with wallet
  - Verify JWT tokens work correctly

- [x] 4. Organization Endpoints
  - [x] 4.1 Implement create organization endpoint
    - Create POST /api/v1/orgs
    - Create org with owner membership
    - _Requirements: 2.1_

  - [x] 4.2 Implement list organizations endpoint
    - Create GET /api/v1/orgs
    - Filter by user membership
    - _Requirements: 2.2_

  - [x] 4.3 Implement get organization endpoint
    - Create GET /api/v1/orgs/:id
    - Verify membership
    - _Requirements: 2.3_

  - [x] 4.4 Implement update organization endpoint
    - Create PUT /api/v1/orgs/:id
    - Require OWNER_ADMIN role
    - _Requirements: 2.4_

  - [x] 4.5 Write property test for membership enforcement
    - **Property 4: Organization Membership Enforcement**
    - **Validates: Requirements 2.3, 2.4, 2.5**

- [x] 5. Organization Member Endpoints
  - [x] 5.1 Implement add member endpoint
    - Create POST /api/v1/orgs/:id/members
    - Require OWNER_ADMIN role
    - _Requirements: 3.1_

  - [x] 5.2 Implement list members endpoint
    - Create GET /api/v1/orgs/:id/members
    - _Requirements: 3.2_

  - [x] 5.3 Implement update member role endpoint
    - Create PUT /api/v1/orgs/:id/members/:memberId
    - Require OWNER_ADMIN role
    - _Requirements: 3.3_

  - [x] 5.4 Implement remove member endpoint
    - Create DELETE /api/v1/orgs/:id/members/:memberId
    - Prevent removing last owner
    - _Requirements: 3.4, 3.5_

- [x] 6. Contractor Endpoints
  - [x] 6.1 Implement create contractor endpoint
    - Create POST /api/v1/orgs/:id/contractors
    - Validate wallet address format
    - Check uniqueness within org
    - _Requirements: 4.1, 4.6, 4.7, 4.8, 4.9_

  - [x] 6.2 Implement list contractors endpoint
    - Create GET /api/v1/orgs/:id/contractors
    - Support pagination, search, filter
    - _Requirements: 4.2_

  - [x] 6.3 Implement get contractor endpoint
    - Create GET /api/v1/orgs/:id/contractors/:contractorId
    - _Requirements: 4.3_

  - [x] 6.4 Implement update contractor endpoint
    - Create PUT /api/v1/orgs/:id/contractors/:contractorId
    - Require OWNER_ADMIN role
    - _Requirements: 4.4_

  - [x] 6.5 Implement archive contractor endpoint
    - Create DELETE /api/v1/orgs/:id/contractors/:contractorId
    - Soft delete (set active=false)
    - _Requirements: 4.5_

  - [x] 6.6 Write property test for wallet uniqueness
    - **Property 6: Contractor Wallet Uniqueness**
    - **Validates: Requirements 4.9**

- [x] 7. Checkpoint - CRUD Complete
  - Test all CRUD operations
  - Verify authorization works

- [x] 8. Payroll Endpoints
  - [x] 8.1 Implement payroll preview endpoint
    - Create POST /api/v1/orgs/:id/payroll-runs/preview
    - Calculate total from active contractors
    - Return preview with deficit
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6_

  - [x] 8.2 Implement create payroll run endpoint
    - Create POST /api/v1/orgs/:id/payroll-runs
    - Validate tx hash format
    - Store run and items
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.7_

  - [x] 8.3 Implement list payroll runs endpoint
    - Create GET /api/v1/orgs/:id/payroll-runs
    - Support pagination
    - _Requirements: 6.5_

  - [x] 8.4 Implement get payroll run endpoint
    - Create GET /api/v1/orgs/:id/payroll-runs/:runId
    - Include items with contractor details
    - _Requirements: 6.6_

  - [x] 8.5 Write property test for payroll calculation
    - **Property 8: Payroll Preview Calculation**
    - **Validates: Requirements 5.1, 5.2, 5.3**

- [x] 9. Treasury Endpoint
  - [x] 9.1 Implement treasury info endpoint
    - Create GET /api/v1/orgs/:id/treasury
    - Return contract address
    - Calculate upcoming payroll total
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

- [x] 10. Notification Endpoints
  - [x] 10.1 Implement list notifications endpoint
    - Create GET /api/v1/notifications
    - Support pagination and filtering
    - Include unread count
    - _Requirements: 8.1, 8.4_

  - [x] 10.2 Implement mark as read endpoints
    - Create PUT /api/v1/notifications/:id/read
    - Create PUT /api/v1/notifications/read-all
    - _Requirements: 8.2, 8.3_

- [x] 11. Input Validation and Error Handling
  - [x] 11.1 Implement Zod validation schemas
    - Create schemas for all request bodies
    - Implement validation middleware
    - _Requirements: 9.1, 9.2_

  - [x] 11.2 Implement error handling middleware
    - Create consistent error response format
    - Map Prisma errors to HTTP codes
    - _Requirements: 9.3, 9.4, 9.5, 9.6, 9.7, 9.8_

  - [x] 11.3 Write property test for input validation
    - **Property 7: Input Validation Completeness**
    - **Validates: Requirements 9.1, 9.2**

- [x] 12. Final Checkpoint
  - Run all tests
  - Verify API documentation is complete
  - Ask the user if questions arise

## Notes

- All tasks including property-based tests are required
- Use fast-check for property-based testing
- All endpoints require JWT authentication except auth/nonce and auth/verify
