# Design Document: OrbitPayroll Debugging Playbooks

## Overview

This document provides step-by-step troubleshooting guides for common issues across all OrbitPayroll components.

## Playbook 1: Payroll Transaction Failed

### Symptoms
- Transaction reverted on-chain
- Error message in UI: "Transaction Failed"

### Diagnostic Steps

```bash
# 1. Get transaction details from block explorer
# Visit: https://etherscan.io/tx/{txHash}

# 2. Check treasury balance
cast call $TREASURY_ADDRESS "getBalance()" --rpc-url $RPC_URL

# 3. Check if caller is admin
cast call $TREASURY_ADDRESS "getAdmin()" --rpc-url $RPC_URL

# 4. Decode revert reason (if available)
cast run $TX_HASH --rpc-url $RPC_URL
```

### Common Causes & Solutions

| Cause | Solution |
|-------|----------|
| Insufficient balance | Deposit more MNEE to treasury |
| Not admin | Verify wallet is org admin |
| Gas too low | Retry with higher gas limit |
| Array mismatch | Check recipients/amounts arrays |

---

## Playbook 2: Authentication Failure

### Symptoms
- "Signature verification failed" error
- Cannot connect wallet

### Diagnostic Steps

```typescript
// 1. Check nonce in database
SELECT * FROM sessions WHERE user_id = 'xxx' ORDER BY created_at DESC;

// 2. Verify signature manually
import { verifyMessage } from 'viem';
const valid = await verifyMessage({
  address: walletAddress,
  message: siweMessage,
  signature,
});
```

### Common Causes & Solutions

| Cause | Solution |
|-------|----------|
| Nonce expired | Request new nonce (5 min expiry) |
| Wrong network | Switch to correct network in wallet |
| Message mismatch | Ensure SIWE message format is correct |

---

## Playbook 3: Database Connection Issues

### Symptoms
- 500 errors on all API calls
- Health check returns unhealthy

### Diagnostic Steps

```bash
# 1. Test database connection
npx prisma db pull

# 2. Check connection string
echo $DATABASE_URL | grep -o 'postgresql://[^:]*'

# 3. Check connection pool
SELECT count(*) FROM pg_stat_activity WHERE datname = 'orbitpayroll';

# 4. Run migrations
npx prisma migrate deploy
```

### Common Causes & Solutions

| Cause | Solution |
|-------|----------|
| Wrong credentials | Verify DATABASE_URL |
| Pool exhausted | Restart application |
| Migrations pending | Run `prisma migrate deploy` |

---

## Playbook 4: RPC Provider Issues

### Symptoms
- Treasury balance shows 0 or stale
- Transactions not broadcasting

### Diagnostic Steps

```bash
# 1. Test RPC connectivity
curl -X POST $RPC_URL \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}'

# 2. Check rate limits
# Review provider dashboard for usage

# 3. Test fallback provider
curl -X POST $RPC_URL_FALLBACK ...
```

### Common Causes & Solutions

| Cause | Solution |
|-------|----------|
| Provider outage | Switch to fallback |
| Rate limited | Upgrade plan or add caching |
| Network mismatch | Verify chain ID |

---

## Playbook 5: Frontend Loading Issues

### Symptoms
- Blank page or infinite loading
- Console errors

### Diagnostic Steps

```javascript
// 1. Check browser console for errors
// Open DevTools > Console

// 2. Check network tab for failed requests
// Open DevTools > Network

// 3. Verify environment variables
console.log(process.env.NEXT_PUBLIC_API_URL);

// 4. Clear cache and retry
localStorage.clear();
sessionStorage.clear();
```

### Common Causes & Solutions

| Cause | Solution |
|-------|----------|
| API unreachable | Check backend deployment |
| CORS error | Verify allowed origins |
| JS error | Check console, fix bug |

---

## Diagnostic Commands Reference

```bash
# Database
npx prisma studio                    # Visual DB browser
npx prisma migrate status            # Check migration status

# Contracts
cast call $ADDR "getBalance()"       # Read contract
cast send $ADDR "deposit(uint256)"   # Write contract
cast logs --address $ADDR            # Get events

# API
curl -X GET $API_URL/health          # Health check
curl -H "Authorization: Bearer $TOKEN" $API_URL/orgs  # Authenticated request

# Logs
railway logs                         # Railway logs
vercel logs                          # Vercel logs
```

## Correctness Properties

### Property 1: Playbook Coverage
*For any* common error scenario, a documented playbook SHALL exist with diagnostic steps and solutions.

**Validates: Requirements 1.1 through 10.6**
