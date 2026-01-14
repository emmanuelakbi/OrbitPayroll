# Playbook: Payroll Transaction Failures

## Overview

This playbook covers diagnosing and resolving failed payroll transactions in OrbitPayroll.

## Symptoms

- Transaction reverted on-chain
- Error message in UI: "Transaction Failed"
- Payroll run status shows `FAILED` in database
- Users report payments not received

---

## Diagnostic Steps

### Step 1: Get Transaction Details

```bash
# Check transaction on block explorer
# Sepolia: https://sepolia.etherscan.io/tx/{txHash}
# Mainnet: https://etherscan.io/tx/{txHash}

# Or use cast to get transaction details
cast tx $TX_HASH --rpc-url $RPC_URL
```

### Step 2: Check Treasury Balance

```bash
# Get current treasury balance
cast call $TREASURY_ADDRESS "getBalance()" --rpc-url $RPC_URL

# Decode the result (returns uint256 in wei)
cast --to-dec $(cast call $TREASURY_ADDRESS "getBalance()" --rpc-url $RPC_URL)
```

### Step 3: Verify Admin Access

```bash
# Check who is the current admin
cast call $TREASURY_ADDRESS "getAdmin()" --rpc-url $RPC_URL

# Compare with the wallet that attempted the transaction
```

### Step 4: Decode Revert Reason

```bash
# Get detailed transaction trace
cast run $TX_HASH --rpc-url $RPC_URL

# Or check the transaction receipt for revert reason
cast receipt $TX_HASH --rpc-url $RPC_URL
```

### Step 5: Check Database Records

```sql
-- Find the payroll run by transaction hash
SELECT * FROM payroll_runs WHERE tx_hash = 'YOUR_TX_HASH';

-- Check payroll items for the run
SELECT pi.*, c.name, c.wallet_address 
FROM payroll_items pi
LEFT JOIN contractors c ON pi.contractor_id = c.id
WHERE pi.payroll_run_id = 'RUN_ID';

-- Check if any contractors have invalid addresses
SELECT * FROM contractors 
WHERE org_id = 'ORG_ID' 
AND active = true 
AND wallet_address NOT SIMILAR TO '0x[a-fA-F0-9]{40}';
```

---

## Common Causes & Solutions

### 1. Insufficient Treasury Balance

**Error Message:** `Insufficient treasury balance`

**Diagnosis:**
```bash
# Check required amount vs available balance
cast call $TREASURY_ADDRESS "getBalance()" --rpc-url $RPC_URL
```

**Solution:**
1. Deposit more MNEE to the treasury:
   ```bash
   # First approve the treasury to spend MNEE
   cast send $MNEE_ADDRESS "approve(address,uint256)" $TREASURY_ADDRESS $AMOUNT --rpc-url $RPC_URL --private-key $PRIVATE_KEY
   
   # Then deposit
   cast send $TREASURY_ADDRESS "deposit(uint256)" $AMOUNT --rpc-url $RPC_URL --private-key $PRIVATE_KEY
   ```
2. Retry the payroll run from the UI

---

### 2. Unauthorized Caller (Not Admin)

**Error Message:** `Unauthorized`

**Diagnosis:**
```bash
# Check current admin
cast call $TREASURY_ADDRESS "getAdmin()" --rpc-url $RPC_URL
```

**Solution:**
1. Ensure the connected wallet is the treasury admin
2. If admin needs to change:
   ```bash
   # Current admin must call setAdmin
   cast send $TREASURY_ADDRESS "setAdmin(address)" $NEW_ADMIN --rpc-url $RPC_URL --private-key $CURRENT_ADMIN_KEY
   ```

---

### 3. Gas Estimation Failed / Out of Gas

**Error Message:** `out of gas` or transaction pending indefinitely

**Diagnosis:**
```bash
# Check gas used vs gas limit
cast receipt $TX_HASH --rpc-url $RPC_URL | grep -E "(gasUsed|gas)"
```

**Solution:**
1. Retry with higher gas limit (increase by 20-50%)
2. If batch is large (>50 recipients), consider splitting into smaller batches
3. Check current network gas prices:
   ```bash
   cast gas-price --rpc-url $RPC_URL
   ```

---

### 4. Array Length Mismatch

**Error Message:** `Array length mismatch`

**Diagnosis:**
- Check that recipients and amounts arrays have equal length
- Review the payroll preview data

**Solution:**
1. Verify contractor data in database:
   ```sql
   SELECT COUNT(*) FROM contractors WHERE org_id = 'ORG_ID' AND active = true;
   ```
2. Regenerate payroll preview and retry

---

### 5. Invalid Recipient Address

**Error Message:** `Invalid recipient`

**Diagnosis:**
```sql
-- Find contractors with zero address or invalid addresses
SELECT * FROM contractors 
WHERE org_id = 'ORG_ID' 
AND active = true 
AND (wallet_address = '0x0000000000000000000000000000000000000000' 
     OR wallet_address IS NULL);
```

**Solution:**
1. Update invalid contractor addresses
2. Deactivate contractors with invalid addresses temporarily
3. Retry payroll

---

### 6. Too Many Recipients

**Error Message:** `Too many recipients`

**Diagnosis:**
- Contract has MAX_RECIPIENTS = 100 limit

**Solution:**
1. Split payroll into batches of ≤100 recipients
2. Execute multiple payroll runs

---

## Retry Failed Payroll

### From UI
1. Navigate to Dashboard → Payroll
2. Click "Preview Payroll" to regenerate
3. Verify treasury balance is sufficient
4. Click "Execute Payroll"

### Manual Retry via Contract

```bash
# Prepare arrays (example with 2 recipients)
RECIPIENTS='["0xRecipient1","0xRecipient2"]'
AMOUNTS='[1000000000000000000,2000000000000000000]'  # In wei
RUN_ID=$(cast --to-bytes32 "payroll-run-123")

# Execute payroll
cast send $TREASURY_ADDRESS \
  "runPayroll(address[],uint256[],bytes32)" \
  $RECIPIENTS $AMOUNTS $RUN_ID \
  --rpc-url $RPC_URL \
  --private-key $ADMIN_KEY
```

---

## Contract Addresses

| Network | Contract | Address |
|---------|----------|---------|
| Sepolia | PayrollTreasury | `0xA6f85Ad3CC0E251624F066052172e76e6edF2380` |
| Sepolia | MNEE Token | `0x8ccedbAe4916b79da7F3F612EfB2EB93A2bFD6cF` |
| Localhost | PayrollTreasury | `0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0` |
| Localhost | MNEE Token | `0x5FbDB2315678afecb367f032d93F642f64180aa3` |

---

## Escalation Path

If the issue cannot be resolved:

1. Collect diagnostic information:
   - Transaction hash
   - Error message
   - Treasury balance
   - Number of recipients
   - Database payroll run record

2. Check application logs:
   ```bash
   # API logs
   railway logs --app orbitpayroll-api
   
   # Or local logs
   npm run dev 2>&1 | grep -i "payroll\|error"
   ```

3. Escalate to engineering with collected data


---

## Contractor Payment Issues

### Verifying Contractor Received Payment

#### Step 1: Check Database Records

```sql
-- Find payment record for specific contractor
SELECT 
  pr.id as run_id,
  pr.tx_hash,
  pr.executed_at,
  pr.status as run_status,
  pi.amount_mnee,
  pi.status as item_status,
  c.name,
  c.wallet_address
FROM payroll_runs pr
JOIN payroll_items pi ON pr.id = pi.payroll_run_id
JOIN contractors c ON pi.contractor_id = c.id
WHERE c.id = 'CONTRACTOR_ID'
ORDER BY pr.executed_at DESC
LIMIT 10;
```

#### Step 2: Verify On-Chain Transfer

```bash
# Check Transfer events from MNEE token
cast logs \
  --address $MNEE_ADDRESS \
  --from-block $BLOCK_NUMBER \
  --to-block latest \
  "Transfer(address,address,uint256)" \
  --rpc-url $RPC_URL | grep -i $CONTRACTOR_WALLET

# Or check specific transaction
cast receipt $TX_HASH --rpc-url $RPC_URL
```

#### Step 3: Check Contractor's MNEE Balance

```bash
# Get contractor's current MNEE balance
cast call $MNEE_ADDRESS "balanceOf(address)" $CONTRACTOR_WALLET --rpc-url $RPC_URL
```

### Common Contractor Payment Issues

| Issue | Diagnosis | Solution |
|-------|-----------|----------|
| Wrong wallet address | Compare DB address with intended address | Update contractor record, process manual payment |
| Contractor inactive | `active = false` in database | Reactivate contractor, include in next run |
| Excluded from run | Not in payroll_items for run | Verify contractor was active at run time |
| Payment pending | Transaction not yet confirmed | Wait for block confirmations |

### Manual Payment Verification

```bash
# 1. Get the PayrollExecuted event from the transaction
cast logs --address $TREASURY_ADDRESS --tx-hash $TX_HASH --rpc-url $RPC_URL

# 2. Decode the event data to see total amount and recipient count
# Event: PayrollExecuted(bytes32 indexed offchainRunId, uint256 totalAmount, uint256 recipientCount, uint256 timestamp)
```

### Escalation for Unresolved Payment Issues

1. Document the discrepancy:
   - Expected payment amount
   - Contractor wallet address
   - Transaction hash
   - Database records

2. Check if payment went to wrong address (typo in wallet)

3. If funds sent to wrong address:
   - Contact recipient if known
   - Document for accounting purposes
   - Process corrective payment to correct address
