# Design Document: OrbitPayroll Architecture

## Overview

OrbitPayroll follows a modular architecture with clear boundaries between frontend, backend, smart contracts, and database. The system is designed for non-custodial operation where the backend never holds private keys or signs transactions.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                                   USERS                                          │
│                    (Organization Admins, Finance Operators)                      │
└─────────────────────────────────────────────────────────────────────────────────┘
                                       │
                    ┌──────────────────┼──────────────────┐
                    │                  │                  │
                    ▼                  ▼                  ▼
┌─────────────────────────┐  ┌─────────────────┐  ┌─────────────────────────┐
│      Web Client         │  │  Wallet Provider │  │    RPC Provider         │
│    (Next.js SPA)        │  │   (MetaMask)     │  │  (Alchemy/Infura)       │
│                         │  │                  │  │                         │
│ - Dashboard UI          │  │ - Sign messages  │  │ - Read blockchain       │
│ - Form handling         │  │ - Sign txs       │  │ - Broadcast txs         │
│ - State management      │  │ - Account mgmt   │  │ - Event listening       │
└─────────────────────────┘  └─────────────────┘  └─────────────────────────┘
           │                                                   │
           │ REST/JSON                                         │ JSON-RPC
           ▼                                                   ▼
┌─────────────────────────┐                    ┌─────────────────────────────┐
│      API Backend        │                    │      Ethereum Network        │
│   (Node.js/Express)     │                    │                             │
│                         │                    │  ┌─────────────────────┐    │
│ - Auth (SIWE)           │                    │  │  PayrollTreasury    │    │
│ - Org management        │                    │  │  - Hold MNEE        │    │
│ - Contractor CRUD       │                    │  │  - Execute payroll  │    │
│ - Payroll metadata      │                    │  └─────────────────────┘    │
│ - Notifications         │                    │                             │
└─────────────────────────┘                    │  ┌─────────────────────┐    │
           │                                   │  │    MNEE Token       │    │
           │ Prisma ORM                        │  │    (ERC20)          │    │
           ▼                                   │  └─────────────────────┘    │
┌─────────────────────────┐                    └─────────────────────────────┘
│      PostgreSQL         │
│                         │
│ - Users & sessions      │
│ - Organizations         │
│ - Contractors           │
│ - Payroll history       │
│ - Audit events          │
└─────────────────────────┘
```

## Component Boundaries

### Web Client (Frontend)
- **Technology**: Next.js 14, React, TailwindCSS, wagmi
- **Responsibilities**: UI rendering, form validation, wallet integration, transaction building
- **Does NOT**: Store secrets, sign transactions server-side, access database directly

### API Backend
- **Technology**: Node.js, Express/NestJS, TypeScript, Prisma
- **Responsibilities**: Authentication, authorization, data persistence, business logic
- **Does NOT**: Hold private keys, sign transactions, custody funds

### Smart Contracts
- **Technology**: Solidity 0.8+, Hardhat/Foundry
- **Responsibilities**: Fund custody, payroll execution, access control
- **Does NOT**: Store off-chain metadata, manage user sessions

### Database
- **Technology**: PostgreSQL, Prisma ORM
- **Responsibilities**: Persist off-chain data, maintain audit trail
- **Does NOT**: Store private keys, store on-chain state

## Data Flow Patterns

### Authentication Flow
```
User → Wallet → Sign SIWE Message → Backend Verify → JWT Issued → Authenticated
```

### Payroll Execution Flow
```
1. Frontend: Load contractors from Backend
2. Frontend: Calculate amounts, build preview
3. Frontend: User confirms, build transaction
4. Wallet: User signs transaction
5. RPC: Broadcast to Ethereum
6. Contract: Execute batch transfers
7. Frontend: Wait for confirmation
8. Frontend: POST run metadata to Backend
9. Backend: Store in Database
```

## Correctness Properties

### Property 1: Non-Custodial Operation
*For any* transaction execution, the private key signing SHALL occur in the user's wallet, never on the backend.

**Validates: Requirements 1.4**

### Property 2: Data Consistency
*For any* payroll run, the on-chain transaction data SHALL match the off-chain metadata stored in the database.

**Validates: Requirements 2.4, 2.5**

### Property 3: Component Isolation
*For any* component failure, other components SHALL continue operating or fail gracefully with appropriate error messages.

**Validates: Requirements 4.5, 4.6**

## Testing Strategy

- **Unit Tests**: Each component tested in isolation with mocks
- **Integration Tests**: API + Database, Frontend + API
- **E2E Tests**: Full flow on testnet
- **Contract Tests**: Hardhat/Foundry test suite
