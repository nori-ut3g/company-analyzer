import { Router, Request, Response } from 'express';
import { sequelize } from '../config/database';
import { redisClient } from '../config/redis';
import { logger } from '../utils/logger';

const router = Router();

interface HealthStatus {
  status: 'healthy' | 'unhealthy';
  timestamp: string;
  uptime: number;
  services: {
    database: {
      status: 'connected' | 'disconnected';
      latency?: number;
    };
    redis: {
      status: 'connected' | 'disconnected';
      latency?: number;
    };
  };
  memory: {
    used: string;
    total: string;
    percentage: number;
  };
}

router.get('/health', async (req: Request, res: Response) => {
  const startTime = Date.now();
  const healthStatus: HealthStatus = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    services: {
      database: { status: 'disconnected' },
      redis: { status: 'disconnected' },
    },
    memory: {
      used: '0 MB',
      total: '0 MB',
      percentage: 0,
    },
  };

  try {
    // Check database connection
    const dbStart = Date.now();
    await sequelize.authenticate();
    healthStatus.services.database = {
      status: 'connected',
      latency: Date.now() - dbStart,
    };
  } catch (error) {
    logger.error('Database health check failed:', error);
    healthStatus.status = 'unhealthy';
    healthStatus.services.database = { status: 'disconnected' };
  }

  try {
    // Check Redis connection
    const redisStart = Date.now();
    await redisClient.ping();
    healthStatus.services.redis = {
      status: 'connected',
      latency: Date.now() - redisStart,
    };
  } catch (error) {
    logger.error('Redis health check failed:', error);
    healthStatus.status = 'unhealthy';
    healthStatus.services.redis = { status: 'disconnected' };
  }

  // Memory usage
  const memoryUsage = process.memoryUsage();
  const totalMemory = memoryUsage.heapTotal;
  const usedMemory = memoryUsage.heapUsed;
  healthStatus.memory = {
    used: `${Math.round(usedMemory / 1024 / 1024)} MB`,
    total: `${Math.round(totalMemory / 1024 / 1024)} MB`,
    percentage: Math.round((usedMemory / totalMemory) * 100),
  };

  const statusCode = healthStatus.status === 'healthy' ? 200 : 503;
  res.status(statusCode).json(healthStatus);
});

router.get('/ready', async (req: Request, res: Response) => {
  try {
    // Check if all services are ready
    await Promise.all([
      sequelize.authenticate(),
      redisClient.ping(),
    ]);

    res.status(200).json({
      status: 'ready',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Readiness check failed:', error);
    res.status(503).json({
      status: 'not ready',
      timestamp: new Date().toISOString(),
    });
  }
});

router.get('/live', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'alive',
    timestamp: new Date().toISOString(),
  });
});

export default router;