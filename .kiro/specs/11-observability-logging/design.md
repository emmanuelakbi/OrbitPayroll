# Design Document: OrbitPayroll Observability & Logging

## Overview

OrbitPayroll implements structured logging with correlation IDs for request tracing, audit logging for compliance, and health endpoints for monitoring.

## Logging Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          Application                                     │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                     │
│  │  Request    │  │   Error     │  │   Audit     │                     │
│  │  Logger     │  │   Logger    │  │   Logger    │                     │
│  └─────────────┘  └─────────────┘  └─────────────┘                     │
│         │                │                │                             │
│         └────────────────┼────────────────┘                             │
│                          ▼                                              │
│                   ┌─────────────┐                                       │
│                   │   Logger    │                                       │
│                   │   (pino)    │                                       │
│                   └─────────────┘                                       │
└─────────────────────────────────────────────────────────────────────────┘
                          │
                          ▼ stdout (JSON)
┌─────────────────────────────────────────────────────────────────────────┐
│                    Platform Logging                                      │
│              (Vercel/Railway/CloudWatch)                                │
└─────────────────────────────────────────────────────────────────────────┘
```

## Logger Implementation

```typescript
// lib/logger.ts
import pino from 'pino';

export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  formatters: {
    level: (label) => ({ level: label }),
  },
  timestamp: pino.stdTimeFunctions.isoTime,
});

// Request logging middleware
export function requestLogger(req, res, next) {
  const correlationId = req.headers['x-correlation-id'] || crypto.randomUUID();
  req.correlationId = correlationId;
  
  const start = Date.now();
  
  res.on('finish', () => {
    logger.info({
      correlationId,
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      durationMs: Date.now() - start,
      userId: req.user?.id,
    });
  });
  
  next();
}
```

## Log Format

```json
{
  "level": "info",
  "time": "2024-01-15T10:30:00.000Z",
  "correlationId": "abc-123",
  "method": "POST",
  "path": "/api/v1/orgs/123/payroll-runs",
  "statusCode": 201,
  "durationMs": 45,
  "userId": "user-456",
  "orgId": "org-123"
}
```

## Audit Events

```typescript
// Audit event types
type AuditEvent = 
  | 'user.login'
  | 'user.logout'
  | 'org.created'
  | 'contractor.created'
  | 'contractor.updated'
  | 'contractor.archived'
  | 'payroll.executed';

async function logAuditEvent(event: AuditEvent, payload: object) {
  await prisma.event.create({
    data: {
      eventType: event,
      payload,
      userId: context.userId,
      orgId: context.orgId,
    },
  });
}
```

## Correctness Properties

### Property 1: Correlation ID Propagation
*For any* request, the correlation ID SHALL be included in all log entries for that request.

**Validates: Requirements 1.3**

### Property 2: Audit Completeness
*For any* security-relevant action, an audit event SHALL be created in the events table.

**Validates: Requirements 5.1, 5.2, 5.3, 5.4, 5.5**

## Health Endpoint

```typescript
app.get('/health', async (req, res) => {
  const dbOk = await prisma.$queryRaw`SELECT 1`.then(() => true).catch(() => false);
  const rpcOk = await publicClient.getBlockNumber().then(() => true).catch(() => false);
  
  res.status(dbOk && rpcOk ? 200 : 503).json({
    status: dbOk && rpcOk ? 'healthy' : 'unhealthy',
    components: { database: dbOk ? 'ok' : 'error', rpc: rpcOk ? 'ok' : 'error' },
    timestamp: new Date().toISOString(),
  });
});
```
