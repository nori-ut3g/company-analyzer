import dotenv from 'dotenv';

dotenv.config();

export const config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '8000'),
  
  // Database
  database: {
    url: process.env.DATABASE_URL || 'postgresql://edinet_user:edinet_pass@localhost:5432/edinet_analysis'
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
  allowedOrigins: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
  
  // Microservices
  services: {
    dataIngestion: process.env.DATA_INGESTION_URL || 'http://localhost:3002',
    analysisService: process.env.ANALYSIS_SERVICE_URL || 'http://localhost:3003',
    reportGenerator: process.env.REPORT_GENERATOR_URL || 'http://localhost:3004',
    authService: process.env.AUTH_SERVICE_URL || 'http://localhost:3001'
  },
  
  // External APIs
  external: {
    edinetApiKey: process.env.EDINET_API_KEY,
    claudeApiKey: process.env.CLAUDE_API_KEY
  }
};