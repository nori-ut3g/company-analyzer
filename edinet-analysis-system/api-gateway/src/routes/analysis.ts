import { Router, Request, Response, NextFunction } from 'express';
import { Pool } from 'pg';
import axios from 'axios';
import { config } from '../config';
import { ApiError } from '../utils/ApiError';
import { AuthenticatedRequest } from '../middleware/auth';

const router = Router();
const pool = new Pool({ connectionString: config.database.url });

// Get analysis results for a company
router.get('/:companyId', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { companyId } = req.params;
    const { 
      analysis_type,
      start_date,
      end_date,
      limit = '10'
    } = req.query;

    let whereClause = 'WHERE company_id = $1';
    const values: any[] = [companyId];
    let valueIndex = 2;

    if (analysis_type) {
      whereClause += ` AND analysis_type = $${valueIndex}`;
      values.push(analysis_type);
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
        analysis_id,
        analysis_type,
        analysis_period,
        period_end,
        metrics,
        insights,
        score,
        created_at,
        updated_at
      FROM edinet.analysis_results 
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${valueIndex}
    `;

    values.push(parseInt(limit as string));
    const result = await pool.query(query, values);

    res.json({
      company_id: companyId,
      analysis_results: result.rows
    });
  } catch (error) {
    next(error);
  }
});

// Request new analysis
router.post('/:companyId/analyze', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { companyId } = req.params;
    const { analysis_type = 'comprehensive', period_end } = req.body;

    // Check if company exists
    const companyQuery = 'SELECT company_id FROM edinet.companies WHERE company_id = $1 AND is_active = true';
    const companyResult = await pool.query(companyQuery, [companyId]);
    
    if (companyResult.rows.length === 0) {
      throw new ApiError(404, 'Company not found');
    }

    // Request analysis from analysis service
    const analysisResponse = await axios.post(
      `${config.services.analysisService}/analyze`,
      {
        company_id: companyId,
        analysis_type,
        period_end,
        user_id: req.user?.userId
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': req.headers.authorization
        },
        timeout: 30000
      }
    );

    res.status(202).json({
      message: 'Analysis request submitted',
      analysis_job_id: analysisResponse.data.job_id,
      estimated_completion: analysisResponse.data.estimated_completion
    });
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      return next(new ApiError(error.response.status, error.response.data.error || 'Analysis service error'));
    }
    next(error);
  }
});

// Get analysis job status
router.get('/jobs/:jobId/status', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { jobId } = req.params;

    const response = await axios.get(
      `${config.services.analysisService}/jobs/${jobId}/status`,
      {
        headers: {
          'Authorization': req.headers.authorization
        },
        timeout: 10000
      }
    );

    res.json(response.data);
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      return next(new ApiError(error.response.status, error.response.data.error || 'Analysis service error'));
    }
    next(error);
  }
});

// Compare companies
router.post('/compare', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { company_ids, analysis_type = 'financial_comparison', period_end } = req.body;

    if (!Array.isArray(company_ids) || company_ids.length < 2 || company_ids.length > 5) {
      throw new ApiError(400, 'Must provide 2-5 company IDs for comparison');
    }

    // Validate companies exist
    const placeholders = company_ids.map((_, index) => `$${index + 1}`).join(',');
    const companyQuery = `
      SELECT company_id, company_name 
      FROM edinet.companies 
      WHERE company_id IN (${placeholders}) AND is_active = true
    `;
    const companyResult = await pool.query(companyQuery, company_ids);
    
    if (companyResult.rows.length !== company_ids.length) {
      throw new ApiError(400, 'One or more companies not found');
    }

    // Request comparison from analysis service
    const response = await axios.post(
      `${config.services.analysisService}/compare`,
      {
        company_ids,
        analysis_type,
        period_end,
        user_id: req.user?.userId
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': req.headers.authorization
        },
        timeout: 30000
      }
    );

    res.json(response.data);
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      return next(new ApiError(error.response.status, error.response.data.error || 'Analysis service error'));
    }
    next(error);
  }
});

// Get analysis types
router.get('/meta/types', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const types = [
      { type: 'profitability', name: '収益性分析', description: 'ROE, ROA, 利益率等の分析' },
      { type: 'safety', name: '安全性分析', description: '自己資本比率, 流動比率等の分析' },
      { type: 'growth', name: '成長性分析', description: '売上成長率, 利益成長率等の分析' },
      { type: 'efficiency', name: '効率性分析', description: '総資産回転率, 棚卸資産回転率等の分析' },
      { type: 'comprehensive', name: '総合分析', description: '全ての指標を含む包括的分析' },
      { type: 'industry_comparison', name: '同業他社比較', description: '同業界企業との比較分析' },
      { type: 'trend_analysis', name: 'トレンド分析', description: '時系列での業績推移分析' }
    ];

    res.json(types);
  } catch (error) {
    next(error);
  }
});

export default router;