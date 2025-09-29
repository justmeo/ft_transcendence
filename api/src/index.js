const config = require('./config');
const database = require('./database');
const schemas = require('./schemas');
const securityPlugin = require('./security');

// Initialize Fastify with configuration
const fastify = require('fastify')({
  logger: {
    level: config.logLevel
  },
  trustProxy: config.trustProxy, // Trust proxy headers (nginx terminates TLS)
  ignoreTrailingSlash: true,
  caseSensitive: false
});

// Global error handler
fastify.setErrorHandler(async (error, request, reply) => {
  fastify.log.error(error);
  
  const statusCode = error.statusCode || 500;
  const response = {
    error: error.name || 'InternalServerError',
    message: error.message || 'An unexpected error occurred',
    statusCode
  };
  
  reply.status(statusCode).send(response);
});

// Add schema validation error handler
fastify.setSchemaErrorFormatter((errors, dataVar) => {
  const error = new Error('Validation failed');
  error.statusCode = 400;
  error.validation = errors.map(err => ({
    field: err.instancePath || err.schemaPath,
    message: err.message,
    value: err.data
  }));
  return error;
});

// Register security plugin
fastify.register(securityPlugin);

// Register routes with /api prefix
fastify.register(async function (fastify) {
  // Health check endpoint with detailed information
  fastify.get('/health', {
    schema: schemas.health
  }, async (request, reply) => {
    const dbInfo = database.getInfo();
    
    return {
      ok: true,
      uptime: process.uptime(),
      version: config.version,
      timestamp: new Date().toISOString(),
      database: {
        connected: !!database.db,
        tables: dbInfo.tables.length
      },
      security: {
        https: config.forceHttps,
        headers: true,
        rateLimit: true
      }
    };
  });

  // Root API endpoint
  fastify.get('/', async (request, reply) => {
    return {
      message: 'ft_transcendence API',
      version: config.version,
      environment: config.nodeEnv,
      endpoints: [
        'GET /api/health - Health check',
        'POST /api/users/register - User registration',
        'POST /api/users/login - User login',
        'GET /api/games - List games',
        'POST /api/games - Create game'
      ]
    };
  });

  // Placeholder routes for future implementation
  fastify.register(async function (fastify) {
    // Register auth-specific rate limiter
    await fastify.register(async function (fastify) {
      await fastify.register(require('@fastify/rate-limit'), fastify.authRateLimit);
      
      // User routes with stricter rate limiting
      fastify.post('/users/register', {
        schema: schemas.registerUser
      }, async (request, reply) => {
        reply.status(501).send({
          error: 'NotImplemented',
          message: 'User registration not yet implemented'
        });
      });

      fastify.post('/users/login', {
        schema: schemas.loginUser
      }, async (request, reply) => {
        reply.status(501).send({
          error: 'NotImplemented',
          message: 'User login not yet implemented'
        });
      });
    });

    // Game routes
    fastify.get('/games', {
      schema: schemas.getGames
    }, async (request, reply) => {
      const { limit = 20, offset = 0, status } = request.query;
      
      // Example query using database helper
      const games = database.query(
        'SELECT * FROM games WHERE ($1 IS NULL OR status = $1) ORDER BY created_at DESC LIMIT $2 OFFSET $3',
        [status || null, limit, offset]
      );
      
      const total = database.queryOne(
        'SELECT COUNT(*) as count FROM games WHERE ($1 IS NULL OR status = $1)',
        [status || null]
      ).count;

      return {
        games,
        total,
        limit,
        offset
      };
    });

    fastify.post('/games', {
      schema: schemas.createGame
    }, async (request, reply) => {
      reply.status(501).send({
        error: 'NotImplemented',
        message: 'Game creation not yet implemented'
      });
    });
  });
}, { prefix: '/api' });

// Graceful shutdown handling
const gracefulShutdown = async (signal) => {
  console.log(`Received ${signal}, starting graceful shutdown...`);
  
  try {
    // Close database connection
    database.close();
    
    // Close Fastify server
    await fastify.close();
    
    console.log('Graceful shutdown completed');
    process.exit(0);
  } catch (error) {
    console.error('Error during shutdown:', error);
    process.exit(1);
  }
};

// Register shutdown handlers
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Unhandled rejection handler
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Start server
const start = async () => {
  try {
    // Initialize database
    await database.initialize();
    
    // Start server
    await fastify.listen({ 
      port: config.port, 
      host: config.host 
    });
    
    console.log(`🚀 API server listening on ${config.host}:${config.port}`);
    console.log(`📊 Environment: ${config.nodeEnv}`);
    console.log(`🗄️  Database: ${config.database.file}`);
    
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();