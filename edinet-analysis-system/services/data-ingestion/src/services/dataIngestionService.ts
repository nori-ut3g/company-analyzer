import * as path from 'path';
import * as fs from 'fs/promises';
import pool from '../config/database';
import { EdinetParser } from './edinetParser';

export class DataIngestionService {
  private parser: EdinetParser;
  
  constructor() {
    this.parser = new EdinetParser();
  }
  
  /**
   * Ingest EDINET data from a specific year
   */
  async ingestYearData(year: string): Promise<{
    processed: number;
    failed: number;
    errors: string[];
  }> {
    const result = {
      processed: 0,
      failed: 0,
      errors: [] as string[]
    };
    
    try {
      // Load metadata
      const metadataPath = path.join(
        process.env.EDINET_DATA_PATH || '/Users/nori/claude-project/company-analyzer/resource/EDINET',
        year,
        'downloaded_list.csv'
      );
      
      const metadata = await this.parser.parseDownloadedList(metadataPath);
      
      // Get all ZIP files
      const filesDir = path.join(
        process.env.EDINET_DATA_PATH || '/Users/nori/claude-project/company-analyzer/resource/EDINET',
        year,
        'files'
      );
      
      const files = await fs.readdir(filesDir);
      const zipFiles = files.filter(f => f.endsWith('.zip'));
      
      // Process each ZIP file
      for (const zipFile of zipFiles) {
        try {
          const zipPath = path.join(filesDir, zipFile);
          const documentId = path.basename(zipFile, '.zip');
          
          // Parse ZIP file
          const { document, financialData } = await this.parser.parseZipFile(zipPath);
          
          // Enrich document with metadata
          const meta = metadata.get(documentId);
          if (meta) {
            document.secCode = meta.secCode;
            document.companyName = document.companyName || meta.companyName;
          }
          
          // Save to database
          await this.saveToDatabase(document, financialData, year);
          
          result.processed++;
        } catch (error) {
          result.failed++;
          result.errors.push(`Failed to process ${zipFile}: ${error}`);
          console.error(`Error processing ${zipFile}:`, error);
        }
      }
      
      return result;
    } catch (error) {
      throw new Error(`Failed to ingest year ${year}: ${error}`);
    }
  }
  
  /**
   * Save parsed data to database
   */
  private async saveToDatabase(
    document: any,
    financialData: any[],
    year: string
  ): Promise<void> {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // 1. Upsert company
      const companyResult = await client.query(`
        INSERT INTO companies (
          securities_code,
          company_name,
          created_at,
          updated_at
        ) VALUES ($1, $2, NOW(), NOW())
        ON CONFLICT (securities_code) 
        DO UPDATE SET 
          company_name = EXCLUDED.company_name,
          updated_at = NOW()
        RETURNING id
      `, [document.secCode, document.companyName]);
      
      const companyId = companyResult.rows[0].id;
      
      // 2. Extract key metrics
      const metrics = this.parser.extractKeyMetrics(financialData);
      
      // 3. Insert financial statement
      const statementResult = await client.query(`
        INSERT INTO financial_statements (
          company_id,
          fiscal_year,
          fiscal_period,
          report_type,
          net_sales,
          operating_income,
          ordinary_income,
          net_income,
          total_assets,
          net_assets,
          capital_stock,
          raw_data,
          created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW())
        ON CONFLICT (company_id, fiscal_year, fiscal_period, report_type)
        DO UPDATE SET
          net_sales = EXCLUDED.net_sales,
          operating_income = EXCLUDED.operating_income,
          ordinary_income = EXCLUDED.ordinary_income,
          net_income = EXCLUDED.net_income,
          total_assets = EXCLUDED.total_assets,
          net_assets = EXCLUDED.net_assets,
          capital_stock = EXCLUDED.capital_stock,
          raw_data = EXCLUDED.raw_data,
          created_at = NOW()
        RETURNING id
      `, [
        companyId,
        parseInt(document.fiscalYear || year),
        document.fiscalPeriod || 'FY',
        document.reportType,
        metrics.netSales,
        metrics.operatingIncome,
        metrics.ordinaryIncome,
        metrics.netIncome,
        metrics.totalAssets,
        metrics.netAssets,
        metrics.capitalStock,
        JSON.stringify({ document, financialData })
      ]);
      
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
  
  /**
   * Get ingestion status
   */
  async getIngestionStatus(): Promise<{
    totalCompanies: number;
    totalStatements: number;
    yearsSummary: any[];
  }> {
    const client = await pool.connect();
    
    try {
      // Get total companies
      const companiesResult = await client.query(
        'SELECT COUNT(*) as count FROM companies'
      );
      
      // Get total statements
      const statementsResult = await client.query(
        'SELECT COUNT(*) as count FROM financial_statements'
      );
      
      // Get summary by year
      const yearsResult = await client.query(`
        SELECT 
          fiscal_year,
          COUNT(DISTINCT company_id) as companies_count,
          COUNT(*) as statements_count
        FROM financial_statements
        GROUP BY fiscal_year
        ORDER BY fiscal_year DESC
      `);
      
      return {
        totalCompanies: parseInt(companiesResult.rows[0].count),
        totalStatements: parseInt(statementsResult.rows[0].count),
        yearsSummary: yearsResult.rows
      };
    } finally {
      client.release();
    }
  }
}