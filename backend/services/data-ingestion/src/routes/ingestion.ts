import { Router, Request, Response } from 'express'
import { v4 as uuidv4 } from 'uuid'
import path from 'path'
import { asyncHandler, createError } from '../middleware/errorHandler'
import { JobQueue } from '../services/JobQueue'
import { DatabaseService } from '../services/DatabaseService'
import { StockDataImporter } from '../services/StockDataImporter'
import { UpdateCompanyNames } from '../services/UpdateCompanyNames'
import { SetSecuritiesCode } from '../services/SetSecuritiesCode'
import { logger } from '../utils/logger'

const router = Router()
const jobQueue = new JobQueue()
const databaseService = new DatabaseService()

// Start ingestion for a specific directory
router.post('/start', asyncHandler(async (req: Request, res: Response) => {
  const { directoryPath, options = {} } = req.body

  if (!directoryPath) {
    throw createError('Directory path is required', 400)
  }

  // Generate job ID
  const jobId = uuidv4()

  // Create job record in database
  await databaseService.createIngestionJob(jobId, directoryPath)

  // Add job to queue
  const job = await jobQueue.addIngestionJob({
    jobId,
    filePath: directoryPath,
    options
  })

  logger.info(`Ingestion job started: ${jobId} for path: ${directoryPath}`)

  res.json({
    success: true,
    data: {
      jobId,
      directoryPath,
      queueJobId: job.id,
      status: 'queued'
    }
  })
}))

// Start ingestion for a specific year
router.post('/ingest/:year', asyncHandler(async (req: Request, res: Response) => {
  const { year } = req.params
  const { options = {} } = req.body

  // Validate year
  const yearNum = parseInt(year)
  if (isNaN(yearNum) || yearNum < 2000 || yearNum > new Date().getFullYear()) {
    throw createError('Invalid year. Must be between 2000 and current year.', 400)
  }

  // Construct directory path
  const directoryPath = path.join(
    process.env.EDINET_DATA_PATH || '/Users/nori/claude-project/company-analyzer/resource/EDINET',
    year,
    'files'
  )

  // Generate job ID
  const jobId = uuidv4()

  // Create job record in database
  await databaseService.createIngestionJob(jobId, directoryPath)

  // Add job to queue
  const job = await jobQueue.addIngestionJob({
    jobId,
    filePath: directoryPath,
    options
  })

  logger.info(`Year ingestion job started: ${jobId} for year: ${year}`)

  res.json({
    success: true,
    data: {
      jobId,
      year,
      directoryPath,
      queueJobId: job.id,
      status: 'queued'
    }
  })
}))

// Ingest all available years
router.post('/ingest-all', asyncHandler(async (req: Request, res: Response) => {
  const { options = {} } = req.body
  const availableYears = ['2018', '2019', '2020', '2021', '2022', '2023']
  const jobs = []

  for (const year of availableYears) {
    try {
      const directoryPath = path.join(
        process.env.EDINET_DATA_PATH || '/Users/nori/claude-project/company-analyzer/resource/EDINET',
        year,
        'files'
      )

      const jobId = uuidv4()

      // Create job record in database
      await databaseService.createIngestionJob(jobId, directoryPath)

      // Add job to queue
      const job = await jobQueue.addIngestionJob({
        jobId,
        filePath: directoryPath,
        options
      })

      jobs.push({
        year,
        jobId,
        directoryPath,
        queueJobId: job.id,
        status: 'queued'
      })

      logger.info(`Bulk ingestion job started: ${jobId} for year: ${year}`)

    } catch (error) {
      logger.error(`Failed to start ingestion for year ${year}:`, error)
      jobs.push({
        year,
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }

  res.json({
    success: true,
    data: {
      message: 'Bulk ingestion jobs started',
      jobs,
      total: jobs.length,
      queued: jobs.filter(j => j.status === 'queued').length,
      failed: jobs.filter(j => j.status === 'failed').length
    }
  })
}))

// Get job status
router.get('/job/:jobId/status', asyncHandler(async (req: Request, res: Response) => {
  const { jobId } = req.params

  const jobStatus = await databaseService.getJobStatus(jobId)

  if (!jobStatus) {
    throw createError('Job not found', 404)
  }

  res.json({
    success: true,
    data: jobStatus
  })
}))

// Get overall ingestion status
router.get('/status', asyncHandler(async (req: Request, res: Response) => {
  // Get queue statistics
  const queueStats = await jobQueue.getQueueStats()

  // Get recent jobs from database
  const recentJobs = await databaseService.query(`
    SELECT * FROM ingestion_jobs 
    ORDER BY created_at DESC 
    LIMIT 20
  `)

  // Get summary statistics
  const summaryStats = await databaseService.query(`
    SELECT 
      status,
      COUNT(*) as count,
      AVG(progress) as avg_progress
    FROM ingestion_jobs 
    WHERE created_at > NOW() - INTERVAL '24 hours'
    GROUP BY status
  `)

  res.json({
    success: true,
    data: {
      queues: queueStats,
      recentJobs: recentJobs.rows,
      summary: summaryStats.rows,
      timestamp: new Date().toISOString()
    }
  })
}))

// Get companies and their data
router.get('/companies', asyncHandler(async (req: Request, res: Response) => {
  const { page = 1, limit = 50, search, industry, market } = req.query

  let query = `
    SELECT 
      c.*,
      COUNT(fd.id) as financial_records_count,
      MAX(fd.fiscal_year) as latest_year
    FROM unique_companies c
    LEFT JOIN financial_data fd ON c.id = fd.company_id
  `

  const params: any[] = []
  const conditions: string[] = []

  if (search) {
    conditions.push(`(c.company_name ILIKE $${params.length + 1} OR c.securities_code ILIKE $${params.length + 1})`)
    params.push(`%${search}%`)
  }

  if (industry) {
    conditions.push(`c.industry = $${params.length + 1}`)
    params.push(industry)
  }

  if (market) {
    conditions.push(`c.listing_market = $${params.length + 1}`)
    params.push(market)
  }

  if (conditions.length > 0) {
    query += ` WHERE ${conditions.join(' AND ')}`
  }

  query += `
    GROUP BY c.id, c.edinet_code, c.company_name, c.securities_code, c.industry, c.listing_market, c.created_at, c.updated_at
    ORDER BY c.company_name
    LIMIT $${params.length + 1} OFFSET $${params.length + 2}
  `

  params.push(Number(limit), (Number(page) - 1) * Number(limit))

  const companies = await databaseService.query(query, params)

  // Get total count of unique companies
  let countQuery = 'SELECT COUNT(*) FROM unique_companies'
  const countParams: any[] = []
  const countConditions: string[] = []

  if (search) {
    countConditions.push(`(company_name ILIKE $${countParams.length + 1} OR securities_code ILIKE $${countParams.length + 1})`)
    countParams.push(`%${search}%`)
  }

  if (industry) {
    countConditions.push(`industry = $${countParams.length + 1}`)
    countParams.push(industry)
  }

  if (market) {
    countConditions.push(`listing_market = $${countParams.length + 1}`)
    countParams.push(market)
  }

  if (countConditions.length > 0) {
    countQuery += ` WHERE ${countConditions.join(' AND ')}`
  }

  const countResult = await databaseService.query(countQuery, countParams)
  const total = parseInt(countResult.rows[0].count)

  res.json({
    success: true,
    data: {
      companies: companies.rows,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit))
      }
    }
  })
}))

// Get financial data for a company
router.get('/companies/:companyId/financial-data', asyncHandler(async (req: Request, res: Response) => {
  const { companyId } = req.params
  const { fiscalYear, fiscalPeriod } = req.query

  let query = `
    SELECT fd.*, c.company_name, c.securities_code
    FROM financial_data fd
    JOIN companies c ON fd.company_id = c.id
    WHERE fd.company_id = $1
  `

  const params = [companyId]

  if (fiscalYear) {
    query += ` AND fd.fiscal_year = $${params.length + 1}`
    params.push(String(fiscalYear))
  }

  if (fiscalPeriod) {
    query += ` AND fd.fiscal_period = $${params.length + 1}`
    params.push(String(fiscalPeriod))
  }

  query += ` ORDER BY fd.fiscal_year DESC, fd.fiscal_period`

  const result = await databaseService.query(query, params)

  res.json({
    success: true,
    data: result.rows
  })
}))

// Clean up old jobs
router.post('/cleanup', asyncHandler(async (req: Request, res: Response) => {
  await jobQueue.cleanupJobs()

  res.json({
    success: true,
    message: 'Old jobs cleaned up successfully'
  })
}))

// Import stock market data
router.post('/import-stock-data', asyncHandler(async (req: Request, res: Response) => {
  const { csvPath } = req.body
  
  const stockImporter = new StockDataImporter()
  
  try {
    let result
    if (csvPath) {
      // Import specific file
      result = await stockImporter.importStockData(csvPath)
    } else {
      // Import latest stock data
      const dataPath = path.join(
        process.env.KABU_PLUS_DATA_PATH || '/Users/nori/claude-project/company-analyzer/resource/kabu_plus/CSVEX-Local',
        'japan-all-stock-data/daily'
      )
      result = await stockImporter.importLatestStockData(dataPath)
    }

    res.json({
      success: true,
      data: {
        message: 'Stock data imported successfully',
        updated: result.updated,
        errors: result.errors
      }
    })
  } catch (error) {
    logger.error('Error importing stock data:', error)
    throw createError('Failed to import stock data', 500)
  }
}))

// Update company names from downloaded_list.csv
router.post('/update-company-names', asyncHandler(async (req: Request, res: Response) => {
  const { year } = req.body
  
  const updater = new UpdateCompanyNames()
  
  try {
    let result
    if (year) {
      // Update specific year
      result = await updater.updateFromDownloadedList(year)
    } else {
      // Update all years
      result = await updater.updateAllYears()
    }

    res.json({
      success: true,
      data: {
        message: 'Company names updated successfully',
        updated: result.updated,
        errors: result.errors
      }
    })
  } catch (error) {
    logger.error('Error updating company names:', error)
    throw createError('Failed to update company names', 500)
  }
}))

// Set securities codes from downloaded_list.csv
router.post('/set-securities-codes', asyncHandler(async (req: Request, res: Response) => {
  const { year } = req.body
  
  const codesSetter = new SetSecuritiesCode()
  
  try {
    let result
    if (year) {
      // Set codes for specific year
      result = await codesSetter.setSecuritiesCodesFromDownloadedList(year)
    } else {
      // Set codes for all years
      result = await codesSetter.setSecuritiesCodesAllYears()
    }

    res.json({
      success: true,
      data: {
        message: 'Securities codes set successfully',
        updated: result.updated,
        errors: result.errors
      }
    })
  } catch (error) {
    logger.error('Error setting securities codes:', error)
    throw createError('Failed to set securities codes', 500)
  }
}))

export default router