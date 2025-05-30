import { Router } from 'express';
import { addIngestionJob } from '../queues/ingestionQueue';
import { DataIngestionService } from '../services/dataIngestionService';

const router = Router();
const dataIngestionService = new DataIngestionService();

// Start ingestion for a specific year
router.post('/ingest/:year', async (req, res, next) => {
  try {
    const { year } = req.params;
    
    // Validate year
    const yearNum = parseInt(year);
    if (isNaN(yearNum) || yearNum < 2000 || yearNum > new Date().getFullYear()) {
      return res.status(400).json({
        error: 'Invalid year. Must be between 2000 and current year.'
      });
    }
    
    // Add job to queue
    const job = await addIngestionJob(year);
    
    res.json({
      message: `Ingestion job started for year ${year}`,
      jobId: job.id
    });
  } catch (error) {
    next(error);
  }
});

// Get ingestion status
router.get('/status', async (req, res, next) => {
  try {
    const status = await dataIngestionService.getIngestionStatus();
    res.json(status);
  } catch (error) {
    next(error);
  }
});

// Ingest all available years
router.post('/ingest-all', async (req, res, next) => {
  try {
    const years = ['2018', '2019', '2020', '2021', '2022', '2023'];
    const jobs = [];
    
    for (const year of years) {
      const job = await addIngestionJob(year);
      jobs.push({
        year,
        jobId: job.id
      });
    }
    
    res.json({
      message: 'Ingestion jobs started for all years',
      jobs
    });
  } catch (error) {
    next(error);
  }
});

export default router;