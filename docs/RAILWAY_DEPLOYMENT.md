# Railway Backend Deployment Guide

This guide covers deploying the OrbitPayroll API backend to Railway.

## Prerequisites

- [Railway account](https://railway.app)
- GitHub repository connected
- PostgreSQL database (Railway or Supabase)
- Environment variables ready

## Quick Start

### 1. Create Railway Project

1. Go to [Railway Dashboard](https://railway.app/dashboard)
2. Click "New Project"
3. Select "Deploy from GitHub repo"
4. Choose the OrbitPayroll repository
5. Railway will auto-detect the monorepo structure

### 2. Configure Service

In Railway project settings:

1. **Root Directory**: Set to `apps/api`
2. **Build Command**: `npm run build`
3. **Start Command**: `npm run start`
4. **Watch Paths**: `apps/api/**`, `packages/**`

### 3. Add PostgreSQL (Optional)

If not using external database:

1. Click "New" → "Database" → "PostgreSQL"
2. Railway auto-injects `DATABASE_URL`

### 4. Configure Environment Variables

Add these environment variables in Railway:

| Variable | Value | Required |
|----------|-------|----------|
| `DATABASE_URL` | PostgreSQL connection string | Yes |
| `JWT_SECRET` | Secure 32+ character secret | Yes |
| `NODE_ENV` | `production` | Yes |
| `PORT` | `3001` | Yes |
| `HOST` | `0.0.0.0` | Yes |
| `CORS_ORIGINS` | `https://orbitpayroll.vercel.app` | Yes |
| `RPC_URL` | Alchemy/Infura Sepolia URL | Yes |
| `CHAIN_ID` | `11155111` | Yes |
| `MNEE_TOKEN_ADDRESS` | `0x8ccedbAe4916b79da7F3F612EfB2EB93A2bFD6cF` | Yes |

#### Generate JWT Secret

```bash
openssl rand -hex 32
```

### 5. Deploy

Railway automatically deploys on push to main branch.

For manual deployment:
```bash
railway up
```

### 6. Verify Deployment

Check the health endpoint:

```bash
curl https://your-app.railway.app/health
```

Expected response:
```json
{
  "status": "healthy",
  "timestamp": "2026-01-14T...",
  "components": {
    "database": { "status": "ok" },
    "blockchain": { "status": "ok" }
  }
}
```

## Railway Configuration File

Create `railway.json` in repository root (optional):

```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "NIXPACKS"
  },
  "deploy": {
    "startCommand": "cd apps/api && npm run start",
    "healthcheckPath": "/health",
    "healthcheckTimeout": 30,
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 3
  }
}
```

## Database Migrations

Railway runs migrations automatically via the Dockerfile CMD.

For manual migrations:

```bash
# Connect to Railway shell
railway run npx prisma migrate deploy
```

## Monitoring

### View Logs

```bash
railway logs
```

Or in Railway Dashboard → Project → Deployments → Logs

### Health Check

Railway automatically monitors `/health` endpoint.

## Troubleshooting

### Build Fails

1. Check build logs in Railway dashboard
2. Ensure all workspace dependencies are listed
3. Verify `tsconfig.json` paths are correct

### Database Connection Issues

1. Verify `DATABASE_URL` format
2. Check if database is running
3. Ensure SSL mode is correct for production

### CORS Errors

1. Verify `CORS_ORIGINS` includes frontend URL
2. Check for trailing slashes
3. Ensure protocol (https) is correct

## Environment-Specific URLs

| Environment | API URL |
|-------------|---------|
| Production | `https://orbitpayroll-api.railway.app` |
| Preview | `https://orbitpayroll-api-pr-{number}.railway.app` |

## Cost Estimation

Railway pricing (as of 2026):
- **Hobby Plan**: $5/month (includes $5 credit)
- **Pro Plan**: Usage-based (~$10-20/month for typical API)

Estimated usage for demo:
- CPU: ~0.1 vCPU average
- Memory: ~256MB
- Bandwidth: ~1GB/month

---

**Note**: Update the frontend `NEXT_PUBLIC_API_URL` after deployment.
