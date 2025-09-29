require('dotenv').config();

const config = {
  // Server Configuration
  port: parseInt(process.env.API_PORT || '3000'),
  host: process.env.API_HOST || '0.0.0.0',
  nodeEnv: process.env.NODE_ENV || 'development',
  
  // Database Configuration
  database: {
    path: process.env.DATABASE_URL || 'sqlite:./db/database.db',
    // Remove sqlite: prefix if present
    file: (process.env.DATABASE_URL || './db/database.db').replace('sqlite:', '')
  },
  
  // Security Configuration
  jwtSecret: process.env.JWT_SECRET || 'dev-secret-change-in-production',
  sessionSecret: process.env.SESSION_SECRET || 'dev-session-secret',
  cookieSecret: process.env.COOKIE_SECRET || 'dev-cookie-secret',
  
  // Security Settings
  forceHttps: process.env.FORCE_HTTPS === 'true',
  trustProxy: process.env.TRUST_PROXY === 'true',
  
  // Rate Limiting
  rateLimit: {
    global: {
      max: parseInt(process.env.RATE_LIMIT_MAX || '100'),
      timeWindow: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000')
    },
    auth: {
      max: parseInt(process.env.AUTH_RATE_LIMIT_MAX || '5'),
      timeWindow: parseInt(process.env.AUTH_RATE_LIMIT_WINDOW_MS || '900000') // 15 minutes
    }
  },
  
  // CORS Configuration
  cors: {
    origin: process.env.CORS_ORIGIN || 'https://localhost',
    credentials: process.env.CORS_CREDENTIALS === 'true'
  },
  
  // Application Configuration
  version: require('../package.json').version,
  appName: process.env.APP_NAME || 'ft_transcendence',
  
  // Logging
  logLevel: process.env.LOG_LEVEL || 'info',
  
  // Development flags
  isDevelopment: process.env.NODE_ENV === 'development',
  isProduction: process.env.NODE_ENV === 'production'
};

// Validate required configuration
const requiredEnvVars = [];

if (config.isProduction) {
  requiredEnvVars.push('JWT_SECRET', 'SESSION_SECRET', 'COOKIE_SECRET');
}

const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
if (missingVars.length > 0) {
  console.error('Missing required environment variables:', missingVars.join(', '));
  process.exit(1);
}

module.exports = config;