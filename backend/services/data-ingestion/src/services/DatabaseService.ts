import { Pool, PoolClient } from 'pg'
import { logger } from '../utils/logger'

export class DatabaseService {
  private pool: Pool | null = null

  constructor() {
    this.pool = new Pool({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      database: process.env.DB_NAME || 'edinet_analysis',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'password',
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    })
  }

  async connect(): Promise<void> {
    if (!this.pool) {
      throw new Error('Database pool not initialized')
    }

    try {
      const client = await this.pool.connect()
      await client.query('SELECT NOW()')
      client.release()
      logger.info('Database connection established')
      
      // Initialize database schema
      await this.initializeSchema()
    } catch (error) {
      logger.error('Failed to connect to database:', error)
      throw error
    }
  }

  async disconnect(): Promise<void> {
    if (this.pool) {
      await this.pool.end()
      this.pool = null
      logger.info('Database connection closed')
    }
  }

  async getClient(): Promise<PoolClient> {
    if (!this.pool) {
      throw new Error('Database pool not initialized')
    }
    return this.pool.connect()
  }

  async query(text: string, params?: any[]): Promise<any> {
    if (!this.pool) {
      throw new Error('Database pool not initialized')
    }
    
    const start = Date.now()
    try {
      const result = await this.pool.query(text, params)
      const duration = Date.now() - start
      logger.debug(`Query executed in ${duration}ms`, { query: text.substring(0, 100) })
      return result
    } catch (error) {
      logger.error('Database query error:', { error, query: text.substring(0, 100) })
      throw error
    }
  }

  private async initializeSchema(): Promise<void> {
    const client = await this.getClient()
    
    try {
      await client.query('BEGIN')

      // Create companies table
      await client.query(`
        CREATE TABLE IF NOT EXISTS companies (
          id SERIAL PRIMARY KEY,
          securities_code VARCHAR(10) UNIQUE,
          company_name VARCHAR(255) NOT NULL,
          industry VARCHAR(100),
          listing_market VARCHAR(50),
          edinet_code VARCHAR(10),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `)

      // Create financial_data table
      await client.query(`
        CREATE TABLE IF NOT EXISTS financial_data (
          id SERIAL PRIMARY KEY,
          company_id INTEGER REFERENCES companies(id),
          fiscal_year INTEGER NOT NULL,
          fiscal_period VARCHAR(10) NOT NULL,
          period_start DATE,
          period_end DATE,
          net_sales BIGINT,
          operating_income BIGINT,
          ordinary_income BIGINT,
          net_income BIGINT,
          total_assets BIGINT,
          net_assets BIGINT,
          equity_capital BIGINT,
          basic_earnings_per_share DECIMAL(10,2),
          diluted_earnings_per_share DECIMAL(10,2),
          equity_ratio DECIMAL(5,3),
          roe DECIMAL(5,2),
          roa DECIMAL(5,2),
          gross_profit_margin DECIMAL(5,2),
          operating_profit_margin DECIMAL(5,2),
          net_profit_margin DECIMAL(5,2),
          current_ratio DECIMAL(5,2),
          quick_ratio DECIMAL(5,2),
          debt_to_equity_ratio DECIMAL(5,2),
          interest_coverage_ratio DECIMAL(5,2),
          raw_data JSONB,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(company_id, fiscal_year, fiscal_period)
        )
      `)

      // Create ingestion_jobs table
      await client.query(`
        CREATE TABLE IF NOT EXISTS ingestion_jobs (
          id SERIAL PRIMARY KEY,
          job_id VARCHAR(100) UNIQUE NOT NULL,
          file_path VARCHAR(500) NOT NULL,
          status VARCHAR(20) DEFAULT 'pending',
          progress INTEGER DEFAULT 0,
          total_files INTEGER DEFAULT 0,
          processed_files INTEGER DEFAULT 0,
          error_message TEXT,
          started_at TIMESTAMP,
          completed_at TIMESTAMP,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `)

      // Create indexes
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_companies_securities_code ON companies(securities_code);
        CREATE INDEX IF NOT EXISTS idx_companies_edinet_code ON companies(edinet_code);
        CREATE INDEX IF NOT EXISTS idx_financial_data_company_year ON financial_data(company_id, fiscal_year);
        CREATE INDEX IF NOT EXISTS idx_financial_data_period ON financial_data(fiscal_year, fiscal_period);
        CREATE INDEX IF NOT EXISTS idx_ingestion_jobs_status ON ingestion_jobs(status);
      `)

      await client.query('COMMIT')
      logger.info('Database schema initialized successfully')
    } catch (error) {
      await client.query('ROLLBACK')
      logger.error('Failed to initialize database schema:', error)
      throw error
    } finally {
      client.release()
    }
  }

  // Company-related methods
  async createCompany(data: {
    securitiesCode?: string
    companyName: string
    industry?: string
    listingMarket?: string
    edinetCode?: string
  }): Promise<number> {
    const result = await this.query(`
      INSERT INTO companies (securities_code, company_name, industry, listing_market, edinet_code)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (securities_code) 
      DO UPDATE SET 
        company_name = EXCLUDED.company_name,
        industry = EXCLUDED.industry,
        listing_market = EXCLUDED.listing_market,
        edinet_code = EXCLUDED.edinet_code,
        updated_at = CURRENT_TIMESTAMP
      RETURNING id
    `, [data.securitiesCode, data.companyName, data.industry, data.listingMarket, data.edinetCode])
    
    return result.rows[0].id
  }

  async getCompanyBySecuritiesCode(securitiesCode: string): Promise<any> {
    const result = await this.query(
      'SELECT * FROM companies WHERE securities_code = $1',
      [securitiesCode]
    )
    return result.rows[0]
  }

  async getCompanyByEdinetCode(edinetCode: string): Promise<any> {
    const result = await this.query(
      'SELECT * FROM companies WHERE edinet_code = $1',
      [edinetCode]
    )
    return result.rows[0]
  }

  // Financial data methods
  async upsertFinancialData(data: {
    companyId: number
    fiscalYear: number
    fiscalPeriod: string
    periodStart?: Date
    periodEnd?: Date
    netSales?: number
    operatingIncome?: number
    ordinaryIncome?: number
    netIncome?: number
    totalAssets?: number
    netAssets?: number
    equityCapital?: number
    basicEarningsPerShare?: number
    dilutedEarningsPerShare?: number
    equityRatio?: number
    roe?: number
    roa?: number
    grossProfitMargin?: number
    operatingProfitMargin?: number
    netProfitMargin?: number
    currentRatio?: number
    quickRatio?: number
    debtToEquityRatio?: number
    interestCoverageRatio?: number
    rawData?: any
  }): Promise<void> {
    await this.query(`
      INSERT INTO financial_data (
        company_id, fiscal_year, fiscal_period, period_start, period_end,
        net_sales, operating_income, ordinary_income, net_income,
        total_assets, net_assets, equity_capital,
        basic_earnings_per_share, diluted_earnings_per_share,
        equity_ratio, roe, roa,
        gross_profit_margin, operating_profit_margin, net_profit_margin,
        current_ratio, quick_ratio, debt_to_equity_ratio, interest_coverage_ratio,
        raw_data
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17,
        $18, $19, $20, $21, $22, $23, $24, $25
      )
      ON CONFLICT (company_id, fiscal_year, fiscal_period)
      DO UPDATE SET
        period_start = EXCLUDED.period_start,
        period_end = EXCLUDED.period_end,
        net_sales = EXCLUDED.net_sales,
        operating_income = EXCLUDED.operating_income,
        ordinary_income = EXCLUDED.ordinary_income,
        net_income = EXCLUDED.net_income,
        total_assets = EXCLUDED.total_assets,
        net_assets = EXCLUDED.net_assets,
        equity_capital = EXCLUDED.equity_capital,
        basic_earnings_per_share = EXCLUDED.basic_earnings_per_share,
        diluted_earnings_per_share = EXCLUDED.diluted_earnings_per_share,
        equity_ratio = EXCLUDED.equity_ratio,
        roe = EXCLUDED.roe,
        roa = EXCLUDED.roa,
        gross_profit_margin = EXCLUDED.gross_profit_margin,
        operating_profit_margin = EXCLUDED.operating_profit_margin,
        net_profit_margin = EXCLUDED.net_profit_margin,
        current_ratio = EXCLUDED.current_ratio,
        quick_ratio = EXCLUDED.quick_ratio,
        debt_to_equity_ratio = EXCLUDED.debt_to_equity_ratio,
        interest_coverage_ratio = EXCLUDED.interest_coverage_ratio,
        raw_data = EXCLUDED.raw_data,
        updated_at = CURRENT_TIMESTAMP
    `, [
      data.companyId, data.fiscalYear, data.fiscalPeriod, data.periodStart, data.periodEnd,
      data.netSales, data.operatingIncome, data.ordinaryIncome, data.netIncome,
      data.totalAssets, data.netAssets, data.equityCapital,
      data.basicEarningsPerShare, data.dilutedEarningsPerShare,
      data.equityRatio, data.roe, data.roa,
      data.grossProfitMargin, data.operatingProfitMargin, data.netProfitMargin,
      data.currentRatio, data.quickRatio, data.debtToEquityRatio, data.interestCoverageRatio,
      data.rawData ? JSON.stringify(data.rawData) : null
    ])
  }

  // Job tracking methods
  async createIngestionJob(jobId: string, filePath: string): Promise<void> {
    await this.query(`
      INSERT INTO ingestion_jobs (job_id, file_path, status, progress, total_files, processed_files)
      VALUES ($1, $2, 'pending', 0, 0, 0)
    `, [jobId, filePath])
  }

  async updateJobStatus(jobId: string, status: string, errorMessage?: string): Promise<void> {
    const updateFields = ['status = $2', 'updated_at = CURRENT_TIMESTAMP']
    const params = [jobId, status]

    if (status === 'processing') {
      updateFields.push('started_at = CURRENT_TIMESTAMP')
    } else if (status === 'completed' || status === 'failed') {
      updateFields.push('completed_at = CURRENT_TIMESTAMP')
    }

    if (errorMessage) {
      updateFields.push(`error_message = $${params.length + 1}`)
      params.push(errorMessage)
    }

    await this.query(`
      UPDATE ingestion_jobs 
      SET ${updateFields.join(', ')}
      WHERE job_id = $1
    `, params)
  }

  async updateJobProgress(jobId: string, processedFiles: number, totalFiles?: number): Promise<void> {
    try {
      if (totalFiles !== undefined) {
        // Calculate progress percentage
        const progress = totalFiles > 0 ? Math.round((processedFiles / totalFiles) * 100) : 0
        
        await this.query(`
          UPDATE ingestion_jobs 
          SET processed_files = $2, total_files = $3, progress = $4, updated_at = CURRENT_TIMESTAMP
          WHERE job_id = $1
        `, [jobId, processedFiles, totalFiles, progress])
      } else {
        await this.query(`
          UPDATE ingestion_jobs 
          SET processed_files = $2, updated_at = CURRENT_TIMESTAMP,
              progress = CASE WHEN total_files > 0 THEN ROUND((processed_files::DECIMAL / total_files::DECIMAL) * 100) ELSE 0 END
          WHERE job_id = $1
        `, [jobId, processedFiles])
      }
    } catch (error) {
      logger.error(`Failed to update job progress for ${jobId}:`, error)
      throw error
    }
  }

  async getJobStatus(jobId: string): Promise<any> {
    const result = await this.query(
      'SELECT * FROM ingestion_jobs WHERE job_id = $1',
      [jobId]
    )
    return result.rows[0]
  }
}