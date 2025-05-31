# Data Ingestion Service

EDINET data fetching and processing service for the EDINET Analysis System.

## Description

This service is responsible for fetching corporate filings from the EDINET API, parsing XBRL documents, extracting financial data, and storing it in the database for analysis.

## API Endpoints

### Data Fetching
- `POST /ingest/fetch-filing` - Fetch specific filing
- `POST /ingest/batch-fetch` - Batch fetch multiple filings
- `GET /ingest/status/:jobId` - Get ingestion job status

### Data Management
- `GET /data/companies` - List companies
- `GET /data/companies/:id/filings` - Get company filings
- `GET /data/filings/:id` - Get filing details
- `POST /data/refresh/:companyId` - Refresh company data

### Scheduled Jobs
- `POST /jobs/schedule-daily` - Schedule daily data fetch
- `GET /jobs/status` - Get job status
- `DELETE /jobs/:id` - Cancel job

## Environment Variables

```env
PORT=3002
NODE_ENV=development

# EDINET API
EDINET_API_KEY=your-api-key
EDINET_API_BASE_URL=https://disclosure.edinet-fsa.go.jp/api/v1

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/edinet_db

# Redis (for job queue)
REDIS_URL=redis://localhost:6379

# Storage
STORAGE_TYPE=local
STORAGE_PATH=/data/filings
# or for S3
STORAGE_TYPE=s3
S3_BUCKET=edinet-filings
S3_REGION=ap-northeast-1

# Processing
MAX_CONCURRENT_JOBS=5
BATCH_SIZE=10
RETRY_ATTEMPTS=3
```

## Setup Instructions

1. Install dependencies:
   ```bash
   npm install
   ```

2. Set up PostgreSQL database:
   ```bash
   npm run db:migrate
   ```

3. Configure environment variables

4. Start the service:
   ```bash
   npm start
   ```

## Development Notes

- Built with Node.js and TypeScript
- Bull queue for job processing
- XBRL parsing with custom parser
- PostgreSQL for data storage
- Redis for job queue management
- S3/local storage for raw filings
- Scheduled jobs with node-cron
- Rate limiting for EDINET API calls

## Data Processing Pipeline

1. **Fetch**: Download XBRL files from EDINET
2. **Parse**: Extract structured data from XBRL
3. **Transform**: Normalize financial data
4. **Store**: Save to PostgreSQL
5. **Index**: Update search indices

## Supported Filing Types

- 有価証券報告書 (Securities Report)
- 四半期報告書 (Quarterly Report)
- 半期報告書 (Semi-Annual Report)
- 臨時報告書 (Extraordinary Report)

## Database Schema

- `companies` - Company master data
- `filings` - Filing metadata
- `financial_statements` - Parsed financial data
- `ingestion_jobs` - Job tracking