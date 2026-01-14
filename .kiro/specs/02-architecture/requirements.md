# Requirements Document: OrbitPayroll Architecture

## Introduction

This document defines the architectural requirements for OrbitPayroll, establishing system boundaries, component interactions, and technical constraints that enable modular development and secure operation of a Web3 payroll platform.

## Glossary

- **Web_Client**: Next.js/React single-page application serving the user interface
- **API_Backend**: Node.js server providing REST APIs for business logic and data persistence
- **Smart_Contract_Layer**: Solidity contracts deployed on Ethereum for treasury and payroll execution
- **Database**: PostgreSQL instance storing off-chain metadata via Prisma ORM
- **Job_Runner**: Background process handling scheduled tasks and notifications
- **RPC_Provider**: External service (Infura/Alchemy) providing Ethereum network access
- **Event_Bus**: Internal messaging system for component communication
- **Cache_Layer**: Optional Redis instance for session management and rate limiting

## Requirements

### Requirement 1: System Component Boundaries

**User Story:** As a developer, I want clear component boundaries, so that I can work on modules independently without breaking other parts of the system.

#### Acceptance Criteria

1. THE Architecture SHALL define five primary components: Web_Client, API_Backend, Smart_Contract_Layer, Database, and Job_Runner
2. THE Architecture SHALL ensure Web_Client communicates with API_Backend via REST/JSON over HTTPS
3. THE Architecture SHALL ensure Web_Client communicates with Smart_Contract_Layer via ethers.js/wagmi for transaction signing
4. THE Architecture SHALL ensure API_Backend never holds or manages private keys
5. THE Architecture SHALL ensure all fund custody occurs exclusively in Smart_Contract_Layer
6. WHEN components communicate THEN the Architecture SHALL use well-defined interfaces and DTOs

### Requirement 2: Data Flow Patterns

**User Story:** As a developer, I want predictable data flow patterns, so that I can trace issues and understand system behavior.

#### Acceptance Criteria

1. WHEN a user initiates a read operation THEN the Web_Client SHALL query API_Backend which queries Database
2. WHEN a user initiates a blockchain read THEN the Web_Client SHALL query RPC_Provider directly or via API_Backend
3. WHEN a user initiates a transaction THEN the Web_Client SHALL construct and sign locally, then broadcast via RPC_Provider
4. WHEN a transaction confirms THEN the Web_Client SHALL notify API_Backend to update off-chain records
5. THE Architecture SHALL implement optimistic updates with rollback on transaction failure
6. WHEN blockchain state changes THEN the Job_Runner MAY poll or listen for events to sync Database

### Requirement 3: Authentication Architecture

**User Story:** As a security engineer, I want a secure authentication architecture, so that user sessions are protected without centralized credential storage.

#### Acceptance Criteria

1. THE Architecture SHALL implement wallet-based authentication using Sign-In with Ethereum (SIWE) pattern
2. WHEN authenticating THEN the API_Backend SHALL generate a unique nonce per session attempt
3. WHEN verifying THEN the API_Backend SHALL validate signature against nonce and wallet address
4. THE Architecture SHALL issue short-lived JWT tokens (15-60 minutes) after successful verification
5. THE Architecture SHALL support refresh token rotation for extended sessions
6. THE Architecture SHALL store session metadata in Database with wallet address as primary identifier

### Requirement 4: Smart Contract Architecture

**User Story:** As a blockchain developer, I want a clear contract architecture, so that I can implement secure and gas-efficient payroll operations.

#### Acceptance Criteria

1. THE Architecture SHALL define a PayrollTreasury contract for holding organization funds
2. THE Architecture SHALL define a PayrollManager contract for executing batch payments
3. THE Architecture SHALL use the MNEE ERC20 at `0x8ccedbAe4916b79da7F3F612EfB2EB93A2bFD6cF` as payment token
4. THE Architecture SHALL implement access control limiting payroll execution to authorized addresses
5. THE Architecture SHALL emit events for all state-changing operations (deposits, payroll runs)
6. THE Architecture SHALL minimize on-chain storage to reduce gas costs
7. WHERE multiple organizations exist THEN the Architecture SHALL support either per-org contracts or multi-tenant mapping

### Requirement 5: Database Architecture

**User Story:** As a backend developer, I want a well-structured database schema, so that I can efficiently query and maintain off-chain data.

#### Acceptance Criteria

1. THE Architecture SHALL use PostgreSQL as the primary database
2. THE Architecture SHALL use Prisma ORM for type-safe database access
3. THE Architecture SHALL define tables for: users, organizations, org_members, contractors, payroll_runs, payroll_items, events
4. THE Architecture SHALL implement foreign key constraints for referential integrity
5. THE Architecture SHALL index frequently queried columns (org_id, wallet_address, created_at)
6. THE Architecture SHALL support soft deletes for audit trail preservation

### Requirement 6: API Architecture

**User Story:** As a frontend developer, I want a consistent API architecture, so that I can integrate reliably with backend services.

#### Acceptance Criteria

1. THE Architecture SHALL expose RESTful JSON APIs over HTTPS
2. THE Architecture SHALL version APIs with URL prefix (e.g., /api/v1/)
3. THE Architecture SHALL implement consistent error response format with code, message, and details
4. THE Architecture SHALL validate all inputs using schema validation (zod/Joi)
5. THE Architecture SHALL implement rate limiting to prevent abuse
6. THE Architecture SHALL document all endpoints with OpenAPI/Swagger specification

### Requirement 7: Job Runner Architecture

**User Story:** As a platform operator, I want reliable background job processing, so that scheduled tasks execute without manual intervention.

#### Acceptance Criteria

1. THE Architecture SHALL implement a Job_Runner for scheduled notifications and reminders
2. THE Job_Runner SHALL NOT execute on-chain transactions directly
3. WHEN a scheduled payroll date arrives THEN the Job_Runner SHALL create notifications for admins
4. THE Job_Runner SHALL implement idempotency to handle restarts safely
5. THE Job_Runner SHALL log all job executions with timestamps and outcomes
6. THE Architecture SHALL support job retry with exponential backoff for transient failures

### Requirement 8: Environment and Configuration

**User Story:** As a DevOps engineer, I want clear configuration management, so that I can deploy consistently across environments.

#### Acceptance Criteria

1. THE Architecture SHALL use environment variables for all configuration
2. THE Architecture SHALL provide .env.example templates for all components
3. THE Architecture SHALL support distinct configurations for development, staging, and production
4. THE Architecture SHALL externalize all secrets (API keys, JWT secrets, RPC URLs)
5. THE Architecture SHALL validate required configuration at startup
6. IF required configuration is missing THEN the component SHALL fail fast with descriptive error

### Requirement 9: Development and Testing Infrastructure

**User Story:** As a developer, I want robust testing infrastructure, so that I can validate changes before deployment.

#### Acceptance Criteria

1. THE Architecture SHALL provide a test harness for end-to-end validation
2. THE Architecture SHALL support local development with mock contracts or testnet
3. THE Architecture SHALL maintain contract ABIs and addresses in version-controlled JSON files
4. THE Architecture SHALL provide seed scripts for local database population
5. THE Architecture SHALL support feature flags for toggling between mock and real integrations
6. WHEN running tests THEN the Architecture SHALL isolate test data from production
