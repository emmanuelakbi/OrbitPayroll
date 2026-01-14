# OrbitPayroll - Project Description

## Elevator Pitch (30 seconds)

OrbitPayroll is a Web3 payroll platform that turns MNEE stablecoin into a "salary rail" for distributed teams. Instead of juggling wallets and spreadsheets, organizations can batch-pay all their contractors in a single on-chain transaction with full transparency and non-custodial control.

---

## The Problem

Paying a global, distributed team is still painful in 2026. DAOs, crypto startups, and remote-first companies face:

- **Manual chaos**: Founders track invoices in spreadsheets and send dozens of individual transactions each pay period
- **No transparency**: Contributors can't easily verify when or if they'll be paid
- **Cross-border friction**: Traditional banking is slow, expensive, and excludes many global workers
- **Custody concerns**: Centralized payroll services require trusting third parties with funds

Stablecoins like MNEE solve the cross-border problem, but most teams still lack a clean way to turn a token balance into predictable, recurring payroll.

---

## Our Solution

OrbitPayroll provides a complete payroll infrastructure built on MNEE:

### 🏦 Non-Custodial Treasury
Organizations deploy their own PayrollTreasury smart contract. Funds stay under org control—we never custody tokens.

### 👥 Contractor Management
Onboard contractors with wallet addresses, pay rates (hourly/monthly), and pay cycles (weekly, bi-weekly, monthly). The system calculates amounts automatically.

### ⚡ Batch Payments
Execute payroll to up to 100 recipients in a single transaction. One signature, one gas fee, complete transparency.

### 📊 Audit Trail
Every payment is recorded on-chain with transaction hashes. Both organizations and contractors can verify payment history independently.

---

## Why MNEE?

MNEE is the ideal settlement asset for global payroll:

| Benefit | Description |
|---------|-------------|
| **Stability** | Pegged value means contractors know exactly what they're receiving |
| **Speed** | Near-instant settlement vs. 3-5 days with traditional banking |
| **Programmability** | Smart contract integration enables batch operations and automation |
| **Transparency** | All transactions are publicly verifiable on Ethereum |
| **Global Access** | Anyone with a wallet can receive payments, no bank account required |

**MNEE Contract**: `0x8ccedbAe4916b79da7F3F612EfB2EB93A2bFD6cF`

---

## Target Users

### DAOs
Pay contributors from treasury with governance oversight. Multi-sig compatible for additional security.

### Crypto Startups
Streamline contractor payments without setting up traditional banking infrastructure. Perfect for early-stage teams.

### Remote-First Companies
Pay global teams without cross-border friction. No more wire fees or currency conversion headaches.

### Freelancer Collectives
Manage payments for distributed talent pools with transparent, verifiable payment history.

---

## Key Features

| Feature | Description |
|---------|-------------|
| 🔐 **Wallet Auth** | Sign-In with Ethereum (SIWE) - no passwords, no accounts to manage |
| 👥 **Contractor CRUD** | Full management of contractor profiles, rates, and pay cycles |
| 💰 **Treasury Control** | Deposit, withdraw, and monitor MNEE balance in real-time |
| ⚡ **Batch Payroll** | Preview amounts, then execute all payments in one transaction |
| 📜 **History** | Complete audit trail with Etherscan links for every payment |
| 🔔 **Notifications** | Real-time alerts for payroll events and confirmations |

---

## Technical Architecture

```
Frontend (Next.js + wagmi)
         │
         ├──► Backend API (Express.js)
         │         │
         │         └──► PostgreSQL (Prisma)
         │
         └──► Ethereum (Sepolia)
                   │
                   └──► PayrollTreasury Contract
                              │
                              └──► MNEE Token
```

### Stack Highlights

- **Frontend**: Next.js 14, React 18, TailwindCSS, RainbowKit
- **Backend**: Express.js, TypeScript, Prisma ORM, Zod validation
- **Contracts**: Solidity, OpenZeppelin (ReentrancyGuard, SafeERC20)
- **Auth**: SIWE (Sign-In with Ethereum) + JWT sessions

---

## What Makes Us Different

| Traditional Payroll | OrbitPayroll |
|---------------------|--------------|
| Custodial (trust required) | Non-custodial (you control funds) |
| Days to settle | Minutes to settle |
| Per-transaction fees | One batch, one fee |
| Opaque processing | Transparent on-chain |
| Bank account required | Wallet only |
| Geographic restrictions | Global by default |

---

## Future Roadmap

| Phase | Features |
|-------|----------|
| **v1.1** | Scheduled payroll runs, recurring automation |
| **v1.2** | Multi-sig treasury support, approval workflows |
| **v2.0** | Analytics dashboard, spending reports |
| **v2.1** | AI agent integrations for automated approvals |

---

## Hackathon Theme Alignment

OrbitPayroll directly demonstrates MNEE's potential as **programmable money**:

1. **Batch Operations**: MNEE enables efficient multi-recipient transfers
2. **Smart Contract Integration**: Treasury contracts showcase MNEE's composability
3. **Real-World Use Case**: Payroll is a universal need that benefits from stablecoin rails
4. **Transparency**: On-chain verification builds trust in payment systems

---

*Built for the MNEE Hackathon - Demonstrating the future of programmable payroll.*
