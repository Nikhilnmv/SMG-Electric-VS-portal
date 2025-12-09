import { Request, Response } from 'express';
import { prisma } from '../lib/db';

/**
 * Health check endpoint - basic liveness check
 * Used by container orchestration to determine if container is running
 */
export async function healthCheck(req: Request, res: Response) {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
  });
}

/**
 * Readiness check endpoint - checks if service is ready to accept traffic
 * Checks database connectivity
 */
export async function readinessCheck(req: Request, res: Response) {
  try {
    // Check database connectivity
    await prisma.$queryRaw`SELECT 1`;
    
    res.status(200).json({
      status: 'ready',
      timestamp: new Date().toISOString(),
      checks: {
        database: 'ok',
      },
    });
  } catch (error) {
    console.error('Readiness check failed:', error);
    res.status(503).json({
      status: 'not ready',
      timestamp: new Date().toISOString(),
      checks: {
        database: 'failed',
      },
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

