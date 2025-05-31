import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import dotenv from 'dotenv'
import path from 'path'
import { createBullBoard } from '@bull-board/api'
import { BullAdapter } from '@bull-board/api/bullAdapter'
import { ExpressAdapter } from '@bull-board/express'
import { errorHandler } from './middleware/errorHandler'
import { requestLogger } from './middleware/requestLogger'
import { DatabaseService } from './services/DatabaseService'
import { JobQueue } from './services/JobQueue'
import healthRoutes from './routes/health'
import ingestionRoutes from './routes/ingestion'
import { logger } from './utils/logger'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 3005

// Initialize services
const databaseService = new DatabaseService()
const jobQueue = new JobQueue()

// Bull Dashboard
const serverAdapter = new ExpressAdapter()
serverAdapter.setBasePath('/admin/queues')

// Middleware
app.use(helmet())
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:3002', 'http://localhost:3003'],
  credentials: true
}))
app.use(express.json({ limit: '50mb' }))
app.use(express.urlencoded({ extended: true, limit: '50mb' }))
app.use(requestLogger)

// Routes
app.use('/health', healthRoutes)
app.use('/api/ingestion', ingestionRoutes)

// Error handling
app.use(errorHandler)

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully')
  await databaseService.disconnect()
  await jobQueue.close()
  process.exit(0)
})

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully')
  await databaseService.disconnect()
  await jobQueue.close()
  process.exit(0)
})

async function startServer() {
  try {
    // Initialize database
    await databaseService.connect()
    logger.info('Database connected successfully')
    
    // Initialize job queue
    await jobQueue.initialize()
    logger.info('Job queue initialized successfully')

    // Bull Dashboard setup after queue initialization
    const { addQueue, removeQueue, setQueues, replaceQueues } = createBullBoard({
      queues: [
        new BullAdapter(jobQueue.getIngestionQueue()),
        new BullAdapter(jobQueue.getProcessingQueue())
      ],
      serverAdapter: serverAdapter,
    })

    // Bull Dashboard
    app.use('/admin/queues', serverAdapter.getRouter())
    
    app.listen(PORT, () => {
      logger.info(`Data Ingestion Service running on port ${PORT}`)
      logger.info(`Bull Dashboard available at http://localhost:${PORT}/admin/queues`)
    })
  } catch (error) {
    logger.error('Failed to start server:', error)
    process.exit(1)
  }
}

startServer()