# Design Document: OrbitPayroll DevOps & Deployment

## Overview

OrbitPayroll uses containerized deployment with automated CI/CD pipelines for consistent, reproducible deployments suitable for hackathon demonstration.

## Deployment Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              GitHub                                      │
│                         (Source Control)                                 │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ Push/PR
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                          GitHub Actions                                  │
│                    (CI/CD Pipeline)                                      │
│  - Lint & Type Check                                                    │
│  - Run Tests                                                            │
│  - Build & Deploy                                                       │
└─────────────────────────────────────────────────────────────────────────┘
           │                    │                    │
           ▼                    ▼                    ▼
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│     Vercel      │  │    Railway      │  │   Supabase      │
│   (Frontend)    │  │   (Backend)     │  │   (Database)    │
└─────────────────┘  └─────────────────┘  └─────────────────┘
```

## Dockerfile

```dockerfile
# apps/backend/Dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build
RUN npx prisma generate

FROM node:20-alpine AS runner
WORKDIR /app
RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/package.json ./
USER nodejs
EXPOSE 3000
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main.js"]
```

## GitHub Actions Workflow

```yaml
# .github/workflows/ci.yml
name: CI/CD
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npm run lint
      - run: npm run type-check
      - run: npm test

  deploy-frontend:
    needs: test
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          vercel-args: '--prod'
```

## Health Check Endpoint

```typescript
// routes/health.ts
app.get('/health', async (req, res) => {
  const checks = {
    database: await checkDatabase(),
    rpc: await checkRpc(),
  };
  
  const healthy = Object.values(checks).every(c => c.status === 'ok');
  
  res.status(healthy ? 200 : 503).json({
    status: healthy ? 'healthy' : 'unhealthy',
    components: checks,
    timestamp: new Date().toISOString(),
  });
});
```

## Correctness Properties

### Property 1: Health Check Accuracy
*For any* health check request, the response SHALL accurately reflect database and RPC connectivity status.

**Validates: Requirements 7.1, 7.2, 7.3, 7.4, 7.5**

### Property 2: Migration Safety
*For any* deployment, database migrations SHALL run before the application starts accepting requests.

**Validates: Requirements 1.7**

## Environment Variables

```bash
# Required
DATABASE_URL=postgresql://...
JWT_SECRET=...
NEXT_PUBLIC_RPC_URL=...
NEXT_PUBLIC_MNEE_ADDRESS=0x8ccedbAe4916b79da7F3F612EfB2EB93A2bFD6cF

# Optional
SENDGRID_API_KEY=...
SENTRY_DSN=...
```
