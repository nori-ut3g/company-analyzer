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

// CORS configuration - must be before other middleware
const corsOptions = {
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    // Log the origin for debugging
    console.log('CORS request from origin:', origin || 'no origin (same-origin or non-browser)');
    // Allow all origins
    callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['X-RateLimit-Limit', 'X-RateLimit-Remaining', 'X-RateLimit-Reset'],
  maxAge: 86400, // 24 hours
  optionsSuccessStatus: 204
};

app.use(cors(corsOptions));

// Add a middleware to log all requests and their headers
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path} - Origin: ${req.headers.origin || 'none'}`);
  next();
});

// Security middleware - disable conflicting headers
app.use(helmet({
  crossOriginResourcePolicy: false,
  contentSecurityPolicy: false,
  crossOriginOpenerPolicy: false,
  crossOriginEmbedderPolicy: false
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

// Proxy to microservices with CORS headers preservation
const createServiceProxy = (target: string, pathRewrite?: Record<string, string>) => 
  createProxyMiddleware({
    target,
    changeOrigin: true,
    pathRewrite,
    onProxyRes: (proxyRes, req, res) => {
      // Ensure CORS headers are preserved on proxy responses
      const origin = req.headers.origin;
      if (origin) {
        proxyRes.headers['access-control-allow-origin'] = origin;
        proxyRes.headers['access-control-allow-credentials'] = 'true';
      }
    },
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
  console.log('CORS enabled for all origins with credentials');
});