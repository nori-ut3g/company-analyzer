import { Router, Request, Response, NextFunction } from 'express';
import { Pool } from 'pg';
import axios from 'axios';
import { config } from '../config';
import { ApiError } from '../utils/ApiError';
import { AuthenticatedRequest } from '../middleware/auth';

const router = Router();
const pool = new Pool({ connectionString: config.database.url });

// Get all companies with pagination and filtering
router.get('/', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const {
      page = '1',
      limit = '20',
      search = '',
      industry = '',
      market = '',
      sortBy = 'company_name',
      sortOrder = 'ASC'
    } = req.query;

    // Proxy to data ingestion service for now
    const response = await axios.get('http://edinet-data-ingestion:3005/api/ingestion/companies', {
      params: {
        page,
        limit,
        search,
        industry,
        market
      }
    });

    // Transform the response to match expected format
    const { companies, pagination } = response.data.data;
    
    res.json({
      companies: companies.map((c: any) => ({
        company_id: c.id,
        edinet_code: c.edinet_code,
        company_name: c.company_name,
        company_name_en: c.company_name_en || c.company_name,
        securities_code: c.securities_code,
        industry_code: c.industry,
        industry_name: c.industry,
        listing_market: c.listing_market,
        fiscal_year_end: c.fiscal_year_end,
        established_date: c.established_date,
        capital_stock: c.capital_stock,
        employee_count: c.employee_count,
        created_at: c.created_at,
        updated_at: c.updated_at
      })),
      pagination
    });
  } catch (error) {
    console.error('Error fetching companies:', error);
    // Return empty result on error
    res.json({
      companies: [],
      pagination: {
        page: parseInt(req.query.page as string) || 1,
        limit: parseInt(req.query.limit as string) || 20,
        total: 0,
        totalPages: 0
      }
    });
  }
});

// Get company by ID
router.get('/:companyId', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { companyId } = req.params;

    const query = `
      SELECT 
        company_id,
        edinet_code,
        company_name,
        company_name_en,
        industry_code,
        industry_name,
        listing_market,
        fiscal_year_end,
        established_date,
        capital_stock,
        employee_count,
        created_at,
        updated_at
      FROM edinet.companies 
      WHERE company_id = $1 AND is_active = true
    `;

    const result = await pool.query(query, [companyId]);

    if (result.rows.length === 0) {
      throw new ApiError(404, 'Company not found');
    }

    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

// Get company financial statements
router.get('/:companyId/financials', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { companyId } = req.params;
    const { 
      period_type = 'annual',
      statement_type,
      start_date,
      end_date,
      consolidated = 'true'
    } = req.query;

    let whereClause = 'WHERE company_id = $1 AND period_type = $2 AND consolidated = $3';
    const values: any[] = [companyId, period_type, consolidated === 'true'];
    let valueIndex = 4;

    if (statement_type) {
      whereClause += ` AND statement_type = $${valueIndex}`;
      values.push(statement_type);
      valueIndex++;
    }

    if (start_date) {
      whereClause += ` AND period_end >= $${valueIndex}`;
      values.push(start_date);
      valueIndex++;
    }

    if (end_date) {
      whereClause += ` AND period_end <= $${valueIndex}`;
      values.push(end_date);
      valueIndex++;
    }

    const query = `
      SELECT 
        statement_id,
        period_end,
        period_type,
        statement_type,
        account_item,
        account_item_en,
        amount,
        unit,
        consolidated,
        created_at
      FROM edinet.financial_statements 
      ${whereClause}
      ORDER BY period_end DESC, statement_type, account_item
    `;

    const result = await pool.query(query, values);

    res.json({
      company_id: companyId,
      financial_statements: result.rows
    });
  } catch (error) {
    next(error);
  }
});

// Get company stock prices
router.get('/:companyId/stock-prices', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { companyId } = req.params;
    const { 
      start_date,
      end_date,
      limit = '100'
    } = req.query;

    let whereClause = 'WHERE company_id = $1';
    const values: any[] = [companyId];
    let valueIndex = 2;

    if (start_date) {
      whereClause += ` AND trade_date >= $${valueIndex}`;
      values.push(start_date);
      valueIndex++;
    }

    if (end_date) {
      whereClause += ` AND trade_date <= $${valueIndex}`;
      values.push(end_date);
      valueIndex++;
    }

    const query = `
      SELECT 
        price_id,
        trade_date,
        open_price,
        high_price,
        low_price,
        close_price,
        adjusted_close,
        volume,
        created_at
      FROM edinet.stock_prices 
      ${whereClause}
      ORDER BY trade_date DESC
      LIMIT $${valueIndex}
    `;

    values.push(parseInt(limit as string));
    const result = await pool.query(query, values);

    res.json({
      company_id: companyId,
      stock_prices: result.rows
    });
  } catch (error) {
    next(error);
  }
});

// Get industry list
router.get('/meta/industries', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    // For now, return data from the data ingestion service
    const response = await axios.get('http://edinet-data-ingestion:3005/api/ingestion/companies?limit=1000');
    const companies = response.data.data.companies;
    
    // Extract unique industries
    const industries = [...new Set(companies
      .filter((c: any) => c.industry)
      .map((c: any) => c.industry))]
      .map(industry => ({ industry_code: industry, industry_name: industry }));
    
    res.json(industries);
  } catch (error) {
    console.error('Error fetching industries:', error);
    // Return empty array on error
    res.json([]);
  }
});

// Get markets list
router.get('/meta/markets', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    // For now, return data from the data ingestion service
    const response = await axios.get('http://edinet-data-ingestion:3005/api/ingestion/companies?limit=1000');
    const companies = response.data.data.companies;
    
    // Extract unique markets
    const markets = [...new Set(companies
      .filter((c: any) => c.listing_market)
      .map((c: any) => c.listing_market))];
    
    res.json(markets);
  } catch (error) {
    console.error('Error fetching markets:', error);
    // Return empty array on error
    res.json([]);
  }
});

export default router;