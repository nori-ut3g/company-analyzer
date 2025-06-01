import dotenv from 'dotenv';

dotenv.config();

export const config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '8000'),
  
  // Database
  database: {
    url: process.env.DATABASE_URL || 'postgresql://edinet_user:your_secure_password_here@edinet-postgres:5432/edinet_analysis'
  },
  
  // Redis
  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379'
  },
  
  // JWT
  jwt: {
    secret: process.env.JWT_SECRET || 'your-jwt-secret',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d'
  },
  
  // CORS
  allowedOrigins: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000', 'http://localhost:3001'],
  
  // Microservices
  services: {
    dataIngestion: process.env.DATA_INGESTION_URL || 'http://edinet-data-ingestion:3005',
    analysisService: process.env.ANALYSIS_SERVICE_URL || 'http://edinet-analysis-service:3001',
    reportGenerator: process.env.REPORT_GENERATOR_URL || 'http://edinet-report-generator:3002',
    authService: process.env.AUTH_SERVICE_URL || 'http://edinet-auth-service:3004'
  },
  
  // External APIs
  external: {
    edinetApiKey: process.env.EDINET_API_KEY,
    claudeApiKey: process.env.CLAUDE_API_KEY
  }
};