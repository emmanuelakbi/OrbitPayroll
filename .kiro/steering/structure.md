# Project Structure

```
orbitpayroll/
├── apps/
│   ├── api/                    # Express.js backend
│   │   └── src/
│   │       ├── index.ts        # Entry point
│   │       ├── app.ts          # Express app factory
│   │       ├── lib/            # Utilities (db, errors, logger)
│   │       ├── middleware/     # Express middleware
│   │       ├── routes/         # API route handlers
│   │       ├── schemas/        # Zod validation schemas
│   │       ├── services/       # Business logic layer
│   │       └── test/           # Test helpers and fixtures
│   │
│   └── web/                    # Next.js frontend
│       └── src/
│           ├── app/            # Next.js App Router pages
│           │   ├── api/        # API routes (Next.js route handlers)
│           │   ├── auth/       # Authentication page
│           │   └── dashboard/  # Protected dashboard routes
│           ├── components/     # React components by domain
│           │   ├── ui/         # Shared UI primitives
│           │   ├── auth/       # Auth components
│           │   ├── contractors/
│           │   ├── dashboard/  # Dashboard layout components
│           │   ├── notifications/  # Toast and notification components
│           │   ├── payroll/
│           │   └── treasury/
│           ├── contracts/      # ABIs and contract addresses
│           │   └── abis/       # Contract ABI JSON files
│           ├── hooks/          # Custom React hooks
│           ├── lib/            # Utilities and API client
│           │   ├── api/        # API client and typed methods
│           │   └── auth/       # Auth utilities
│           └── test/           # Test helpers and fixtures
│
├── packages/
│   ├── config/                 # Shared configuration schemas
│   │   └── src/
│   ├── contracts/              # Solidity smart contracts
│   │   ├── contracts/          # .sol files
│   │   ├── deployments/        # Deployment artifacts
│   │   ├── exports/            # Exported ABIs
│   │   ├── scripts/            # Deploy scripts
│   │   ├── test/               # Contract tests
│   │   └── typechain-types/    # Generated TypeScript bindings
│   ├── database/               # Prisma ORM package
│   │   ├── prisma/
│   │   │   ├── schema.prisma   # Database schema
│   │   │   └── migrations/     # SQL migrations
│   │   └── src/
│   └── types/                  # Shared TypeScript types
│       └── src/
│
├── docs/                       # Documentation
│   ├── DATABASE_DEPLOYMENT.md  # Supabase/Railway database setup
│   ├── DEMO_DEPLOYMENT_CHECKLIST.md  # Pre-demo verification checklist
│   ├── DEMO_VIDEO_SCRIPT.md    # Demo video recording script
│   ├── DEVPOST_SUBMISSION.md   # Hackathon submission template
│   ├── MNEE_INTEGRATION.md     # MNEE token integration details
│   ├── OrbitPayroll-Overview.md
│   ├── PROJECT_DESCRIPTION.md  # Product description for submissions
│   ├── RAILWAY_DEPLOYMENT.md   # Railway backend deployment guide
│   ├── VERCEL_DEPLOYMENT.md    # Vercel frontend deployment guide
│   ├── VIDEO_UPLOAD_CHECKLIST.md  # YouTube upload checklist
│   └── playbooks/              # Troubleshooting guides
│       ├── authentication-failures.md
│       ├── database-issues.md
│       ├── diagnostic-tools.md
│       ├── payroll-failures.md
│       └── rpc-issues.md
│
└── scripts/                    # Utility scripts
    ├── fund-demo-treasury.ts   # Fund demo treasury script
    ├── init-db.sql             # Database initialization SQL
    ├── setup-demo.sh           # Demo setup script
    └── test-harness.sh         # Test harness script
```

## Conventions

### API Layer
- Routes in `routes/` define endpoints and call services
- Services in `services/` contain business logic
- Schemas in `schemas/` define Zod validation
- Middleware handles auth, validation, rate limiting, errors
- Custom errors in `lib/errors.ts` with error codes (AUTH_001, ORG_001, etc.)

### Frontend
- Components organized by feature domain
- `ui/` contains reusable primitives (button, card, dialog)
- API client in `lib/api/client.ts` with typed methods
- Auth state managed via Zustand store
- Contract ABIs in `contracts/abis/`

### Database
- Prisma schema uses snake_case for DB columns (`@map`)
- Models use PascalCase, fields use camelCase
- UUIDs for all primary keys
- Soft deletes via `active` boolean where applicable

### Smart Contracts
- OpenZeppelin base contracts for security
- ReentrancyGuard on state-changing functions
- Events for all significant state changes
- Typechain generates TypeScript bindings
- Max 100 recipients per payroll batch
