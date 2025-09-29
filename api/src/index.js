const config = require('./config');
const database = require('./database');
const schemas = require('./schemas');
const securityPlugin = require('./security');
const authService = require('./auth-service');
const tournamentService = require('./tournament-service');

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

// Register cookie and session support
fastify.register(require('@fastify/cookie'));
fastify.register(require('@fastify/session'), {
  secret: config.sessionSecret,
  cookieName: 'ft_session',
  cookie: {
    secure: config.isProduction, // Only send over HTTPS in production
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  },
  saveUninitialized: false,
  rolling: true
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
      
      // Auth routes with stricter rate limiting
      fastify.post('/auth/signup', {
        schema: { 
          body: schemas.authSignup.body,
          response: {
            201: schemas.userResponse,
            400: schemas.error
          }
        }
      }, async (request, reply) => {
        try {
          const { email, password, displayName, avatarUrl } = request.body;

          // Validate input
          if (!authService.isValidEmail(email)) {
            return reply.status(400).send({
              error: 'ValidationError',
              message: 'Invalid email format',
              statusCode: 400
            });
          }

          if (!authService.isValidPassword(password)) {
            return reply.status(400).send({
              error: 'ValidationError',
              message: 'Password must be at least 6 characters with uppercase, lowercase, and number',
              statusCode: 400
            });
          }

          if (!authService.isValidDisplayName(displayName)) {
            return reply.status(400).send({
              error: 'ValidationError',
              message: 'Display name must be 3-50 characters, alphanumeric and underscores only',
              statusCode: 400
            });
          }

          // Create user
          const user = await authService.createUser({ email, password, displayName, avatarUrl });

          // Set session
          request.session.userId = user.id;
          request.session.authenticated = true;

          reply.status(201).send(user);
        } catch (error) {
          reply.status(400).send({
            error: 'SignupError',
            message: error.message,
            statusCode: 400
          });
        }
      });

      fastify.post('/auth/login', {
        schema: { 
          body: schemas.authLogin.body,
          response: {
            200: schemas.userResponse,
            401: schemas.error
          }
        }
      }, async (request, reply) => {
        try {
          const { email, password } = request.body;

          // Authenticate user
          const user = await authService.authenticateUser(email, password);

          // Set session
          request.session.userId = user.id;
          request.session.authenticated = true;

          reply.send(user);
        } catch (error) {
          reply.status(401).send({
            error: 'AuthenticationError',
            message: error.message,
            statusCode: 401
          });
        }
      });

      fastify.post('/auth/logout', async (request, reply) => {
        if (request.session) {
          await request.session.destroy();
        }
        reply.send({ message: 'Logged out successfully' });
      });
    });

    // Tournament routes
    fastify.post('/tournaments', {
      preHandler: requireAuth,
      schema: {
        body: schemas.createTournament.body,
        response: {
          201: schemas.tournamentResponse,
          400: schemas.error,
          401: schemas.error
        }
      }
    }, async (request, reply) => {
      try {
        const tournament = tournamentService.createTournament(
          request.session.userId,
          request.body
        );
        reply.status(201).send(tournament);
      } catch (error) {
        reply.status(400).send({
          error: 'TournamentError',
          message: error.message,
          statusCode: 400
        });
      }
    });

    fastify.get('/tournaments', {
      schema: {
        querystring: {
          type: 'object',
          properties: {
            status: { type: 'string', enum: ['registration', 'active', 'completed'] },
            limit: { type: 'number', minimum: 1, maximum: 100, default: 20 },
            offset: { type: 'number', minimum: 0, default: 0 }
          }
        }
      }
    }, async (request, reply) => {
      try {
        const result = tournamentService.listTournaments(request.query);
        reply.send(result);
      } catch (error) {
        reply.status(500).send({
          error: 'InternalServerError',
          message: 'Failed to fetch tournaments',
          statusCode: 500
        });
      }
    });

    fastify.get('/tournaments/:id', async (request, reply) => {
      try {
        const tournament = tournamentService.getTournamentById(request.params.id);
        reply.send(tournament);
      } catch (error) {
        reply.status(404).send({
          error: 'NotFound',
          message: error.message,
          statusCode: 404
        });
      }
    });

    fastify.post('/tournaments/:id/join', {
      preHandler: requireAuth
    }, async (request, reply) => {
      try {
        const result = tournamentService.joinTournament(
          request.params.id,
          request.session.userId
        );
        reply.send(result);
      } catch (error) {
        reply.status(400).send({
          error: 'TournamentError',
          message: error.message,
          statusCode: 400
        });
      }
    });

    fastify.post('/tournaments/:id/start', {
      preHandler: requireAuth
    }, async (request, reply) => {
      try {
        const result = tournamentService.startTournament(
          request.params.id,
          request.session.userId
        );
        reply.send(result);
      } catch (error) {
        reply.status(400).send({
          error: 'TournamentError',
          message: error.message,
          statusCode: 400
        });
      }
    });

    fastify.get('/tournaments/:id/participants', async (request, reply) => {
      try {
        const participants = tournamentService.getTournamentParticipants(request.params.id);
        reply.send({ participants });
      } catch (error) {
        reply.status(404).send({
          error: 'NotFound',
          message: 'Tournament not found',
          statusCode: 404
        });
      }
    });

    fastify.get('/tournaments/:id/matches', async (request, reply) => {
      try {
        const matches = tournamentService.getTournamentMatches(request.params.id);
        reply.send({ matches });
      } catch (error) {
        reply.status(404).send({
          error: 'NotFound',
          message: 'Tournament not found',
          statusCode: 404
        });
      }
    });

    fastify.get('/tournaments/:id/results', async (request, reply) => {
      try {
        const results = tournamentService.getTournamentResults(request.params.id);
        reply.send({ results });
      } catch (error) {
        reply.status(404).send({
          error: 'NotFound',
          message: 'Tournament not found',
          statusCode: 404
        });
      }
    });

    fastify.post('/matches/:id/result', {
      preHandler: requireAuth,
      schema: {
        body: schemas.recordMatchResult.body,
        response: {
          200: { type: 'object', properties: { message: { type: 'string' } } },
          400: schemas.error,
          401: schemas.error
        }
      }
    }, async (request, reply) => {
      try {
        const result = tournamentService.recordMatchResult(
          request.params.id,
          request.session.userId,
          request.body
        );
        reply.send(result);
      } catch (error) {
        reply.status(400).send({
          error: 'MatchError',
          message: error.message,
          statusCode: 400
        });
      }
    });

    fastify.get('/profile/tournaments', {
      preHandler: requireAuth
    }, async (request, reply) => {
      try {
        const result = tournamentService.getUserTournamentHistory(
          request.session.userId,
          request.query
        );
        reply.send(result);
      } catch (error) {
        reply.status(500).send({
          error: 'InternalServerError',
          message: 'Failed to fetch tournament history',
          statusCode: 500
        });
      }
    });    // User profile routes (require authentication)
    const requireAuth = async (request, reply) => {
      if (!request.session?.authenticated || !request.session?.userId) {
        reply.status(401).send({
          error: 'Unauthorized',
          message: 'Authentication required',
          statusCode: 401
        });
        return;
      }
    };

    fastify.get('/profile', {
      preHandler: requireAuth,
      schema: {
        response: {
          200: schemas.userResponse,
          401: schemas.error
        }
      }
    }, async (request, reply) => {
      try {
        const user = authService.getUserById(request.session.userId);
        reply.send(user);
      } catch (error) {
        reply.status(404).send({
          error: 'NotFound',
          message: 'User not found',
          statusCode: 404
        });
      }
    });

    fastify.get('/profile/stats', {
      preHandler: requireAuth,
      schema: {
        response: {
          200: schemas.userStatsResponse,
          401: schemas.error
        }
      }
    }, async (request, reply) => {
      try {
        const stats = authService.getUserStats(request.session.userId);
        reply.send(stats);
      } catch (error) {
        reply.status(500).send({
          error: 'InternalServerError',
          message: 'Failed to fetch user statistics',
          statusCode: 500
        });
      }
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