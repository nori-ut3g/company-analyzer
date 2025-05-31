import fs from 'fs/promises'
import path from 'path'
import { parse } from 'csv-parse'
import { DatabaseService } from './DatabaseService'
import { logger } from '../utils/logger'

export class UpdateCompanyNames {
  private databaseService: DatabaseService

  constructor() {
    this.databaseService = new DatabaseService()
  }

  async updateFromDownloadedList(year: string): Promise<{ updated: number, errors: number }> {
    let updated = 0
    let errors = 0

    try {
      const csvPath = path.join(
        process.env.EDINET_DATA_PATH || '/data/edinet',
        year,
        'downloaded_list.csv'
      )

      logger.info(`Reading downloaded_list.csv from: ${csvPath}`)
      
      const fileContent = await fs.readFile(csvPath, 'utf-8')
      const records = await this.parseCSV(fileContent)
      
      logger.info(`Found ${records.length} records in downloaded_list.csv`)

      // Update companies in batches
      const batchSize = 100
      for (let i = 0; i < records.length; i += batchSize) {
        const batch = records.slice(i, i + batchSize)
        
        for (const record of batch) {
          try {
            // First check if the document ID exists in companies table
            const existsResult = await this.databaseService.query(
              `SELECT id FROM companies WHERE company_name = $1 LIMIT 1`,
              [record.id]
            )

            if (existsResult.rows.length > 0) {
              // Check if this securities code already exists
              let shouldSetSecCode = false
              if (record.secCode) {
                const secCodeExistsResult = await this.databaseService.query(
                  `SELECT id FROM companies WHERE securities_code = $1 LIMIT 1`,
                  [record.secCode]
                )
                shouldSetSecCode = secCodeExistsResult.rows.length === 0
              }

              const result = await this.databaseService.query(
                `UPDATE companies 
                 SET company_name = $1,
                     securities_code = CASE 
                       WHEN securities_code IS NULL AND $2 IS NOT NULL AND $4 = true THEN $2 
                       ELSE securities_code 
                     END,
                     updated_at = NOW()
                 WHERE company_name = $3`,
                [record.filerName, record.secCode || null, record.id, shouldSetSecCode]
              )

              if (result.rowCount && result.rowCount > 0) {
                updated += result.rowCount
                logger.debug(`Updated company: ${record.id} -> ${record.filerName} (${record.secCode})`)
              }
            }
          } catch (error) {
            // Handle duplicate key errors gracefully
            if (error.code === '23505') { // unique_violation
              logger.warn(`Duplicate securities code ${record.secCode} for ${record.id}, skipping securities code update`)
              
              // Try updating just the company name
              try {
                const result = await this.databaseService.query(
                  `UPDATE companies 
                   SET company_name = $1,
                       updated_at = NOW()
                   WHERE company_name = $2`,
                  [record.filerName, record.id]
                )
                if (result.rowCount && result.rowCount > 0) {
                  updated += result.rowCount
                  logger.debug(`Updated company name only: ${record.id} -> ${record.filerName}`)
                }
              } catch (nameError) {
                errors++
                logger.error(`Error updating company name for ${record.id}:`, nameError)
              }
            } else {
              errors++
              logger.error(`Error updating company ${record.id}:`, error)
            }
          }
        }
        
        logger.info(`Progress: ${i + batch.length}/${records.length} records processed`)
      }

      logger.info(`Company names update completed. Updated: ${updated}, Errors: ${errors}`)
      return { updated, errors }

    } catch (error) {
      logger.error('Error updating company names:', error)
      throw error
    }
  }

  private async parseCSV(content: string): Promise<any[]> {
    return new Promise((resolve, reject) => {
      const records: any[] = []
      
      const parser = parse({
        columns: true,
        skip_empty_lines: true,
        trim: true
      })

      parser.on('readable', function() {
        let record
        while ((record = parser.read()) !== null) {
          records.push({
            id: record['id'],
            secCode: record['sec-code'],
            filerName: record['filer-name'],
            description: record['description']
          })
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

  async updateAllYears(): Promise<{ updated: number, errors: number }> {
    const years = ['2018', '2019', '2020', '2021', '2022', '2023']
    let totalUpdated = 0
    let totalErrors = 0

    for (const year of years) {
      try {
        logger.info(`Updating company names for year: ${year}`)
        const result = await this.updateFromDownloadedList(year)
        totalUpdated += result.updated
        totalErrors += result.errors
      } catch (error) {
        logger.error(`Failed to update year ${year}:`, error)
        totalErrors++
      }
    }

    return { updated: totalUpdated, errors: totalErrors }
  }
}