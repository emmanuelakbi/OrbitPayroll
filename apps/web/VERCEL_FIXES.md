# Vercel Deployment Fixes

## Critical: WalletConnect Project ID Required

Before deploying to Vercel, ensure you have set the `NEXT_PUBLIC_WC_PROJECT_ID` environment variable in your Vercel project settings.

**Get your Project ID:**
1. Go to [WalletConnect Cloud](https://cloud.walletconnect.com)
2. Create a new project (or use existing)
3. Copy the Project ID
4. Add to Vercel: Project Settings → Environment Variables → `NEXT_PUBLIC_WC_PROJECT_ID`

Without this, wallet connections (MetaMask, WalletConnect, etc.) will fail.

## Issues Resolved

### 1. Module not found: 'encoding'
**Error**: `Module not found: Can't resolve 'encoding'`

**Fix**: Added `encoding` package as a dependency. This is required by some Web3 libraries but marked as optional.

### 2. Module not found: 'pino-pretty'
**Error**: `Module not found: Can't resolve 'pino-pretty'`

**Fix**: Added `pino-pretty` package as a dependency. Used by WalletConnect logger.

### 3. indexedDB is not defined
**Error**: `ReferenceError: indexedDB is not defined`

**Fix**: Created SSR polyfill in `src/lib/polyfills.ts` that provides a stub `indexedDB` object during server-side rendering. Imported in root layout.

## Configuration Changes

### next.config.mjs
- Added webpack fallback configuration to ignore optional Node.js modules
- Externalized optional dependencies for server-side builds
- Prevents bundling issues with Web3 libraries

### package.json
- Added `encoding@^0.1.13`
- Added `pino-pretty@^11.0.0`

## Deployment Checklist

Before deploying to Vercel:
1. ✅ Install dependencies: `npm install`
2. ✅ Test build locally: `npm run build`
3. ✅ Verify no build errors
4. Push to repository
5. Vercel will auto-deploy

## Testing Locally

```bash
cd apps/web
npm run build
npm start
```

Visit http://localhost:3000 to verify the build works correctly.
