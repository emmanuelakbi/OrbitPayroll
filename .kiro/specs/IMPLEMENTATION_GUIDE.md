# OrbitPayroll Implementation Guide

## Overview

This guide provides a systematic approach to implementing OrbitPayroll from the comprehensive specs. Follow this order to build incrementally with minimal rework.

## Prerequisites

Before starting, ensure you have:
- Node.js 20+ installed
- PostgreSQL database (local or cloud)
- MetaMask or another Ethereum wallet
- Alchemy/Infura account for RPC access
- Git repository initialized

## Implementation Phases

### Phase 1: Foundation (Days 1-2)

**Goal:** Set up project structure, database, and smart contracts

#### Step 1.1: Architecture Setup
```
📁 .kiro/specs/02-architecture/tasks.md
```
- [ ] Task 1.1: Initialize monorepo structure
- [ ] Task 1.2: Configure shared TypeScript
- [ ] Task 1.3: Create shared types package
- [ ] Task 2.1: Create environment templates
- [ ] Task 2.2: Implement config validation

**Deliverable:** Working monorepo with `apps/frontend`, `apps/backend`, `packages/types`

#### Step 1.2: Database Schema
```
📁 .kiro/specs/06-database/tasks.md
```
- [ ] Task 1.1: Initialize Prisma
- [ ] Task 2.1-2.5: Create all models (User, Org, Contractor, Payroll, etc.)
- [ ] Task 3.1: Generate and run migrations
- [ ] Task 4.1: Create seed script

**Deliverable:** PostgreSQL database with all tables created

#### Step 1.3: Smart Contracts
```
📁 .kiro/specs/05-smart-contracts/tasks.md
```
- [ ] Task 1.1: Initialize Hardhat project
- [ ] Task 1.2: Create mock MNEE token
- [ ] Task 2.1-2.6: Implement PayrollTreasury contract
- [ ] Task 4.1-4.5: Write unit tests
- [ ] Task 8.1: Deploy to testnet

**Deliverable:** PayrollTreasury deployed to Sepolia testnet

---

### Phase 2: Backend API (Days 3-4)

**Goal:** Build complete REST API

```
📁 .kiro/specs/03-backend/tasks.md
```

#### Step 2.1: Core Setup
- [ ] Task 1.1: Initialize Express application
- [ ] Task 1.2: Configure Prisma and database
- [ ] Task 1.3: Set up middleware stack

#### Step 2.2: Authentication
- [ ] Task 2.1-2.4: Implement auth endpoints (nonce, verify, refresh, logout)
- [ ] Task 2.5: Write property test for nonce uniqueness

#### Step 2.3: Organization & Members
- [ ] Task 4.1-4.4: Implement org endpoints
- [ ] Task 5.1-5.4: Implement member endpoints

#### Step 2.4: Contractors
- [ ] Task 6.1-6.5: Implement contractor CRUD
- [ ] Task 6.6: Write property test for wallet uniqueness

#### Step 2.5: Payroll
- [ ] Task 8.1-8.4: Implement payroll endpoints
- [ ] Task 9.1: Implement treasury endpoint
- [ ] Task 10.1-10.2: Implement notification endpoints

#### Step 2.6: Validation & Error Handling
- [ ] Task 11.1-11.2: Implement Zod schemas and error middleware

**Deliverable:** Complete REST API with all endpoints working

---

### Phase 3: Frontend UI (Days 5-6)

**Goal:** Build complete dashboard UI

```
📁 .kiro/specs/04-frontend/tasks.md
```

#### Step 3.1: Project Setup
- [ ] Task 1.1: Initialize Next.js 14
- [ ] Task 1.2: Configure wagmi and RainbowKit
- [ ] Task 1.3: Set up TanStack Query
- [ ] Task 1.4: Create API client

#### Step 3.2: Authentication
- [ ] Task 2.1: Implement landing page
- [ ] Task 3.1-3.3: Implement wallet connection and SIWE

#### Step 3.3: Dashboard
- [ ] Task 5.1-5.3: Create dashboard layout and overview

#### Step 3.4: Contractor Management
- [ ] Task 6.1-6.4: Implement contractor list, form, edit, archive

#### Step 3.5: Treasury
- [ ] Task 7.1-7.3: Implement treasury display, deposit, history

#### Step 3.6: Payroll Execution
- [ ] Task 9.1-9.6: Implement preview, confirmation, execution, status tracking

#### Step 3.7: History & Notifications
- [ ] Task 10.1-10.3: Implement payroll history
- [ ] Task 11.1-11.2: Implement notifications

**Deliverable:** Complete frontend with all pages functional

---

### Phase 4: Integration & Security (Day 7)

**Goal:** Connect all components and harden security

#### Step 4.1: Integrations
```
📁 .kiro/specs/07-integrations/tasks.md
```
- [ ] Task 1.1: Configure RPC client
- [ ] Task 2.1-2.2: Set up contract ABIs and addresses
- [ ] Task 3.1-3.2: Configure wallet connectors
- [ ] Task 4.1: Create explorer URL utilities

#### Step 4.2: Security
```
📁 .kiro/specs/08-security/tasks.md
```
- [ ] Task 1.1-1.2: Implement SIWE and JWT security
- [ ] Task 2.1: Implement RBAC middleware
- [ ] Task 3.1-3.3: Configure rate limiting, headers, validation
- [ ] Task 4.1-4.2: Verify contract security patterns
- [ ] Task 5.1: Write security tests

**Deliverable:** Secure, integrated application

---

### Phase 5: Testing & Quality (Day 8)

**Goal:** Comprehensive test coverage

```
📁 .kiro/specs/09-testing/tasks.md
```
- [ ] Task 1.1-1.4: Configure test infrastructure
- [ ] Task 2.1-2.3: Write backend unit tests
- [ ] Task 3.1: Write API integration tests
- [ ] Task 4.1: Write frontend component tests
- [ ] Task 5.1: Write contract tests
- [ ] Task 6.1: Write property-based tests

```
📁 .kiro/specs/12-non-functional/tasks.md
```
- [ ] Task 1.1-1.2: Optimize performance
- [ ] Task 3.1: Implement accessibility
- [ ] Task 4.1: Implement responsive design

**Deliverable:** 80%+ test coverage, accessible UI

---

### Phase 6: Deployment (Day 9)

**Goal:** Deploy to production

```
📁 .kiro/specs/10-devops-deployment/tasks.md
```
- [ ] Task 1.1: Create Dockerfile
- [ ] Task 2.1: Configure Vercel deployment
- [ ] Task 3.1: Set up managed PostgreSQL
- [ ] Task 4.1: Finalize contract deployment
- [ ] Task 5.1: Create GitHub Actions workflow
- [ ] Task 6.1: Implement health endpoint
- [ ] Task 7.1: Set up demo environment

```
📁 .kiro/specs/11-observability-logging/tasks.md
```
- [ ] Task 1.1-1.2: Configure logging
- [ ] Task 4.1: Implement audit events
- [ ] Task 5.1: Implement health check

**Deliverable:** Live application at production URL

---

### Phase 7: Documentation & Submission (Day 10)

**Goal:** Complete hackathon deliverables

```
📁 .kiro/specs/13-debugging-playbooks/tasks.md
```
- [ ] Task 1.1-1.4: Write troubleshooting playbooks
- [ ] Task 2.1: Document diagnostic commands

```
📁 .kiro/specs/14-deliverables-hackathon/tasks.md
```
- [ ] Task 1.1-1.2: Write README and project description
- [ ] Task 2.1-2.2: Record and upload demo video
- [ ] Task 3.1-3.2: Deploy and seed demo environment
- [ ] Task 4.1: Prepare public repository
- [ ] Task 5.1: Document MNEE integration
- [ ] Task 6.1: Complete Devpost submission

**Deliverable:** Complete hackathon submission

---

## Quick Reference: Task Execution Order

```
Day 1-2: Foundation
├── 02-architecture/tasks.md (1.1 → 2.2)
├── 06-database/tasks.md (1.1 → 4.1)
└── 05-smart-contracts/tasks.md (1.1 → 8.1)

Day 3-4: Backend
└── 03-backend/tasks.md (1.1 → 11.2)

Day 5-6: Frontend
└── 04-frontend/tasks.md (1.1 → 14.1)

Day 7: Integration
├── 07-integrations/tasks.md (1.1 → 4.1)
└── 08-security/tasks.md (1.1 → 5.1)

Day 8: Testing
├── 09-testing/tasks.md (1.1 → 6.1)
└── 12-non-functional/tasks.md (1.1 → 4.1)

Day 9: Deployment
├── 10-devops-deployment/tasks.md (1.1 → 7.1)
└── 11-observability-logging/tasks.md (1.1 → 5.1)

Day 10: Submission
├── 13-debugging-playbooks/tasks.md (1.1 → 2.1)
└── 14-deliverables-hackathon/tasks.md (1.1 → 6.1)
```

## How to Execute Tasks in Kiro

1. Open the relevant `tasks.md` file
2. Click "Start task" next to the task you want to execute
3. Kiro will implement the task based on the requirements and design
4. Review the changes and provide feedback if needed
5. Mark the task as complete when satisfied
6. Move to the next task

## Tips for Success

1. **Don't skip checkpoints** - They ensure each phase is working before moving on
2. **Test on testnet first** - Always verify contract interactions on Sepolia before mainnet
3. **Keep commits small** - Commit after each task for easy rollback
4. **Run tests frequently** - Catch issues early
5. **Document as you go** - Update README with setup instructions

## Environment Variables Checklist

```bash
# Database
DATABASE_URL=postgresql://...

# JWT
JWT_SECRET=your-256-bit-secret

# Ethereum
NEXT_PUBLIC_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/...
NEXT_PUBLIC_NETWORK=sepolia
NEXT_PUBLIC_MNEE_ADDRESS=0x8ccedbAe4916b79da7F3F612EfB2EB93A2bFD6cF

# WalletConnect
NEXT_PUBLIC_WC_PROJECT_ID=your-project-id

# Optional: Email
SENDGRID_API_KEY=SG.xxx
```

## Success Criteria

Before submitting, verify:
- [ ] Wallet connection works
- [ ] Can create organization
- [ ] Can add contractors
- [ ] Can deposit MNEE to treasury
- [ ] Can execute payroll on testnet
- [ ] Transaction appears on Etherscan
- [ ] History shows completed runs
- [ ] Mobile responsive
- [ ] Demo video recorded
- [ ] README complete
- [ ] Devpost submitted

Good luck with your hackathon! 🚀
