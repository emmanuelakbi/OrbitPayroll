# Diagnostic Tools and Commands Reference

## Overview

This document provides a comprehensive reference for diagnostic tools and commands used to troubleshoot OrbitPayroll. It covers health checks, database queries, contract interactions, API testing, and log analysis.

---

## Table of Contents

1. [Health Check Endpoints](#health-check-endpoints)
2. [Database Diagnostic Queries](#database-diagnostic-queries)
3. [Smart Contract Commands](#smart-contract-commands)
4. [API Testing Commands](#api-testing-commands)
5. [Log Search Patterns](#log-search-patterns)
6. [Prisma Studio Access](#prisma-studio-access)
7. [Environment Verification](#environment-verification)

---

## Health Check Endpoints

### API Health Check

```bash
# Full health check with component status
curl -s $API_URL/health | jq .

# Expected response:
# {
#   "status": "healthy",
#   "components": {
#     "database": { "status": "ok", "latency": 5 },
#     "rpc": { "status": "ok", "latency": 120 }
#   },
#   "timestamp": "2026-01-14T...",
#   "version": "1.0.0"
# }

# Quick health check (returns 200 if healthy, 503 if unhealthy)
curl -s -o /dev/null -w "%{http_code}" $API_URL/health
```

### Readiness Check

```bash
# Check if API is ready to accept requests
curl -s $API_URL/ready | jq .

# Expected response:
# { "status": "ready", "timestamp": "2026-01-14T..." }
```

### Frontend Health Check

```bash
# Check frontend and API connectivity
curl -s $WEB_URL/api/health | jq .

# Expected response:
# {
#   "status": "healthy",
#   "components": {
#     "frontend": { "status": "ok" },
#     "api": { "status": "ok", "url": "..." }
#   },
#   "timestamp": "...",
#   "version": "abc1234"
# }
```

---

## Database Diagnostic Queries

### Connection and Pool Status

```sql
-- Test basic connectivity
SELECT 1 AS connection_test;

-- Check active connections
SELECT 
  count(*) AS total_connections,
  count(*) FILTER (WHERE state = 'active') AS active,
  count(*) FILTER (WHERE state = 'idle') AS idle,
  count(*) FILTER (WHERE state = 'idle in transaction') AS idle_in_transaction
FROM pg_stat_activity 
WHERE datname = current_database();

-- Check connection limits
SHOW max_connections;

-- View active queries
SELECT 
  pid,
  usename,
  application_name,
  client_addr,
  state,
  query_start,
  LEFT(query, 100) AS query_preview
FROM pg_stat_activity
WHERE datname = current_database()
  AND state != 'idle'
ORDER BY query_start DESC;
```

### User and Session Queries

```sql
-- Find user by wallet address
SELECT id, wallet_address, email, created_at 
FROM users 
WHERE wallet_address = '0xYourWalletAddress';

-- Check user sessions
SELECT 
  s.id,
  s.expires_at,
  s.created_at,
  u.wallet_address
FROM sessions s
JOIN users u ON s.user_id = u.id
WHERE u.wallet_address = '0xYourWalletAddress'
ORDER BY s.created_at DESC;

-- Find expired sessions
SELECT COUNT(*) AS expired_sessions
FROM sessions 
WHERE expires_at < NOW();

-- Clean up expired sessions
DELETE FROM sessions WHERE expires_at < NOW();
```

### Organization Queries

```sql
-- List all organizations
SELECT 
  o.id,
  o.name,
  o.treasury_address,
  u.wallet_address AS owner_wallet,
  o.created_at
FROM organizations o
JOIN users u ON o.owner_id = u.id
ORDER BY o.created_at DESC;

-- Get organization members
SELECT 
  om.role,
  u.wallet_address,
  u.email,
  om.created_at
FROM org_members om
JOIN users u ON om.user_id = u.id
WHERE om.org_id = 'ORG_ID'
ORDER BY om.role, om.created_at;

-- Find organization by treasury address
SELECT * FROM organizations 
WHERE treasury_address = '0xTreasuryAddress';
```

### Contractor Queries

```sql
-- List active contractors for an organization
SELECT 
  id,
  name,
  wallet_address,
  rate_amount,
  rate_currency,
  pay_cycle,
  created_at
FROM contractors
WHERE org_id = 'ORG_ID' AND active = true
ORDER BY name;

-- Find contractors with invalid wallet addresses
SELECT id, name, wallet_address
FROM contractors 
WHERE org_id = 'ORG_ID' 
  AND active = true 
  AND (
    wallet_address IS NULL 
    OR wallet_address = '0x0000000000000000000000000000000000000000'
    OR wallet_address NOT SIMILAR TO '0x[a-fA-F0-9]{40}'
  );

-- Count contractors by pay cycle
SELECT 
  pay_cycle,
  COUNT(*) AS count,
  SUM(rate_amount) AS total_rate
FROM contractors
WHERE org_id = 'ORG_ID' AND active = true
GROUP BY pay_cycle;

-- Find duplicate wallet addresses within org
SELECT wallet_address, COUNT(*) AS count
FROM contractors
WHERE org_id = 'ORG_ID' AND active = true
GROUP BY wallet_address
HAVING COUNT(*) > 1;
```

### Payroll Queries

```sql
-- Recent payroll runs for an organization
SELECT 
  id,
  run_label,
  status,
  total_mnee,
  tx_hash,
  executed_at,
  created_at
FROM payroll_runs
WHERE org_id = 'ORG_ID'
ORDER BY created_at DESC
LIMIT 10;

-- Find payroll run by transaction hash
SELECT * FROM payroll_runs WHERE tx_hash = '0xYourTxHash';

-- Get payroll items for a run
SELECT 
  pi.id,
  pi.amount_mnee,
  pi.status,
  c.name AS contractor_name,
  c.wallet_address
FROM payroll_items pi
LEFT JOIN contractors c ON pi.contractor_id = c.id
WHERE pi.payroll_run_id = 'RUN_ID'
ORDER BY c.name;

-- Failed payroll runs in last 7 days
SELECT 
  pr.id,
  pr.run_label,
  pr.total_mnee,
  pr.tx_hash,
  pr.created_at,
  o.name AS org_name
FROM payroll_runs pr
JOIN organizations o ON pr.org_id = o.id
WHERE pr.status = 'FAILED'
  AND pr.created_at > NOW() - INTERVAL '7 days'
ORDER BY pr.created_at DESC;

-- Payment history for a contractor
SELECT 
  pr.id AS run_id,
  pr.tx_hash,
  pr.executed_at,
  pr.status AS run_status,
  pi.amount_mnee,
  pi.status AS item_status
FROM payroll_runs pr
JOIN payroll_items pi ON pr.id = pi.payroll_run_id
WHERE pi.contractor_id = 'CONTRACTOR_ID'
ORDER BY pr.executed_at DESC
LIMIT 20;
```

### Event and Notification Queries

```sql
-- Recent events for an organization
SELECT 
  id,
  event_type,
  payload,
  created_at
FROM events
WHERE org_id = 'ORG_ID'
ORDER BY created_at DESC
LIMIT 20;

-- Unread notifications for a user
SELECT 
  id,
  type,
  title,
  message,
  created_at
FROM notifications
WHERE user_id = 'USER_ID' AND read = false
ORDER BY created_at DESC;

-- Event counts by type (last 24 hours)
SELECT 
  event_type,
  COUNT(*) AS count
FROM events
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY event_type
ORDER BY count DESC;
```

### Database Statistics

```sql
-- Table sizes
SELECT 
  relname AS table_name,
  pg_size_pretty(pg_total_relation_size(relid)) AS total_size,
  pg_size_pretty(pg_relation_size(relid)) AS data_size,
  pg_size_pretty(pg_indexes_size(relid)) AS index_size
FROM pg_catalog.pg_statio_user_tables
ORDER BY pg_total_relation_size(relid) DESC;

-- Row counts for all tables
SELECT 
  'users' AS table_name, COUNT(*) AS row_count FROM users
UNION ALL SELECT 'organizations', COUNT(*) FROM organizations
UNION ALL SELECT 'contractors', COUNT(*) FROM contractors
UNION ALL SELECT 'payroll_runs', COUNT(*) FROM payroll_runs
UNION ALL SELECT 'payroll_items', COUNT(*) FROM payroll_items
UNION ALL SELECT 'sessions', COUNT(*) FROM sessions
UNION ALL SELECT 'events', COUNT(*) FROM events
UNION ALL SELECT 'notifications', COUNT(*) FROM notifications;

-- Index usage statistics
SELECT 
  schemaname,
  relname AS table_name,
  indexrelname AS index_name,
  idx_scan AS times_used,
  idx_tup_read AS tuples_read,
  idx_tup_fetch AS tuples_fetched
FROM pg_stat_user_indexes
ORDER BY idx_scan DESC;
```

---

## Smart Contract Commands

### Prerequisites

```bash
# Install foundry (cast command)
curl -L https://foundry.paradigm.xyz | bash
foundryup

# Set environment variables
export RPC_URL="https://sepolia.infura.io/v3/YOUR_KEY"
export TREASURY_ADDRESS="0xA6f85Ad3CC0E251624F066052172e76e6edF2380"
export MNEE_ADDRESS="0x8ccedbAe4916b79da7F3F612EfB2EB93A2bFD6cF"
```

### Contract Addresses

| Network | Contract | Address |
|---------|----------|---------|
| Sepolia | PayrollTreasury | `0xA6f85Ad3CC0E251624F066052172e76e6edF2380` |
| Sepolia | MNEE Token | `0x8ccedbAe4916b79da7F3F612EfB2EB93A2bFD6cF` |
| Localhost | PayrollTreasury | `0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0` |
| Localhost | MNEE Token | `0x5FbDB2315678afecb367f032d93F642f64180aa3` |

### Treasury Contract Queries

```bash
# Get treasury balance (MNEE)
cast call $TREASURY_ADDRESS "getBalance()" --rpc-url $RPC_URL

# Decode balance to human-readable format (18 decimals)
cast --to-dec $(cast call $TREASURY_ADDRESS "getBalance()" --rpc-url $RPC_URL)

# Get treasury admin address
cast call $TREASURY_ADDRESS "getAdmin()" --rpc-url $RPC_URL

# Get MNEE token address configured in treasury
cast call $TREASURY_ADDRESS "mneeToken()" --rpc-url $RPC_URL
```

### MNEE Token Queries

```bash
# Get MNEE balance for any address
cast call $MNEE_ADDRESS "balanceOf(address)" $WALLET_ADDRESS --rpc-url $RPC_URL

# Get MNEE total supply
cast call $MNEE_ADDRESS "totalSupply()" --rpc-url $RPC_URL

# Get MNEE decimals
cast call $MNEE_ADDRESS "decimals()" --rpc-url $RPC_URL

# Check allowance (how much treasury can spend)
cast call $MNEE_ADDRESS "allowance(address,address)" $OWNER $TREASURY_ADDRESS --rpc-url $RPC_URL
```

### Transaction Analysis

```bash
# Get transaction details
cast tx $TX_HASH --rpc-url $RPC_URL

# Get transaction receipt (includes status, gas used, logs)
cast receipt $TX_HASH --rpc-url $RPC_URL

# Decode transaction revert reason
cast run $TX_HASH --rpc-url $RPC_URL

# Get transaction trace (detailed execution)
cast run $TX_HASH --rpc-url $RPC_URL --trace
```

### Event Logs

```bash
# Get PayrollExecuted events from treasury
cast logs \
  --address $TREASURY_ADDRESS \
  --from-block 0 \
  --to-block latest \
  "PayrollExecuted(bytes32,uint256,uint256,uint256)" \
  --rpc-url $RPC_URL

# Get Transfer events from MNEE token
cast logs \
  --address $MNEE_ADDRESS \
  --from-block $BLOCK_NUMBER \
  --to-block latest \
  "Transfer(address,address,uint256)" \
  --rpc-url $RPC_URL

# Filter Transfer events to specific recipient
cast logs \
  --address $MNEE_ADDRESS \
  --from-block $BLOCK_NUMBER \
  "Transfer(address,address,uint256)" \
  --rpc-url $RPC_URL | grep -i $RECIPIENT_ADDRESS
```

### Network Information

```bash
# Get current block number
cast block-number --rpc-url $RPC_URL

# Get current gas price
cast gas-price --rpc-url $RPC_URL

# Get chain ID
cast chain-id --rpc-url $RPC_URL

# Get block details
cast block latest --rpc-url $RPC_URL
```

### Contract Write Operations (Admin Only)

```bash
# Deposit MNEE to treasury (requires approval first)
# Step 1: Approve treasury to spend MNEE
cast send $MNEE_ADDRESS "approve(address,uint256)" $TREASURY_ADDRESS $AMOUNT \
  --rpc-url $RPC_URL --private-key $PRIVATE_KEY

# Step 2: Deposit to treasury
cast send $TREASURY_ADDRESS "deposit(uint256)" $AMOUNT \
  --rpc-url $RPC_URL --private-key $PRIVATE_KEY

# Change treasury admin
cast send $TREASURY_ADDRESS "setAdmin(address)" $NEW_ADMIN \
  --rpc-url $RPC_URL --private-key $CURRENT_ADMIN_KEY
```

---

## API Testing Commands

### Authentication Flow

```bash
# Step 1: Get nonce for wallet
curl -s -X POST $API_URL/api/v1/auth/nonce \
  -H "Content-Type: application/json" \
  -d '{"address": "0xYourWalletAddress"}' | jq .

# Step 2: Verify signature (after signing SIWE message)
curl -s -X POST $API_URL/api/v1/auth/verify \
  -H "Content-Type: application/json" \
  -d '{
    "message": "SIWE_MESSAGE_STRING",
    "signature": "0xSIGNATURE"
  }' | jq .

# Step 3: Refresh token
curl -s -X POST $API_URL/api/v1/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{"refreshToken": "YOUR_REFRESH_TOKEN"}' | jq .

# Logout
curl -s -X POST $API_URL/api/v1/auth/logout \
  -H "Authorization: Bearer $ACCESS_TOKEN" | jq .
```

### Organization Endpoints

```bash
# List user's organizations
curl -s -X GET $API_URL/api/v1/orgs \
  -H "Authorization: Bearer $ACCESS_TOKEN" | jq .

# Get specific organization
curl -s -X GET $API_URL/api/v1/orgs/$ORG_ID \
  -H "Authorization: Bearer $ACCESS_TOKEN" | jq .

# Create organization
curl -s -X POST $API_URL/api/v1/orgs \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Org",
    "treasuryAddress": "0xTreasuryAddress"
  }' | jq .
```

### Contractor Endpoints

```bash
# List contractors for organization
curl -s -X GET "$API_URL/api/v1/orgs/$ORG_ID/contractors" \
  -H "Authorization: Bearer $ACCESS_TOKEN" | jq .

# Get specific contractor
curl -s -X GET "$API_URL/api/v1/orgs/$ORG_ID/contractors/$CONTRACTOR_ID" \
  -H "Authorization: Bearer $ACCESS_TOKEN" | jq .

# Create contractor
curl -s -X POST "$API_URL/api/v1/orgs/$ORG_ID/contractors" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "walletAddress": "0xContractorWallet",
    "rateAmount": "1000.00",
    "payCycle": "MONTHLY"
  }' | jq .
```

### Payroll Endpoints

```bash
# Preview payroll (get pending amounts)
curl -s -X GET "$API_URL/api/v1/orgs/$ORG_ID/payroll-runs/preview" \
  -H "Authorization: Bearer $ACCESS_TOKEN" | jq .

# List payroll runs
curl -s -X GET "$API_URL/api/v1/orgs/$ORG_ID/payroll-runs" \
  -H "Authorization: Bearer $ACCESS_TOKEN" | jq .

# Get specific payroll run
curl -s -X GET "$API_URL/api/v1/orgs/$ORG_ID/payroll-runs/$RUN_ID" \
  -H "Authorization: Bearer $ACCESS_TOKEN" | jq .

# Create payroll run
curl -s -X POST "$API_URL/api/v1/orgs/$ORG_ID/payroll-runs" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "runLabel": "January 2026 Payroll"
  }' | jq .
```

### Treasury Endpoints

```bash
# Get treasury balance
curl -s -X GET "$API_URL/api/v1/orgs/$ORG_ID/treasury/balance" \
  -H "Authorization: Bearer $ACCESS_TOKEN" | jq .

# Get treasury transactions
curl -s -X GET "$API_URL/api/v1/orgs/$ORG_ID/treasury/transactions" \
  -H "Authorization: Bearer $ACCESS_TOKEN" | jq .
```

### Notification Endpoints

```bash
# Get user notifications
curl -s -X GET "$API_URL/api/v1/notifications" \
  -H "Authorization: Bearer $ACCESS_TOKEN" | jq .

# Mark notification as read
curl -s -X PATCH "$API_URL/api/v1/notifications/$NOTIFICATION_ID/read" \
  -H "Authorization: Bearer $ACCESS_TOKEN" | jq .
```

### Error Response Testing

```bash
# Test 401 Unauthorized (no token)
curl -s -X GET $API_URL/api/v1/orgs | jq .

# Test 401 Unauthorized (invalid token)
curl -s -X GET $API_URL/api/v1/orgs \
  -H "Authorization: Bearer invalid_token" | jq .

# Test 404 Not Found
curl -s -X GET $API_URL/api/v1/orgs/nonexistent-id \
  -H "Authorization: Bearer $ACCESS_TOKEN" | jq .

# Test rate limiting (make many rapid requests)
for i in {1..20}; do
  curl -s -o /dev/null -w "%{http_code}\n" \
    -X POST $API_URL/api/v1/auth/nonce \
    -H "Content-Type: application/json" \
    -d '{"address": "0x1234567890123456789012345678901234567890"}'
done
```

---

## Log Search Patterns

### API Error Patterns

```bash
# Search for authentication errors
grep -E "AUTH_00[1-4]|auth_failed|signature|nonce" logs/api.log

# Search for payroll errors
grep -E "PAYROLL_|payroll.*error|transaction.*failed" logs/api.log

# Search for database errors
grep -E "PrismaClient|database|connection.*refused|pool" logs/api.log

# Search for RPC errors
grep -E "RPC.*error|eth_|timeout|rate.*limit" logs/api.log

# Search for specific error codes
grep -E "ORG_00[1-3]|CONTRACTOR_00[1-4]" logs/api.log
```

### Request Tracing

```bash
# Find all requests for a specific user (by wallet address)
grep -i "0xWalletAddress" logs/api.log

# Find all requests for a specific organization
grep "org_id.*ORG_ID" logs/api.log

# Find slow requests (>1 second)
grep -E "responseTime.*[0-9]{4,}" logs/api.log

# Find all 5xx errors
grep -E '"statusCode":5[0-9]{2}' logs/api.log
```

### Deployment Logs

```bash
# Railway logs
railway logs --app orbitpayroll-api
railway logs --app orbitpayroll-api --tail 100

# Vercel logs (frontend)
vercel logs
vercel logs --follow

# Docker logs (local)
docker logs orbitpayroll-api --tail 100
docker logs orbitpayroll-api -f
```

### Structured Log Queries (JSON logs)

```bash
# Parse JSON logs with jq
cat logs/api.log | jq 'select(.level == "error")'

# Find errors in last hour
cat logs/api.log | jq 'select(.level == "error" and .time > (now - 3600))'

# Group errors by type
cat logs/api.log | jq -s 'map(select(.level == "error")) | group_by(.code) | map({code: .[0].code, count: length})'
```

---

## Prisma Studio Access

### Starting Prisma Studio

```bash
# Navigate to database package
cd packages/database

# Start Prisma Studio (opens at http://localhost:5555)
npx prisma studio
```

### Prisma Studio Features

- **Browse Data**: View all tables and records
- **Edit Records**: Modify data directly (use with caution in production)
- **Filter & Search**: Find specific records
- **View Relations**: Navigate between related records
- **Export Data**: Export query results

### Alternative: Prisma CLI Queries

```bash
# Check migration status
npx prisma migrate status

# Generate Prisma client
npx prisma generate

# Pull schema from database
npx prisma db pull

# Push schema to database (dev only)
npx prisma db push

# Reset database (WARNING: deletes all data)
npx prisma migrate reset
```

---

## Environment Verification

### Required Environment Variables

```bash
# API Environment
echo "DATABASE_URL: ${DATABASE_URL:+SET}"
echo "JWT_SECRET: ${JWT_SECRET:+SET}"
echo "RPC_URL: ${RPC_URL:+SET}"
echo "CHAIN_ID: $CHAIN_ID"

# Frontend Environment
echo "NEXT_PUBLIC_API_URL: $NEXT_PUBLIC_API_URL"
echo "NEXT_PUBLIC_RPC_URL: ${NEXT_PUBLIC_RPC_URL:+SET}"
echo "NEXT_PUBLIC_NETWORK: $NEXT_PUBLIC_NETWORK"
```

### Verify Configuration

```bash
# Check API is running
curl -s $API_URL/health | jq .status

# Check database connection
cd packages/database && npx prisma db pull

# Check RPC connectivity
curl -s -X POST $RPC_URL \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_chainId","params":[],"id":1}' | jq .

# Verify contract addresses match network
cast call $TREASURY_ADDRESS "getAdmin()" --rpc-url $RPC_URL
```

### Version Information

```bash
# Node.js version
node --version

# npm version
npm --version

# Prisma version
npx prisma --version

# Foundry version
cast --version

# Check package versions
npm list --depth=0
```

---

## Quick Reference Card

### Most Common Commands

| Task | Command |
|------|---------|
| Check API health | `curl $API_URL/health` |
| Check DB connection | `npx prisma db pull` |
| Check RPC | `cast block-number --rpc-url $RPC_URL` |
| Treasury balance | `cast call $TREASURY "getBalance()"` |
| Open DB browser | `npx prisma studio` |
| View API logs | `railway logs` or `docker logs` |
| Test auth flow | `curl -X POST $API_URL/api/v1/auth/nonce` |

### Error Code Quick Reference

| Code | Meaning |
|------|---------|
| AUTH_001 | Nonce expired |
| AUTH_002 | Invalid signature |
| AUTH_003 | Token expired |
| AUTH_004 | Invalid token |
| ORG_001 | Organization not found |
| ORG_002 | Not authorized |
| CONTRACTOR_001 | Contractor not found |
| PAYROLL_001 | Insufficient balance |

---

## Escalation Checklist

When escalating an issue, collect:

1. **Error Information**
   - Error message and code
   - Stack trace (if available)
   - Timestamp of occurrence

2. **Environment Context**
   - Network (Sepolia/Mainnet)
   - API version
   - Frontend version

3. **Diagnostic Results**
   - Health check output
   - Relevant database queries
   - Transaction hash (if applicable)
   - Log excerpts

4. **Reproduction Steps**
   - What action triggered the error
   - User wallet address
   - Organization ID
