import pool from '../config/database';

export interface TimeSeriesData {
  fiscalYear: number;
  fiscalPeriod: string;
  metrics: {
    netSales: number | null;
    operatingIncome: number | null;
    ordinaryIncome: number | null;
    netIncome: number | null;
    totalAssets: number | null;
    netAssets: number | null;
    roe: number | null;
    roa: number | null;
  };
}

export interface TrendAnalysis {
  metric: string;
  trend: 'increasing' | 'decreasing' | 'stable' | 'volatile';
  averageGrowthRate: number | null;
  volatility: number | null;
  forecast: {
    nextPeriod: number | null;
    confidence: number;
  };
}

export class TimeSeriesAnalysisService {
  /**
   * Get time series data for a company
   */
  async getTimeSeriesData(
    companyId: number,
    startYear: number,
    endYear: number
  ): Promise<TimeSeriesData[]> {
    const client = await pool.connect();
    
    try {
      const result = await client.query(`
        SELECT 
          fs.fiscal_year,
          fs.fiscal_period,
          fs.net_sales,
          fs.operating_income,
          fs.ordinary_income,
          fs.net_income,
          fs.total_assets,
          fs.net_assets,
          ar.metrics
        FROM financial_statements fs
        LEFT JOIN analysis_results ar ON fs.id = ar.financial_statement_id
          AND ar.analysis_type = 'financial_metrics'
        WHERE fs.company_id = $1
          AND fs.fiscal_year BETWEEN $2 AND $3
        ORDER BY fs.fiscal_year, 
          CASE fs.fiscal_period
            WHEN 'Q1' THEN 1
            WHEN 'Q2' THEN 2
            WHEN 'Q3' THEN 3
            WHEN 'Q4' THEN 4
            WHEN 'FY' THEN 5
          END
      `, [companyId, startYear, endYear]);
      
      return result.rows.map(row => ({
        fiscalYear: row.fiscal_year,
        fiscalPeriod: row.fiscal_period,
        metrics: {
          netSales: row.net_sales,
          operatingIncome: row.operating_income,
          ordinaryIncome: row.ordinary_income,
          netIncome: row.net_income,
          totalAssets: row.total_assets,
          netAssets: row.net_assets,
          roe: row.metrics?.roe || null,
          roa: row.metrics?.roa || null
        }
      }));
    } finally {
      client.release();
    }
  }
  
  /**
   * Analyze trends for specific metrics
   */
  async analyzeTrends(
    companyId: number,
    metrics: string[],
    periods: number = 12
  ): Promise<TrendAnalysis[]> {
    // Get recent time series data
    const endYear = new Date().getFullYear();
    const startYear = endYear - Math.ceil(periods / 4) - 1;
    
    const timeSeriesData = await this.getTimeSeriesData(
      companyId,
      startYear,
      endYear
    );
    
    const trendAnalyses: TrendAnalysis[] = [];
    
    for (const metric of metrics) {
      const values = this.extractMetricValues(timeSeriesData, metric);
      
      if (values.length < 3) {
        continue; // Not enough data for trend analysis
      }
      
      const trend = this.determineTrend(values);
      const avgGrowthRate = this.calculateAverageGrowthRate(values);
      const volatility = this.calculateVolatility(values);
      const forecast = this.simpleForecast(values);
      
      trendAnalyses.push({
        metric,
        trend,
        averageGrowthRate: avgGrowthRate,
        volatility,
        forecast
      });
    }
    
    return trendAnalyses;
  }
  
  /**
   * Extract values for a specific metric from time series data
   */
  private extractMetricValues(
    data: TimeSeriesData[],
    metric: string
  ): number[] {
    return data
      .map(d => (d.metrics as any)[metric])
      .filter(v => v !== null && v !== undefined);
  }
  
  /**
   * Determine trend based on values
   */
  private determineTrend(values: number[]): 'increasing' | 'decreasing' | 'stable' | 'volatile' {
    if (values.length < 3) return 'stable';
    
    // Calculate linear regression slope
    const n = values.length;
    const x = Array.from({ length: n }, (_, i) => i);
    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = values.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((sum, xi, i) => sum + xi * values[i], 0);
    const sumX2 = x.reduce((sum, xi) => sum + xi * xi, 0);
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const avgValue = sumY / n;
    const relativeSlope = slope / avgValue;
    
    // Calculate coefficient of variation
    const variance = values.reduce((sum, v) => sum + Math.pow(v - avgValue, 2), 0) / n;
    const stdDev = Math.sqrt(variance);
    const cv = stdDev / avgValue;
    
    // Determine trend
    if (cv > 0.3) return 'volatile';
    if (Math.abs(relativeSlope) < 0.02) return 'stable';
    if (relativeSlope > 0) return 'increasing';
    return 'decreasing';
  }
  
  /**
   * Calculate average growth rate
   */
  private calculateAverageGrowthRate(values: number[]): number | null {
    if (values.length < 2) return null;
    
    const growthRates: number[] = [];
    
    for (let i = 1; i < values.length; i++) {
      if (values[i - 1] !== 0) {
        const rate = ((values[i] - values[i - 1]) / values[i - 1]) * 100;
        growthRates.push(rate);
      }
    }
    
    if (growthRates.length === 0) return null;
    
    return growthRates.reduce((a, b) => a + b, 0) / growthRates.length;
  }
  
  /**
   * Calculate volatility (standard deviation)
   */
  private calculateVolatility(values: number[]): number | null {
    if (values.length < 2) return null;
    
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);
    
    return (stdDev / mean) * 100; // Return as percentage
  }
  
  /**
   * Simple forecast using linear regression
   */
  private simpleForecast(values: number[]): {
    nextPeriod: number | null;
    confidence: number;
  } {
    if (values.length < 3) {
      return { nextPeriod: null, confidence: 0 };
    }
    
    // Use linear regression for simple forecast
    const n = values.length;
    const x = Array.from({ length: n }, (_, i) => i);
    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = values.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((sum, xi, i) => sum + xi * values[i], 0);
    const sumX2 = x.reduce((sum, xi) => sum + xi * xi, 0);
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;
    
    // Forecast next period
    const nextPeriod = slope * n + intercept;
    
    // Calculate R-squared for confidence
    const yMean = sumY / n;
    const ssTotal = values.reduce((sum, y) => sum + Math.pow(y - yMean, 2), 0);
    const ssResidual = values.reduce((sum, y, i) => {
      const predicted = slope * i + intercept;
      return sum + Math.pow(y - predicted, 2);
    }, 0);
    
    const rSquared = 1 - (ssResidual / ssTotal);
    const confidence = Math.max(0, Math.min(1, rSquared));
    
    return { nextPeriod, confidence };
  }
  
  /**
   * Get peer comparison over time
   */
  async getPeerComparison(
    companyIds: number[],
    metric: string,
    startYear: number,
    endYear: number
  ): Promise<any> {
    const client = await pool.connect();
    
    try {
      const result = await client.query(`
        SELECT 
          c.company_name,
          c.securities_code,
          fs.fiscal_year,
          fs.fiscal_period,
          fs.${metric} as value
        FROM companies c
        JOIN financial_statements fs ON c.id = fs.company_id
        WHERE c.id = ANY($1)
          AND fs.fiscal_year BETWEEN $2 AND $3
          AND fs.${metric} IS NOT NULL
        ORDER BY fs.fiscal_year, 
          CASE fs.fiscal_period
            WHEN 'Q1' THEN 1
            WHEN 'Q2' THEN 2
            WHEN 'Q3' THEN 3
            WHEN 'Q4' THEN 4
            WHEN 'FY' THEN 5
          END,
          c.company_name
      `, [companyIds, startYear, endYear]);
      
      // Group by company
      const companiesData: { [key: string]: any } = {};
      
      for (const row of result.rows) {
        const key = row.securities_code;
        if (!companiesData[key]) {
          companiesData[key] = {
            companyName: row.company_name,
            securitiesCode: row.securities_code,
            data: []
          };
        }
        
        companiesData[key].data.push({
          fiscalYear: row.fiscal_year,
          fiscalPeriod: row.fiscal_period,
          value: row.value
        });
      }
      
      return Object.values(companiesData);
    } finally {
      client.release();
    }
  }
}