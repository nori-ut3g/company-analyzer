import pool from '../config/database';

export interface FinancialMetrics {
  // Profitability Ratios
  roe: number | null;              // Return on Equity
  roa: number | null;              // Return on Assets
  netProfitMargin: number | null;  // Net Profit Margin
  operatingMargin: number | null;  // Operating Margin
  
  // Efficiency Ratios
  assetTurnover: number | null;    // Asset Turnover Ratio
  
  // Leverage Ratios
  debtToEquity: number | null;     // Debt to Equity Ratio
  equityRatio: number | null;      // Equity Ratio
  
  // Growth Metrics
  salesGrowth: number | null;      // Year-over-Year Sales Growth
  netIncomeGrowth: number | null;  // Year-over-Year Net Income Growth
  assetGrowth: number | null;      // Year-over-Year Asset Growth
  
  // Per Share Metrics
  eps: number | null;              // Earnings Per Share
  bps: number | null;              // Book Value Per Share
}

export class FinancialMetricsService {
  /**
   * Calculate financial metrics for a company in a specific period
   */
  async calculateMetrics(
    companyId: number,
    fiscalYear: number,
    fiscalPeriod: string
  ): Promise<FinancialMetrics> {
    const client = await pool.connect();
    
    try {
      // Get current period data
      const currentPeriod = await this.getFinancialStatement(
        client,
        companyId,
        fiscalYear,
        fiscalPeriod
      );
      
      if (!currentPeriod) {
        throw new Error('Financial statement not found');
      }
      
      // Get previous year data for growth calculations
      const previousYear = await this.getFinancialStatement(
        client,
        companyId,
        fiscalYear - 1,
        fiscalPeriod
      );
      
      // Calculate metrics
      const metrics: FinancialMetrics = {
        // Profitability Ratios
        roe: this.calculateROE(currentPeriod),
        roa: this.calculateROA(currentPeriod),
        netProfitMargin: this.calculateNetProfitMargin(currentPeriod),
        operatingMargin: this.calculateOperatingMargin(currentPeriod),
        
        // Efficiency Ratios
        assetTurnover: this.calculateAssetTurnover(currentPeriod),
        
        // Leverage Ratios
        debtToEquity: this.calculateDebtToEquity(currentPeriod),
        equityRatio: this.calculateEquityRatio(currentPeriod),
        
        // Growth Metrics
        salesGrowth: this.calculateGrowth(
          previousYear?.net_sales,
          currentPeriod.net_sales
        ),
        netIncomeGrowth: this.calculateGrowth(
          previousYear?.net_income,
          currentPeriod.net_income
        ),
        assetGrowth: this.calculateGrowth(
          previousYear?.total_assets,
          currentPeriod.total_assets
        ),
        
        // Per Share Metrics (placeholder - needs share count)
        eps: null,
        bps: null
      };
      
      // Save metrics to database
      await this.saveMetrics(client, companyId, fiscalYear, fiscalPeriod, metrics);
      
      return metrics;
    } finally {
      client.release();
    }
  }
  
  /**
   * Get financial statement from database
   */
  private async getFinancialStatement(
    client: any,
    companyId: number,
    fiscalYear: number,
    fiscalPeriod: string
  ): Promise<any> {
    const result = await client.query(`
      SELECT * FROM financial_statements
      WHERE company_id = $1 
        AND fiscal_year = $2 
        AND fiscal_period = $3
        AND report_type = 'Quarterly Report'
    `, [companyId, fiscalYear, fiscalPeriod]);
    
    return result.rows[0];
  }
  
  /**
   * Calculate Return on Equity (ROE)
   */
  private calculateROE(statement: any): number | null {
    if (!statement.net_income || !statement.net_assets) {
      return null;
    }
    return (statement.net_income / statement.net_assets) * 100;
  }
  
  /**
   * Calculate Return on Assets (ROA)
   */
  private calculateROA(statement: any): number | null {
    if (!statement.net_income || !statement.total_assets) {
      return null;
    }
    return (statement.net_income / statement.total_assets) * 100;
  }
  
  /**
   * Calculate Net Profit Margin
   */
  private calculateNetProfitMargin(statement: any): number | null {
    if (!statement.net_income || !statement.net_sales) {
      return null;
    }
    return (statement.net_income / statement.net_sales) * 100;
  }
  
  /**
   * Calculate Operating Margin
   */
  private calculateOperatingMargin(statement: any): number | null {
    if (!statement.operating_income || !statement.net_sales) {
      return null;
    }
    return (statement.operating_income / statement.net_sales) * 100;
  }
  
  /**
   * Calculate Asset Turnover Ratio
   */
  private calculateAssetTurnover(statement: any): number | null {
    if (!statement.net_sales || !statement.total_assets) {
      return null;
    }
    return statement.net_sales / statement.total_assets;
  }
  
  /**
   * Calculate Debt to Equity Ratio
   */
  private calculateDebtToEquity(statement: any): number | null {
    if (!statement.total_assets || !statement.net_assets) {
      return null;
    }
    const totalDebt = statement.total_assets - statement.net_assets;
    return totalDebt / statement.net_assets;
  }
  
  /**
   * Calculate Equity Ratio
   */
  private calculateEquityRatio(statement: any): number | null {
    if (!statement.net_assets || !statement.total_assets) {
      return null;
    }
    return (statement.net_assets / statement.total_assets) * 100;
  }
  
  /**
   * Calculate growth rate
   */
  private calculateGrowth(previousValue: number | null, currentValue: number | null): number | null {
    if (!previousValue || !currentValue || previousValue === 0) {
      return null;
    }
    return ((currentValue - previousValue) / previousValue) * 100;
  }
  
  /**
   * Save calculated metrics to database
   */
  private async saveMetrics(
    client: any,
    companyId: number,
    fiscalYear: number,
    fiscalPeriod: string,
    metrics: FinancialMetrics
  ): Promise<void> {
    // First, get the financial statement ID
    const statementResult = await client.query(`
      SELECT id FROM financial_statements
      WHERE company_id = $1 
        AND fiscal_year = $2 
        AND fiscal_period = $3
        AND report_type = 'Quarterly Report'
    `, [companyId, fiscalYear, fiscalPeriod]);
    
    if (statementResult.rows.length === 0) {
      throw new Error('Financial statement not found');
    }
    
    const statementId = statementResult.rows[0].id;
    
    // Insert or update analysis results
    await client.query(`
      INSERT INTO analysis_results (
        financial_statement_id,
        analysis_type,
        metrics,
        created_at
      ) VALUES ($1, $2, $3, NOW())
      ON CONFLICT (financial_statement_id, analysis_type)
      DO UPDATE SET
        metrics = EXCLUDED.metrics,
        created_at = NOW()
    `, [statementId, 'financial_metrics', JSON.stringify(metrics)]);
  }
  
  /**
   * Get metrics for multiple companies for comparison
   */
  async getComparativeMetrics(
    companyIds: number[],
    fiscalYear: number,
    fiscalPeriod: string
  ): Promise<any[]> {
    const client = await pool.connect();
    
    try {
      const result = await client.query(`
        SELECT 
          c.id as company_id,
          c.company_name,
          c.securities_code,
          fs.fiscal_year,
          fs.fiscal_period,
          ar.metrics
        FROM companies c
        JOIN financial_statements fs ON c.id = fs.company_id
        LEFT JOIN analysis_results ar ON fs.id = ar.financial_statement_id
        WHERE c.id = ANY($1)
          AND fs.fiscal_year = $2
          AND fs.fiscal_period = $3
          AND ar.analysis_type = 'financial_metrics'
        ORDER BY c.company_name
      `, [companyIds, fiscalYear, fiscalPeriod]);
      
      return result.rows;
    } finally {
      client.release();
    }
  }
  
  /**
   * Get industry average metrics
   */
  async getIndustryAverageMetrics(
    industryCode: string,
    fiscalYear: number,
    fiscalPeriod: string
  ): Promise<FinancialMetrics> {
    const client = await pool.connect();
    
    try {
      // This is a simplified version - in production, you'd have industry classifications
      const result = await client.query(`
        SELECT 
          AVG((ar.metrics->>'roe')::numeric) as avg_roe,
          AVG((ar.metrics->>'roa')::numeric) as avg_roa,
          AVG((ar.metrics->>'netProfitMargin')::numeric) as avg_net_profit_margin,
          AVG((ar.metrics->>'operatingMargin')::numeric) as avg_operating_margin,
          AVG((ar.metrics->>'assetTurnover')::numeric) as avg_asset_turnover,
          AVG((ar.metrics->>'debtToEquity')::numeric) as avg_debt_to_equity,
          AVG((ar.metrics->>'equityRatio')::numeric) as avg_equity_ratio,
          AVG((ar.metrics->>'salesGrowth')::numeric) as avg_sales_growth,
          AVG((ar.metrics->>'netIncomeGrowth')::numeric) as avg_net_income_growth,
          AVG((ar.metrics->>'assetGrowth')::numeric) as avg_asset_growth
        FROM financial_statements fs
        JOIN analysis_results ar ON fs.id = ar.financial_statement_id
        WHERE fs.fiscal_year = $1
          AND fs.fiscal_period = $2
          AND ar.analysis_type = 'financial_metrics'
      `, [fiscalYear, fiscalPeriod]);
      
      const row = result.rows[0];
      
      return {
        roe: row.avg_roe,
        roa: row.avg_roa,
        netProfitMargin: row.avg_net_profit_margin,
        operatingMargin: row.avg_operating_margin,
        assetTurnover: row.avg_asset_turnover,
        debtToEquity: row.avg_debt_to_equity,
        equityRatio: row.avg_equity_ratio,
        salesGrowth: row.avg_sales_growth,
        netIncomeGrowth: row.avg_net_income_growth,
        assetGrowth: row.avg_asset_growth,
        eps: null,
        bps: null
      };
    } finally {
      client.release();
    }
  }
}