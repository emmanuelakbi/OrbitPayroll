# Playbook: Authentication Failures

## Overview

This playbook covers diagnosing and resolving authentication issues in OrbitPayroll, which uses SIWE (Sign-In with Ethereum) for wallet-based authentication.

## Symptoms

- "Signature verification failed" error
- "Session expired" message
- Cannot connect wallet
- Stuck on authentication screen
- JWT token errors

---

## Authentication Flow Overview

1. User connects wallet (MetaMask, WalletConnect, etc.)
2. Frontend requests nonce from API
3. User signs SIWE message with wallet
4. API verifies signature and issues JWT tokens
5. Access token (15 min) + Refresh token (7 days)

---

## Diagnostic Steps

### Step 1: Check Browser Console

```javascript
// Open DevTools (F12) → Console
// Look for errors like:
// - "AUTH_001: Nonce expired"
// - "AUTH_002: Invalid signature"
// - "AUTH_003: Token expired"
// - "AUTH_004: Invalid token"
```

### Step 2: Check Network Requests

```javascript
// DevTools → Network tab
// Filter by "auth" or "nonce"
// Check response status codes and error messages
```

### Step 3: Check API Logs

```bash
# Look for auth-related log entries
grep -E "auth_failed|nonce_expired|signature|AUTH_" logs/api.log

# Or in Railway/Vercel logs
railway logs | grep -i auth
```

### Step 4: Check User Sessions in Database

```sql
-- Find sessions for a specific user
SELECT s.*, u.wallet_address 
FROM sessions s
JOIN users u ON s.user_id = u.id
WHERE u.wallet_address = '0xYourWalletAddress'
ORDER BY s.created_at DESC;

-- Check for expired sessions
SELECT * FROM sessions 
WHERE expires_at < NOW()
ORDER BY created_at DESC
LIMIT 10;
```

---

## Common Causes & Solutions

### 1. Nonce Expired (AUTH_001)

**Error Message:** `Your session has expired. Please reconnect your wallet to continue.`

**Cause:** Nonce has a 5-minute expiration window. User took too long to sign.

**Diagnosis:**
```bash
# Check nonce expiry configuration
echo $NONCE_EXPIRY_MINUTES  # Default: 5
```

**Solution:**
1. User should reconnect wallet and sign promptly
2. If persistent, check system clock synchronization:
   ```bash
   # Server time
   date
   # NTP sync status
   timedatectl status
   ```

---

### 2. Invalid Signature (AUTH_002)

**Error Message:** `We couldn't verify your wallet signature. Please try signing the message again.`

**Causes:**
- User rejected the signature request
- Message format mismatch
- Wrong wallet signed the message
- Network/chain ID mismatch

**Diagnosis:**
```typescript
// Manual signature verification (for debugging)
import { verifyMessage } from 'viem';

const isValid = await verifyMessage({
  address: walletAddress,
  message: siweMessage,
  signature: userSignature,
});
console.log('Signature valid:', isValid);
```

**Solution:**
1. Ensure user is signing with the correct wallet
2. Check chain ID matches:
   ```bash
   echo $CHAIN_ID  # Should be 11155111 for Sepolia, 1 for mainnet
   ```
3. Have user switch to correct network in wallet
4. Clear browser cache and retry

---

### 3. Token Expired (AUTH_003)

**Error Message:** `Your session has ended. Please reconnect your wallet to continue.`

**Cause:** Access token (15 min) or refresh token (7 days) expired.

**Diagnosis:**
```sql
-- Check session expiration
SELECT id, expires_at, created_at 
FROM sessions 
WHERE user_id = 'USER_ID'
ORDER BY created_at DESC;
```

**Solution:**
1. Frontend should automatically refresh tokens
2. If refresh fails, user must re-authenticate
3. Check refresh token flow:
   ```bash
   curl -X POST $API_URL/auth/refresh \
     -H "Content-Type: application/json" \
     -d '{"refreshToken": "YOUR_REFRESH_TOKEN"}'
   ```

---

### 4. Invalid Token (AUTH_004)

**Error Message:** `Your authentication is invalid. Please reconnect your wallet.`

**Causes:**
- Malformed JWT
- Token signed with different secret
- Token tampered with

**Diagnosis:**
```bash
# Decode JWT (without verification) to inspect claims
echo $JWT_TOKEN | cut -d'.' -f2 | base64 -d 2>/dev/null | jq .
```

**Solution:**
1. Clear local storage and session storage:
   ```javascript
   localStorage.clear();
   sessionStorage.clear();
   ```
2. Reconnect wallet
3. If server-side, verify JWT_SECRET is consistent across deployments

---

### 5. Wallet Not Connected

**Symptoms:** "Please connect your wallet" persists after connection attempt

**Diagnosis:**
```javascript
// Check wallet connection status in console
console.log('Connected:', window.ethereum?.isConnected());
console.log('Accounts:', await window.ethereum?.request({ method: 'eth_accounts' }));
```

**Solution:**
1. Ensure wallet extension is installed and unlocked
2. Try disconnecting and reconnecting in wallet
3. Check if site is blocked in wallet settings
4. Try different browser or incognito mode

---

### 6. Wrong Network

**Symptoms:** Authentication fails silently or with network error

**Diagnosis:**
```javascript
// Check current chain ID
const chainId = await window.ethereum?.request({ method: 'eth_chainId' });
console.log('Current chain:', parseInt(chainId, 16));
// Expected: 11155111 (Sepolia) or 1 (Mainnet)
```

**Solution:**
1. Switch network in wallet to correct chain
2. Or use the network switcher in the app UI

---

## Rate Limiting

**Error:** `Too many nonce requests. Please try again later.`

**Cause:** More than 10 nonce requests per minute from same IP

**Diagnosis:**
```bash
# Check rate limit logs
grep "nonce_rate_limited" logs/api.log
```

**Solution:**
1. Wait 1 minute before retrying
2. If legitimate high traffic, consider increasing limit:
   ```typescript
   // In auth.service.ts
   const NONCE_RATE_LIMIT_MAX = 10; // Increase if needed
   ```

---

## Clearing User Session

### From Frontend

```javascript
// Clear all auth state
localStorage.removeItem('accessToken');
localStorage.removeItem('refreshToken');
sessionStorage.clear();

// Disconnect wallet
// (depends on wallet library - RainbowKit example)
disconnect();
```

### From Database (Admin)

```sql
-- Delete all sessions for a user
DELETE FROM sessions WHERE user_id = 'USER_ID';

-- Or delete specific session
DELETE FROM sessions WHERE id = 'SESSION_ID';
```

### Via API (if implemented)

```bash
curl -X POST $API_URL/auth/logout \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

---

## User-Facing Troubleshooting Steps

Provide these steps to users experiencing auth issues:

1. **Refresh the page** - Clears temporary state
2. **Check wallet is unlocked** - Open MetaMask/wallet and ensure it's unlocked
3. **Switch to correct network** - Ensure Sepolia (testnet) or Mainnet is selected
4. **Clear browser cache** - Settings → Clear browsing data → Cached images and files
5. **Try incognito mode** - Rules out extension conflicts
6. **Try different browser** - Chrome, Firefox, Brave
7. **Reconnect wallet** - Disconnect and reconnect in wallet settings

---

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `JWT_SECRET` | - | Must be ≥32 characters |
| `JWT_ACCESS_EXPIRY` | `15m` | Access token lifetime |
| `JWT_REFRESH_EXPIRY` | `7d` | Refresh token lifetime |
| `NONCE_EXPIRY_MINUTES` | `5` | Nonce validity window |
| `CHAIN_ID` | `11155111` | Expected blockchain network |

---

## Error Codes Reference

| Code | Message | Cause |
|------|---------|-------|
| AUTH_001 | Nonce expired | Nonce older than 5 minutes |
| AUTH_002 | Invalid signature | Signature verification failed |
| AUTH_003 | Token expired | JWT access/refresh token expired |
| AUTH_004 | Invalid token | Malformed or tampered JWT |

---

## Escalation Path

If authentication issues persist:

1. Collect:
   - Wallet address
   - Browser and version
   - Wallet type (MetaMask, WalletConnect, etc.)
   - Error messages from console
   - Network request/response data

2. Check server logs for the specific wallet address

3. Verify environment configuration matches across deployments

4. Escalate to engineering with collected data
