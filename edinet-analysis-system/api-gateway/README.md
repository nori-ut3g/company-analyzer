# API Gateway Service

Express.js API gateway for the EDINET Analysis System.

## Description

Central API gateway that routes requests to appropriate microservices, handles authentication, rate limiting, and provides a unified API interface for the frontend application.

## API Endpoints

### Company Routes
- `GET /api/companies` - Search companies
- `GET /api/companies/:id` - Get company details
- `GET /api/companies/:id/filings` - Get company filings

### Analysis Routes
- `POST /api/analysis/start` - Start new analysis
- `GET /api/analysis/:id/status` - Get analysis status
- `GET /api/analysis/:id/results` - Get analysis results

### Report Routes
- `POST /api/reports/generate` - Generate report
- `GET /api/reports/:id` - Download report
- `GET /api/reports` - List user reports

### Auth Routes
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `POST /api/auth/refresh` - Refresh token
- `GET /api/auth/profile` - Get user profile

## Environment Variables

```env
PORT=3000
NODE_ENV=development
JWT_SECRET=your-secret-key

# Service URLs
DATA_INGESTION_SERVICE_URL=http://localhost:3002
ANALYSIS_SERVICE_URL=http://localhost:3003
REPORT_GENERATOR_SERVICE_URL=http://localhost:3004
AUTH_SERVICE_URL=http://localhost:3001

# Redis
REDIS_URL=redis://localhost:6379

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

## Setup Instructions

1. Install dependencies:
   ```bash
   npm install
   ```

2. Configure environment variables in `.env`

3. Start the server:
   ```bash
   npm start
   ```

4. Run in development mode:
   ```bash
   npm run dev
   ```

## Development Notes

- Express.js with TypeScript
- JWT authentication middleware
- Request validation with Joi
- Rate limiting with express-rate-limit
- Circuit breaker pattern for service calls
- Request logging with Morgan
- CORS enabled for frontend integration
- WebSocket support for real-time updates

## Middleware Stack

1. CORS
2. Body parsing
3. Request logging
4. Rate limiting
5. Authentication
6. Request validation
7. Error handling