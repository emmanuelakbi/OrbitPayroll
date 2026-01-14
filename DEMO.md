# OrbitPayroll Demo Environment

Welcome to OrbitPayroll! This guide helps judges and evaluators explore the platform.

## 🌐 Live Demo

| Component | URL |
|-----------|-----|
| **Frontend** | https://orbitpayroll.vercel.app |
| **API** | https://orbitpayroll-api.railway.app |
| **Smart Contract** | [Sepolia Etherscan](https://sepolia.etherscan.io/address/0xA6f85Ad3CC0E251624F066052172e76e6edF2380) |

## 🚀 Quick Start for Judges

### Prerequisites

- MetaMask or any Web3 wallet
- Sepolia testnet configured in your wallet
- Some Sepolia ETH for gas (get from [Sepolia Faucet](https://sepoliafaucet.com/))

### Step 1: Connect Your Wallet

1. Visit the demo URL above
2. Click "Connect Wallet"
3. Select MetaMask (or your preferred wallet)
4. Ensure you're on **Sepolia testnet**
5. Sign the authentication message

### Step 2: Explore the Demo Organization

The demo comes pre-seeded with:

| Entity | Details |
|--------|---------|
| **Organization** | Orbit Demo Corp |
| **Treasury** | Pre-funded with 50,000 MNEE |
| **Contractors** | 5 active contractors with various pay cycles |
| **Payroll History** | 3 completed payroll runs |

### Step 3: Try Key Features

#### View Dashboard
- See organization overview
- Check treasury balance
- View upcoming payroll

#### Manage Contractors
- Navigate to Contractors page
- Add a new contractor (use any Sepolia address)
- Edit contractor rates and pay cycles

#### Execute Payroll
- Go to Payroll page
- Preview the next payroll run
- Execute a batch payment (requires MNEE in treasury)

#### Treasury Management
- View treasury balance
- See transaction history
- Deposit additional MNEE (if you have test tokens)

## 🔑 Demo Wallet Addresses

For testing, you can use these pre-configured addresses:

| Role | Address |
|------|---------|
| Demo Admin | `0x7d12d3A3de749896e77E7c87F723a3EC4CAbe377` |
| Contractor 1 | `0xcccc567890123456789012345678901234567890` |
| Contractor 2 | `0xdddd567890123456789012345678901234567890` |
| Contractor 3 | `0xeeee567890123456789012345678901234567890` |

## 📋 Feature Checklist

Use this checklist to evaluate the platform:

### Authentication
- [ ] Wallet connection works
- [ ] SIWE (Sign-In with Ethereum) authentication
- [ ] Session persistence across page refreshes

### Organization Management
- [ ] View organization details
- [ ] See member roles (Owner/Admin, Finance Operator)

### Contractor Management
- [ ] List all contractors
- [ ] Add new contractor
- [ ] Edit contractor details
- [ ] Archive/deactivate contractor
- [ ] Filter by pay cycle

### Payroll Execution
- [ ] Preview payroll with amounts
- [ ] Execute batch payment
- [ ] View transaction on Etherscan
- [ ] See payment confirmation

### Treasury
- [ ] View MNEE balance
- [ ] See transaction history
- [ ] Deposit funds (if you have MNEE)

### Notifications
- [ ] Receive payroll notifications
- [ ] Mark notifications as read

## 🔧 Technical Details

### Smart Contract

The `PayrollTreasury` contract on Sepolia:
- **Address**: `0xA6f85Ad3CC0E251624F066052172e76e6edF2380`
- **MNEE Token**: `0x8ccedbAe4916b79da7F3F612EfB2EB93A2bFD6cF`
- **Features**: Batch payments (up to 100 recipients), admin controls, reentrancy protection

### API Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /health` | Health check with component status |
| `POST /api/v1/auth/nonce` | Get SIWE nonce |
| `POST /api/v1/auth/verify` | Verify SIWE signature |
| `GET /api/v1/orgs/:id` | Get organization details |
| `GET /api/v1/orgs/:id/contractors` | List contractors |
| `POST /api/v1/orgs/:id/payroll/preview` | Preview payroll |
| `POST /api/v1/orgs/:id/payroll/execute` | Execute payroll |

### Tech Stack

- **Frontend**: Next.js 14, React 18, TailwindCSS, RainbowKit
- **Backend**: Express.js, TypeScript, Prisma ORM
- **Database**: PostgreSQL (Supabase)
- **Blockchain**: Solidity, Hardhat, ethers.js v6

## 🔄 Reset Demo Data

If you need to reset the demo to its initial state:

```bash
# From the project root
npm run demo:reset
```

This will:
1. Run database migrations
2. Clear all existing data
3. Re-seed the demo organization with:
   - Demo admin user
   - 5 contractors with various pay cycles
   - Historical payroll runs
   - Sample notifications

## ❓ Troubleshooting

### "Wrong Network" Error
- Switch MetaMask to Sepolia testnet
- Network ID: 11155111

### "Insufficient Funds" Error
- Get Sepolia ETH from [faucet](https://sepoliafaucet.com/)
- Treasury needs MNEE for payroll execution

### Transaction Stuck
- Check Sepolia network status
- Try increasing gas price in MetaMask

### Can't Connect Wallet
- Ensure MetaMask is unlocked
- Try refreshing the page
- Clear browser cache if issues persist

## 📞 Support

For hackathon-related questions:
- GitHub Issues: [OrbitPayroll Repository](https://github.com/emmanuelakbi/OrbitPayroll/issues)
- Email: support@orbitpayroll.test

---

**Thank you for evaluating OrbitPayroll!** 🚀
