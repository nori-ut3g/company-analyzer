import fs from 'fs/promises'
import path from 'path'
import { parse } from 'csv-parse'
import { DatabaseService } from './DatabaseService'
import { logger } from '../utils/logger'

export class SetSecuritiesCode {
  private databaseService: DatabaseService

  constructor() {
    this.databaseService = new DatabaseService()
  }

  async setSecuritiesCodesFromDownloadedList(year: string): Promise<{ updated: number, errors: number }> {
    let updated = 0
    let errors = 0

    try {
      const csvPath = path.join(
        process.env.EDINET_DATA_PATH || '/Users/nori/claude-project/company-analyzer/resource/EDINET',
        year,
        'downloaded_list.csv'
      )

      logger.info(`Reading securities codes from: ${csvPath}`)
      
      const fileContent = await fs.readFile(csvPath, 'utf-8')
      const records = await this.parseCSV(fileContent)
      
      logger.info(`Found ${records.length} records in downloaded_list.csv`)

      // Get unique securities codes and their first occurrence company name
      const secCodeMap = new Map<string, string>()
      
      for (const record of records) {
        if (record.secCode && record.filerName) {
          if (!secCodeMap.has(record.secCode)) {
            secCodeMap.set(record.secCode, record.filerName)
          }
        }
      }

      logger.info(`Found ${secCodeMap.size} unique securities codes`)

      // Update companies with securities codes
      for (const [secCode, companyName] of secCodeMap) {
        try {
          const result = await this.databaseService.query(
            `UPDATE companies 
             SET securities_code = $1,
                 updated_at = NOW()
             WHERE company_name = $2 
               AND securities_code IS NULL`,
            [secCode, companyName]
          )

          if (result.rowCount && result.rowCount > 0) {
            updated += result.rowCount
            logger.debug(`Set securities code ${secCode} for ${companyName}`)
          }
        } catch (error) {
          // Handle duplicate key errors
          if (error.code === '23505') {
            logger.warn(`Securities code ${secCode} already exists, skipping`)
          } else {
            errors++
            logger.error(`Error setting securities code ${secCode}:`, error)
          }
        }
      }

      logger.info(`Securities codes update completed. Updated: ${updated}, Errors: ${errors}`)
      return { updated, errors }

    } catch (error) {
      logger.error('Error setting securities codes:', error)
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

  async setSecuritiesCodesAllYears(): Promise<{ updated: number, errors: number }> {
    const years = ['2018', '2019', '2020', '2021', '2022', '2023']
    let totalUpdated = 0
    let totalErrors = 0

    for (const year of years) {
      try {
        logger.info(`Setting securities codes for year: ${year}`)
        const result = await this.setSecuritiesCodesFromDownloadedList(year)
        totalUpdated += result.updated
        totalErrors += result.errors
      } catch (error) {
        logger.error(`Failed to set securities codes for year ${year}:`, error)
        totalErrors++
      }
    }

    return { updated: totalUpdated, errors: totalErrors }
  }
}