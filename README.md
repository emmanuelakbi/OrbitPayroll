# OrbitPayroll 🚀

**Web3-native payroll platform for distributed teams using MNEE stablecoin.**

[![Live Demo](https://img.shields.io/badge/demo-live-brightgreen)](https://orbitpayroll.vercel.app)
[![Demo Video](https://img.shields.io/badge/video-YouTube-red)](https://youtube.com/watch?v=DEMO_VIDEO_ID)
[![Devpost](https://img.shields.io/badge/submission-Devpost-blue)](https://devpost.com/software/orbitpayroll)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

---

## 🎯 The Problem

Paying a global, distributed team is still painful. Founders and DAO treasurers face:

- **Manual processes**: Juggling multiple wallets and tracking invoices in spreadsheets
- **High friction**: Sending dozens of individual transactions every pay period
- **Lack of transparency**: No unified view of payroll history and spending
- **Cross-border complexity**: Traditional banking rails are slow and expensive for international contractors

## 💡 The Solution

OrbitPayroll transforms MNEE stablecoin into a **"salary rail"** for the Web3 era. Our platform enables organizations to:

- **Batch payments**: Pay all contractors in a single on-chain transaction
- **Non-custodial treasury**: Organizations maintain full control of their funds
- **Transparent history**: Every payment is verifiable on-chain with transaction hashes
- **Programmable payroll**: Set pay cycles (weekly, bi-weekly, monthly) and automate calculations

### Why MNEE?

MNEE is the ideal settlement asset for global payroll because it combines:
- **Stability**: Pegged value eliminates volatility concerns for contractors
- **Speed**: Near-instant settlement vs. days with traditional banking
- **Programmability**: Smart contract integration enables batch operations
- **Transparency**: All transactions are publicly verifiable on Ethereum

**MNEE Contract**: [`0x8ccedbAe4916b79da7F3F612EfB2EB93A2bFD6cF`](https://sepolia.etherscan.io/address/0x8ccedbAe4916b79da7F3F612EfB2EB93A2bFD6cF)

---

## 👥 Target Users

| User Type | Use Case |
|-----------|----------|
| **DAOs** | Pay contributors from treasury with governance oversight |
| **Crypto Startups** | Streamline contractor payments without traditional banking |
| **Remote-First Companies** | Pay global teams without cross-border friction |
| **Freelancer Collectives** | Manage payments for distributed talent pools |

---

## ✨ Key Features

| Feature | Description |
|---------|-------------|
| 🔐 **Wallet Authentication** | Sign-In with Ethereum (SIWE) for passwordless, secure login |
| 👥 **Contractor Management** | Add contractors with wallet addresses, rates, and pay cycles |
| 💰 **Non-Custodial Treasury** | Organization-controlled smart contract holds MNEE funds |
| ⚡ **Batch Payroll** | Execute payments to up to 100 recipients in one transaction |
| 📊 **Transaction History** | Full audit trail with on-chain verification |
| 🔔 **Notifications** | Real-time alerts for payroll events |

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Frontend (Next.js)                       │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │
│  │   Auth      │  │ Contractors │  │   Payroll   │              │
│  │  (SIWE)     │  │  Management │  │  Execution  │              │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘              │
│         │                │                │                      │
│         └────────────────┼────────────────┘                      │
│                          │                                       │
│                    ┌─────▼─────┐                                 │
│                    │  wagmi +  │                                 │
│                    │ RainbowKit│                                 │
│                    └─────┬─────┘                                 │
└──────────────────────────┼──────────────────────────────────────┘
                           │
           ┌───────────────┼───────────────┐
           │               │               │
           ▼               ▼               ▼
┌──────────────────┐ ┌──────────┐ ┌────────────────────┐
│   Backend API    │ │ Ethereum │ │  PayrollTreasury   │
│   (Express.js)   │ │   RPC    │ │  Smart Contract    │
│                  │ │          │ │                    │
│  ┌────────────┐  │ │          │ │  • deposit()       │
│  │   Auth     │  │ │          │ │  • runPayroll()    │
│  │  Service   │  │ │          │ │  • withdraw()      │
│  ├────────────┤  │ │          │ │                    │
│  │  Payroll   │  │ │          │ │  MNEE Token:       │
│  │  Service   │  │ │          │ │  0x8cced...cF      │
│  ├────────────┤  │ │          │ │                    │
│  │ Contractor │  │ │          │ └────────────────────┘
│  │  Service   │  │ │          │
│  └────────────┘  │ │          │
│        │         │ │          │
│        ▼         │ │          │
│  ┌────────────┐  │ │          │
│  │ PostgreSQL │  │ │          │
│  │  (Prisma)  │  │ │          │
│  └────────────┘  │ │          │
└──────────────────┘ └──────────┘
```


---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | Next.js 14, React 18, TailwindCSS, RainbowKit, wagmi |
| **Backend** | Express.js, TypeScript, Pino (logging), Zod (validation) |
| **Database** | PostgreSQL, Prisma ORM |
| **Blockchain** | Solidity, Hardhat, OpenZeppelin, ethers.js v6 |
| **Auth** | SIWE (Sign-In with Ethereum), JWT |
| **Testing** | Vitest, fast-check (property-based testing), Hardhat |

---

## 📁 Project Structure

```
orbitpayroll/
├── apps/
│   ├── api/                    # Express.js backend API
│   │   └── src/
│   │       ├── lib/            # Utilities (db, errors, logger)
│   │       ├── middleware/     # Auth, validation, rate limiting
│   │       ├── routes/         # API endpoints
│   │       ├── schemas/        # Zod validation schemas
│   │       └── services/       # Business logic layer
│   │
│   └── web/                    # Next.js frontend
│       └── src/
│           ├── app/            # Next.js App Router pages
│           ├── components/     # React components by domain
│           ├── contracts/      # ABIs and addresses
│           ├── hooks/          # Custom React hooks
│           └── lib/            # Utilities and API client
│
├── packages/
│   ├── config/                 # Shared configuration schemas
│   ├── contracts/              # Solidity smart contracts
│   │   ├── contracts/          # PayrollTreasury.sol
│   │   ├── scripts/            # Deploy scripts
│   │   └── test/               # Contract tests
│   ├── database/               # Prisma ORM package
│   │   └── prisma/
│   │       ├── schema.prisma   # Database schema
│   │       └── migrations/     # SQL migrations
│   └── types/                  # Shared TypeScript types
│
├── docs/                       # Documentation & playbooks
└── scripts/                    # Utility scripts
```

---

## 🚀 Quick Start

### Prerequisites

- Node.js >= 18.0.0
- Docker & Docker Compose
- MetaMask or Web3 wallet

### 1. Clone and Install

```bash
git clone https://github.com/emmanuelakbi/OrbitPayroll.git
cd OrbitPayroll
npm install
```

### 2. Environment Setup

```bash
# Copy all environment files
cp .env.example .env
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local
cp packages/database/.env.example packages/database/.env
cp packages/contracts/.env.example packages/contracts/.env
```

### 3. Start Database

```bash
npm run docker:up
```

### 4. Initialize Database

```bash
cd packages/database
npm run db:generate    # Generate Prisma client
npm run db:migrate     # Run migrations
npm run db:seed        # Seed with sample data
cd ../..
```

### 5. Compile Smart Contracts

```bash
cd packages/contracts
npm run compile
cd ../..
```

### 6. Run Development Servers

```bash
# Terminal 1: API (port 3001)
cd apps/api && npm run dev

# Terminal 2: Web (port 3000)
cd apps/web && npm run dev
```

Visit **http://localhost:3000** to access the application.

---

## 📋 Environment Variables

### API (`apps/api/.env`)

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | Secret for JWT token signing |
| `ETHEREUM_RPC_URL` | Ethereum RPC endpoint |
| `MNEE_TOKEN_ADDRESS` | MNEE token contract address |

### Web (`apps/web/.env.local`)

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_API_URL` | Backend API URL |
| `NEXT_PUBLIC_CHAIN_ID` | Target chain ID (11155111 for Sepolia) |
| `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` | WalletConnect project ID |

---

## 🧪 Running Tests

```bash
# Run all tests
npm run test

# API tests
cd apps/api && npm run test

# Web tests
cd apps/web && npm run test

# Smart contract tests
cd packages/contracts && npm run test

# Property-based tests
npm run test:property
```

---

## 📜 Smart Contract

The `PayrollTreasury` contract handles:

- **Deposits**: Organizations deposit MNEE into their treasury
- **Batch Payroll**: Execute payments to up to 100 recipients in one transaction
- **Admin Controls**: Role-based access for treasury management
- **Security**: ReentrancyGuard, SafeERC20, event logging

### Deployed Addresses (Sepolia)

| Contract | Address |
|----------|---------|
| PayrollTreasury | [`0xA6f85Ad3CC0E251624F066052172e76e6edF2380`](https://sepolia.etherscan.io/address/0xA6f85Ad3CC0E251624F066052172e76e6edF2380) |
| MNEE Token | [`0x8ccedbAe4916b79da7F3F612EfB2EB93A2bFD6cF`](https://sepolia.etherscan.io/address/0x8ccedbAe4916b79da7F3F612EfB2EB93A2bFD6cF) |

---

## 🔗 Links

| Resource | URL |
|----------|-----|
| 🌐 **Live Demo** | https://orbitpayroll.vercel.app |
| 🎬 **Demo Video** | [YouTube](https://youtube.com/watch?v=DEMO_VIDEO_ID) |
| 📝 **Devpost** | [Submission](https://devpost.com/software/orbitpayroll) |
| 📖 **Demo Guide** | [DEMO.md](DEMO.md) |

---

## 👥 Team

- **Emmanuel Akbi** - Full Stack Developer

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- [MNEE](https://mnee.io) - Stablecoin infrastructure
- [OpenZeppelin](https://openzeppelin.com) - Smart contract security
- [RainbowKit](https://rainbowkit.com) - Wallet connection UX
- [Prisma](https://prisma.io) - Database ORM

---

<p align="center">
  Built with ❤️ for the MNEE Hackathon
</p>
