import { Router } from 'express';
import pool from '../config/database';

const router = Router();

// Get all available metrics for a company
router.get('/company/:companyId', async (req, res, next) => {
  try {
    const { companyId } = req.params;
    const client = await pool.connect();
    
    try {
      const result = await client.query(`
        SELECT 
          fs.id,
          fs.fiscal_year,
          fs.fiscal_period,
          fs.report_type,
          fs.net_sales,
          fs.operating_income,
          fs.ordinary_income,
          fs.net_income,
          fs.total_assets,
          fs.net_assets,
          fs.capital_stock,
          ar.metrics as calculated_metrics,
          fs.created_at
        FROM financial_statements fs
        LEFT JOIN analysis_results ar ON fs.id = ar.financial_statement_id
          AND ar.analysis_type = 'financial_metrics'
        WHERE fs.company_id = $1
        ORDER BY fs.fiscal_year DESC, 
          CASE fs.fiscal_period
            WHEN 'FY' THEN 5
            WHEN 'Q4' THEN 4
            WHEN 'Q3' THEN 3
            WHEN 'Q2' THEN 2
            WHEN 'Q1' THEN 1
          END DESC
      `, [companyId]);
      
      res.json({
        companyId: parseInt(companyId),
        statements: result.rows
      });
    } finally {
      client.release();
    }
  } catch (error) {
    next(error);
  }
});

// Get metric definitions
router.get('/definitions', async (req, res) => {
  res.json({
    metrics: {
      roe: {
        name: 'Return on Equity (ROE)',
        description: '純利益 ÷ 純資産 × 100',
        unit: '%',
        category: 'profitability'
      },
      roa: {
        name: 'Return on Assets (ROA)',
        description: '純利益 ÷ 総資産 × 100',
        unit: '%',
        category: 'profitability'
      },
      netProfitMargin: {
        name: 'Net Profit Margin',
        description: '純利益 ÷ 売上高 × 100',
        unit: '%',
        category: 'profitability'
      },
      operatingMargin: {
        name: 'Operating Margin',
        description: '営業利益 ÷ 売上高 × 100',
        unit: '%',
        category: 'profitability'
      },
      assetTurnover: {
        name: 'Asset Turnover Ratio',
        description: '売上高 ÷ 総資産',
        unit: '倍',
        category: 'efficiency'
      },
      debtToEquity: {
        name: 'Debt to Equity Ratio',
        description: '負債 ÷ 純資産',
        unit: '倍',
        category: 'leverage'
      },
      equityRatio: {
        name: 'Equity Ratio',
        description: '純資産 ÷ 総資産 × 100',
        unit: '%',
        category: 'leverage'
      },
      salesGrowth: {
        name: 'Sales Growth Rate',
        description: '前年同期比売上高成長率',
        unit: '%',
        category: 'growth'
      },
      netIncomeGrowth: {
        name: 'Net Income Growth Rate',
        description: '前年同期比純利益成長率',
        unit: '%',
        category: 'growth'
      },
      assetGrowth: {
        name: 'Asset Growth Rate',
        description: '前年同期比総資産成長率',
        unit: '%',
        category: 'growth'
      }
    }
  });
});

// Get top performers by metric
router.get('/top-performers', async (req, res, next) => {
  try {
    const { metric, fiscalYear, fiscalPeriod, limit } = req.query;
    
    if (!metric || !fiscalYear || !fiscalPeriod) {
      return res.status(400).json({
        error: 'metric, fiscalYear, and fiscalPeriod are required'
      });
    }
    
    const client = await pool.connect();
    
    try {
      const result = await client.query(`
        SELECT 
          c.id as company_id,
          c.company_name,
          c.securities_code,
          (ar.metrics->>'${metric}')::numeric as metric_value
        FROM companies c
        JOIN financial_statements fs ON c.id = fs.company_id
        JOIN analysis_results ar ON fs.id = ar.financial_statement_id
        WHERE fs.fiscal_year = $1
          AND fs.fiscal_period = $2
          AND ar.analysis_type = 'financial_metrics'
          AND ar.metrics->>'${metric}' IS NOT NULL
        ORDER BY (ar.metrics->>'${metric}')::numeric DESC
        LIMIT $3
      `, [fiscalYear, fiscalPeriod, limit || 10]);
      
      res.json({
        metric,
        fiscalYear: parseInt(fiscalYear as string),
        fiscalPeriod,
        topPerformers: result.rows
      });
    } finally {
      client.release();
    }
  } catch (error) {
    next(error);
  }
});

export default router;