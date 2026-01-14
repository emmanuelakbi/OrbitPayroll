# Database Deployment Guide

This guide covers deploying OrbitPayroll's PostgreSQL database to managed providers (Supabase or Railway).

## Overview

OrbitPayroll uses PostgreSQL with Prisma ORM. For production, we recommend:
- **Supabase** (free tier available, built-in connection pooling)
- **Railway** (simple setup, automatic backups)

## Option 1: Supabase (Recommended)

### 1. Create Project

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Click "New Project"
3. Fill in:
   - **Name**: `orbitpayroll-prod` (or your preferred name)
   - **Database Password**: Generate a strong password (save this!)
   - **Region**: Choose closest to your users
   - **Pricing Plan**: Free tier works for hackathon

### 2. Get Connection Strings

After project creation, go to **Settings → Database**:

#### Direct Connection (for migrations)
```
postgresql://postgres.[PROJECT_REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:5432/postgres
```

#### Pooled Connection (for application - recommended)
```
postgresql://postgres.[PROJECT_REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?pgbouncer=true
```

### 3. Configure Connection Pooling

Supabase uses PgBouncer for connection pooling. For Prisma compatibility:

1. Go to **Settings → Database → Connection Pooling**
2. Ensure "Transaction" mode is selected (default)
3. Use port `6543` for pooled connections

### 4. SSL Configuration

Supabase enforces SSL by default. Add to your connection string:
```
?sslmode=require
```

Full example:
```
postgresql://postgres.[REF]:[PASS]@aws-0-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true&sslmode=require
```

### 5. Environment Variables

Update your `.env` files:

```bash
# packages/database/.env
DATABASE_URL="postgresql://postgres.[REF]:[PASS]@aws-0-[REGION].pooler.supabase.com:6543/postgres?pgbouncer=true&sslmode=require"

# For migrations (direct connection without pooler)
DIRECT_URL="postgresql://postgres.[REF]:[PASS]@aws-0-[REGION].pooler.supabase.com:5432/postgres?sslmode=require"
```

---

## Option 2: Railway

### 1. Create Project

1. Go to [Railway Dashboard](https://railway.app/dashboard)
2. Click "New Project" → "Provision PostgreSQL"
3. Railway automatically creates a PostgreSQL instance

### 2. Get Connection String

1. Click on the PostgreSQL service
2. Go to **Variables** tab
3. Copy `DATABASE_URL`

Railway format:
```
postgresql://postgres:[PASSWORD]@[HOST].railway.app:5432/railway
```

### 3. Connection Pooling

Railway doesn't include built-in pooling. For production, consider:
- Using Prisma's connection pool settings
- Adding PgBouncer as a separate service

Configure Prisma connection pool in `schema.prisma`:
```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

And set pool size via URL parameter:
```
postgresql://...?connection_limit=10
```

### 4. SSL Configuration

Railway enforces SSL. Add to connection string:
```
?sslmode=require
```

### 5. Automatic Backups

Railway provides automatic daily backups on paid plans. For free tier:
- Use `pg_dump` for manual backups
- Consider upgrading for production use

---

## Prisma Configuration

### Update schema.prisma for Production

```prisma
// packages/database/prisma/schema.prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")  // For migrations (Supabase)
}
```

### Run Migrations

```bash
# From packages/database directory
cd packages/database

# Generate Prisma client
npm run db:generate

# Run migrations against production database
npx prisma migrate deploy

# Verify migration status
npx prisma migrate status
```

---

## Environment Variable Setup

### Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | Pooled connection string | `postgresql://...?pgbouncer=true&sslmode=require` |
| `DIRECT_URL` | Direct connection (Supabase only) | `postgresql://...?sslmode=require` |

### Platform Configuration

#### Vercel (Frontend)
Not needed - frontend doesn't connect directly to database.

#### Railway (Backend)
1. Go to your API service
2. Click **Variables**
3. Add `DATABASE_URL` with your connection string

#### Docker/Self-hosted
Set in `.env` file or container environment variables.

---

## Security Best Practices

### 1. Never Commit Secrets
- Add `.env` to `.gitignore` (already configured)
- Use platform secrets management

### 2. Use Connection Pooling
- Prevents connection exhaustion
- Required for serverless environments
- Supabase: Use port 6543
- Railway: Configure Prisma pool settings

### 3. Enable SSL
- Always use `sslmode=require`
- Both Supabase and Railway enforce SSL

### 4. Restrict Network Access
- Supabase: Configure allowed IPs in dashboard
- Railway: Uses private networking by default

### 5. Regular Backups
- Supabase: Automatic daily backups (Pro plan)
- Railway: Automatic backups (paid plans)
- Manual: `pg_dump` for critical data

---

## Troubleshooting

### Connection Timeout
```
Error: Connection timed out
```
**Solution**: Check if your IP is allowed, verify SSL settings.

### Too Many Connections
```
Error: too many connections for role
```
**Solution**: Use connection pooling, reduce `connection_limit`.

### SSL Required
```
Error: SSL connection is required
```
**Solution**: Add `?sslmode=require` to connection string.

### Migration Fails with Pooler
```
Error: prepared statement already exists
```
**Solution**: Use `DIRECT_URL` for migrations (Supabase).

### Prisma Client Not Generated
```
Error: @prisma/client did not initialize
```
**Solution**: Run `npx prisma generate` after installing dependencies.

---

## Quick Setup Checklist

- [ ] Create database on Supabase or Railway
- [ ] Copy connection string (pooled for app, direct for migrations)
- [ ] Add `?sslmode=require` to connection string
- [ ] Update `DATABASE_URL` in deployment platform
- [ ] Update `DIRECT_URL` if using Supabase
- [ ] Run `npx prisma migrate deploy`
- [ ] Verify with `npx prisma migrate status`
- [ ] Test API health endpoint

---

## Demo Environment Setup

For hackathon demo:

1. **Create Supabase project** (free tier)
2. **Run migrations**:
   ```bash
   cd packages/database
   DATABASE_URL="your-connection-string" npx prisma migrate deploy
   ```
3. **Seed demo data**:
   ```bash
   DATABASE_URL="your-connection-string" npx prisma db seed
   ```
4. **Configure backend** with production DATABASE_URL
5. **Verify** via health endpoint: `GET /health`
