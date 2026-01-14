# Design Document: OrbitPayroll Integrations

## Overview

OrbitPayroll integrates with external services for Ethereum network access, wallet connectivity, and optional email notifications. This document defines the integration patterns and interfaces.

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        OrbitPayroll Application                          │
├─────────────────────────────────────────────────────────────────────────┤
│                         Integration Layer                                │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐    │
│  │ RPC Client  │  │Wallet Client│  │Token Client │  │Email Client │    │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘    │
└─────────────────────────────────────────────────────────────────────────┘
         │                  │                │                │
         ▼                  ▼                ▼                ▼
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   Alchemy   │    │  MetaMask   │    │    MNEE     │    │  SendGrid   │
│   Infura    │    │WalletConnect│    │   ERC20     │    │  (Optional) │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
```

## Components and Interfaces

### RPC Client

```typescript
// lib/rpc.ts
import { createPublicClient, http, fallback } from 'viem';
import { mainnet, sepolia } from 'viem/chains';

const chain = process.env.NEXT_PUBLIC_NETWORK === 'mainnet' ? mainnet : sepolia;

export const publicClient = createPublicClient({
  chain,
  transport: fallback([
    http(process.env.NEXT_PUBLIC_RPC_URL),
    http(process.env.NEXT_PUBLIC_RPC_URL_FALLBACK),
  ]),
});

// Retry wrapper
export async function withRetry<T>(
  fn: () => Promise<T>,
  retries = 3,
  delay = 1000
): Promise<T> {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === retries - 1) throw error;
      await new Promise(r => setTimeout(r, delay * Math.pow(2, i)));
    }
  }
  throw new Error('Unreachable');
}
```

### Contract ABIs

```typescript
// contracts/abis/index.ts
export const MNEE_ABI = [
  'function balanceOf(address) view returns (uint256)',
  'function allowance(address owner, address spender) view returns (uint256)',
  'function approve(address spender, uint256 amount) returns (bool)',
  'function transfer(address to, uint256 amount) returns (bool)',
  'function decimals() view returns (uint8)',
] as const;

export const TREASURY_ABI = [
  'function deposit(uint256 amount)',
  'function getBalance() view returns (uint256)',
  'function getAdmin() view returns (address)',
  'function runPayroll(address[] recipients, uint256[] amounts, bytes32 runId)',
  'function emergencyWithdraw(uint256 amount, address recipient)',
  'event Deposited(address indexed depositor, uint256 amount)',
  'event PayrollExecuted(bytes32 indexed runId, uint256 total, uint256 count, uint256 timestamp)',
] as const;

// contracts/addresses.ts
export const ADDRESSES = {
  mainnet: {
    MNEE: '0x8ccedbAe4916b79da7F3F612EfB2EB93A2bFD6cF',
  },
  sepolia: {
    MNEE: '0x8ccedbAe4916b79da7F3F612EfB2EB93A2bFD6cF', // Same or test address
  },
} as const;
```

### Wallet Integration

```typescript
// lib/wallet.ts
import { createConfig, http } from 'wagmi';
import { mainnet, sepolia } from 'wagmi/chains';
import { injected, walletConnect, coinbaseWallet } from 'wagmi/connectors';

export const wagmiConfig = createConfig({
  chains: [mainnet, sepolia],
  connectors: [
    injected(),
    walletConnect({ 
      projectId: process.env.NEXT_PUBLIC_WC_PROJECT_ID!,
      metadata: {
        name: 'OrbitPayroll',
        description: 'Web3 Payroll Platform',
        url: 'https://orbitpayroll.xyz',
        icons: ['https://orbitpayroll.xyz/icon.png'],
      },
    }),
    coinbaseWallet({ appName: 'OrbitPayroll' }),
  ],
  transports: {
    [mainnet.id]: http(process.env.NEXT_PUBLIC_RPC_URL),
    [sepolia.id]: http(process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL),
  },
});
```

### Block Explorer URLs

```typescript
// lib/explorer.ts
const EXPLORERS = {
  mainnet: 'https://etherscan.io',
  sepolia: 'https://sepolia.etherscan.io',
};

export function getTxUrl(txHash: string, network: 'mainnet' | 'sepolia'): string {
  return `${EXPLORERS[network]}/tx/${txHash}`;
}

export function getAddressUrl(address: string, network: 'mainnet' | 'sepolia'): string {
  return `${EXPLORERS[network]}/address/${address}`;
}
```

### Email Integration (Optional)

```typescript
// lib/email.ts
import sgMail from '@sendgrid/mail';

if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
}

export async function sendEmail(params: {
  to: string;
  template: 'payroll_scheduled' | 'payroll_executed' | 'low_balance';
  data: Record<string, string>;
}): Promise<void> {
  if (!process.env.SENDGRID_API_KEY) {
    console.log('Email disabled, would send:', params);
    return;
  }
  
  await sgMail.send({
    to: params.to,
    from: process.env.EMAIL_FROM!,
    templateId: TEMPLATES[params.template],
    dynamicTemplateData: params.data,
  });
}
```

## Environment Configuration

```bash
# .env.example

# Ethereum RPC
NEXT_PUBLIC_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/YOUR_KEY
NEXT_PUBLIC_RPC_URL_FALLBACK=https://mainnet.infura.io/v3/YOUR_KEY
NEXT_PUBLIC_NETWORK=mainnet  # or sepolia

# Wallet Connect
NEXT_PUBLIC_WC_PROJECT_ID=your_project_id

# MNEE Contract
NEXT_PUBLIC_MNEE_ADDRESS=0x8ccedbAe4916b79da7F3F612EfB2EB93A2bFD6cF

# Email (Optional)
SENDGRID_API_KEY=SG.xxx
EMAIL_FROM=noreply@orbitpayroll.xyz
```

## Correctness Properties

### Property 1: RPC Failover
*For any* RPC request that fails on the primary provider, the system SHALL automatically retry on the fallback provider.

**Validates: Requirements 1.2, 1.3**

### Property 2: Contract Address Consistency
*For any* network configuration, the MNEE contract address SHALL be `0x8ccedbAe4916b79da7F3F612EfB2EB93A2bFD6cF`.

**Validates: Requirements 2.1**

### Property 3: Wallet Compatibility
*For any* supported wallet (MetaMask, WalletConnect, Coinbase), connection and signing SHALL work correctly.

**Validates: Requirements 5.1, 5.2, 5.3**

## Testing Strategy

- Mock RPC responses for unit tests
- Use local Hardhat node for integration tests
- Test wallet flows with browser automation
- Verify email templates render correctly
