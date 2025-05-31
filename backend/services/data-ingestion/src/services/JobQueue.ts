import Queue from 'bull'
import { logger } from '../utils/logger'
import { EDINETProcessor } from './EDINETProcessor'

export interface IngestionJobData {
  jobId: string
  filePath: string
  options?: {
    overwrite?: boolean
    validateOnly?: boolean
  }
}

export interface ProcessingJobData {
  jobId: string
  companyId: number
  fiscalYear: number
  fiscalPeriod: string
}

export class JobQueue {
  private ingestionQueue: Queue.Queue<IngestionJobData>
  private processingQueue: Queue.Queue<ProcessingJobData>
  private edinetProcessor: EDINETProcessor

  constructor() {
    const redisConfig = {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
      db: parseInt(process.env.REDIS_DB || '0'),
    }

    this.ingestionQueue = new Queue('edinet-ingestion', { redis: redisConfig })
    this.processingQueue = new Queue('data-processing', { redis: redisConfig })
    this.edinetProcessor = new EDINETProcessor()
  }

  async initialize(): Promise<void> {
    // Configure ingestion queue
    this.ingestionQueue.process('process-edinet-files', 2, async (job) => {
      return this.processIngestionJob(job.data)
    })

    // Configure processing queue
    this.processingQueue.process('calculate-metrics', 5, async (job) => {
      return this.processCalculationJob(job.data)
    })

    // Error handling
    this.ingestionQueue.on('failed', (job, err) => {
      logger.error(`Ingestion job ${job.id} failed:`, err)
    })

    this.processingQueue.on('failed', (job, err) => {
      logger.error(`Processing job ${job.id} failed:`, err)
    })

    // Completed jobs
    this.ingestionQueue.on('completed', (job) => {
      logger.info(`Ingestion job ${job.id} completed successfully`)
    })

    this.processingQueue.on('completed', (job) => {
      logger.info(`Processing job ${job.id} completed successfully`)
    })

    logger.info('Job queues initialized successfully')
  }

  async close(): Promise<void> {
    await Promise.all([
      this.ingestionQueue.close(),
      this.processingQueue.close()
    ])
    logger.info('Job queues closed')
  }

  // Queue getters for Bull Board
  getIngestionQueue(): Queue.Queue<IngestionJobData> {
    return this.ingestionQueue
  }

  getProcessingQueue(): Queue.Queue<ProcessingJobData> {
    return this.processingQueue
  }

  // Add jobs to queues
  async addIngestionJob(data: IngestionJobData): Promise<Queue.Job<IngestionJobData>> {
    return this.ingestionQueue.add('process-edinet-files', data, {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000,
      },
      removeOnComplete: 10,
      removeOnFail: 5,
    })
  }

  async addProcessingJob(data: ProcessingJobData): Promise<Queue.Job<ProcessingJobData>> {
    return this.processingQueue.add('calculate-metrics', data, {
      attempts: 2,
      backoff: {
        type: 'exponential',
        delay: 1000,
      },
      removeOnComplete: 20,
      removeOnFail: 10,
    })
  }

  // Job processors
  private async processIngestionJob(data: IngestionJobData): Promise<any> {
    logger.info(`Starting ingestion job ${data.jobId} for path: ${data.filePath}`)

    try {
      // Update job status to processing
      await this.edinetProcessor.updateJobStatus(data.jobId, 'processing')

      // Process EDINET files
      const result = await this.edinetProcessor.processDirectory(data.filePath, data.jobId, data.options)

      // Update job status to completed
      await this.edinetProcessor.updateJobStatus(data.jobId, 'completed')

      logger.info(`Ingestion job ${data.jobId} completed:`, result)
      return result

    } catch (error) {
      logger.error(`Ingestion job ${data.jobId} failed:`, error)
      
      // Update job status to failed
      await this.edinetProcessor.updateJobStatus(
        data.jobId, 
        'failed', 
        error instanceof Error ? error.message : 'Unknown error'
      )
      
      throw error
    }
  }

  private async processCalculationJob(data: ProcessingJobData): Promise<any> {
    logger.info(`Starting calculation job ${data.jobId} for company ${data.companyId}`)

    try {
      // Calculate financial metrics
      const result = await this.edinetProcessor.calculateFinancialMetrics(
        data.companyId,
        data.fiscalYear,
        data.fiscalPeriod
      )

      logger.info(`Calculation job ${data.jobId} completed`)
      return result

    } catch (error) {
      logger.error(`Calculation job ${data.jobId} failed:`, error)
      throw error
    }
  }

  // Queue status methods
  async getQueueStats(): Promise<any> {
    const [ingestionStats, processingStats] = await Promise.all([
      this.getQueueCounts(this.ingestionQueue),
      this.getQueueCounts(this.processingQueue)
    ])

    return {
      ingestion: ingestionStats,
      processing: processingStats
    }
  }

  private async getQueueCounts(queue: Queue.Queue): Promise<any> {
    const [waiting, active, completed, failed, delayed] = await Promise.all([
      queue.getWaiting(),
      queue.getActive(),
      queue.getCompleted(),
      queue.getFailed(),
      queue.getDelayed()
    ])

    return {
      waiting: waiting.length,
      active: active.length,
      completed: completed.length,
      failed: failed.length,
      delayed: delayed.length
    }
  }

  // Clean up old jobs
  async cleanupJobs(): Promise<void> {
    const oneWeekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000)
    
    await Promise.all([
      this.ingestionQueue.clean(oneWeekAgo, 'completed'),
      this.ingestionQueue.clean(oneWeekAgo, 'failed'),
      this.processingQueue.clean(oneWeekAgo, 'completed'),
      this.processingQueue.clean(oneWeekAgo, 'failed')
    ])

    logger.info('Old jobs cleaned up')
  }
}