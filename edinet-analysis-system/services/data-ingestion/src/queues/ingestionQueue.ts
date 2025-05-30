import Bull from 'bull';
import { DataIngestionService } from '../services/dataIngestionService';

export const ingestionQueue = new Bull('data-ingestion', {
  redis: {
    host: process.env.REDIS_HOST || 'redis',
    port: parseInt(process.env.REDIS_PORT || '6379'),
  },
});

const dataIngestionService = new DataIngestionService();

// Process ingestion jobs
ingestionQueue.process('ingest-year', async (job) => {
  const { year } = job.data;
  
  console.log(`Starting ingestion for year ${year}`);
  
  const result = await dataIngestionService.ingestYearData(year);
  
  console.log(`Completed ingestion for year ${year}:`, result);
  
  return result;
});

// Handle job events
ingestionQueue.on('completed', (job, result) => {
  console.log(`Job ${job.id} completed:`, result);
});

ingestionQueue.on('failed', (job, err) => {
  console.error(`Job ${job.id} failed:`, err);
});

export const addIngestionJob = async (year: string) => {
  const job = await ingestionQueue.add('ingest-year', {
    year
  }, {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
  });
  
  return job;
};