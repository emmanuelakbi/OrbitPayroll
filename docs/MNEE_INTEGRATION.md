# MNEE Integration Documentation

This document details how OrbitPayroll integrates with the MNEE stablecoin for payroll operations.

## Overview

OrbitPayroll uses MNEE as the exclusive payment token for all payroll operations. This integration enables:

- **Instant global payments** to contractors anywhere in the world
- **Batch transfers** executing multiple payments in a single transaction
- **Non-custodial treasury** where organizations maintain full control
- **Transparent audit trail** with all transactions verifiable on-chain

## MNEE Token Contract

| Network | Address | Explorer |
|---------|---------|----------|
| Mainnet | `0x8ccedbAe4916b79da7F3F612EfB2EB93A2bFD6cF` | [Etherscan](https://etherscan.io/address/0x8ccedbAe4916b79da7F3F612EfB2EB93A2bFD6cF) |
| Sepolia | `0x8ccedbAe4916b79da7F3F612EfB2EB93A2bFD6cF` | [Sepolia Etherscan](https://sepolia.etherscan.io/address/0x8ccedbAe4916b79da7F3F612EfB2EB93A2bFD6cF) |

## Integration Points

### 1. Treasury Contract

The `PayrollTreasury` smart contract holds MNEE tokens for each organization:

```solidity
// PayrollTreasury.sol
IERC20 public immutable mneeToken;

constructor(address _mneeToken, address _admin) {
    mneeToken = IERC20(_mneeToken);
    // ...
}
```

### 2. Deposit Flow

Organizations deposit MNEE using the standard ERC-20 approve + transfer pattern:

```typescript
// Frontend deposit flow
const depositMnee = async (amount: bigint) => {
  // 1. Approve treasury to spend MNEE
  await mneeContract.approve(treasuryAddress, amount);
  
  // 2. Deposit into treasury
  await treasuryContract.deposit(amount);
};
```

### 3. Batch Payroll Execution

The `runPayroll` function executes batch MNEE transfers:

```solidity
function runPayroll(
    address[] calldata recipients,
    uint256[] calldata amounts,
    bytes32 runId
) external onlyAdmin nonReentrant {
    uint256 total = 0;
    for (uint i = 0; i < recipients.length; i++) {
        total += amounts[i];
        mneeToken.safeTransfer(recipients[i], amounts[i]);
    }
    emit PayrollExecuted(runId, total, recipients.length, block.timestamp);
}
```

### 4. Event Logging

All payroll operations emit events for transparency:

```solidity
event PayrollExecuted(
    bytes32 indexed runId,
    uint256 totalAmount,
    uint256 recipientCount,
    uint256 timestamp
);

event Deposited(
    address indexed depositor,
    uint256 amount,
    uint256 timestamp
);
```

## UI Integration

### Treasury Balance Display

The treasury page displays MNEE balance with direct Etherscan links:

- **Balance Card**: Shows current MNEE balance
- **Contract Address**: Copyable with Etherscan link
- **Transaction History**: Links to block explorer for each tx

### MNEE Integration Showcase

A dedicated card on the treasury page highlights:

- MNEE contract address with copy/link functionality
- Benefits of using MNEE for payroll
- Integration highlights (ERC-20, batch transfers, etc.)

### MNEE Badge

A compact badge component displays MNEE info in headers:

```tsx
<MneeBadge />
// Renders: [MNEE icon] MNEE 0x8cce...cF [external link]
```

## Benefits of MNEE for Payroll

| Benefit | Description |
|---------|-------------|
| **Stability** | Pegged value eliminates volatility concerns |
| **Speed** | Near-instant settlement vs. days with banks |
| **Programmability** | Smart contract integration enables automation |
| **Transparency** | All transactions publicly verifiable |
| **Global Reach** | Pay anyone with an Ethereum wallet |
| **Low Fees** | Batch operations reduce per-payment costs |

## Security Considerations

1. **Non-Custodial**: Organizations control their own treasury contracts
2. **SafeERC20**: Using OpenZeppelin's SafeERC20 for token transfers
3. **ReentrancyGuard**: Protection against reentrancy attacks
4. **Role-Based Access**: Only admins can execute payroll
5. **Event Logging**: Full audit trail on-chain

## Code References

| Component | Location |
|-----------|----------|
| Treasury Contract | `packages/contracts/contracts/PayrollTreasury.sol` |
| Contract Addresses | `apps/web/src/contracts/addresses.ts` |
| MNEE Integration Card | `apps/web/src/components/treasury/MneeIntegrationCard.tsx` |
| Explorer Utilities | `apps/web/src/lib/explorer.ts` |
| Treasury Balance Card | `apps/web/src/components/treasury/TreasuryBalanceCard.tsx` |

## Testing MNEE Integration

```bash
# Run smart contract tests
cd packages/contracts
npm run test

# Run property-based tests for payroll
cd apps/api
npm run test -- --grep "payroll"
```

## Future Enhancements

- [ ] Multi-token support (other stablecoins)
- [ ] Automated payroll scheduling
- [ ] MNEE price feed integration
- [ ] Cross-chain MNEE support
