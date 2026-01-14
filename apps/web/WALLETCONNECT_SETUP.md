# WalletConnect Setup for Vercel Deployment

## Why This Matters

WalletConnect is required for:
- Mobile wallet connections (Trust Wallet, Rainbow, etc.)
- WalletConnect protocol support
- Proper wallet discovery and pairing

Without a valid project ID, users will see connection errors when trying to connect wallets.

## Current Configuration

The app is configured to use `NEXT_PUBLIC_WC_PROJECT_ID` from environment variables.

**Location**: `apps/web/src/lib/wagmi.ts`
```typescript
const wcProjectId = process.env.NEXT_PUBLIC_WC_PROJECT_ID || "demo";
```

⚠️ **Warning**: The fallback `"demo"` is NOT a valid project ID and will cause failures in production.

## Setup Steps

### 1. Get Your WalletConnect Project ID

1. Visit [WalletConnect Cloud](https://cloud.walletconnect.com)
2. Sign in or create an account
3. Click "Create New Project"
4. Fill in project details:
   - **Project Name**: OrbitPayroll
   - **Homepage URL**: Your production URL (e.g., `https://orbitpayroll.vercel.app`)
5. Copy the **Project ID** (format: `xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`)

### 2. Add to Vercel Environment Variables

1. Go to your Vercel project dashboard
2. Navigate to **Settings** → **Environment Variables**
3. Add new variable:
   - **Key**: `NEXT_PUBLIC_WC_PROJECT_ID`
   - **Value**: Your WalletConnect Project ID
   - **Environment**: Select all (Production, Preview, Development)
4. Click **Save**

### 3. Redeploy

After adding the environment variable:
- Vercel will automatically redeploy
- Or manually trigger: **Deployments** → **...** → **Redeploy**

### 4. Verify

Test wallet connections:
1. Visit your deployed app
2. Click "Connect Wallet"
3. Try connecting with:
   - MetaMask (browser extension)
   - WalletConnect (mobile wallets)
   - Coinbase Wallet

## Local Development

For local development, create `apps/web/.env.local`:

```bash
NEXT_PUBLIC_WC_PROJECT_ID=your_project_id_here
NEXT_PUBLIC_API_URL=http://localhost:3001/api/v1
NEXT_PUBLIC_RPC_URL=https://sepolia.infura.io/v3/YOUR_INFURA_KEY
NEXT_PUBLIC_SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/YOUR_INFURA_KEY
NEXT_PUBLIC_MNEE_ADDRESS=0x8ccedbAe4916b79da7F3F612EfB2EB93A2bFD6cF
NEXT_PUBLIC_NETWORK=sepolia
```

## Troubleshooting

### "Invalid Project ID" Error

**Symptom**: Wallet connection fails with invalid project ID error

**Solution**: 
- Verify the project ID is correct (32 character hex string)
- Check it's set in Vercel environment variables
- Redeploy after adding the variable

### WalletConnect Modal Doesn't Open

**Symptom**: Clicking WalletConnect does nothing

**Solution**:
- Check browser console for errors
- Verify `NEXT_PUBLIC_WC_PROJECT_ID` is set
- Clear browser cache and try again

### Mobile Wallets Can't Connect

**Symptom**: QR code doesn't work or pairing fails

**Solution**:
- Ensure project ID is valid
- Check WalletConnect Cloud dashboard for connection logs
- Verify your app URL is whitelisted in WalletConnect project settings

## WalletConnect Cloud Dashboard

Monitor your connections:
- Visit [WalletConnect Cloud Dashboard](https://cloud.walletconnect.com)
- View connection statistics
- Check error logs
- Monitor usage limits

## Free Tier Limits

WalletConnect free tier includes:
- **1 million requests/month**
- Unlimited projects
- Basic analytics

This is sufficient for most demo/MVP deployments.

## Security Notes

- Project ID is public (safe to expose in frontend)
- No sensitive data in WalletConnect project ID
- Can be committed to version control if needed
- Rotate if compromised (update in Vercel settings)

---

**Next Steps**: After setting up WalletConnect, test all wallet connection flows before demo.
