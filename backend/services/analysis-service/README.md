# Analysis Service

Financial analysis engine for the EDINET Analysis System.

## Description

This service performs comprehensive financial analysis on company data extracted from EDINET filings. It calculates financial ratios, trends, peer comparisons, and generates insights using various analytical models.

## API Endpoints

### Analysis Operations
- `POST /analysis/start` - Start new analysis
- `GET /analysis/:id` - Get analysis results
- `GET /analysis/:id/status` - Get analysis status
- `DELETE /analysis/:id` - Cancel analysis

### Analysis Types
- `POST /analysis/ratio` - Financial ratio analysis
- `POST /analysis/trend` - Trend analysis
- `POST /analysis/peer` - Peer comparison
- `POST /analysis/forecast` - Financial forecasting
- `POST /analysis/risk` - Risk assessment

### Batch Operations
- `POST /analysis/batch` - Batch analysis for multiple companies
- `GET /analysis/batch/:batchId` - Get batch results

## Environment Variables

```env
PORT=3003
NODE_ENV=development

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/edinet_db

# Redis (for caching)
REDIS_URL=redis://localhost:6379
CACHE_TTL=3600

# Analysis Configuration
MAX_CONCURRENT_ANALYSES=10
ANALYSIS_TIMEOUT_MS=300000
ENABLE_ML_MODELS=true

# Python ML Service (if using Python models)
ML_SERVICE_URL=http://localhost:5000

# Performance
WORKER_THREADS=4
MAX_MEMORY_GB=8
```

## Setup Instructions

1. Install dependencies:
   ```bash
   npm install
   ```

2. Install Python dependencies (for ML models):
   ```bash
   pip install -r requirements.txt
   ```

3. Configure environment variables

4. Start the service:
   ```bash
   npm start
   ```

## Development Notes

- Node.js with TypeScript for main service
- Python integration for ML models
- Worker threads for parallel processing
- Redis caching for performance
- Support for custom analysis plugins

## Analysis Modules

### Financial Ratios
- Profitability (ROE, ROA, Profit Margins)
- Liquidity (Current Ratio, Quick Ratio)
- Efficiency (Asset Turnover, Inventory Turnover)
- Leverage (Debt-to-Equity, Interest Coverage)
- Market Value (P/E, P/B, EV/EBITDA)

### Trend Analysis
- Revenue growth trends
- Profit margin evolution
- Cash flow patterns
- Working capital changes
- Seasonal adjustments

### Peer Comparison
- Industry benchmarking
- Relative performance metrics
- Percentile rankings
- Competitive positioning

### Risk Assessment
- Financial distress indicators
- Altman Z-Score
- Volatility analysis
- Credit risk scoring

### Forecasting
- Time series forecasting
- Regression models
- Monte Carlo simulations
- Scenario analysis

## Output Format

```json
{
  "analysisId": "uuid",
  "companyId": "7203",
  "timestamp": "2024-01-15T10:30:00Z",
  "modules": {
    "ratios": { ... },
    "trends": { ... },
    "peers": { ... },
    "risks": { ... },
    "forecasts": { ... }
  },
  "insights": [
    {
      "type": "warning",
      "message": "Declining profit margins",
      "severity": "medium"
    }
  ]
}
```

## Performance Optimization

- Cached calculations for common metrics
- Parallel processing for independent analyses
- Incremental updates for time series
- Pre-computed industry averages