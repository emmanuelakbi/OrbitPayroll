/**
 * API Routes Configuration
 */

import type { Express, Request, Response } from 'express';
import { db } from '../lib/db.js';
import { withRpcLogging } from '../lib/blockchain-logger.js';
import authRoutes from './auth.routes.js';
import orgRoutes from './org.routes.js';
import contractorRoutes from './contractor.routes.js';
import payrollRoutes from './payroll.routes.js';
import treasuryRoutes from './treasury.routes.js';
import notificationRoutes from './notification.routes.js';

export function setupRoutes(app: Express): void {
  // Health check endpoints
  app.get('/health', async (_req: Request, res: Response) => {
    const checks: Record<string, { status: string; latency?: number; error?: string }> = {};
    
    // Check database connectivity
    const dbStart = Date.now();
    try {
      await db.$queryRaw`SELECT 1`;
      checks.database = { status: 'ok', latency: Date.now() - dbStart };
    } catch (error) {
      checks.database = { 
        status: 'error', 
        latency: Date.now() - dbStart,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }

    // Check RPC connectivity (optional - only if RPC_URL is configured)
    const rpcUrl = process.env.RPC_URL;
    if (rpcUrl) {
      const rpcStart = Date.now();
      try {
        // Use withRpcLogging for structured logging of RPC health check
        await withRpcLogging(
          'eth_blockNumber',
          async () => {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000);
            
            const response = await fetch(rpcUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                jsonrpc: '2.0',
                method: 'eth_blockNumber',
                params: [],
                id: 1,
              }),
              signal: controller.signal,
            });
            
            clearTimeout(timeoutId);
            
            if (!response.ok) {
              throw new Error(`HTTP ${response.status}`);
            }
            
            return response.json();
          },
          { healthCheck: true },
          { correlationId: 'health-check' }
        );
        
        checks.rpc = { status: 'ok', latency: Date.now() - rpcStart };
      } catch (error) {
        checks.rpc = { 
          status: 'error', 
          latency: Date.now() - rpcStart,
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    }

    const healthy = Object.values(checks).every(c => c.status === 'ok');
    
    res.status(healthy ? 200 : 503).json({
      status: healthy ? 'healthy' : 'unhealthy',
      components: checks,
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
    });
  });

  app.get('/ready', async (_req: Request, res: Response) => {
    try {
      // Check database connectivity
      await db.$queryRaw`SELECT 1`;
      res.json({ status: 'ready', timestamp: new Date().toISOString() });
    } catch {
      res.status(503).json({
        status: 'not_ready',
        timestamp: new Date().toISOString(),
        error: 'Database connection failed',
      });
    }
  });

  // API version prefix
  const apiV1 = '/api/v1';

  // API info endpoint
  app.get(`${apiV1}`, (_req: Request, res: Response) => {
    res.json({
      name: 'OrbitPayroll API',
      version: '1.0.0',
      endpoints: {
        auth: `${apiV1}/auth`,
        orgs: `${apiV1}/orgs`,
        contractors: `${apiV1}/orgs/:id/contractors`,
        payrollRuns: `${apiV1}/orgs/:id/payroll-runs`,
        treasury: `${apiV1}/orgs/:id/treasury`,
        notifications: `${apiV1}/notifications`,
      },
    });
  });

  // Mount route modules
  app.use(`${apiV1}/auth`, authRoutes);
  app.use(`${apiV1}/orgs`, orgRoutes);
  app.use(`${apiV1}/orgs/:id/contractors`, contractorRoutes);
  app.use(`${apiV1}/orgs/:id/payroll-runs`, payrollRoutes);
  app.use(`${apiV1}/orgs/:id/treasury`, treasuryRoutes);
  app.use(`${apiV1}/notifications`, notificationRoutes);

  // 404 handler for unknown routes
  app.use((_req: Request, res: Response) => {
    res.status(404).json({
      code: 'NOT_FOUND',
      message: 'The requested endpoint does not exist',
    });
  });
}
