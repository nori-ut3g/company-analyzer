import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { createProxyMiddleware } from 'http-proxy-middleware';
import morgan from 'morgan';
import { config } from './config';
import { errorHandler } from './middleware/errorHandler';
import { authMiddleware } from './middleware/auth';
import healthRoutes from './routes/health';
import authRoutes from './routes/auth';
import companiesRoutes from './routes/companies';
import analysisRoutes from './routes/analysis';
import reportsRoutes from './routes/reports';

const app = express();

// Security middleware
app.use(helmet());
app.use(cors({
  origin: config.allowedOrigins,
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP'
});
app.use('/api/', limiter);

// Compression and parsing
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Logging
app.use(morgan('combined'));

// Health check (no auth required)
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    message: 'API Gateway is running',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.status(200).json({
    message: 'EDINET Analysis System API Gateway',
    version: '1.0.0',
    status: 'running'
  });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/companies', companiesRoutes);
app.use('/api/analysis', analysisRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/health', healthRoutes);

// Also mount routes without /api prefix for backward compatibility
app.use('/auth', authRoutes);
app.use('/companies', companiesRoutes);
app.use('/analysis', analysisRoutes);
app.use('/reports', reportsRoutes);

// Proxy to microservices
const createServiceProxy = (target: string, pathRewrite?: Record<string, string>) => 
  createProxyMiddleware({
    target,
    changeOrigin: true,
    pathRewrite,
    onError: (err, req, res) => {
      console.error(`Proxy error for ${req.url}:`, err.message);
      if (!res.headersSent) {
        res.status(503).json({ error: 'Service temporarily unavailable' });
      }
    }
  });

// Service proxies
app.use('/api/data-ingestion', createServiceProxy('http://edinet-data-ingestion:3005', { '^/api/data-ingestion': '' }));
app.use('/api/analysis-service', createServiceProxy('http://edinet-analysis-service:3001', { '^/api/analysis-service': '' }));
app.use('/api/report-generator', createServiceProxy('http://edinet-report-generator:3002', { '^/api/report-generator': '' }));

// Error handling
app.use(errorHandler);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

const PORT = config.port;

app.listen(PORT, () => {
  console.log(`API Gateway running on port ${PORT}`);
  console.log(`Environment: ${config.env}`);
});