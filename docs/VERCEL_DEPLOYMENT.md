# Vercel Frontend Deployment Guide

This guide covers deploying the OrbitPayroll frontend to Vercel.

## Prerequisites

- [Vercel account](https://vercel.com/signup)
- GitHub repository connected
- Backend API deployed (Railway)
- WalletConnect Project ID

## Quick Start

### 1. Import Project

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click "Add New" → "Project"
3. Import from GitHub
4. Select the OrbitPayroll repository

### 2. Configure Project

| Setting | Value |
|---------|-------|
| Framework Preset | Next.js |
| Root Directory | `apps/web` |
| Build Command | `npm run build` |
| Output Directory | `.next` |
| Install Command | `npm install` |

### 3. Environment Variables

Add these in Vercel project settings → Environment Variables:

| Variable | Value | Required |
|----------|-------|----------|
| `NEXT_PUBLIC_API_URL` | `https://orbitpayroll-api.railway.app/api/v1` | Yes |
| `NEXT_PUBLIC_WC_PROJECT_ID` | Your WalletConnect Project ID | Yes |
| `NEXT_PUBLIC_RPC_URL` | Alchemy/Infura mainnet URL | Yes |
| `NEXT_PUBLIC_SEPOLIA_RPC_URL` | Alchemy/Infura Sepolia URL | Yes |
| `NEXT_PUBLIC_MNEE_ADDRESS` | `0x8ccedbAe4916b79da7F3F612EfB2EB93A2bFD6cF` | Yes |
| `NEXT_PUBLIC_TREASURY_ADDRESS` | `0xA6f85Ad3CC0E251624F066052172e76e6edF2380` | Yes |
| `NEXT_PUBLIC_NETWORK` | `sepolia` | Yes |
| `NEXT_PUBLIC_USE_MOCK_CONTRACTS` | `false` | No |

### 4. Get WalletConnect Project ID

1. Go to [WalletConnect Cloud](https://cloud.walletconnect.com)
2. Create a new project
3. Copy the Project ID

### 5. Deploy

Click "Deploy" - Vercel handles the rest.

## Automatic Deployments

- **Production**: Pushes to `main` branch
- **Preview**: Pull requests get unique preview URLs

## Custom Domain

1. Go to Project Settings → Domains
2. Add your domain (e.g., `orbitpayroll.xyz`)
3. Configure DNS as instructed
4. SSL is automatic

## Vercel Configuration

The `apps/web/vercel.json` is pre-configured with:

- Security headers (X-Frame-Options, CSP, etc.)
- Static asset caching
- Health check endpoint

## Deployment URLs

| Environment | URL Pattern |
|-------------|-------------|
| Production | `https://orbitpayroll.vercel.app` |
| Preview | `https://orbitpayroll-{hash}.vercel.app` |
| Branch | `https://orbitpayroll-{branch}.vercel.app` |

## Health Check

Verify deployment:

```bash
curl https://orbitpayroll.vercel.app/health
```

Expected response:
```json
{
  "status": "healthy",
  "components": {
    "frontend": { "status": "ok" },
    "api": { "status": "ok" }
  }
}
```

## Troubleshooting

### Build Fails

1. Check build logs in Vercel dashboard
2. Ensure environment variables are set
3. Verify `next.config.mjs` is valid

### Environment Variables Not Working

- Variables must be prefixed with `NEXT_PUBLIC_` for client-side access
- Redeploy after changing variables
- Check for typos in variable names

### API Connection Issues

1. Verify `NEXT_PUBLIC_API_URL` is correct
2. Check CORS settings on backend
3. Ensure API is deployed and healthy

### Wallet Connection Issues

1. Verify `NEXT_PUBLIC_WC_PROJECT_ID` is set
2. Check WalletConnect dashboard for errors
3. Ensure RPC URLs are valid

## Performance Optimization

The deployment includes:

- Static asset caching (1 year for `/_next/static/`)
- Security headers on all routes
- Regional deployment (US East - iad1)

## Cost Estimation

Vercel pricing:
- **Hobby**: Free (100GB bandwidth)
- **Pro**: $20/month (1TB bandwidth)

Demo usage typically stays within free tier.

---

**After Deployment**: Update `DEMO.md` and `README.md` with actual URLs.
