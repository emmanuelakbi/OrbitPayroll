# Playbook: RPC Provider Issues

## Overview

This playbook covers diagnosing and resolving Ethereum RPC provider issues in OrbitPayroll, which uses viem for blockchain interactions.

## Symptoms

- Treasury balance shows 0 or stale data
- Transactions not broadcasting
- "Network error" messages
- Slow or hanging blockchain operations
- Gas estimation failures

---

## RPC Configuration Overview

OrbitPayroll uses:
- Primary RPC URL (configurable)
- Fallback RPC URL (optional)
- Automatic failover between providers
- Retry logic with exponential backoff
- 30-second default timeout

---

## Diagnostic Steps

### Step 1: Test RPC Connectivity

```bash
# Test basic RPC call (get block number)
curl -X POST $RPC_URL \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}'

# Expected response:
# {"jsonrpc":"2.0","id":1,"result":"0x..."}
```

### Step 2: Check Chain ID

```bash
# Verify correct network
curl -X POST $RPC_URL \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_chainId","params":[],"id":1}'

# Expected:
# Sepolia: 0xaa36a7 (11155111)
# Mainnet: 0x1 (1)
```

### Step 3: Test Contract Calls

```bash
# Test treasury balance call
cast call $TREASURY_ADDRESS "getBalance()" --rpc-url $RPC_URL

# Test MNEE balance
cast call $MNEE_ADDRESS "balanceOf(address)" $WALLET_ADDRESS --rpc-url $RPC_URL
```

### Step 4: Check Rate Limits

```bash
# Make multiple rapid requests to check rate limiting
for i in {1..10}; do
  curl -s -X POST $RPC_URL \
    -H "Content-Type: application/json" \
    -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":'$i'}' &
done
wait

# If you see errors after several requests, you're being rate limited
```

### Step 5: Check Fallback Provider

```bash
# Test fallback RPC if configured
curl -X POST $RPC_URL_FALLBACK \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}'
```

---

## Common Causes & Solutions

### 1. Provider Outage

**Symptoms:** All RPC calls fail, provider status page shows issues

**Diagnosis:**
```bash
# Quick connectivity test
curl -s -o /dev/null -w "%{http_code}" -X POST $RPC_URL \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}'
```

**Solution:**
1. Check provider status pages (see below)
2. Switch to fallback provider:
   ```bash
   # Update environment variable
   export NEXT_PUBLIC_RPC_URL=$NEXT_PUBLIC_RPC_URL_FALLBACK
   ```
3. Or use public RPC temporarily:
   - Sepolia: `https://rpc.sepolia.org`
   - Mainnet: `https://eth.llamarpc.com`

---

### 2. Rate Limiting

**Error:** `429 Too Many Requests` or `rate limit exceeded`

**Diagnosis:**
```bash
# Check response headers for rate limit info
curl -v -X POST $RPC_URL \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' 2>&1 | grep -i "rate\|limit\|x-"
```

**Solution:**
1. Upgrade provider plan for higher limits
2. Implement request caching (already in rpc.ts):
   ```typescript
   // Cache block number for 12 seconds
   const blockNumber = await withCache('blockNumber', () => 
     client.getBlockNumber()
   );
   ```
3. Reduce polling frequency
4. Use WebSocket instead of HTTP for subscriptions

---

### 3. Network Mismatch

**Symptoms:** Transactions fail, wrong balances shown

**Diagnosis:**
```bash
# Check configured chain ID
echo $NEXT_PUBLIC_NETWORK  # Should be 'sepolia' or 'mainnet'

# Verify RPC is on correct network
curl -X POST $RPC_URL \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_chainId","params":[],"id":1}'
```

**Solution:**
1. Ensure RPC URL matches expected network
2. Update environment variables:
   ```bash
   # For Sepolia
   NEXT_PUBLIC_NETWORK=sepolia
   NEXT_PUBLIC_RPC_URL=https://sepolia.infura.io/v3/YOUR_KEY
   
   # For Mainnet
   NEXT_PUBLIC_NETWORK=mainnet
   NEXT_PUBLIC_RPC_URL=https://mainnet.infura.io/v3/YOUR_KEY
   ```

---

### 4. Timeout Issues

**Error:** `Request timed out` or hanging requests

**Diagnosis:**
```bash
# Test with explicit timeout
timeout 10 curl -X POST $RPC_URL \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}'
```

**Solution:**
1. Increase timeout in configuration:
   ```typescript
   // In rpc.ts
   const DEFAULT_TIMEOUT = 60_000; // Increase to 60 seconds
   ```
2. Check network latency to provider
3. Try a geographically closer provider

---

### 5. Invalid API Key

**Error:** `Invalid API key` or `Unauthorized`

**Diagnosis:**
```bash
# Check if API key is in URL
echo $RPC_URL | grep -o "api[_-]key\|apikey\|/v3/"
```

**Solution:**
1. Verify API key is valid in provider dashboard
2. Check key hasn't expired
3. Ensure key has correct permissions (read/write)
4. Regenerate key if compromised

---

### 6. Stale Data / Caching Issues

**Symptoms:** Balance doesn't update after transaction

**Diagnosis:**
```javascript
// Check if data is cached
console.log('Cache entries:', rpcCache.size);
```

**Solution:**
1. Clear RPC cache:
   ```typescript
   import { clearRpcCache } from '@/lib/rpc';
   clearRpcCache();
   ```
2. Force fresh request:
   ```typescript
   // Bypass cache
   const balance = await client.getBalance({ address });
   ```

---

## Verifying RPC via Health Endpoint

```bash
# Check API health endpoint (includes RPC status)
curl $API_URL/health

# Expected response includes RPC connectivity status
```

---

## Provider Status Pages

Check these when experiencing issues:

| Provider | Status Page |
|----------|-------------|
| Infura | https://status.infura.io |
| Alchemy | https://status.alchemy.com |
| QuickNode | https://status.quicknode.com |
| Ankr | https://status.ankr.com |
| Public Sepolia | https://sepolia.etherscan.io (check latest block) |

---

## Fallback Configuration

### Environment Variables

```bash
# Primary RPC
NEXT_PUBLIC_RPC_URL=https://sepolia.infura.io/v3/YOUR_KEY

# Fallback RPC (used when primary fails)
NEXT_PUBLIC_RPC_URL_FALLBACK=https://eth-sepolia.g.alchemy.com/v2/YOUR_KEY

# Network selection
NEXT_PUBLIC_NETWORK=sepolia
```

### Testing Failover

```typescript
// The RPC client automatically fails over
// To test manually:
import { resetPublicClient, getPublicClient } from '@/lib/rpc';

// Reset client to pick up new config
resetPublicClient();
const client = getPublicClient();
```

---

## Common RPC Methods

```bash
# Get latest block number
cast block-number --rpc-url $RPC_URL

# Get gas price
cast gas-price --rpc-url $RPC_URL

# Get transaction
cast tx $TX_HASH --rpc-url $RPC_URL

# Get transaction receipt
cast receipt $TX_HASH --rpc-url $RPC_URL

# Call contract function
cast call $CONTRACT "functionName(args)" --rpc-url $RPC_URL

# Send transaction
cast send $CONTRACT "functionName(args)" --rpc-url $RPC_URL --private-key $KEY
```

---

## Retry Logic

OrbitPayroll implements automatic retry with exponential backoff:

```typescript
// Default configuration
const DEFAULT_RETRIES = 3;
const DEFAULT_RETRY_DELAY = 1000; // 1 second base

// Retry pattern: 1s, 2s, 4s
```

If retries are exhausted, the error is propagated to the UI.

---

## Monitoring RPC Health

### Log Patterns to Watch

```bash
# Search for RPC errors in logs
grep -E "RPC Error|eth_|timeout|rate.limit" logs/app.log

# Check for failover events
grep -i "fallback\|failover" logs/app.log
```

### Metrics to Track

- Request latency (p50, p95, p99)
- Error rate by method
- Failover frequency
- Cache hit rate

---

## Escalation Path

If RPC issues persist:

1. Collect:
   - RPC URL (masked API key)
   - Error messages
   - Network/chain ID
   - Specific failing methods
   - Provider status page screenshot

2. Test with alternative provider to isolate issue

3. Check if issue is provider-specific or network-wide

4. Contact provider support if their service is degraded

5. Escalate to engineering with collected data
