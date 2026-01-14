# Playbook: Database Connectivity Issues

## Overview

This playbook covers diagnosing and resolving PostgreSQL database issues in OrbitPayroll, which uses Prisma ORM.

## Symptoms

- 500 errors on all API calls
- Health check returns unhealthy
- "Connection refused" errors in logs
- Slow queries or timeouts
- Migration failures

---

## Diagnostic Steps

### Step 1: Test Database Connection

```bash
# Test connection using Prisma
cd packages/database
npx prisma db pull

# Or test with psql directly
psql $DATABASE_URL -c "SELECT 1;"
```

### Step 2: Check Connection String

```bash
# Verify DATABASE_URL format (mask password)
echo $DATABASE_URL | sed 's/:\/\/[^:]*:[^@]*@/:\/\/***:***@/'

# Expected format:
# postgresql://user:password@host:port/database?schema=public
```

### Step 3: Check Connection Pool Status

```sql
-- Check active connections
SELECT count(*) as total_connections,
       count(*) FILTER (WHERE state = 'active') as active,
       count(*) FILTER (WHERE state = 'idle') as idle
FROM pg_stat_activity 
WHERE datname = 'orbitpayroll';

-- Check connection limits
SHOW max_connections;

-- See what's using connections
SELECT pid, usename, application_name, client_addr, state, query_start, query
FROM pg_stat_activity
WHERE datname = 'orbitpayroll'
ORDER BY query_start DESC;
```

### Step 4: Check for Locks

```sql
-- Find blocking queries
SELECT blocked_locks.pid AS blocked_pid,
       blocked_activity.usename AS blocked_user,
       blocking_locks.pid AS blocking_pid,
       blocking_activity.usename AS blocking_user,
       blocked_activity.query AS blocked_statement,
       blocking_activity.query AS blocking_statement
FROM pg_catalog.pg_locks blocked_locks
JOIN pg_catalog.pg_stat_activity blocked_activity ON blocked_activity.pid = blocked_locks.pid
JOIN pg_catalog.pg_locks blocking_locks ON blocking_locks.locktype = blocked_locks.locktype
    AND blocking_locks.database IS NOT DISTINCT FROM blocked_locks.database
    AND blocking_locks.relation IS NOT DISTINCT FROM blocked_locks.relation
    AND blocking_locks.page IS NOT DISTINCT FROM blocked_locks.page
    AND blocking_locks.tuple IS NOT DISTINCT FROM blocked_locks.tuple
    AND blocking_locks.virtualxid IS NOT DISTINCT FROM blocked_locks.virtualxid
    AND blocking_locks.transactionid IS NOT DISTINCT FROM blocked_locks.transactionid
    AND blocking_locks.classid IS NOT DISTINCT FROM blocked_locks.classid
    AND blocking_locks.objid IS NOT DISTINCT FROM blocked_locks.objid
    AND blocking_locks.objsubid IS NOT DISTINCT FROM blocked_locks.objsubid
    AND blocking_locks.pid != blocked_locks.pid
JOIN pg_catalog.pg_stat_activity blocking_activity ON blocking_activity.pid = blocking_locks.pid
WHERE NOT blocked_locks.granted;
```

### Step 5: Check Migration Status

```bash
# Check pending migrations
cd packages/database
npx prisma migrate status

# View migration history
npx prisma migrate status --schema=./prisma/schema.prisma
```

---

## Common Causes & Solutions

### 1. Wrong Credentials

**Error:** `authentication failed for user`

**Diagnosis:**
```bash
# Test credentials directly
psql "postgresql://user:password@host:port/database" -c "SELECT 1;"
```

**Solution:**
1. Verify DATABASE_URL in environment
2. Check if password contains special characters (URL encode them)
3. Verify user exists and has correct permissions:
   ```sql
   -- As superuser
   SELECT usename, usesuper FROM pg_user WHERE usename = 'your_user';
   GRANT ALL PRIVILEGES ON DATABASE orbitpayroll TO your_user;
   ```

---

### 2. Network/Firewall Issues

**Error:** `Connection refused` or `Connection timed out`

**Diagnosis:**
```bash
# Test network connectivity
nc -zv $DB_HOST $DB_PORT

# Check if PostgreSQL is listening
# (on database server)
ss -tlnp | grep 5432
```

**Solution:**
1. Check firewall rules allow connection from API server
2. Verify PostgreSQL is configured to accept remote connections:
   ```bash
   # In postgresql.conf
   listen_addresses = '*'
   
   # In pg_hba.conf
   host all all 0.0.0.0/0 md5
   ```
3. Restart PostgreSQL after config changes

---

### 3. Connection Pool Exhaustion

**Error:** `too many connections` or `connection pool timeout`

**Diagnosis:**
```sql
SELECT count(*) FROM pg_stat_activity WHERE datname = 'orbitpayroll';
```

**Solution:**
1. Restart the application to release connections:
   ```bash
   # Railway
   railway restart
   
   # Local
   npm run dev  # Restart the dev server
   ```

2. Increase pool size in Prisma schema:
   ```prisma
   datasource db {
     provider = "postgresql"
     url      = env("DATABASE_URL")
     // Add connection pool settings
   }
   ```

3. Or via connection string:
   ```
   postgresql://user:pass@host:port/db?connection_limit=20&pool_timeout=30
   ```

4. Kill idle connections:
   ```sql
   SELECT pg_terminate_backend(pid) 
   FROM pg_stat_activity 
   WHERE datname = 'orbitpayroll' 
   AND state = 'idle' 
   AND query_start < NOW() - INTERVAL '10 minutes';
   ```

---

### 4. Migrations Pending

**Error:** `The database schema is not in sync with your Prisma schema`

**Diagnosis:**
```bash
npx prisma migrate status
```

**Solution:**
```bash
# Apply pending migrations
npx prisma migrate deploy

# If in development, reset and re-migrate
npx prisma migrate reset  # WARNING: Deletes all data!

# Generate Prisma client after migration
npx prisma generate
```

---

### 5. Schema Drift

**Error:** `Drift detected: Your database schema is not in sync`

**Diagnosis:**
```bash
# Check for drift
npx prisma migrate diff \
  --from-schema-datamodel prisma/schema.prisma \
  --to-schema-datasource prisma/schema.prisma
```

**Solution:**
1. If intentional changes, create a migration:
   ```bash
   npx prisma migrate dev --name describe_changes
   ```

2. If unintentional, reset to schema:
   ```bash
   npx prisma db push --force-reset  # WARNING: Data loss!
   ```

---

### 6. Slow Queries

**Symptoms:** API timeouts, slow page loads

**Diagnosis:**
```sql
-- Find slow queries
SELECT pid, now() - pg_stat_activity.query_start AS duration, query, state
FROM pg_stat_activity
WHERE (now() - pg_stat_activity.query_start) > interval '5 seconds'
AND state != 'idle';

-- Check table sizes
SELECT relname, pg_size_pretty(pg_total_relation_size(relid))
FROM pg_catalog.pg_statio_user_tables
ORDER BY pg_total_relation_size(relid) DESC;

-- Check for missing indexes
SELECT schemaname, relname, seq_scan, seq_tup_read, idx_scan, idx_tup_fetch
FROM pg_stat_user_tables
WHERE seq_scan > idx_scan
ORDER BY seq_tup_read DESC;
```

**Solution:**
1. Add indexes for frequently queried columns
2. Analyze tables:
   ```sql
   ANALYZE;
   ```
3. Check query plans:
   ```sql
   EXPLAIN ANALYZE SELECT * FROM contractors WHERE org_id = 'xxx';
   ```

---

## Running Migrations Manually

### Development

```bash
cd packages/database

# Create a new migration
npx prisma migrate dev --name migration_name

# Apply migrations
npx prisma migrate dev

# Reset database (WARNING: deletes data)
npx prisma migrate reset
```

### Production

```bash
cd packages/database

# Apply pending migrations (safe for production)
npx prisma migrate deploy

# Check status
npx prisma migrate status
```

### Rollback (Manual)

Prisma doesn't support automatic rollback. To rollback:

1. Create a new migration that reverses changes
2. Or restore from backup

```bash
# View migration SQL
cat prisma/migrations/*/migration.sql

# Manually reverse if needed
psql $DATABASE_URL -f rollback.sql
```

---

## Prisma Studio Access

```bash
# Open visual database browser
cd packages/database
npx prisma studio

# Opens at http://localhost:5555
```

Use Prisma Studio to:
- Browse and edit data
- Verify relationships
- Debug data issues

---

## Health Check Queries

```sql
-- Basic connectivity
SELECT 1;

-- Check all tables exist
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public';

-- Verify row counts
SELECT 
  (SELECT count(*) FROM users) as users,
  (SELECT count(*) FROM organizations) as orgs,
  (SELECT count(*) FROM contractors) as contractors,
  (SELECT count(*) FROM payroll_runs) as payroll_runs;
```

---

## Environment Variables

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | Prisma connection string (with pooler) |
| `DIRECT_URL` | Direct connection for migrations |

### Connection String Format

```
postgresql://USER:PASSWORD@HOST:PORT/DATABASE?schema=public&connection_limit=10
```

For Supabase/Neon with connection pooler:
```
# Pooled connection (for app)
DATABASE_URL="postgresql://user:pass@pooler.host:6543/db?pgbouncer=true"

# Direct connection (for migrations)
DIRECT_URL="postgresql://user:pass@direct.host:5432/db"
```

---

## Escalation Path

If database issues persist:

1. Collect:
   - Error messages from logs
   - Connection string (masked)
   - Migration status output
   - Active connection count
   - Recent schema changes

2. Check database provider status page (Supabase, Neon, etc.)

3. Verify database server resources (CPU, memory, disk)

4. Escalate to engineering with collected data
