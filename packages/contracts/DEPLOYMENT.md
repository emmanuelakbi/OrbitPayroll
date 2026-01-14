# Smart Contract Deployment Guide

This guide covers deploying OrbitPayroll smart contracts to various networks.

## Prerequisites

- Node.js 20+ installed
- npm dependencies installed (`npm install` from monorepo root)
- Ethereum wallet with sufficient ETH for gas fees
- RPC provider URL (Infura, Alchemy, or similar)
- Etherscan API key (for contract verification)

## Quick Start

### 1. Configure Environment

Copy the example environment file and fill in your values:

```bash
cd packages/contracts
cp .env.example .env
```

Edit `.env` with your configuration:

```bash
# Required for testnet/mainnet deployment
DEPLOYER_PRIVATE_KEY=0x...your-private-key...
SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/YOUR_PROJECT_ID
MAINNET_RPC_URL=https://mainnet.infura.io/v3/YOUR_PROJECT_ID

# Required for contract verification
ETHERSCAN_API_KEY=your-etherscan-api-key

# MNEE Token address (use official address for mainnet/testnet)
MNEE_TOKEN_ADDRESS=0x8ccedbAe4916b79da7F3F612EfB2EB93A2bFD6cF
```

### 2. Compile Contracts

```bash
npm run compile
```

### 3. Deploy

```bash
# Local development (Hardhat network)
npm run deploy:local

# Sepolia testnet
npm run deploy:sepolia

# Ethereum mainnet
npm run deploy:mainnet
```

### 4. Verify on Etherscan

```bash
# Sepolia
npm run verify:sepolia

# Mainnet
npm run verify:mainnet
```

## Deployment Networks

| Network | Chain ID | RPC URL | Explorer |
|---------|----------|---------|----------|
| Hardhat | 31337 | http://127.0.0.1:8545 | N/A |
| Sepolia | 11155111 | Infura/Alchemy | https://sepolia.etherscan.io |
| Mainnet | 1 | Infura/Alchemy | https://etherscan.io |

## Deployment Process

### What Gets Deployed

1. **PayrollTreasury** - Main treasury contract for holding MNEE and executing payroll
2. **MockMNEE** (local only) - Mock ERC20 token for testing

### Deployment Steps

The deployment script (`scripts/deploy.ts`) performs:

1. Connects to the specified network
2. Validates deployer wallet balance
3. For local networks: deploys MockMNEE and mints test tokens
4. Deploys PayrollTreasury with admin and MNEE token addresses
5. Verifies deployment by reading contract state
6. Saves deployment artifacts to `deployments/` folder

### Output Files

After deployment, these files are created/updated:

| File | Description |
|------|-------------|
| `deployments/{network}.json` | Full deployment details (addresses, tx hashes, block numbers) |
| `deployments/addresses.json` | Simplified address mapping for all networks |

## Contract Verification

### Automatic Verification

The verification script (`scripts/verify.ts`) reads deployment data and submits to Etherscan:

```bash
npm run verify:sepolia
```

### Manual Verification

If automatic verification fails, verify manually on Etherscan:

1. Go to the contract address on Etherscan
2. Click "Contract" → "Verify and Publish"
3. Select:
   - Compiler Type: Solidity (Single file)
   - Compiler Version: v0.8.20
   - License: MIT
4. Paste the flattened source code
5. Enter constructor arguments (ABI-encoded)

Constructor arguments for PayrollTreasury:
```
admin: <deployer-address>
mneeToken: 0x8ccedbAe4916b79da7F3F612EfB2EB93A2bFD6cF
```

## Exporting ABIs

After deployment, export ABIs for frontend/backend use:

```bash
npm run export
```

This creates:
- `exports/contracts.json` - Combined ABIs and addresses
- `exports/PayrollTreasury.abi.json` - PayrollTreasury ABI only
- `exports/addresses.ts` - TypeScript address constants

## Current Deployments

### Sepolia Testnet

| Contract | Address |
|----------|---------|
| PayrollTreasury | `0xA6f85Ad3CC0E251624F066052172e76e6edF2380` |
| MNEE Token | `0x8ccedbAe4916b79da7F3F612EfB2EB93A2bFD6cF` |

View on Etherscan: https://sepolia.etherscan.io/address/0xA6f85Ad3CC0E251624F066052172e76e6edF2380

## Troubleshooting

### "Insufficient funds" Error

Ensure your deployer wallet has enough ETH for gas:
- Sepolia: Get test ETH from [Sepolia Faucet](https://sepoliafaucet.com/)
- Mainnet: Requires real ETH

### "Invalid RPC URL" Error

Check your `.env` file:
- Ensure RPC URL is correct and includes your API key
- Test the URL with `curl <your-rpc-url>`

### Verification Fails with "Already Verified"

This is not an error - the contract is already verified on Etherscan.

### "Nonce too low" Error

Your wallet may have pending transactions. Wait for them to confirm or reset your nonce.

### Contract Not Found After Deployment

1. Check the deployment output for the contract address
2. Verify the transaction was mined on the block explorer
3. Wait a few blocks for indexing

## Security Considerations

⚠️ **NEVER commit your `.env` file or private keys to version control!**

- Use hardware wallets for mainnet deployments
- Keep deployer private keys secure
- Verify contract source code on Etherscan after deployment
- Test thoroughly on testnet before mainnet deployment

## Gas Estimation

Approximate gas costs (varies with network conditions):

| Operation | Gas Units | ~Cost at 20 gwei |
|-----------|-----------|------------------|
| Deploy PayrollTreasury | ~800,000 | ~0.016 ETH |
| Deploy MockMNEE | ~1,200,000 | ~0.024 ETH |

## Integration with Frontend

After deployment, update the frontend contract addresses:

1. Run `npm run export` to generate address files
2. Copy addresses to `apps/web/src/contracts/addresses.json`
3. Or import directly from `packages/contracts/exports/addresses.ts`

## CI/CD Integration

For automated deployments in CI/CD:

```yaml
# Example GitHub Actions step
- name: Deploy to Sepolia
  env:
    DEPLOYER_PRIVATE_KEY: ${{ secrets.DEPLOYER_PRIVATE_KEY }}
    SEPOLIA_RPC_URL: ${{ secrets.SEPOLIA_RPC_URL }}
    ETHERSCAN_API_KEY: ${{ secrets.ETHERSCAN_API_KEY }}
  run: |
    cd packages/contracts
    npm run deploy:sepolia
    npm run verify:sepolia
```

Required secrets:
- `DEPLOYER_PRIVATE_KEY` - Wallet private key for deployment
- `SEPOLIA_RPC_URL` - RPC endpoint URL
- `ETHERSCAN_API_KEY` - For contract verification
