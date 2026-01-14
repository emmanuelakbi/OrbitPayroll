# Frontend Deployment Guide

This guide covers deploying the OrbitPayroll frontend to Vercel.

## Prerequisites

- [Vercel account](https://vercel.com/signup)
- GitHub repository connected to Vercel
- Required API keys and environment variables

## Quick Start

### 1. Connect to Vercel

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click "Add New Project"
3. Import your GitHub repository
4. Set the root directory to `apps/web`
5. Framework preset will auto-detect as Next.js

### 2. Configure Environment Variables

In Vercel project settings, add these environment variables:

| Variable | Description | Required |
|----------|-------------|----------|
| `NEXT_PUBLIC_API_URL` | Backend API URL (e.g., `https://api.orbitpayroll.com/api/v1`) | Yes |
| `NEXT_PUBLIC_WC_PROJECT_ID` | WalletConnect Project ID | Yes |
| `NEXT_PUBLIC_RPC_URL` | Ethereum RPC URL (Alchemy/Infura) | Yes |
| `NEXT_PUBLIC_SEPOLIA_RPC_URL` | Sepolia testnet RPC URL | Yes |
| `NEXT_PUBLIC_MNEE_ADDRESS` | MNEE token contract address | Yes |
| `NEXT_PUBLIC_TREASURY_ADDRESS` | Treasury contract address | Yes |
| `NEXT_PUBLIC_NETWORK` | Network name (`sepolia` or `mainnet`) | Yes |
| `NEXT_PUBLIC_USE_MOCK_CONTRACTS` | Use mock contracts (`true`/`false`) | No |

### 3. GitHub Actions Setup

For automatic deployments via GitHub Actions, add these secrets to your repository:

1. Go to Repository Settings → Secrets and variables → Actions
2. Add the following secrets:

| Secret | Description | How to Get |
|--------|-------------|------------|
| `VERCEL_TOKEN` | Vercel API token | [Vercel Tokens](https://vercel.com/account/tokens) |
| `VERCEL_ORG_ID` | Vercel organization ID | `vercel whoami` or project settings |
| `VERCEL_PROJECT_ID` | Vercel project ID | `.vercel/project.json` after linking |

### 4. Link Project Locally (Optional)

```bash
cd apps/web
npx vercel link
```

This creates `.vercel/project.json` with your project configuration.

## Deployment Workflows

### Automatic Deployments

- **Production**: Merges to `main` branch trigger production deployments
- **Preview**: Pull requests get preview deployments with unique URLs

### Manual Deployment

```bash
# Preview deployment
cd apps/web
npx vercel

# Production deployment
npx vercel --prod
```

## Configuration Files

### vercel.json

The `vercel.json` file configures:
- Security headers (X-Frame-Options, CSP, etc.)
- CDN caching for static assets
- Health check endpoint rewrite

### Environment-Specific Settings

Vercel automatically sets these variables:
- `VERCEL=1` - Indicates Vercel environment
- `VERCEL_ENV` - `production`, `preview`, or `development`
- `VERCEL_URL` - Deployment URL
- `VERCEL_GIT_COMMIT_SHA` - Git commit hash

## Health Check

The frontend exposes a health endpoint at `/health` that:
- Returns frontend status
- Checks API connectivity (if configured)
- Returns version info from git commit

```bash
curl https://your-app.vercel.app/health
```

Response:
```json
{
  "status": "healthy",
  "components": {
    "frontend": { "status": "ok" },
    "api": { "status": "ok", "url": "https://api.example.com" }
  },
  "timestamp": "2026-01-13T12:00:00.000Z",
  "version": "abc1234"
}
```

## Troubleshooting

### Build Failures

1. Check build logs in Vercel dashboard
2. Ensure all dependencies are in `package.json`
3. Verify environment variables are set

### Environment Variables Not Working

- Variables prefixed with `NEXT_PUBLIC_` are exposed to the browser
- Non-prefixed variables are server-side only
- Redeploy after changing environment variables

### Preview Deployments Not Appearing

1. Check GitHub Actions workflow status
2. Verify `VERCEL_TOKEN` secret is set
3. Ensure PR is targeting `main` or `develop` branch

## Custom Domain

1. Go to Vercel project settings → Domains
2. Add your custom domain
3. Configure DNS records as instructed
4. SSL certificate is automatically provisioned

## Performance Optimization

The deployment is configured with:
- Static asset caching (1 year for `/_next/static/`)
- Security headers on all routes
- Regional deployment (US East by default)

To change region, update `regions` in `vercel.json`.
