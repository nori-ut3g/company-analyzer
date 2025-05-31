import fs from 'fs/promises'
import path from 'path'
import { parse } from 'csv-parse'
import iconv from 'iconv-lite'
import { DatabaseService } from './DatabaseService'
import { logger } from '../utils/logger'

export interface StockDataRecord {
  securityCode: string
  companyName: string
  market: string
  industry: string
  marketCap?: string
  sharesOutstanding?: string
  dividendYield?: string
  per?: string
  pbr?: string
  eps?: string
  bps?: string
}

export class StockDataImporter {
  private databaseService: DatabaseService

  constructor() {
    this.databaseService = new DatabaseService()
  }

  async importStockData(csvPath: string): Promise<{ updated: number, errors: number }> {
    let updated = 0
    let errors = 0

    try {
      // Read file and convert from Shift-JIS to UTF-8
      const fileBuffer = await fs.readFile(csvPath)
      const fileContent = iconv.decode(fileBuffer, 'Shift_JIS')

      // Parse CSV
      const records = await this.parseCSV(fileContent)
      
      logger.info(`Found ${records.length} records in stock data file`)

      // Update companies in batches
      const batchSize = 100
      for (let i = 0; i < records.length; i += batchSize) {
        const batch = records.slice(i, i + batchSize)
        const results = await this.updateCompaniesBatch(batch)
        updated += results.updated
        errors += results.errors
        
        logger.info(`Progress: ${i + batch.length}/${records.length} records processed`)
      }

      logger.info(`Stock data import completed. Updated: ${updated}, Errors: ${errors}`)
      return { updated, errors }

    } catch (error) {
      logger.error('Error importing stock data:', error)
      throw error
    }
  }

  private async parseCSV(content: string): Promise<StockDataRecord[]> {
    return new Promise((resolve, reject) => {
      const records: StockDataRecord[] = []
      
      const parser = parse({
        columns: true,
        skip_empty_lines: true,
        trim: true
      })

      parser.on('readable', function() {
        let record
        while ((record = parser.read()) !== null) {
          // Map Japanese column names to English
          const stockRecord: StockDataRecord = {
            securityCode: record['SC'] || record['銘柄コード'] || '',
            companyName: record['名称'] || record['銘柄名'] || '',
            market: record['市場'] || '',
            industry: record['業種'] || '',
            marketCap: record['時価総額（百万円）'] || '',
            sharesOutstanding: record['発行済株式数'] || '',
            dividendYield: record['配当利回り（予想）'] || '',
            per: record['PER（予想）'] || '',
            pbr: record['PBR（実績）'] || '',
            eps: record['EPS（予想）'] || '',
            bps: record['BPS（実績）'] || ''
          }

          // Skip index records and invalid entries
          if (stockRecord.securityCode && 
              !stockRecord.securityCode.startsWith('000') &&
              stockRecord.industry !== '株価指数') {
            records.push(stockRecord)
          }
        }
      })

      parser.on('error', (err) => {
        reject(err)
      })

      parser.on('end', () => {
        resolve(records)
      })

      parser.write(content)
      parser.end()
    })
  }

  private async updateCompaniesBatch(records: StockDataRecord[]): Promise<{ updated: number, errors: number }> {
    let updated = 0
    let errors = 0

    for (const record of records) {
      try {
        // Convert 4-digit kabu_plus code to 5-digit EDINET format
        const edinetSecurityCode = record.securityCode + '0'
        
        // Try to update by securities code first (EDINET 5-digit format)
        let result = await this.databaseService.query(
          `UPDATE companies 
           SET industry = $1, 
               listing_market = $2,
               updated_at = NOW()
           WHERE securities_code = $3 AND securities_code IS NOT NULL`,
          [record.industry, record.market, edinetSecurityCode]
        )

        if (result.rowCount === 0) {
          // Try exact company name match first
          result = await this.databaseService.query(
            `UPDATE companies 
             SET industry = $1, 
                 listing_market = $2,
                 securities_code = $3,
                 updated_at = NOW()
             WHERE company_name = $4`,
            [record.industry, record.market, record.securityCode, record.companyName]
          )
        }

        if (result.rowCount === 0) {
          // Try partial name matching
          const cleanName = record.companyName
            .replace(/株式会社/g, '')
            .replace(/ホールディングス/g, '')
            .replace(/HD/g, '')
            .replace(/\s+/g, '')
            .trim()

          if (cleanName.length > 2) {
            result = await this.databaseService.query(
              `UPDATE companies 
               SET industry = $1, 
                   listing_market = $2,
                   securities_code = $3,
                   updated_at = NOW()
               WHERE REPLACE(REPLACE(company_name, '株式会社', ''), ' ', '') LIKE $4
               LIMIT 1`,
              [
                record.industry, 
                record.market, 
                record.securityCode,
                `%${cleanName}%`
              ]
            )
          }
        }

        if (result.rowCount && result.rowCount > 0) {
          updated += result.rowCount
          logger.debug(`Updated company: ${record.securityCode} - ${record.companyName}`)
        }

      } catch (error) {
        // Handle duplicate key errors gracefully
        if (error.code === '23505') { // unique_violation
          logger.warn(`Duplicate securities code ${record.securityCode}, trying industry/market update only`)
          
          try {
            const result = await this.databaseService.query(
              `UPDATE companies 
               SET industry = $1, 
                   listing_market = $2,
                   updated_at = NOW()
               WHERE company_name = $3`,
              [record.industry, record.market, record.companyName]
            )
            if (result.rowCount && result.rowCount > 0) {
              updated += result.rowCount
              logger.debug(`Updated industry/market only: ${record.companyName}`)
            }
          } catch (fallbackError) {
            errors++
            logger.error(`Error in fallback update for ${record.securityCode}:`, fallbackError)
          }
        } else {
          errors++
          logger.error(`Error updating company ${record.securityCode}:`, error)
        }
      }
    }

    return { updated, errors }
  }

  async importLatestStockData(dataPath: string): Promise<{ updated: number, errors: number }> {
    try {
      // Find the latest stock data file
      const files = await fs.readdir(dataPath)
      const stockDataFiles = files
        .filter(f => f.startsWith('japan-all-stock-data_') && f.endsWith('.csv'))
        .sort()
        .reverse()

      if (stockDataFiles.length === 0) {
        throw new Error('No stock data files found')
      }

      const latestFile = stockDataFiles[0]
      const filePath = path.join(dataPath, latestFile)
      
      logger.info(`Importing stock data from: ${latestFile}`)
      return await this.importStockData(filePath)

    } catch (error) {
      logger.error('Error finding latest stock data:', error)
      throw error
    }
  }
}