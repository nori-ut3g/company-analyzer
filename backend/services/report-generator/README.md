# Report Generator Service

Report generation service (HTML/PDF) for the EDINET Analysis System.

## Description

This service generates professional financial analysis reports in various formats (HTML, PDF) based on analysis results. It provides customizable templates, multi-language support, and various export options.

## API Endpoints

### Report Generation
- `POST /reports/generate` - Generate new report
- `GET /reports/:id` - Get report status/download
- `GET /reports/:id/preview` - Preview report (HTML)
- `DELETE /reports/:id` - Delete report

### Report Types
- `POST /reports/summary` - Executive summary report
- `POST /reports/detailed` - Detailed analysis report
- `POST /reports/comparison` - Peer comparison report
- `POST /reports/trend` - Trend analysis report

### Templates
- `GET /templates` - List available templates
- `GET /templates/:id` - Get template details
- `POST /templates/custom` - Upload custom template

### Export Options
- `GET /reports/:id/pdf` - Download as PDF
- `GET /reports/:id/html` - Download as HTML
- `GET /reports/:id/excel` - Download as Excel

## Environment Variables

```env
PORT=3004
NODE_ENV=development

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/edinet_db

# Storage
REPORT_STORAGE_PATH=/data/reports
# or for S3
STORAGE_TYPE=s3
S3_BUCKET=edinet-reports
S3_REGION=ap-northeast-1

# PDF Generation
PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium
PDF_GENERATION_TIMEOUT=60000

# Template Engine
TEMPLATE_ENGINE=handlebars
TEMPLATE_PATH=/templates

# Localization
DEFAULT_LANGUAGE=ja
SUPPORTED_LANGUAGES=ja,en

# Performance
MAX_CONCURRENT_GENERATIONS=5
REPORT_CACHE_TTL=86400
```

## Setup Instructions

1. Install dependencies:
   ```bash
   npm install
   ```

2. Install system dependencies for PDF generation:
   ```bash
   # For Ubuntu/Debian
   sudo apt-get install chromium-browser
   
   # For macOS
   brew install chromium
   ```

3. Configure environment variables

4. Start the service:
   ```bash
   npm start
   ```

## Development Notes

- Node.js with TypeScript
- Puppeteer for PDF generation
- Handlebars for template engine
- Chart.js for visualizations
- i18n for multi-language support
- Excel generation with ExcelJS

## Report Sections

### Executive Summary
- Company overview
- Key findings
- Financial highlights
- Investment recommendations

### Financial Analysis
- Income statement analysis
- Balance sheet analysis
- Cash flow analysis
- Ratio analysis with charts

### Peer Comparison
- Industry positioning
- Competitive benchmarks
- Relative performance metrics

### Risk Assessment
- Financial health indicators
- Risk factors
- Mitigation recommendations

### Appendices
- Detailed financial statements
- Calculation methodologies
- Data sources

## Template Structure

```handlebars
<!DOCTYPE html>
<html lang="{{language}}">
<head>
    <title>{{company.name}} - {{reportType}}</title>
    <style>{{> styles}}</style>
</head>
<body>
    {{> header}}
    {{> executive-summary}}
    {{> financial-analysis}}
    {{> charts}}
    {{> footer}}
</body>
</html>
```

## Supported Charts

- Line charts (trends)
- Bar charts (comparisons)
- Pie charts (composition)
- Radar charts (multi-dimensional)
- Waterfall charts (changes)

## Localization

Reports support multiple languages:
- Japanese (ja) - Default
- English (en)

## Output Examples

```json
{
  "reportId": "uuid",
  "companyId": "7203",
  "type": "detailed",
  "language": "ja",
  "format": "pdf",
  "status": "completed",
  "url": "https://reports.example.com/uuid.pdf",
  "generatedAt": "2024-01-15T10:30:00Z",
  "expiresAt": "2024-01-22T10:30:00Z"
}
```

## Performance Optimization

- Template caching
- Parallel chart generation
- Compressed asset storage
- CDN integration for static assets