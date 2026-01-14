# Tech Stack & Build System

## Monorepo Structure

npm workspaces monorepo with `apps/` and `packages/` directories.

## Applications

### API (`apps/api`)
- Express.js with TypeScript
- Pino for structured logging
- Zod for request validation
- JWT + SIWE for authentication
- Rate limiting with express-rate-limit

### Web (`apps/web`)
- Next.js 14 (App Router)
- React 18 with TypeScript
- TailwindCSS + Radix UI components
- RainbowKit + wagmi for wallet connection
- TanStack Query for data fetching
- Zustand for client state

## Packages

- `@orbitpayroll/database`: Prisma ORM with PostgreSQL
- `@orbitpayroll/contracts`: Solidity smart contracts (Hardhat)
- `@orbitpayroll/config`: Shared configuration schemas
- `@orbitpayroll/types`: Shared TypeScript types

## Key Dependencies

- ethers.js v6 for blockchain interactions (backend)
- viem + wagmi for frontend Web3
- siwe for Sign-In with Ethereum
- OpenZeppelin contracts for smart contract security
- fast-check for property-based testing

## Common Commands

```bash
# Root level
npm install              # Install all dependencies
npm run build            # Build all workspaces
npm run test             # Run tests across all workspaces
npm run docker:up        # Start PostgreSQL container
npm run docker:reset     # Reset database

# API (apps/api)
npm run dev              # Start dev server with hot reload
npm run build            # Compile TypeScript
npm run test             # Run Vitest tests

# Web (apps/web)
npm run dev              # Start Next.js dev server (port 3000)
npm run build            # Production build
npm run test             # Run Vitest tests

# Database (packages/database)
npm run db:generate      # Generate Prisma client
npm run db:migrate       # Run migrations
npm run db:studio        # Open Prisma Studio
npm run db:seed          # Seed database

# Contracts (packages/contracts)
npm run compile          # Compile Solidity
npm run test             # Run Hardhat tests
npm run deploy:local     # Deploy to local node
npm run deploy:sepolia   # Deploy to Sepolia testnet
```

## Testing

- Vitest for API and Web unit tests
- Hardhat + Chai for smart contract tests
- fast-check for property-based testing
- Run property tests: `npm run test:property`
