import { Router, Request, Response, NextFunction } from 'express';
import { Pool } from 'pg';
import axios from 'axios';
import { config } from '../config';
import { ApiError } from '../utils/ApiError';
import { AuthenticatedRequest } from '../middleware/auth';

const router = Router();
const pool = new Pool({ connectionString: config.database.url });

// Get reports for a company
router.get('/:companyId', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { companyId } = req.params;
    const { 
      report_type,
      file_format,
      limit = '20',
      offset = '0'
    } = req.query;

    let whereClause = 'WHERE r.company_id = $1';
    const values: any[] = [companyId];
    let valueIndex = 2;

    if (report_type) {
      whereClause += ` AND r.report_type = $${valueIndex}`;
      values.push(report_type);
      valueIndex++;
    }

    if (file_format) {
      whereClause += ` AND r.file_format = $${valueIndex}`;
      values.push(file_format);
      valueIndex++;
    }

    const query = `
      SELECT 
        r.report_id,
        r.report_type,
        r.report_name,
        r.file_format,
        r.file_size,
        r.generated_at,
        r.is_public,
        r.download_count,
        c.company_name
      FROM edinet.reports r
      JOIN edinet.companies c ON r.company_id = c.company_id
      ${whereClause}
      ORDER BY r.generated_at DESC
      LIMIT $${valueIndex} OFFSET $${valueIndex + 1}
    `;

    values.push(parseInt(limit as string), parseInt(offset as string));
    const result = await pool.query(query, values);

    res.json({
      company_id: companyId,
      reports: result.rows
    });
  } catch (error) {
    next(error);
  }
});

// Generate new report
router.post('/:companyId/generate', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { companyId } = req.params;
    const { 
      report_type = 'comprehensive',
      file_format = 'PDF',
      period_end,
      template_options = {}
    } = req.body;

    // Check if company exists
    const companyQuery = 'SELECT company_id, company_name FROM edinet.companies WHERE company_id = $1 AND is_active = true';
    const companyResult = await pool.query(companyQuery, [companyId]);
    
    if (companyResult.rows.length === 0) {
      throw new ApiError(404, 'Company not found');
    }

    // Request report generation
    const response = await axios.post(
      `${config.services.reportGenerator}/generate`,
      {
        company_id: companyId,
        company_name: companyResult.rows[0].company_name,
        report_type,
        file_format,
        period_end,
        template_options,
        user_id: req.user?.userId
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': req.headers.authorization
        },
        timeout: 60000
      }
    );

    res.status(202).json({
      message: 'Report generation started',
      job_id: response.data.job_id,
      estimated_completion: response.data.estimated_completion
    });
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      return next(new ApiError(error.response.status, error.response.data.error || 'Report service error'));
    }
    next(error);
  }
});

// Download report
router.get('/download/:reportId', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { reportId } = req.params;

    // Get report info
    const reportQuery = `
      SELECT r.*, c.company_name 
      FROM edinet.reports r
      JOIN edinet.companies c ON r.company_id = c.company_id
      WHERE r.report_id = $1
    `;
    const reportResult = await pool.query(reportQuery, [reportId]);
    
    if (reportResult.rows.length === 0) {
      throw new ApiError(404, 'Report not found');
    }

    const report = reportResult.rows[0];

    // Stream file from report generator service
    const response = await axios.get(
      `${config.services.reportGenerator}/download/${reportId}`,
      {
        headers: {
          'Authorization': req.headers.authorization
        },
        responseType: 'stream',
        timeout: 30000
      }
    );

    // Update download count
    await pool.query(
      'UPDATE edinet.reports SET download_count = download_count + 1 WHERE report_id = $1',
      [reportId]
    );

    // Set appropriate headers
    const filename = `${report.company_name}_${report.report_type}_${report.generated_at.toISOString().split('T')[0]}.${report.file_format.toLowerCase()}`;
    
    res.setHeader('Content-Type', getContentType(report.file_format));
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
    
    if (report.file_size) {
      res.setHeader('Content-Length', report.file_size);
    }

    response.data.pipe(res);
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      return next(new ApiError(error.response.status, error.response.data.error || 'Report service error'));
    }
    next(error);
  }
});

// Get report generation job status
router.get('/jobs/:jobId/status', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { jobId } = req.params;

    const response = await axios.get(
      `${config.services.reportGenerator}/jobs/${jobId}/status`,
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
      return next(new ApiError(error.response.status, error.response.data.error || 'Report service error'));
    }
    next(error);
  }
});

// Get available report types
router.get('/meta/types', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const types = [
      {
        type: 'comprehensive',
        name: '総合レポート',
        description: '財務分析、株価分析、業界比較を含む包括的レポート',
        formats: ['PDF', 'HTML']
      },
      {
        type: 'financial_analysis',
        name: '財務分析レポート',
        description: '収益性、安全性、成長性、効率性の詳細分析',
        formats: ['PDF', 'HTML', 'XLSX']
      },
      {
        type: 'industry_comparison',
        name: '業界比較レポート',
        description: '同業他社との比較分析レポート',
        formats: ['PDF', 'HTML']
      },
      {
        type: 'trend_analysis',
        name: 'トレンド分析レポート',
        description: '時系列での業績推移と将来予測',
        formats: ['PDF', 'HTML']
      },
      {
        type: 'investment_summary',
        name: '投資判断サマリー',
        description: '投資判断に必要な要約情報',
        formats: ['PDF', 'HTML']
      }
    ];

    res.json(types);
  } catch (error) {
    next(error);
  }
});

// Delete report
router.delete('/:reportId', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { reportId } = req.params;

    // Check if report exists and user has permission
    const reportQuery = 'SELECT report_id, generated_by FROM edinet.reports WHERE report_id = $1';
    const reportResult = await pool.query(reportQuery, [reportId]);
    
    if (reportResult.rows.length === 0) {
      throw new ApiError(404, 'Report not found');
    }

    const report = reportResult.rows[0];
    if (report.generated_by !== req.user?.userId && req.user?.role !== 'admin') {
      throw new ApiError(403, 'Permission denied');
    }

    // Delete from report generator service
    await axios.delete(
      `${config.services.reportGenerator}/reports/${reportId}`,
      {
        headers: {
          'Authorization': req.headers.authorization
        },
        timeout: 10000
      }
    );

    // Delete from database
    await pool.query('DELETE FROM edinet.reports WHERE report_id = $1', [reportId]);

    res.json({ message: 'Report deleted successfully' });
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status !== 404) {
      return next(new ApiError(error.response.status, error.response.data.error || 'Report service error'));
    }
    next(error);
  }
});

function getContentType(format: string): string {
  switch (format.toUpperCase()) {
    case 'PDF':
      return 'application/pdf';
    case 'HTML':
      return 'text/html';
    case 'XLSX':
      return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    default:
      return 'application/octet-stream';
  }
}

export default router;