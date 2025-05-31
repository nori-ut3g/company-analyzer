import { Router, Request, Response } from 'express';
import { Pool } from 'pg';
import Redis from 'ioredis';
import { config } from '../config';

const router = Router();

// Database pool
const pool = new Pool({
  connectionString: config.database.url
});

// Redis client
const redis = new Redis(config.redis.url);

router.get('/', async (req: Request, res: Response) => {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    services: {
      database: 'unknown',
      redis: 'unknown',
      microservices: {}
    }
  };

  // Check database
  try {
    await pool.query('SELECT 1');
    health.services.database = 'healthy';
  } catch (error) {
    health.services.database = 'unhealthy';
    health.status = 'degraded';
  }

  // Check Redis
  try {
    await redis.ping();
    health.services.redis = 'healthy';
  } catch (error) {
    health.services.redis = 'unhealthy';
    health.status = 'degraded';
  }

  // Check microservices
  const services = ['dataIngestion', 'analysisService', 'reportGenerator', 'authService'];
  for (const service of services) {
    try {
      const response = await fetch(`${config.services[service as keyof typeof config.services]}/health`, {
        method: 'GET',
        timeout: 5000
      });
      health.services.microservices[service] = response.ok ? 'healthy' : 'unhealthy';
      if (!response.ok) health.status = 'degraded';
    } catch (error) {
      health.services.microservices[service] = 'unhealthy';
      health.status = 'degraded';
    }
  }

  const statusCode = health.status === 'healthy' ? 200 : 503;
  res.status(statusCode).json(health);
});

export default router;