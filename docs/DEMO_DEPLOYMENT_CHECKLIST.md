# Demo Environment Deployment Checklist

This checklist ensures the demo environment is properly set up for hackathon judging.

## Pre-Deployment

### 1. Accounts & Services

- [ ] **Vercel Account** - For frontend hosting
  - Sign up at https://vercel.com
  - Connect GitHub repository
  
- [ ] **Supabase Account** - For PostgreSQL database
  - Sign up at https://supabase.com
  - Create new project in desired region
  
- [ ] **Alchemy/Infura Account** - For Ethereum RPC
  - Sign up at https://alchemy.com or https://infura.io
  - Create Sepolia testnet app
  
- [ ] **WalletConnect Project** - For wallet connections
  - Sign up at https://cloud.walletconnect.com
  - Create new project and get Project ID

### 2. Smart Contract Deployment

- [ ] Deploy PayrollTreasury to Sepolia
  ```bash
  cd packages/contracts
  npm run deploy:sepolia
  ```
  
- [ ] Verify contract on Etherscan
  ```bash
  npm run verify:sepolia
  ```
  
- [ ] Note deployed addresses:
  - PayrollTreasury: `___________________________`
  - MNEE Token: `0x8ccedbAe4916b79da7F3F612EfB2EB93A2bFD6cF`

### 3. Database Setup

- [ ] Create Supabase project
- [ ] Get connection strings:
  - Pooled (for app): `___________________________`
  - Direct (for migrations): `___________________________`
  
- [ ] Run migrations
  ```bash
  cd packages/database
  DATABASE_URL="your-connection-string" npx prisma migrate deploy
  ```
  
- [ ] Seed demo data
  ```bash
  DATABASE_URL="your-connection-string" npm run db:seed:demo
  ```

## Deployment

### 4. Backend Deployment (Railway)

- [ ] Create Railway project
- [ ] Add PostgreSQL service (or use Supabase)
- [ ] Configure environment variables:
  ```
  DATABASE_URL=postgresql://...
  JWT_SECRET=<generate-secure-secret>
  NODE_ENV=production
  PORT=3000
  CORS_ORIGIN=https://your-frontend-url.vercel.app
  ```
  
- [ ] Deploy from GitHub
- [ ] Note API URL: `___________________________`

### 5. Frontend Deployment (Vercel)

- [ ] Import project from GitHub
- [ ] Set root directory to `apps/web`
- [ ] Configure environment variables:
  ```
  NEXT_PUBLIC_API_URL=https://your-api-url.railway.app/api/v1
  NEXT_PUBLIC_WC_PROJECT_ID=<your-walletconnect-project-id>
  NEXT_PUBLIC_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/<key>
  NEXT_PUBLIC_SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/<key>
  NEXT_PUBLIC_MNEE_ADDRESS=0x8ccedbAe4916b79da7F3F612EfB2EB93A2bFD6cF
  NEXT_PUBLIC_TREASURY_ADDRESS=<your-treasury-address>
  NEXT_PUBLIC_NETWORK=sepolia
  ```
  
- [ ] Deploy
- [ ] Note frontend URL: `___________________________`

### 6. Fund Test Treasury

- [ ] Get Sepolia ETH from faucet
  - https://sepoliafaucet.com/
  - https://www.alchemy.com/faucets/ethereum-sepolia
  
- [ ] Get test MNEE tokens (if available on testnet)
  - Or deploy MockMNEE for testing
  
- [ ] Deposit MNEE to treasury contract
  ```javascript
  // Using ethers.js
  const mnee = new ethers.Contract(MNEE_ADDRESS, ERC20_ABI, signer);
  const treasury = new ethers.Contract(TREASURY_ADDRESS, TREASURY_ABI, signer);
  
  // Approve treasury to spend MNEE
  await mnee.approve(TREASURY_ADDRESS, ethers.parseUnits("50000", 8));
  
  // Deposit to treasury
  await treasury.deposit(ethers.parseUnits("50000", 8));
  ```

## Post-Deployment Verification

### 7. Health Checks

- [ ] API health check
  ```bash
  curl https://your-api-url.railway.app/health
  ```
  Expected: `{"status":"healthy",...}`
  
- [ ] Frontend loads
  - Visit https://your-frontend-url.vercel.app
  - Check for console errors
  
- [ ] Database connectivity
  - API health check shows database: "ok"

### 8. Functional Testing

- [ ] **Authentication**
  - Connect wallet
  - Sign SIWE message
  - Session persists on refresh
  
- [ ] **Organization**
  - View demo organization
  - See treasury balance
  
- [ ] **Contractors**
  - List contractors
  - Add new contractor
  - Edit contractor
  
- [ ] **Payroll**
  - Preview payroll
  - Execute payroll (if treasury funded)
  - View transaction on Etherscan
  
- [ ] **Notifications**
  - View notifications
  - Mark as read

### 9. Update Demo Documentation

- [ ] Update DEMO.md with actual URLs
- [ ] Update README.md with demo link
- [ ] Verify all links work

## Demo URLs

| Component | URL |
|-----------|-----|
| Frontend | https://orbitpayroll.vercel.app |
| API | https://orbitpayroll-api.railway.app |
| API Health | https://orbitpayroll-api.railway.app/health |
| Smart Contract | https://sepolia.etherscan.io/address/0xA6f85Ad3CC0E251624F066052172e76e6edF2380 |
| MNEE Token | https://sepolia.etherscan.io/address/0x8ccedbAe4916b79da7F3F612EfB2EB93A2bFD6cF |

## Emergency Procedures

### Reset Demo Data
```bash
npm run demo:reset
```

### Redeploy Frontend
```bash
cd apps/web
vercel --prod
```

### Check Logs
- **Vercel**: Dashboard → Project → Deployments → Logs
- **Railway**: Dashboard → Project → Logs
- **Supabase**: Dashboard → Project → Logs

## Contacts

- **Technical Issues**: [GitHub Issues](https://github.com/emmanuelakbi/OrbitPayroll/issues)
- **Deployment Help**: Check deployment guides in `/docs`

---

**Checklist completed by**: _______________  
**Date**: _______________  
**Verified by**: _______________
