import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

type HealthStatus = 'ok' | 'error' | 'unknown';

interface HealthCheck {
  status: HealthStatus;
  url?: string;
}

export async function GET() {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  
  const checks: {
    frontend: HealthCheck;
    api: HealthCheck;
  } = {
    frontend: { status: 'ok' },
    api: { status: 'unknown', url: apiUrl || 'not configured' },
  };

  // Check API connectivity if configured
  if (apiUrl) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const response = await fetch(`${apiUrl}/health`, {
        signal: controller.signal,
        cache: 'no-store',
      });
      
      clearTimeout(timeoutId);
      
      checks.api = {
        status: response.ok ? 'ok' : 'error',
        url: apiUrl,
      };
    } catch {
      checks.api = {
        status: 'error',
        url: apiUrl,
      };
    }
  }

  const healthy = checks.frontend.status === 'ok';

  return NextResponse.json(
    {
      status: healthy ? 'healthy' : 'degraded',
      components: checks,
      timestamp: new Date().toISOString(),
      version: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) || 'local',
    },
    { status: healthy ? 200 : 503 }
  );
}
