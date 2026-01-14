# OrbitPayroll - Devpost Submission Guide

This document contains all the content needed to complete the Devpost submission. Copy-paste each section into the corresponding Devpost field.

---

## 📋 Submission Checklist

- [ ] Project name entered
- [ ] Project tagline entered
- [ ] Project description (detailed) entered
- [ ] "What it does" section completed
- [ ] "How we built it" section completed
- [ ] "Challenges we ran into" section completed
- [ ] "Accomplishments" section completed
- [ ] "What we learned" section completed
- [ ] "What's next" section completed
- [ ] Demo video link added
- [ ] Live demo URL added
- [ ] GitHub repository link added
- [ ] Technology tags added
- [ ] Team members added
- [ ] Submitted before deadline

---

## Project Name

```
OrbitPayroll
```

## Tagline (One-liner)

```
Web3-native payroll platform for distributed teams using MNEE stablecoin
```

---

## Project Description (Short - 300 chars)

```
OrbitPayroll transforms MNEE stablecoin into a "salary rail" for distributed teams. Organizations can batch-pay all contractors in a single on-chain transaction with full transparency and non-custodial control. No banks, no borders, no friction.
```

---

## What it does

```markdown
OrbitPayroll is a complete payroll infrastructure built on MNEE stablecoin that enables organizations to:

**🏦 Non-Custodial Treasury**
Organizations deploy their own PayrollTreasury smart contract. Funds stay under org control—we never custody tokens.

**👥 Contractor Management**
Onboard contractors with wallet addresses, pay rates (hourly/monthly), and pay cycles (weekly, bi-weekly, monthly). The system calculates amounts automatically.

**⚡ Batch Payments**
Execute payroll to up to 100 recipients in a single transaction. One signature, one gas fee, complete transparency.

**📊 Audit Trail**
Every payment is recorded on-chain with transaction hashes. Both organizations and contractors can verify payment history independently.

**Key Features:**
- 🔐 Wallet-based authentication (Sign-In with Ethereum)
- 💰 Real-time treasury balance monitoring
- 📜 Complete payment history with Etherscan links
- 🔔 Real-time notifications for payroll events
```

---

## How we built it

```markdown
OrbitPayroll is built as a full-stack Web3 application with a monorepo architecture:

**Frontend (Next.js 14)**
- React 18 with TypeScript for type safety
- TailwindCSS for responsive, accessible UI
- RainbowKit + wagmi for seamless wallet connection
- TanStack Query for efficient data fetching

**Backend (Express.js)**
- TypeScript with Zod for runtime validation
- Prisma ORM with PostgreSQL for data persistence
- SIWE (Sign-In with Ethereum) + JWT for authentication
- Pino for structured logging

**Smart Contracts (Solidity)**
- PayrollTreasury contract for secure fund management
- OpenZeppelin's ReentrancyGuard and SafeERC20 for security
- Hardhat for development, testing, and deployment
- Deployed on Sepolia testnet

**MNEE Integration**
- MNEE token (0x8ccedbAe4916b79da7F3F612EfB2EB93A2bFD6cF) for all payments
- Batch transfer functionality for efficient payroll execution
- On-chain event logging for transparency

**Testing**
- Vitest for unit and integration tests
- fast-check for property-based testing
- Hardhat tests for smart contract verification
```

---

## Challenges we ran into

```markdown
**1. Batch Payment Gas Optimization**
Executing payments to many recipients in a single transaction required careful gas optimization. We implemented efficient loops and storage patterns to keep gas costs reasonable even with 100 recipients.

**2. Non-Custodial Architecture**
Designing a system where organizations maintain full control of their funds while still enabling smooth UX was challenging. We solved this with organization-specific treasury contracts and clear approval flows.

**3. Real-Time Transaction Status**
Tracking blockchain transaction status and providing real-time feedback to users required careful handling of pending states, confirmations, and potential failures.

**4. Cross-Border Complexity**
Understanding the real pain points of global payroll helped us focus on the features that matter most: instant settlement, transparent records, and no geographic restrictions.
```

---

## Accomplishments that we're proud of

```markdown
**✅ Complete End-to-End Flow**
From wallet connection to on-chain payment verification, the entire payroll workflow is functional and tested.

**✅ Non-Custodial Design**
Organizations never have to trust us with their funds. The treasury contract ensures full control remains with the org.

**✅ Batch Efficiency**
Paying 100 contractors costs the same gas as paying 1 (plus minimal per-recipient overhead). This makes MNEE payroll economically viable.

**✅ Production-Ready Architecture**
Clean separation of concerns, comprehensive error handling, and proper security practices make this more than a hackathon prototype.

**✅ MNEE Integration**
Demonstrating MNEE's potential as programmable money for a real-world use case that affects millions of global workers.
```

---

## What we learned

```markdown
**MNEE's Potential**
Building with MNEE showed us how stablecoins can transform traditional financial processes. The programmability enables use cases that simply aren't possible with traditional banking.

**Web3 UX Challenges**
Wallet connection, transaction signing, and blockchain confirmations add friction. We learned to minimize this through clear UI feedback and optimistic updates.

**Smart Contract Security**
Even simple contracts require careful attention to reentrancy, access control, and edge cases. OpenZeppelin's battle-tested contracts were invaluable.

**Global Payroll Complexity**
Talking to potential users revealed just how painful international payments are. There's a massive opportunity for crypto-native solutions.
```

---

## What's next for OrbitPayroll

```markdown
**v1.1 - Scheduled Payroll**
Automated recurring payments based on pay cycles. Set it and forget it.

**v1.2 - Multi-Sig Support**
Integration with Gnosis Safe and other multi-sig wallets for DAO treasury management.

**v2.0 - Analytics Dashboard**
Spending reports, contractor insights, and budget forecasting.

**v2.1 - AI Agent Integration**
Automated approval workflows and intelligent payment scheduling.

**Long-term Vision**
Become the default payroll infrastructure for Web3 organizations, supporting multiple stablecoins and chains while maintaining the simplicity that makes OrbitPayroll special.
```

---

## Links

### Demo Video
```
https://youtube.com/watch?v=DEMO_VIDEO_ID
```
*(Replace with actual YouTube URL after upload)*

### Live Demo
```
https://orbitpayroll.vercel.app
```

### GitHub Repository
```
https://github.com/emmanuelakbi/OrbitPayroll
```

---

## Technology Tags

Add these tags on Devpost:
- Ethereum
- Solidity
- Next.js
- React
- TypeScript
- Node.js
- PostgreSQL
- Web3
- DeFi
- Stablecoin

---

## Built With (Technologies)

```
Next.js, React, TypeScript, TailwindCSS, Express.js, PostgreSQL, Prisma, Solidity, Hardhat, OpenZeppelin, wagmi, RainbowKit, SIWE, ethers.js, Vitest
```

---

## Team Members

Add team members by their Devpost username or email.

| Name | Role |
|------|------|
| Emmanuel Akbi | Full Stack Developer |

---

## MNEE Integration Details

For hackathon judges evaluating MNEE integration:

**MNEE Token Contract**: `0x8ccedbAe4916b79da7F3F612EfB2EB93A2bFD6cF`

**PayrollTreasury Contract**: `0xA6f85Ad3CC0E251624F066052172e76e6edF2380`

**Integration Points:**
1. Treasury deposits use MNEE's `approve()` + `transferFrom()` pattern
2. Batch payroll uses `safeTransfer()` for each recipient
3. All payments emit on-chain events for transparency
4. UI displays MNEE balance and links to Etherscan

**Why MNEE for Payroll:**
- Stability: Contractors receive predictable value
- Speed: Instant settlement vs. days with banks
- Programmability: Batch operations in single transaction
- Transparency: All payments verifiable on-chain
- Global: No bank account required

---

## Final Submission Notes

1. **Before submitting**, verify:
   - Live demo is accessible and stable
   - Demo video plays correctly
   - GitHub repo is public
   - All links work

2. **Submission deadline**: Check Devpost for exact time

3. **After submitting**, you can still edit until the deadline

---

*Good luck with the submission! 🚀*
