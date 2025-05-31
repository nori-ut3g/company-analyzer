import * as fs from 'fs/promises';
import * as path from 'path';
import handlebars from 'handlebars';
import puppeteer from 'puppeteer';
import pool from '../config/database';
import { ChartGeneratorService } from './chartGeneratorService';

export interface ReportData {
  company: {
    id: number;
    name: string;
    securitiesCode: string;
  };
  period: {
    fiscalYear: number;
    fiscalPeriod: string;
  };
  financialStatements: any;
  metrics: any;
  analysis: {
    trends: any[];
    comparisons: any[];
  };
  charts: {
    [key: string]: string; // Base64 encoded chart images
  };
}

export class ReportGeneratorService {
  private chartGenerator: ChartGeneratorService;
  private templatesPath: string;
  
  constructor() {
    this.chartGenerator = new ChartGeneratorService();
    this.templatesPath = path.join(__dirname, '..', 'templates');
  }
  
  /**
   * Generate a complete financial report
   */
  async generateReport(
    companyId: number,
    fiscalYear: number,
    fiscalPeriod: string,
    format: 'html' | 'pdf' = 'pdf'
  ): Promise<Buffer> {
    // Gather all report data
    const reportData = await this.gatherReportData(companyId, fiscalYear, fiscalPeriod);
    
    // Generate charts
    reportData.charts = await this.generateCharts(reportData);
    
    // Render HTML
    const html = await this.renderHTML(reportData);
    
    if (format === 'html') {
      return Buffer.from(html);
    }
    
    // Convert to PDF
    const pdf = await this.convertToPDF(html);
    
    // Save report to database
    await this.saveReportToDatabase(reportData, pdf);
    
    return pdf;
  }
  
  /**
   * Gather all data needed for the report
   */
  private async gatherReportData(
    companyId: number,
    fiscalYear: number,
    fiscalPeriod: string
  ): Promise<ReportData> {
    const client = await pool.connect();
    
    try {
      // Get company info
      const companyResult = await client.query(
        'SELECT * FROM companies WHERE id = $1',
        [companyId]
      );
      
      if (companyResult.rows.length === 0) {
        throw new Error('Company not found');
      }
      
      const company = companyResult.rows[0];
      
      // Get financial statements
      const statementsResult = await client.query(`
        SELECT * FROM financial_statements
        WHERE company_id = $1
          AND fiscal_year BETWEEN $2 - 2 AND $2
          AND fiscal_period = $3
        ORDER BY fiscal_year DESC
      `, [companyId, fiscalYear, fiscalPeriod]);
      
      // Get analysis results
      const analysisResult = await client.query(`
        SELECT 
          fs.fiscal_year,
          fs.fiscal_period,
          ar.analysis_type,
          ar.metrics,
          ar.insights
        FROM financial_statements fs
        JOIN analysis_results ar ON fs.id = ar.financial_statement_id
        WHERE fs.company_id = $1
          AND fs.fiscal_year = $2
          AND fs.fiscal_period = $3
      `, [companyId, fiscalYear, fiscalPeriod]);
      
      // Get peer comparison data
      const peerResult = await client.query(`
        SELECT 
          c.company_name,
          c.securities_code,
          ar.metrics
        FROM companies c
        JOIN financial_statements fs ON c.id = fs.company_id
        JOIN analysis_results ar ON fs.id = ar.financial_statement_id
        WHERE fs.fiscal_year = $1
          AND fs.fiscal_period = $2
          AND ar.analysis_type = 'financial_metrics'
          AND c.id != $3
        ORDER BY (ar.metrics->>'roe')::numeric DESC
        LIMIT 5
      `, [fiscalYear, fiscalPeriod, companyId]);
      
      // Extract current period data
      const currentStatement = statementsResult.rows.find(
        s => s.fiscal_year === fiscalYear
      );
      
      const metrics = analysisResult.rows.find(
        a => a.analysis_type === 'financial_metrics'
      )?.metrics || {};
      
      return {
        company: {
          id: company.id,
          name: company.company_name,
          securitiesCode: company.securities_code
        },
        period: {
          fiscalYear,
          fiscalPeriod
        },
        financialStatements: currentStatement,
        metrics,
        analysis: {
          trends: statementsResult.rows,
          comparisons: peerResult.rows
        },
        charts: {}
      };
    } finally {
      client.release();
    }
  }
  
  /**
   * Generate charts for the report
   */
  private async generateCharts(reportData: ReportData): Promise<{ [key: string]: string }> {
    const charts: { [key: string]: string } = {};
    
    // Revenue trend chart
    const revenueTrend = reportData.analysis.trends.map(t => ({
      year: t.fiscal_year,
      value: t.net_sales || 0
    }));
    
    charts.revenueTrend = await this.chartGenerator.generateLineChart(
      revenueTrend,
      '売上高推移',
      '年度',
      '売上高（百万円）'
    );
    
    // Profitability metrics chart
    const profitabilityData = [
      { label: 'ROE', value: reportData.metrics.roe || 0 },
      { label: 'ROA', value: reportData.metrics.roa || 0 },
      { label: '営業利益率', value: reportData.metrics.operatingMargin || 0 },
      { label: '純利益率', value: reportData.metrics.netProfitMargin || 0 }
    ];
    
    charts.profitability = await this.chartGenerator.generateBarChart(
      profitabilityData,
      '収益性指標',
      '指標',
      '％'
    );
    
    // Balance sheet composition
    const bsData = [
      { label: '流動資産', value: reportData.financialStatements.current_assets || 0 },
      { label: '固定資産', value: reportData.financialStatements.fixed_assets || 0 },
      { label: '流動負債', value: reportData.financialStatements.current_liabilities || 0 },
      { label: '固定負債', value: reportData.financialStatements.fixed_liabilities || 0 },
      { label: '純資産', value: reportData.financialStatements.net_assets || 0 }
    ];
    
    charts.balanceSheet = await this.chartGenerator.generatePieChart(
      bsData,
      '貸借対照表構成'
    );
    
    return charts;
  }
  
  /**
   * Render HTML using Handlebars template
   */
  private async renderHTML(reportData: ReportData): Promise<string> {
    // Register Handlebars helpers
    handlebars.registerHelper('formatNumber', (value: number) => {
      if (value === null || value === undefined) return 'N/A';
      return value.toLocaleString('ja-JP');
    });
    
    handlebars.registerHelper('formatPercent', (value: number) => {
      if (value === null || value === undefined) return 'N/A';
      return `${value.toFixed(2)}%`;
    });
    
    handlebars.registerHelper('formatDate', (date: Date) => {
      return new Date(date).toLocaleDateString('ja-JP');
    });
    
    // Load template
    const templatePath = path.join(this.templatesPath, 'financial-report.hbs');
    const templateContent = await fs.readFile(templatePath, 'utf-8');
    const template = handlebars.compile(templateContent);
    
    // Render HTML
    return template(reportData);
  }
  
  /**
   * Convert HTML to PDF using Puppeteer
   */
  private async convertToPDF(html: string): Promise<Buffer> {
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    try {
      const page = await browser.newPage();
      
      // Set content
      await page.setContent(html, {
        waitUntil: 'networkidle0'
      });
      
      // Generate PDF
      const pdf = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: {
          top: '20mm',
          right: '20mm',
          bottom: '20mm',
          left: '20mm'
        }
      });
      
      return pdf;
    } finally {
      await browser.close();
    }
  }
  
  /**
   * Save generated report to database
   */
  private async saveReportToDatabase(
    reportData: ReportData,
    pdfBuffer: Buffer
  ): Promise<void> {
    const client = await pool.connect();
    
    try {
      await client.query(`
        INSERT INTO reports (
          company_id,
          report_type,
          fiscal_year,
          fiscal_period,
          report_data,
          file_path,
          created_at,
          created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, NOW(), $7)
      `, [
        reportData.company.id,
        'Financial Analysis Report',
        reportData.period.fiscalYear,
        reportData.period.fiscalPeriod,
        JSON.stringify(reportData),
        null, // File path would be set if saving to file system
        'system'
      ]);
    } finally {
      client.release();
    }
  }
  
  /**
   * Get report history for a company
   */
  async getReportHistory(companyId: number): Promise<any[]> {
    const client = await pool.connect();
    
    try {
      const result = await client.query(`
        SELECT 
          id,
          report_type,
          fiscal_year,
          fiscal_period,
          created_at,
          created_by
        FROM reports
        WHERE company_id = $1
        ORDER BY created_at DESC
      `, [companyId]);
      
      return result.rows;
    } finally {
      client.release();
    }
  }
}