import { Router, Request, Response, NextFunction } from 'express';
import { Pool } from 'pg';
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

    const offset = (parseInt(page as string) - 1) * parseInt(limit as string);
    
    let whereClause = 'WHERE is_active = true';
    const values: any[] = [];
    let valueIndex = 1;

    if (search) {
      whereClause += ` AND (company_name ILIKE $${valueIndex} OR company_name_en ILIKE $${valueIndex} OR edinet_code ILIKE $${valueIndex})`;
      values.push(`%${search}%`);
      valueIndex++;
    }

    if (industry) {
      whereClause += ` AND industry_code = $${valueIndex}`;
      values.push(industry);
      valueIndex++;
    }

    if (market) {
      whereClause += ` AND listing_market = $${valueIndex}`;
      values.push(market);
      valueIndex++;
    }

    const validSortFields = ['company_name', 'edinet_code', 'industry_name', 'listing_market', 'created_at'];
    const sortField = validSortFields.includes(sortBy as string) ? sortBy : 'company_name';
    const order = sortOrder === 'DESC' ? 'DESC' : 'ASC';

    const countQuery = `SELECT COUNT(*) FROM edinet.companies ${whereClause}`;
    const countResult = await pool.query(countQuery, values);
    const totalCount = parseInt(countResult.rows[0].count);

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
      ${whereClause}
      ORDER BY ${sortField} ${order}
      LIMIT $${valueIndex} OFFSET $${valueIndex + 1}
    `;

    values.push(parseInt(limit as string), offset);
    const result = await pool.query(query, values);

    res.json({
      companies: result.rows,
      pagination: {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        total: totalCount,
        totalPages: Math.ceil(totalCount / parseInt(limit as string))
      }
    });
  } catch (error) {
    next(error);
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
    const query = `
      SELECT DISTINCT industry_code, industry_name 
      FROM edinet.companies 
      WHERE industry_code IS NOT NULL AND is_active = true
      ORDER BY industry_name
    `;

    const result = await pool.query(query);
    res.json(result.rows);
  } catch (error) {
    next(error);
  }
});

// Get markets list
router.get('/meta/markets', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const query = `
      SELECT DISTINCT listing_market 
      FROM edinet.companies 
      WHERE listing_market IS NOT NULL AND is_active = true
      ORDER BY listing_market
    `;

    const result = await pool.query(query);
    res.json(result.rows.map(row => row.listing_market));
  } catch (error) {
    next(error);
  }
});

export default router;