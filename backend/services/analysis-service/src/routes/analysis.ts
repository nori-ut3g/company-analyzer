import { Router } from 'express';
import { FinancialMetricsService } from '../services/financialMetricsService';
import { TimeSeriesAnalysisService } from '../services/timeSeriesAnalysisService';

const router = Router();
const financialMetricsService = new FinancialMetricsService();
const timeSeriesAnalysisService = new TimeSeriesAnalysisService();

// Calculate financial metrics for a company
router.post('/calculate/:companyId', async (req, res, next) => {
  try {
    const { companyId } = req.params;
    const { fiscalYear, fiscalPeriod } = req.body;
    
    if (!fiscalYear || !fiscalPeriod) {
      return res.status(400).json({
        error: 'fiscalYear and fiscalPeriod are required'
      });
    }
    
    const metrics = await financialMetricsService.calculateMetrics(
      parseInt(companyId),
      parseInt(fiscalYear),
      fiscalPeriod
    );
    
    res.json({
      companyId: parseInt(companyId),
      fiscalYear: parseInt(fiscalYear),
      fiscalPeriod,
      metrics
    });
  } catch (error) {
    next(error);
  }
});

// Get comparative metrics for multiple companies
router.post('/compare', async (req, res, next) => {
  try {
    const { companyIds, fiscalYear, fiscalPeriod } = req.body;
    
    if (!companyIds || !Array.isArray(companyIds) || companyIds.length === 0) {
      return res.status(400).json({
        error: 'companyIds array is required'
      });
    }
    
    if (!fiscalYear || !fiscalPeriod) {
      return res.status(400).json({
        error: 'fiscalYear and fiscalPeriod are required'
      });
    }
    
    const comparativeData = await financialMetricsService.getComparativeMetrics(
      companyIds.map(id => parseInt(id)),
      parseInt(fiscalYear),
      fiscalPeriod
    );
    
    res.json({
      fiscalYear: parseInt(fiscalYear),
      fiscalPeriod,
      companies: comparativeData
    });
  } catch (error) {
    next(error);
  }
});

// Get time series data for a company
router.get('/time-series/:companyId', async (req, res, next) => {
  try {
    const { companyId } = req.params;
    const { startYear, endYear } = req.query;
    
    const start = startYear ? parseInt(startYear as string) : new Date().getFullYear() - 5;
    const end = endYear ? parseInt(endYear as string) : new Date().getFullYear();
    
    const timeSeriesData = await timeSeriesAnalysisService.getTimeSeriesData(
      parseInt(companyId),
      start,
      end
    );
    
    res.json({
      companyId: parseInt(companyId),
      startYear: start,
      endYear: end,
      data: timeSeriesData
    });
  } catch (error) {
    next(error);
  }
});

// Analyze trends for specific metrics
router.post('/trends/:companyId', async (req, res, next) => {
  try {
    const { companyId } = req.params;
    const { metrics, periods } = req.body;
    
    if (!metrics || !Array.isArray(metrics) || metrics.length === 0) {
      return res.status(400).json({
        error: 'metrics array is required'
      });
    }
    
    const trendAnalysis = await timeSeriesAnalysisService.analyzeTrends(
      parseInt(companyId),
      metrics,
      periods || 12
    );
    
    res.json({
      companyId: parseInt(companyId),
      analysis: trendAnalysis
    });
  } catch (error) {
    next(error);
  }
});

// Get peer comparison over time
router.post('/peer-comparison', async (req, res, next) => {
  try {
    const { companyIds, metric, startYear, endYear } = req.body;
    
    if (!companyIds || !Array.isArray(companyIds) || companyIds.length === 0) {
      return res.status(400).json({
        error: 'companyIds array is required'
      });
    }
    
    if (!metric) {
      return res.status(400).json({
        error: 'metric is required'
      });
    }
    
    const start = startYear || new Date().getFullYear() - 5;
    const end = endYear || new Date().getFullYear();
    
    const comparison = await timeSeriesAnalysisService.getPeerComparison(
      companyIds.map(id => parseInt(id)),
      metric,
      start,
      end
    );
    
    res.json({
      metric,
      startYear: start,
      endYear: end,
      companies: comparison
    });
  } catch (error) {
    next(error);
  }
});

// Get industry average metrics
router.get('/industry-average', async (req, res, next) => {
  try {
    const { industryCode, fiscalYear, fiscalPeriod } = req.query;
    
    if (!fiscalYear || !fiscalPeriod) {
      return res.status(400).json({
        error: 'fiscalYear and fiscalPeriod are required'
      });
    }
    
    const industryMetrics = await financialMetricsService.getIndustryAverageMetrics(
      industryCode as string || 'ALL',
      parseInt(fiscalYear as string),
      fiscalPeriod as string
    );
    
    res.json({
      industryCode: industryCode || 'ALL',
      fiscalYear: parseInt(fiscalYear as string),
      fiscalPeriod,
      metrics: industryMetrics
    });
  } catch (error) {
    next(error);
  }
});

export default router;