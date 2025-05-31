import { Router, Request, Response } from 'express'
import { asyncHandler } from '../middleware/errorHandler'
import { DatabaseService } from '../services/DatabaseService'

const router = Router()
const databaseService = new DatabaseService()

router.get('/', asyncHandler(async (req: Request, res: Response) => {
  try {
    // Check database connection
    await databaseService.query('SELECT 1')
    
    res.json({
      status: 'healthy',
      service: 'data-ingestion',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.npm_package_version || '1.0.0',
      checks: {
        database: 'healthy'
      }
    })
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      service: 'data-ingestion',
      timestamp: new Date().toISOString(),
      checks: {
        database: 'unhealthy'
      },
      error: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}))

router.get('/database', asyncHandler(async (req: Request, res: Response) => {
  try {
    const result = await databaseService.query('SELECT version()')
    res.json({
      status: 'healthy',
      database: {
        version: result.rows[0].version,
        connected: true
      }
    })
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      database: {
        connected: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    })
  }
}))

export default router