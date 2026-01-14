# Requirements Document: OrbitPayroll Backend API

## Introduction

This document specifies the backend API requirements for OrbitPayroll, defining REST endpoints, authentication flows, data validation, and business logic for managing organizations, contractors, and payroll metadata.

## Glossary

- **API_Server**: Node.js/Express or NestJS application serving REST endpoints
- **Auth_Service**: Module handling wallet-based authentication and session management
- **Org_Service**: Module managing organization CRUD operations
- **Contractor_Service**: Module managing contractor records within organizations
- **Payroll_Service**: Module handling payroll run metadata and calculations
- **JWT_Token**: JSON Web Token issued after successful authentication
- **Nonce**: Unique random string used for signature verification
- **DTO**: Data Transfer Object defining API request/response shapes
- **Middleware**: Request interceptors for auth, validation, and logging

## Requirements

### Requirement 1: Authentication Endpoints

**User Story:** As a user, I want to authenticate via my wallet, so that I can securely access organization data.

#### Acceptance Criteria

1. WHEN a client requests `POST /api/v1/auth/nonce` with wallet address THEN the API_Server SHALL return a unique nonce
2. THE API_Server SHALL store the nonce with expiration (5 minutes) associated with the wallet address
3. WHEN a client submits `POST /api/v1/auth/verify` with wallet, signature, and nonce THEN the API_Server SHALL verify the signature
4. IF signature is valid THEN the API_Server SHALL return a JWT_Token with wallet address claim
5. IF signature is invalid or nonce expired THEN the API_Server SHALL return 401 with error details
6. WHEN a client requests `POST /api/v1/auth/refresh` with valid refresh token THEN the API_Server SHALL issue new tokens
7. WHEN a client requests `POST /api/v1/auth/logout` THEN the API_Server SHALL invalidate the session

### Requirement 2: Organization Endpoints

**User Story:** As an authenticated user, I want to manage organizations, so that I can set up and configure my team's payroll.

#### Acceptance Criteria

1. WHEN a client requests `POST /api/v1/orgs` with name THEN the API_Server SHALL create organization with caller as Owner_Admin
2. WHEN a client requests `GET /api/v1/orgs` THEN the API_Server SHALL return all organizations where user is a member
3. WHEN a client requests `GET /api/v1/orgs/:id` THEN the API_Server SHALL return organization details if user is member
4. WHEN a client requests `PUT /api/v1/orgs/:id` THEN the API_Server SHALL update organization if user is Owner_Admin
5. IF user is not a member of the organization THEN the API_Server SHALL return 403 Forbidden
6. THE API_Server SHALL validate organization name is non-empty and under 100 characters

### Requirement 3: Organization Member Endpoints

**User Story:** As an organization owner, I want to manage team members, so that I can delegate access appropriately.

#### Acceptance Criteria

1. WHEN a client requests `POST /api/v1/orgs/:id/members` with wallet and role THEN the API_Server SHALL add member if caller is Owner_Admin
2. WHEN a client requests `GET /api/v1/orgs/:id/members` THEN the API_Server SHALL return all members with roles
3. WHEN a client requests `PUT /api/v1/orgs/:id/members/:memberId` THEN the API_Server SHALL update role if caller is Owner_Admin
4. WHEN a client requests `DELETE /api/v1/orgs/:id/members/:memberId` THEN the API_Server SHALL remove member if caller is Owner_Admin
5. THE API_Server SHALL prevent removal of the last Owner_Admin
6. THE API_Server SHALL validate role is one of: Owner_Admin, Finance_Operator

### Requirement 4: Contractor Endpoints

**User Story:** As an organization admin, I want to manage contractors via API, so that I can maintain the payroll roster.

#### Acceptance Criteria

1. WHEN a client requests `POST /api/v1/orgs/:id/contractors` THEN the API_Server SHALL create contractor if caller has permission
2. WHEN a client requests `GET /api/v1/orgs/:id/contractors` THEN the API_Server SHALL return paginated contractor list
3. WHEN a client requests `GET /api/v1/orgs/:id/contractors/:contractorId` THEN the API_Server SHALL return contractor details
4. WHEN a client requests `PUT /api/v1/orgs/:id/contractors/:contractorId` THEN the API_Server SHALL update contractor if caller is Owner_Admin
5. WHEN a client requests `DELETE /api/v1/orgs/:id/contractors/:contractorId` THEN the API_Server SHALL archive (soft delete) contractor
6. THE API_Server SHALL validate wallet address is valid Ethereum address format
7. THE API_Server SHALL validate rate_amount is positive number
8. THE API_Server SHALL validate pay_cycle is one of: weekly, bi-weekly, monthly
9. THE API_Server SHALL enforce unique wallet addresses within an organization

### Requirement 5: Payroll Preview Endpoint

**User Story:** As a finance operator, I want to preview payroll calculations, so that I can verify amounts before execution.

#### Acceptance Criteria

1. WHEN a client requests `POST /api/v1/orgs/:id/payroll-runs/preview` THEN the API_Server SHALL calculate total MNEE for active contractors
2. THE API_Server SHALL return array of contractor payments with wallet and amount
3. THE API_Server SHALL return total MNEE required for the run
4. THE API_Server SHALL exclude archived contractors from preview
5. IF no active contractors exist THEN the API_Server SHALL return empty preview with zero total
6. THE API_Server SHALL include contractor names and IDs in preview for reference

### Requirement 6: Payroll Run Endpoints

**User Story:** As a finance operator, I want to record payroll runs, so that I maintain accurate history of payments.

#### Acceptance Criteria

1. WHEN a client requests `POST /api/v1/orgs/:id/payroll-runs` with tx_hash and items THEN the API_Server SHALL create payroll run record
2. THE API_Server SHALL validate tx_hash is valid transaction hash format
3. THE API_Server SHALL create payroll_items for each contractor payment
4. WHEN a client requests `GET /api/v1/orgs/:id/payroll-runs` THEN the API_Server SHALL return paginated list of runs
5. WHEN a client requests `GET /api/v1/orgs/:id/payroll-runs/:runId` THEN the API_Server SHALL return run with items
6. THE API_Server SHALL store executed_date as timestamp of record creation
7. THE API_Server SHALL calculate and store total_mnee from items

### Requirement 7: Treasury Read Endpoint

**User Story:** As an organization member, I want to query treasury info via API, so that I can display balance in the UI.

#### Acceptance Criteria

1. WHEN a client requests `GET /api/v1/orgs/:id/treasury` THEN the API_Server SHALL return treasury contract address
2. THE API_Server SHALL return cached MNEE balance if available and fresh (< 30 seconds)
3. IF cache is stale THEN the API_Server SHALL query blockchain and update cache
4. THE API_Server SHALL return upcoming payroll total based on active contractors
5. THE API_Server SHALL return next scheduled payroll date if configured

### Requirement 8: Notification Endpoints

**User Story:** As a user, I want to manage notifications via API, so that I stay informed about payroll events.

#### Acceptance Criteria

1. WHEN a client requests `GET /api/v1/notifications` THEN the API_Server SHALL return user's notifications paginated
2. WHEN a client requests `PUT /api/v1/notifications/:id/read` THEN the API_Server SHALL mark notification as read
3. WHEN a client requests `PUT /api/v1/notifications/read-all` THEN the API_Server SHALL mark all as read
4. THE API_Server SHALL return unread count in notification list response
5. THE API_Server SHALL filter notifications by organization if org_id query param provided

### Requirement 9: Input Validation and Error Handling

**User Story:** As a developer, I want consistent validation and errors, so that I can handle API responses predictably.

#### Acceptance Criteria

1. THE API_Server SHALL validate all request bodies using zod schemas
2. IF validation fails THEN the API_Server SHALL return 400 with field-level error details
3. THE API_Server SHALL return consistent error format: { code, message, details }
4. THE API_Server SHALL return 401 for missing or invalid authentication
5. THE API_Server SHALL return 403 for insufficient permissions
6. THE API_Server SHALL return 404 for non-existent resources
7. THE API_Server SHALL return 500 for unexpected errors with correlation ID
8. THE API_Server SHALL log all errors with request context

### Requirement 10: Security and Rate Limiting

**User Story:** As a security engineer, I want protected APIs, so that the system resists abuse and attacks.

#### Acceptance Criteria

1. THE API_Server SHALL require valid JWT_Token for all endpoints except auth/nonce and auth/verify
2. THE API_Server SHALL implement rate limiting: 100 requests/minute per IP for auth, 1000/minute for authenticated
3. THE API_Server SHALL validate JWT signature and expiration on every request
4. THE API_Server SHALL sanitize all inputs to prevent injection attacks
5. THE API_Server SHALL set security headers (CORS, CSP, X-Frame-Options)
6. THE API_Server SHALL log authentication failures with IP and wallet address
