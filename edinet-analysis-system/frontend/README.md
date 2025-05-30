# Frontend Service

React/TypeScript web UI for the EDINET Analysis System.

## Description

This service provides the user interface for interacting with the EDINET Analysis System. It offers dashboards for viewing financial data, initiating analyses, and generating reports from Japanese corporate filings.

## Features

- Company search and selection
- Financial data visualization
- Report generation interface
- Real-time analysis status updates
- User authentication

## Environment Variables

```env
REACT_APP_API_GATEWAY_URL=http://localhost:3000
REACT_APP_AUTH_SERVICE_URL=http://localhost:3001
REACT_APP_ENVIRONMENT=development
```

## Setup Instructions

1. Install dependencies:
   ```bash
   npm install
   ```

2. Create `.env` file with required environment variables

3. Start development server:
   ```bash
   npm start
   ```

4. Build for production:
   ```bash
   npm run build
   ```

## Development Notes

- Uses React 18 with TypeScript
- State management with Redux Toolkit
- Material-UI for component library
- Recharts for data visualization
- WebSocket support for real-time updates
- Responsive design for mobile/desktop

## Available Scripts

- `npm start` - Run development server
- `npm test` - Run test suite
- `npm run build` - Build production bundle
- `npm run lint` - Run ESLint
- `npm run format` - Format code with Prettier