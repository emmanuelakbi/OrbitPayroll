# OrbitPayroll - Comprehensive Specification Overview

## Vision

OrbitPayroll is a Web3-native payroll platform enabling DAOs, startups, and distributed teams to onboard contractors and execute global payroll using MNEE stablecoin on Ethereum. The platform abstracts blockchain complexity while providing transparent, programmable, and auditable payment rails.

## Core Value Proposition

1. **Simplified Global Payroll**: Pay contractors worldwide in a single transaction
2. **Programmable Money**: Leverage MNEE's programmable features for automated, transparent payments
3. **Non-Custodial**: Organizations maintain full control of treasury funds via smart contracts
4. **Audit Trail**: Complete on-chain history of all payments with verifiable transaction hashes
5. **Role-Based Access**: Delegate payroll operations while maintaining security

## Specification Modules

| Module | Purpose | Priority |
|--------|---------|----------|
| [01-product](../01-product/) | Core product requirements and user stories | P0 |
| [02-architecture](../02-architecture/) | System design and component boundaries | P0 |
| [03-backend](../03-backend/) | REST API specifications | P0 |
| [04-frontend](../04-frontend/) | UI/UX requirements | P0 |
| [05-smart-contracts](../05-smart-contracts/) | On-chain logic specifications | P0 |
| [06-database](../06-database/) | Data model and schema | P0 |
| [07-integrations](../07-integrations/) | External service integrations | P1 |
| [08-security](../08-security/) | Security requirements | P0 |
| [09-testing](../09-testing/) | Test strategy and coverage | P1 |
| [10-devops-deployment](../10-devops-deployment/) | Deployment and infrastructure | P1 |
| [11-observability-logging](../11-observability-logging/) | Logging and monitoring | P2 |
| [12-non-functional](../12-non-functional/) | Performance, UX, accessibility | P1 |
| [13-debugging-playbooks](../13-debugging-playbooks/) | Troubleshooting guides | P2 |
| [14-deliverables-hackathon](../14-deliverables-hackathon/) | Hackathon submission requirements | P0 |

## Technology Stack

### Frontend
- **Framework**: Next.js 14 (App Router)
- **Styling**: Tailwind CSS + shadcn/ui
- **State**: TanStack Query (React Query)
- **Web3**: wagmi + viem + RainbowKit
- **Forms**: React Hook Form + zod

### Backend
- **Runtime**: Node.js 20 LTS
- **Framework**: Express.js or NestJS
- **Language**: TypeScript (strict mode)
- **ORM**: Prisma
- **Validation**: zod
- **Auth**: JWT + SIWE

### Smart Contracts
- **Language**: Solidity 0.8.20+
- **Framework**: Hardhat or Foundry
- **Libraries**: OpenZeppelin Contracts
- **Token**: MNEE ERC20 at `0x8ccedbAe4916b79da7F3F612EfB2EB93A2bFD6cF`

### Database
- **Engine**: PostgreSQL 15+
- **ORM**: Prisma
- **Hosting**: Supabase / Railway / Neon

### Infrastructure
- **Frontend Hosting**: Vercel
- **Backend Hosting**: Railway / Render / Fly.io
- **RPC Provider**: Alchemy / Infura

## Implementation Roadmap

### Phase 1: Foundation (Days 1-2)
1. Set up monorepo structure
2. Initialize Next.js frontend with wallet connection
3. Initialize Express/Nest backend with auth endpoints
4. Set up PostgreSQL with Prisma schema
5. Deploy basic smart contracts to testnet

### Phase 2: Core Features (Days 3-5)
1. Implement organization management (backend + frontend)
2. Implement contractor CRUD (backend + frontend)
3. Implement treasury view and deposit flow
4. Implement payroll preview calculation
5. Implement payroll execution with smart contract

### Phase 3: Polish & Integration (Days 6-7)
1. Implement payroll history and audit views
2. Add notifications (in-app)
3. Error handling and loading states
4. Responsive design refinement
5. End-to-end testing on testnet

### Phase 4: Hackathon Prep (Day 8)
1. Deploy to production/demo environment
2. Seed demo data for judges
3. Record demo video
4. Write README and documentation
5. Submit to Devpost

## Key User Flows

### Flow 1: Onboarding
```
Landing → Connect Wallet → Sign Message → Create Org → Dashboard
```

### Flow 2: Add Contractor
```
Dashboard → Contractors → Add Contractor → Fill Form → Save → Updated List
```

### Flow 3: Fund Treasury
```
Dashboard → Treasury → Deposit → Approve MNEE → Transfer → Updated Balance
```

### Flow 4: Execute Payroll
```
Dashboard → Payroll → Preview → Confirm → Sign Tx → Wait Confirmation → Success
```

## Smart Contract Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      User Wallet (EOA)                       │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ approve() + deposit()
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    PayrollTreasury                           │
│  - Holds MNEE for organization                              │
│  - Admin-controlled                                          │
│  - deposit(), emergencyWithdraw(), getBalance()             │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ runPayroll()
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    PayrollManager                            │
│  - Executes batch payments                                   │
│  - Emits PayrollExecuted event                              │
│  - runPayroll(recipients[], amounts[], runId)               │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ transfer() to each recipient
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    MNEE Token (ERC20)                        │
│  Address: 0x8ccedbAe4916b79da7F3F612EfB2EB93A2bFD6cF        │
└─────────────────────────────────────────────────────────────┘
```

## Database Schema Overview

```
users ─────────────┐
                   │
org_members ◄──────┼──────► organizations
                   │              │
                   │              │
                   │              ▼
                   │        contractors
                   │              │
                   │              │
                   │              ▼
                   │        payroll_runs
                   │              │
                   │              │
                   │              ▼
                   │        payroll_items
                   │
                   ▼
             notifications
                   │
                   ▼
               events
```

## Success Criteria

### MVP Must-Haves
- [ ] Wallet authentication working
- [ ] Create organization and add contractors
- [ ] View treasury balance (from contract)
- [ ] Execute payroll on testnet
- [ ] View transaction history with tx hashes
- [ ] Mobile-responsive UI
- [ ] Demo video recorded
- [ ] Live demo deployed

### Nice-to-Haves
- [ ] Email notifications
- [ ] Scheduled payroll
- [ ] CSV export
- [ ] Multi-org support
- [ ] Role management UI

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Smart contract bugs | Use OpenZeppelin, extensive testing, testnet first |
| RPC provider downtime | Configure fallback provider |
| Time constraints | Prioritize MVP features, cut nice-to-haves |
| Gas costs on mainnet | Deploy to specified hackathon network |
| Wallet compatibility | Use RainbowKit for broad support |

## Getting Started

1. Clone repository
2. Copy `.env.example` to `.env` and configure
3. Install dependencies: `npm install`
4. Start database: `docker-compose up -d`
5. Run migrations: `npx prisma migrate dev`
6. Start development: `npm run dev`

See individual spec modules for detailed requirements.
