import * as fs from 'fs/promises';
import * as path from 'path';
import * as unzipper from 'unzipper';
import { parse } from 'csv-parse';
import * as iconv from 'iconv-lite';
import { Readable } from 'stream';

export interface EdinetDocument {
  documentId: string;
  secCode: string;
  companyName: string;
  reportType: string;
  fiscalYear: string;
  fiscalPeriod: string;
}

export interface FinancialData {
  elementId: string;
  itemName: string;
  contextId: string;
  relativeYear: string;
  consolidatedFlag: string;
  periodType: string;
  unitId: string;
  unit: string;
  value: string;
}

export class EdinetParser {
  /**
   * Parse EDINET ZIP file and extract financial data
   */
  async parseZipFile(zipPath: string): Promise<{
    document: EdinetDocument;
    financialData: FinancialData[];
  }> {
    const financialData: FinancialData[] = [];
    const documentId = path.basename(zipPath, '.zip');
    
    // Extract and parse ZIP file
    const zip = await unzipper.Open.file(zipPath);
    
    for (const entry of zip.files) {
      if (entry.path.endsWith('.csv') && entry.path.includes('XBRL_TO_CSV')) {
        const content = await entry.buffer();
        const decodedContent = iconv.decode(content, 'UTF-16LE');
        
        // Parse CSV
        const records = await this.parseCSV(decodedContent);
        
        // Transform records to FinancialData
        for (const record of records) {
          financialData.push({
            elementId: record['要素ID'] || '',
            itemName: record['項目名'] || '',
            contextId: record['コンテキストID'] || '',
            relativeYear: record['相対年度'] || '',
            consolidatedFlag: record['連結・個別'] || '',
            periodType: record['期間・時点'] || '',
            unitId: record['ユニットID'] || '',
            unit: record['単位'] || '',
            value: record['値'] || ''
          });
        }
      }
    }
    
    // Extract document info from financial data
    const document = this.extractDocumentInfo(documentId, financialData);
    
    return { document, financialData };
  }
  
  /**
   * Parse CSV content
   */
  private async parseCSV(content: string): Promise<any[]> {
    return new Promise((resolve, reject) => {
      const records: any[] = [];
      
      const parser = parse({
        columns: true,
        skip_empty_lines: true,
        trim: true,
        bom: true
      });
      
      parser.on('data', (record) => {
        records.push(record);
      });
      
      parser.on('error', (err) => {
        reject(err);
      });
      
      parser.on('end', () => {
        resolve(records);
      });
      
      // Convert string to stream
      const stream = Readable.from(content);
      stream.pipe(parser);
    });
  }
  
  /**
   * Extract document information from financial data
   */
  private extractDocumentInfo(documentId: string, financialData: FinancialData[]): EdinetDocument {
    // Extract fiscal year and period from context
    let fiscalYear = '';
    let fiscalPeriod = '';
    let companyName = '';
    
    for (const data of financialData) {
      // Look for company name
      if (data.itemName.includes('提出会社名') || data.itemName.includes('会社名')) {
        companyName = data.value;
      }
      
      // Extract fiscal year from context ID (e.g., CurrentYearDuration)
      if (data.contextId.includes('CurrentYear')) {
        const yearMatch = data.relativeYear.match(/\d{4}/);
        if (yearMatch) {
          fiscalYear = yearMatch[0];
        }
      }
      
      // Determine fiscal period
      if (data.contextId.includes('Q1') || data.contextId.includes('FirstQuarter')) {
        fiscalPeriod = 'Q1';
      } else if (data.contextId.includes('Q2') || data.contextId.includes('SecondQuarter')) {
        fiscalPeriod = 'Q2';
      } else if (data.contextId.includes('Q3') || data.contextId.includes('ThirdQuarter')) {
        fiscalPeriod = 'Q3';
      } else if (data.contextId.includes('Q4') || data.contextId.includes('Year')) {
        fiscalPeriod = 'FY';
      }
    }
    
    return {
      documentId,
      secCode: '', // Will be populated from downloaded_list.csv
      companyName,
      reportType: 'Quarterly Report', // Default
      fiscalYear,
      fiscalPeriod
    };
  }
  
  /**
   * Parse downloaded list CSV to get company metadata
   */
  async parseDownloadedList(csvPath: string): Promise<Map<string, {
    secCode: string;
    companyName: string;
    description: string;
  }>> {
    const content = await fs.readFile(csvPath, 'utf-8');
    const records = await this.parseCSV(content);
    
    const metadata = new Map();
    
    for (const record of records) {
      metadata.set(record.id, {
        secCode: record['sec-code'] || '',
        companyName: record['filer-name'] || '',
        description: record['description'] || ''
      });
    }
    
    return metadata;
  }
  
  /**
   * Extract key financial metrics from financial data
   */
  extractKeyMetrics(financialData: FinancialData[]): {
    [key: string]: number | null;
  } {
    const metrics: { [key: string]: number | null } = {
      netSales: null,
      operatingIncome: null,
      ordinaryIncome: null,
      netIncome: null,
      totalAssets: null,
      netAssets: null,
      capitalStock: null
    };
    
    const metricMappings = {
      '売上高': 'netSales',
      '営業利益': 'operatingIncome',
      '経常利益': 'ordinaryIncome',
      '当期純利益': 'netIncome',
      '親会社株主に帰属する当期純利益': 'netIncome',
      '総資産額': 'totalAssets',
      '資産合計': 'totalAssets',
      '純資産額': 'netAssets',
      '純資産合計': 'netAssets',
      '資本金': 'capitalStock'
    };
    
    for (const data of financialData) {
      // Only consider current year data
      if (!data.contextId.includes('CurrentYear') && !data.relativeYear.includes('0')) {
        continue;
      }
      
      // Check if this is a key metric
      for (const [jpName, metricKey] of Object.entries(metricMappings)) {
        if (data.itemName.includes(jpName)) {
          const value = this.parseNumericValue(data.value);
          if (value !== null) {
            metrics[metricKey] = value;
          }
        }
      }
    }
    
    return metrics;
  }
  
  /**
   * Parse numeric value from string
   */
  private parseNumericValue(value: string): number | null {
    if (!value || value === '' || value === 'NaN') {
      return null;
    }
    
    // Remove commas and parse
    const cleanValue = value.replace(/,/g, '');
    const parsed = parseFloat(cleanValue);
    
    return isNaN(parsed) ? null : parsed;
  }
}