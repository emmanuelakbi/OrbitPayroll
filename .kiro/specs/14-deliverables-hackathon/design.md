# Design Document: OrbitPayroll Hackathon Deliverables

## Overview

This document defines the artifacts and materials required for hackathon submission, including demo video, live deployment, and documentation.

## Deliverables Checklist

### Required Artifacts

- [ ] **Project Description** - Devpost submission text
- [ ] **Demo Video** - 5 min max, YouTube/Vimeo
- [ ] **Live Demo URL** - Deployed on Vercel + Railway
- [ ] **GitHub Repository** - Public, MIT license
- [ ] **README** - Setup instructions, architecture

### Demo Video Script

```
0:00 - 0:30  | Problem Statement
             | "Global teams struggle with payroll..."
             
0:30 - 1:00  | Solution Introduction
             | "OrbitPayroll uses MNEE for programmable payroll"
             
1:00 - 2:00  | Wallet Connection & Org Setup
             | Connect MetaMask, create organization
             
2:00 - 3:00  | Add Contractors
             | Add 2-3 contractors with different rates
             
3:00 - 4:00  | Fund Treasury & Execute Payroll
             | Deposit MNEE, preview, execute batch payment
             
4:00 - 4:30  | Verify On-Chain
             | Show Etherscan transaction, event logs
             
4:30 - 5:00  | Closing & Impact
             | "MNEE enables instant, transparent global payroll"
```

### README Template

```markdown
# OrbitPayroll 🚀

Web3-native payroll platform for distributed teams using MNEE stablecoin.

## Features
- 🔐 Wallet-based authentication (SIWE)
- 👥 Contractor management
- 💰 Non-custodial treasury
- ⚡ Batch payroll execution
- 📊 Transaction history

## Tech Stack
- Frontend: Next.js 14, TailwindCSS, wagmi
- Backend: Node.js, Express, Prisma
- Database: PostgreSQL
- Contracts: Solidity, Hardhat

## Quick Start
\`\`\`bash
git clone https://github.com/your-org/orbitpayroll
cd orbitpayroll
cp .env.example .env
npm install
npm run dev
\`\`\`

## Architecture
[Include diagram]

## MNEE Integration
OrbitPayroll uses MNEE (0x8cced...cF) for all payments.

## Links
- [Live Demo](https://orbitpayroll.vercel.app)
- [Demo Video](https://youtube.com/...)
- [Devpost](https://devpost.com/...)

## Team
- Developer 1
- Developer 2

## License
MIT
```

### Demo Environment Setup

```typescript
// Seed script for demo
async function seedDemo() {
  // Create demo org
  const org = await prisma.organization.create({
    data: {
      name: 'Demo Organization',
      treasuryAddress: DEMO_TREASURY,
      owner: { connect: { walletAddress: DEMO_WALLET } },
    },
  });
  
  // Add demo contractors
  await prisma.contractor.createMany({
    data: [
      { orgId: org.id, name: 'Alice', walletAddress: '0xaaa...', rateAmount: 5000, payCycle: 'MONTHLY' },
      { orgId: org.id, name: 'Bob', walletAddress: '0xbbb...', rateAmount: 4000, payCycle: 'MONTHLY' },
      { orgId: org.id, name: 'Carol', walletAddress: '0xccc...', rateAmount: 3000, payCycle: 'MONTHLY' },
    ],
  });
}
```

## MNEE Integration Showcase

### Key Integration Points

1. **Treasury Contract** - Holds MNEE for organization
2. **Deposit Flow** - approve() + deposit() pattern
3. **Batch Payments** - Single tx to multiple recipients
4. **Event Logging** - PayrollExecuted events on-chain

### Code Snippet for Judges

```solidity
// PayrollTreasury.sol - MNEE Integration
IERC20 public immutable mneeToken; // 0x8ccedbAe4916b79da7F3F612EfB2EB93A2bFD6cF

function runPayroll(
    address[] calldata recipients,
    uint256[] calldata amounts,
    bytes32 runId
) external onlyAdmin {
    uint256 total = 0;
    for (uint i = 0; i < amounts.length; i++) {
        total += amounts[i];
        mneeToken.safeTransfer(recipients[i], amounts[i]);
    }
    emit PayrollExecuted(runId, total, recipients.length, block.timestamp);
}
```

## Correctness Properties

### Property 1: Demo Stability
*For any* judge interaction during the judging period, the demo SHALL remain functional and responsive.

**Validates: Requirements 10.4**

### Property 2: MNEE Visibility
*For any* payroll execution in the demo, the MNEE token address and transaction SHALL be visible and verifiable.

**Validates: Requirements 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7**

### Property 3: MVP Completeness
*For any* core user flow (auth, add contractor, execute payroll), the demo SHALL complete successfully.

**Validates: Requirements 9.1 through 9.8**

## Submission Checklist

- [ ] Devpost project created
- [ ] All required fields filled
- [ ] Demo video uploaded and linked
- [ ] Live demo URL tested
- [ ] GitHub repo public
- [ ] README complete
- [ ] Team members added
- [ ] Submitted before deadline
