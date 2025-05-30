import { Router } from 'express';
import { ReportGeneratorService } from '../services/reportGeneratorService';

const router = Router();
const reportGeneratorService = new ReportGeneratorService();

// Generate a new report
router.post('/generate', async (req, res, next) => {
  try {
    const { companyId, fiscalYear, fiscalPeriod, format } = req.body;
    
    if (!companyId || !fiscalYear || !fiscalPeriod) {
      return res.status(400).json({
        error: 'companyId, fiscalYear, and fiscalPeriod are required'
      });
    }
    
    const reportBuffer = await reportGeneratorService.generateReport(
      parseInt(companyId),
      parseInt(fiscalYear),
      fiscalPeriod,
      format || 'pdf'
    );
    
    // Set appropriate headers
    if (format === 'html') {
      res.contentType('text/html');
    } else {
      res.contentType('application/pdf');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="financial_report_${companyId}_${fiscalYear}_${fiscalPeriod}.pdf"`
      );
    }
    
    res.send(reportBuffer);
  } catch (error) {
    next(error);
  }
});

// Get report history for a company
router.get('/history/:companyId', async (req, res, next) => {
  try {
    const { companyId } = req.params;
    
    const history = await reportGeneratorService.getReportHistory(
      parseInt(companyId)
    );
    
    res.json({
      companyId: parseInt(companyId),
      reports: history
    });
  } catch (error) {
    next(error);
  }
});

// Get a specific report by ID
router.get('/:reportId', async (req, res, next) => {
  try {
    const { reportId } = req.params;
    
    // This would retrieve a previously generated report from the database
    // For now, returning a placeholder
    res.json({
      message: 'Report retrieval not yet implemented',
      reportId
    });
  } catch (error) {
    next(error);
  }
});

// Delete a report
router.delete('/:reportId', async (req, res, next) => {
  try {
    const { reportId } = req.params;
    
    // This would delete a report from the database
    // For now, returning a placeholder
    res.json({
      message: 'Report deletion not yet implemented',
      reportId
    });
  } catch (error) {
    next(error);
  }
});

export default router;