const config = require('./config');
const database = require('./database');
const schemas = require('./schemas');
const securityPlugin = require('./security');
const authService = require('./auth-service');
const tournamentService = require('./tournament-service');
const matchHub = require('./match-hub');
const chatService = require('./chat-service');

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

// Register WebSocket support
fastify.register(require('@fastify/websocket'));

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

        }
    });

    // Chat routes
    fastify.get('/chat/channels', {
      preHandler: requireAuth
    }, async (request, reply) => {
      try {
        const channels = chatService.getUserChannels(request.session.userId);
        reply.send({ channels });
      } catch (error) {
        reply.status(500).send({
          error: 'InternalServerError',
          message: 'Failed to fetch chat channels',
          statusCode: 500
        });
      }
    });

    fastify.get('/chat/channels/:channelId/messages', {
      preHandler: requireAuth,
      schema: {
        querystring: {
          type: 'object',
          properties: {
            limit: { type: 'number', minimum: 1, maximum: 100, default: 50 },
            offset: { type: 'number', minimum: 0, default: 0 }
          }
        }
      }
    }, async (request, reply) => {
      try {
        const messages = chatService.getChannelMessages(
          request.session.userId,
          request.params.channelId,
          request.query.limit,
          request.query.offset
        );
        reply.send({ messages });
      } catch (error) {
        reply.status(403).send({
          error: 'AccessDenied',
          message: error.message,
          statusCode: 403
        });
      }
    });

    fastify.post('/chat/channels/:channelId/messages', {
      preHandler: requireAuth,
      schema: {
        body: schemas.sendMessage.body
      }
    }, async (request, reply) => {
      try {
        const message = chatService.sendMessage(
          request.session.userId,
          request.params.channelId,
          request.body.message,
          request.body.messageType,
          request.body.metadata
        );
        reply.send(message);
      } catch (error) {
        reply.status(400).send({
          error: 'ChatError',
          message: error.message,
          statusCode: 400
        });
      }
    });

    fastify.post('/chat/dm/:userId', {
      preHandler: requireAuth
    }, async (request, reply) => {
      try {
        const channel = chatService.getOrCreateDMChannel(
          request.session.userId,
          parseInt(request.params.userId)
        );
        reply.send(channel);
      } catch (error) {
        reply.status(400).send({
          error: 'ChatError',
          message: error.message,
          statusCode: 400
        });
      }
    });

    // Block management
    fastify.post('/users/:userId/block', {
      preHandler: requireAuth
    }, async (request, reply) => {
      try {
        const result = chatService.blockUser(
          request.session.userId,
          parseInt(request.params.userId)
        );
        reply.send(result);
      } catch (error) {
        reply.status(400).send({
          error: 'BlockError',
          message: error.message,
          statusCode: 400
        });
      }
    });

    fastify.delete('/users/:userId/block', {
      preHandler: requireAuth
    }, async (request, reply) => {
      try {
        const result = chatService.unblockUser(
          request.session.userId,
          parseInt(request.params.userId)
        );
        reply.send(result);
      } catch (error) {
        reply.status(400).send({
          error: 'UnblockError',
          message: error.message,
          statusCode: 400
        });
      }
    });

    fastify.get('/profile/blocked-users', {
      preHandler: requireAuth
    }, async (request, reply) => {
      try {
        const blockedUsers = chatService.getBlockedUsers(request.session.userId);
        reply.send({ blockedUsers });
      } catch (error) {
        reply.status(500).send({
          error: 'InternalServerError',
          message: 'Failed to fetch blocked users',
          statusCode: 500
        });
      }
    });

    // Match invites
    fastify.post('/match-invites', {
      preHandler: requireAuth,
      schema: {
        body: schemas.createMatchInvite.body
      }
    }, async (request, reply) => {
      try {
        const invite = chatService.createMatchInvite(
          request.session.userId,
          request.body.toUserId,
          request.body.matchType
        );
        reply.send(invite);
      } catch (error) {
        reply.status(400).send({
          error: 'InviteError',
          message: error.message,
          statusCode: 400
        });
      }
    });

    fastify.post('/match-invites/:inviteId/respond', {
      preHandler: requireAuth,
      schema: {
        body: schemas.respondToInvite.body
      }
    }, async (request, reply) => {
      try {
        const result = chatService.respondToMatchInvite(
          parseInt(request.params.inviteId),
          request.session.userId,
          request.body.response
        );
        reply.send(result);
      } catch (error) {
        reply.status(400).send({
          error: 'InviteError',
          message: error.message,
          statusCode: 400
        });
      }
    });

    fastify.get('/match-invites', {
      preHandler: requireAuth
    }, async (request, reply) => {
      try {
        const invites = chatService.getUserInvites(request.session.userId);
        reply.send({ invites });
      } catch (error) {
        reply.status(500).send({
          error: 'InternalServerError',
          message: 'Failed to fetch invites',
          statusCode: 500
        });
      }
    });

    // User search
    fastify.get('/users/search', {
      preHandler: requireAuth,
      schema: {
        querystring: {
          type: 'object',
          properties: {
            q: { type: 'string', minLength: 1 },
            limit: { type: 'number', minimum: 1, maximum: 50, default: 10 }
          },
          required: ['q']
        }
      }
    }, async (request, reply) => {
      try {
        const users = chatService.searchUsers(
          request.query.q,
          request.session.userId,
          request.query.limit
        );
        reply.send({ users });
      } catch (error) {
        reply.status(500).send({
          error: 'InternalServerError',
          message: 'Failed to search users',
          statusCode: 500
        });
      }
    });
  }, { prefix: '/api' });

  // Health check endpoint
  fastify.get('/health', async (request, reply) => {
    try {
      // Test database connection
      const dbTest = database.queryOne('SELECT 1 as test');
      
      return {
        status: 'ok',
        timestamp: new Date().toISOString(),
        database: dbTest ? 'connected' : 'error',
        uptime: process.uptime()
      };
    } catch (error) {
      reply.status(503).send({
        status: 'error',
        message: 'Database connection failed',
        timestamp: new Date().toISOString()
      });
    }
  });

  // WebSocket routes
  fastify.register(async function (fastify) {
    // WebSocket endpoint for match connections
    fastify.get('/ws/match/:matchId', { websocket: true }, async (connection, request) => {
      const { socket } = connection;
      const { matchId } = request.params;

      // WebSocket session authentication
      let userId = null;
      
      // Parse session from query string or headers (WebSocket doesn't support cookies directly)
      const sessionId = request.query.sessionId;
      if (sessionId) {
        // In a real implementation, you'd validate the session ID
        // For now, we'll use a simple approach with query params
        userId = parseInt(request.query.userId);
      }

      if (!userId) {
        socket.send(JSON.stringify({
          type: 'error',
          message: 'Authentication required'
        }));
        socket.close();
        return;
      }

      // Join match
      const success = matchHub.joinMatch(matchId, userId, socket);
      if (!success) {
        socket.close();
      }
    });

    // Get match hub status (for debugging)
    fastify.get('/ws/status', async (request, reply) => {
      return {
        activeMatches: matchHub.getActiveMatchesCount(),
        connectedClients: matchHub.clients.size
      };
    });
    });

}, { prefix: '/api' });

// Start server

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
    console.log('🚀 Starting ft_transcendence API server...');
    await fastify.listen({ port: 8080, host: '0.0.0.0' });
    console.log('✅ Server running on http://0.0.0.0:8080');
    console.log('📋 Available routes:');
    console.log('   GET  /api/health - Health check');
    console.log('   POST /api/auth/login - User login');
    console.log('   GET  /api/chat/channels - Chat channels');
  } catch (err) {
    console.error('❌ Server startup failed:', err.message);
    console.error('Stack trace:', err.stack);
    process.exit(1);
  }
};

start();