import fs from 'fs/promises'
import path from 'path'
import unzipper from 'unzipper'
import { parse as csvParse } from 'csv-parse'
import iconv from 'iconv-lite'
import { DatabaseService } from './DatabaseService'
import { logger } from '../utils/logger'

export interface ProcessingOptions {
  overwrite?: boolean
  validateOnly?: boolean
  batchSize?: number
}

export interface ProcessingResult {
  processedFiles: number
  totalFiles: number
  companiesCreated: number
  financialRecordsCreated: number
  errors: string[]
  warnings: string[]
}

export interface EDINETRecord {
  elementId: string
  elementLabel: string
  contextRef: string
  contextLabel: string
  instant?: string
  duration?: string
  unit: string
  decimals?: string
  value: string
}

export class EDINETProcessor {
  private databaseService: DatabaseService
  private companyMapping: Map<string, { secCode: string, companyName: string }> = new Map()

  constructor() {
    this.databaseService = new DatabaseService()
  }

  async processDirectory(
    directoryPath: string, 
    jobId: string, 
    options: ProcessingOptions = {}
  ): Promise<ProcessingResult> {
    const result: ProcessingResult = {
      processedFiles: 0,
      totalFiles: 0,
      companiesCreated: 0,
      financialRecordsCreated: 0,
      errors: [],
      warnings: []
    }

    try {
      // Connect to database if not already connected
      try {
        await this.databaseService.connect()
      } catch (error) {
        // Database might already be connected, ignore connection errors
        logger.debug('Database connection attempt failed (might already be connected):', error)
      }

      // Load company mapping from downloaded_list.csv
      await this.loadCompanyMapping(directoryPath)

      // Get list of ZIP files
      const files = await this.getZipFiles(directoryPath)
      result.totalFiles = files.length

      // Update job with total files count
      await this.updateJobProgress(jobId, 0, result.totalFiles)

      logger.info(`Found ${result.totalFiles} ZIP files to process in ${directoryPath}`)

      // Process files in batches
      const batchSize = options.batchSize || 10
      
      for (let i = 0; i < files.length; i += batchSize) {
        const batch = files.slice(i, i + batchSize)
        
        await Promise.all(batch.map(async (file) => {
          try {
            const fileResult = await this.processZipFile(file, options)
            
            result.processedFiles++
            result.companiesCreated += fileResult.companiesCreated
            result.financialRecordsCreated += fileResult.financialRecordsCreated
            result.warnings.push(...fileResult.warnings)

            // Update progress
            await this.updateJobProgress(jobId, result.processedFiles)

            logger.debug(`Processed file ${file}: ${fileResult.financialRecordsCreated} records`)

          } catch (error) {
            const errorMsg = `Error processing ${file}: ${error instanceof Error ? error.message : 'Unknown error'}`
            result.errors.push(errorMsg)
            logger.error(errorMsg, error)
          }
        }))

        // Log batch progress
        logger.info(`Processed batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(files.length / batchSize)}: ${result.processedFiles}/${result.totalFiles} files`)
      }

      logger.info(`Processing complete. Processed ${result.processedFiles}/${result.totalFiles} files`, {
        companiesCreated: result.companiesCreated,
        financialRecordsCreated: result.financialRecordsCreated,
        errors: result.errors.length,
        warnings: result.warnings.length
      })

      return result

    } catch (error) {
      logger.error('Error in processDirectory:', error)
      throw error
    }
  }

  private async getZipFiles(directoryPath: string): Promise<string[]> {
    const entries = await fs.readdir(directoryPath, { withFileTypes: true })
    
    return entries
      .filter(entry => entry.isFile() && entry.name.toLowerCase().endsWith('.zip'))
      .map(entry => path.join(directoryPath, entry.name))
  }

  private async processZipFile(
    zipFilePath: string, 
    options: ProcessingOptions = {}
  ): Promise<ProcessingResult> {
    const result: ProcessingResult = {
      processedFiles: 1,
      totalFiles: 1,
      companiesCreated: 0,
      financialRecordsCreated: 0,
      errors: [],
      warnings: []
    }

    try {
      // Extract company info from filename
      const fileName = path.basename(zipFilePath, '.zip')
      const companyInfo = this.parseFileName(fileName)

      if (!companyInfo) {
        result.warnings.push(`Could not parse filename: ${fileName}`)
        return result
      }

      // Extract and process CSV files from ZIP
      const csvData = await this.extractCSVFromZip(zipFilePath)

      if (csvData.length === 0) {
        result.warnings.push(`No CSV files found in: ${fileName}`)
        return result
      }

      // Create or get company
      let companyId: number
      try {
        companyId = await this.createOrUpdateCompany(companyInfo)
        if (companyId) {
          result.companiesCreated = 1
        }
      } catch (error) {
        result.errors.push(`Failed to create company for ${fileName}: ${error}`)
        return result
      }

      // Process each CSV file
      for (const csv of csvData) {
        try {
          const financialData = await this.parseCSVData(csv.content, csv.filename)
          
          if (financialData && Object.keys(financialData).length > 0) {
            await this.saveFinancialData(companyId, companyInfo, financialData)
            result.financialRecordsCreated++
          }
        } catch (error) {
          result.errors.push(`Error processing CSV ${csv.filename}: ${error}`)
        }
      }

      return result

    } catch (error) {
      logger.error(`Error processing ZIP file ${zipFilePath}:`, error)
      throw error
    }
  }

  private parseFileName(fileName: string): any {
    // EDINET filename format: S100xxxxx (document ID)
    // Get company info from our loaded mapping
    const companyInfo = this.companyMapping.get(fileName)
    
    return {
      documentId: fileName,
      edinetCode: fileName, // Use document ID as EDINET code
      securitiesCode: companyInfo?.secCode || null,
      companyName: companyInfo?.companyName || fileName, // Fallback to document ID
      fiscalYear: new Date().getFullYear(), // Will be updated from CSV data
      fiscalPeriod: 'FY', // Will be updated from CSV data
      periodEnd: null // Will be updated from CSV data
    }
  }

  private async extractCSVFromZip(zipFilePath: string): Promise<Array<{filename: string, content: string}>> {
    const csvFiles: Array<{filename: string, content: string}> = []

    try {
      const directory = await unzipper.Open.file(zipFilePath)
      
      for (const file of directory.files) {
        if (file.path.toLowerCase().endsWith('.csv')) {
          const buffer = await file.buffer()
          
          // Try to detect encoding and convert to UTF-8
          let content: string
          
          // Check for BOM to detect UTF-8
          if (buffer.length >= 3 && buffer[0] === 0xEF && buffer[1] === 0xBB && buffer[2] === 0xBF) {
            content = iconv.decode(buffer, 'utf8')
          } else {
            // Try multiple encodings for Japanese files
            try {
              // First try Shift-JIS (most common for EDINET)
              content = iconv.decode(buffer, 'shift_jis')
              // Validate that it decoded properly by checking for common patterns
              if (content.includes('�') || content.length === 0) {
                throw new Error('Invalid Shift-JIS decoding')
              }
            } catch {
              try {
                // Try UTF-8
                content = iconv.decode(buffer, 'utf8')
              } catch {
                try {
                  // Try EUC-JP as fallback
                  content = iconv.decode(buffer, 'euc-jp')
                } catch {
                  // Last resort: use buffer as-is
                  content = buffer.toString('utf8')
                }
              }
            }
          }

          csvFiles.push({
            filename: file.path,
            content: content
          })
        }
      }

      return csvFiles

    } catch (error) {
      logger.error(`Error extracting CSV from ${zipFilePath}:`, error)
      throw error
    }
  }

  private async parseCSVData(csvContent: string, filename: string): Promise<any> {
    const records: EDINETRecord[] = []
    const financialData: any = {}

    try {
      // Clean up CSV content to handle encoding issues
      let cleanedContent = csvContent
        .replace(/^\uFEFF/, '') // Remove BOM
        .replace(/\r\n/g, '\n') // Normalize line endings
        .trim()

      // Parse CSV with more flexible settings for Japanese content
      const csvRecords = await new Promise<any[]>((resolve, reject) => {
        csvParse(cleanedContent, {
          columns: true,
          skip_empty_lines: true,
          delimiter: ',',
          quote: '"',
          escape: '"',
          auto_parse: false,
          relax_column_count: true,
          relax_quotes: true,
          trim: true,
          bom: true
        }, (err, data) => {
          if (err) {
            logger.warn(`CSV parse error for ${filename}, trying alternative method:`, err.message)
            // Try parsing without headers if it fails
            csvParse(cleanedContent, {
              columns: false,
              skip_empty_lines: true,
              delimiter: ',',
              quote: '"',
              escape: '"',
              auto_parse: false,
              relax_column_count: true,
              relax_quotes: true,
              trim: true,
              bom: true
            }, (err2, data2) => {
              if (err2) {
                reject(err2)
              } else {
                // Convert array format to object format using first row as headers
                if (data2 && data2.length > 1) {
                  const headers = data2[0]
                  const convertedData = data2.slice(1).map((row: any[]) => {
                    const obj: any = {}
                    headers.forEach((header: string, index: number) => {
                      obj[header] = row[index] || ''
                    })
                    return obj
                  })
                  resolve(convertedData)
                } else {
                  resolve([])
                }
              }
            })
          } else {
            resolve(data)
          }
        })
      })

      // Process each record
      for (const record of csvRecords) {
        try {
          const edinetRecord = this.normalizeCSVRecord(record)
          if (edinetRecord) {
            records.push(edinetRecord)
          }
        } catch (error) {
          logger.debug(`Error processing CSV record:`, { error, record })
        }
      }

      // Extract financial metrics from records
      financialData.rawRecords = records
      
      // Extract company information
      const companyInfo = this.extractCompanyInfo(records)
      if (companyInfo) {
        Object.assign(financialData, companyInfo)
      }

      // Extract financial metrics
      const metrics = this.extractFinancialMetrics(records)
      Object.assign(financialData, metrics)

      return financialData

    } catch (error) {
      logger.error(`Error parsing CSV data from ${filename}:`, error)
      throw error
    }
  }

  private normalizeCSVRecord(record: any): EDINETRecord | null {
    // Handle different CSV column formats
    const keys = Object.keys(record)
    
    if (keys.length < 3) {
      return null
    }

    // Handle Japanese column headers by position and content patterns
    let elementId = '', elementLabel = '', contextRef = '', contextLabel = '', unit = '', value = ''
    
    // Try to identify columns by Japanese headers or position
    for (let i = 0; i < keys.length; i++) {
      const key = keys[i]
      const content = record[key] || ''
      
      // Column mapping based on typical EDINET CSV structure
      if (i === 0 || key.includes('要素ID') || key.includes('ElementID') || content.includes('_cor:') || content.includes('_pfs:')) {
        elementId = content
      } else if (i === 1 || key.includes('要素名') || key.includes('ElementLabel')) {
        elementLabel = content
      } else if (i === 2 || key.includes('コンテキスト') || key.includes('Context') || content.includes('Duration') || content.includes('Instant')) {
        contextRef = content
      } else if (i === 3 || key.includes('コンテキスト名') || key.includes('ContextLabel')) {
        contextLabel = content
      } else if (key.includes('単位') || key.includes('Unit') || content === 'JPY' || content === 'JPYPerShares' || content === 'pure') {
        unit = content
      } else if (i === keys.length - 1 || key.includes('値') || key.includes('Value')) {
        value = content
      }
    }

    // Fallback to positional mapping if content-based mapping fails
    if (!elementId && keys.length > 0) elementId = record[keys[0]] || ''
    if (!elementLabel && keys.length > 1) elementLabel = record[keys[1]] || ''
    if (!contextRef && keys.length > 2) contextRef = record[keys[2]] || ''
    if (!contextLabel && keys.length > 3) contextLabel = record[keys[3]] || ''
    if (!unit && keys.length > 6) unit = record[keys[6]] || ''
    if (!value && keys.length > 0) value = record[keys[keys.length - 1]] || ''

    // Validate that we have essential data
    if (!elementId || (!value && value !== '0')) {
      return null
    }

    return {
      elementId: elementId.trim(),
      elementLabel: elementLabel.trim(),
      contextRef: contextRef.trim(),
      contextLabel: contextLabel.trim(),
      instant: keys.length > 4 ? (record[keys[4]] || '').trim() : '',
      duration: keys.length > 5 ? (record[keys[5]] || '').trim() : '',
      unit: unit.trim(),
      decimals: keys.length > 7 ? (record[keys[7]] || '').trim() : '',
      value: value.trim()
    }
  }

  private extractCompanyInfo(records: EDINETRecord[]): any {
    const info: any = {}

    // Extract EDINET code and other company info from DEI records
    for (const record of records) {
      if (record.elementId.includes('dei_cor:')) {
        if (record.elementId.includes('EDINETCode')) {
          info.edinetCode = record.value
        } else if (record.elementId.includes('SecurityCode')) {
          info.securitiesCode = record.value
        } else if (record.elementId.includes('CompanyName')) {
          info.companyName = record.value
        }
      }

      // Extract fiscal period information
      if (record.contextRef.includes('Duration')) {
        if (record.contextRef.includes('Prior1Year')) {
          info.fiscalPeriod = 'FY'
        } else if (record.contextRef.includes('Quarter')) {
          info.fiscalPeriod = record.contextRef.includes('1Quarter') ? 'Q1' :
                              record.contextRef.includes('2Quarter') ? 'Q2' :
                              record.contextRef.includes('3Quarter') ? 'Q3' : 'Q4'
        }
      }

      // Extract period end date
      if (record.instant && record.instant.match(/\d{4}-\d{2}-\d{2}/)) {
        info.periodEnd = new Date(record.instant)
        info.fiscalYear = info.periodEnd.getFullYear()
      }
    }

    return info
  }

  private extractFinancialMetrics(records: EDINETRecord[]): any {
    const metrics: any = {}

    for (const record of records) {
      const value = this.parseNumericValue(record.value)
      
      if (value === null) continue

      // Map EDINET elements to our financial metrics
      if (record.elementId.includes('NetSales')) {
        metrics.netSales = value
      } else if (record.elementId.includes('OperatingIncome') || record.elementId.includes('OperatingProfit')) {
        metrics.operatingIncome = value
      } else if (record.elementId.includes('OrdinaryIncome')) {
        metrics.ordinaryIncome = value
      } else if (record.elementId.includes('ProfitLossAttributableToOwnersOfParent') || 
                 record.elementId.includes('NetIncome')) {
        metrics.netIncome = value
      } else if (record.elementId.includes('TotalAssets')) {
        metrics.totalAssets = value
      } else if (record.elementId.includes('NetAssets') && !record.elementId.includes('Ratio')) {
        metrics.netAssets = value
      } else if (record.elementId.includes('BasicEarningsLossPerShare')) {
        metrics.basicEarningsPerShare = value
      } else if (record.elementId.includes('DilutedEarningsPerShare')) {
        metrics.dilutedEarningsPerShare = value
      } else if (record.elementId.includes('EquityToAssetRatio')) {
        metrics.equityRatio = value
      }
    }

    // Calculate derived metrics
    if (metrics.netIncome && metrics.netAssets) {
      metrics.roe = (metrics.netIncome / metrics.netAssets) * 100
    }

    if (metrics.netIncome && metrics.totalAssets) {
      metrics.roa = (metrics.netIncome / metrics.totalAssets) * 100
    }

    if (metrics.operatingIncome && metrics.netSales) {
      metrics.operatingProfitMargin = (metrics.operatingIncome / metrics.netSales) * 100
    }

    if (metrics.netIncome && metrics.netSales) {
      metrics.netProfitMargin = (metrics.netIncome / metrics.netSales) * 100
    }

    return metrics
  }

  private parseNumericValue(value: string): number | null {
    if (!value || value === '' || value === '-' || value === '－') {
      return null
    }

    // Remove commas and convert to number
    const cleaned = value.replace(/,/g, '').replace(/"/g, '')
    const parsed = parseFloat(cleaned)

    return isNaN(parsed) ? null : parsed
  }

  private async createOrUpdateCompany(companyInfo: any): Promise<number> {
    // Extract company info from filename or use defaults
    const companyData = {
      securitiesCode: companyInfo.securitiesCode,
      companyName: companyInfo.companyName || companyInfo.documentId,
      industry: companyInfo.industry,
      listingMarket: companyInfo.listingMarket,
      edinetCode: companyInfo.edinetCode
    }

    return await this.databaseService.createCompany(companyData)
  }

  private async saveFinancialData(companyId: number, companyInfo: any, financialData: any): Promise<void> {
    const data = {
      companyId,
      fiscalYear: financialData.fiscalYear || companyInfo.fiscalYear || new Date().getFullYear(),
      fiscalPeriod: financialData.fiscalPeriod || companyInfo.fiscalPeriod || 'FY',
      periodEnd: financialData.periodEnd || companyInfo.periodEnd,
      netSales: financialData.netSales,
      operatingIncome: financialData.operatingIncome,
      ordinaryIncome: financialData.ordinaryIncome,
      netIncome: financialData.netIncome,
      totalAssets: financialData.totalAssets,
      netAssets: financialData.netAssets,
      basicEarningsPerShare: financialData.basicEarningsPerShare,
      dilutedEarningsPerShare: financialData.dilutedEarningsPerShare,
      equityRatio: financialData.equityRatio,
      roe: financialData.roe,
      roa: financialData.roa,
      operatingProfitMargin: financialData.operatingProfitMargin,
      netProfitMargin: financialData.netProfitMargin,
      rawData: financialData.rawRecords
    }

    await this.databaseService.upsertFinancialData(data)
  }

  // Job status methods
  async updateJobStatus(jobId: string, status: string, errorMessage?: string): Promise<void> {
    await this.databaseService.updateJobStatus(jobId, status, errorMessage)
  }

  async updateJobProgress(jobId: string, processedFiles: number, totalFiles?: number): Promise<void> {
    await this.databaseService.updateJobProgress(jobId, processedFiles, totalFiles)
  }

  // Calculate financial metrics for a specific company/period
  async calculateFinancialMetrics(companyId: number, fiscalYear: number, fiscalPeriod: string): Promise<any> {
    // This method would implement advanced financial calculations
    // For now, we'll just return the existing data
    const result = await this.databaseService.query(`
      SELECT * FROM financial_data 
      WHERE company_id = $1 AND fiscal_year = $2 AND fiscal_period = $3
    `, [companyId, fiscalYear, fiscalPeriod])

    return result.rows[0]
  }

  // Load company mapping from downloaded_list.csv
  private async loadCompanyMapping(directoryPath: string): Promise<void> {
    try {
      // Go up one level from 'files' directory to find downloaded_list.csv
      const parentDir = path.dirname(directoryPath)
      const csvPath = path.join(parentDir, 'downloaded_list.csv')
      
      logger.info(`Loading company mapping from: ${csvPath}`)
      const fileContent = await fs.readFile(csvPath, 'utf-8')
      
      // Parse CSV
      const records = await new Promise<any[]>((resolve, reject) => {
        csvParse(fileContent, {
          columns: true,
          skip_empty_lines: true,
          delimiter: ',',
          quote: '"',
          escape: '"',
          trim: true,
          bom: true
        }, (err, data) => {
          if (err) reject(err)
          else resolve(data)
        })
      })

      // Build mapping
      this.companyMapping.clear()
      for (const record of records) {
        if (record.id && record['filer-name']) {
          this.companyMapping.set(record.id, {
            secCode: record['sec-code'] || '',
            companyName: record['filer-name']
          })
        }
      }

      logger.info(`Loaded ${this.companyMapping.size} company mappings from downloaded_list.csv`)
    } catch (error) {
      logger.warn('Failed to load downloaded_list.csv, will use document IDs as company names:', error)
    }
  }
}