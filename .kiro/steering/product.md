# OrbitPayroll Product Overview

OrbitPayroll is a Web3 payroll platform enabling organizations to make batch cryptocurrency payments to contractors using MNEE stablecoin on Ethereum.

## Core Features

- **Wallet Authentication**: SIWE (Sign-In with Ethereum) for passwordless login
- **Organization Management**: Multi-tenant with role-based access (Owner/Admin, Finance Operator)
- **Contractor Management**: Add contractors with wallet addresses, pay rates, and cycles (weekly, bi-weekly, monthly)
- **Batch Payroll**: Execute payroll runs via smart contracts with transaction tracking
- **Treasury Management**: Deposit/withdraw MNEE tokens from organization treasury

## User Flow

1. Connect wallet → Sign SIWE message → Authenticated
2. Create/join organization with treasury contract address
3. Add contractors with wallet addresses and payment rates
4. Preview payroll → Execute batch payment via smart contract
5. Track transaction status and payment history

## Key Entities

- **Users**: Identified by Ethereum wallet address (0x...)
- **Organizations**: Have treasury contracts, manage contractors and payroll
- **Contractors**: Payment recipients with defined rates and pay cycles
- **Payroll Runs**: Batch payment executions with status tracking (PENDING → EXECUTED/FAILED)

## MNEE Token

Official contract: `0x8ccedbAe4916b79da7F3F612EfB2EB93A2bFD6cF`

## Business Rules

- Max 100 recipients per payroll batch
- Wallet addresses normalized to lowercase
- Soft deletes for contractors (active=false)
- Duplicate wallet check only against active contractors within same org
