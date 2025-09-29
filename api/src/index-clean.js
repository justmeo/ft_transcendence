const fastify = require('fastify')({ logger: true });
const config = require('./config');
const database = require('./database');
const schemas = require('./schemas');
const securityPlugin = require('./security');
const authService = require('./auth-service');
const tournamentService = require('./tournament-service');
const matchHub = require('./match-hub');
const chatService = require('./chat-service');

// Initialize database
database.init();

// Register plugins
fastify.register(require('@fastify/websocket'));
fastify.register(require('@fastify/cors'), {
  origin: true,
  credentials: true
});
fastify.register(require('@fastify/cookie'));
fastify.register(require('@fastify/session'), {
  secret: config.sessionSecret,
  cookie: { secure: false, httpOnly: true, maxAge: 24 * 60 * 60 * 1000 }
});
fastify.register(securityPlugin);

// Auth middleware
const requireAuth = async (request, reply) => {
  if (!request.session.userId) {
    reply.status(401).send({ error: 'Authentication required' });
  }
};

// Register API routes
fastify.register(async function (fastify) {
  
  // Health check
  fastify.get('/health', async (request, reply) => {
    try {
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

  // Auth routes
  fastify.post('/auth/login', { schema: schemas.loginUser }, async (request, reply) => {
    try {
      const result = await authService.login(request.body.email, request.body.password);
      request.session.userId = result.user.id;
      reply.send(result);
    } catch (error) {
      reply.status(401).send({ error: 'Invalid credentials', message: error.message });
    }
  });

  fastify.post('/auth/signup', { schema: schemas.createUser }, async (request, reply) => {
    try {
      const result = await authService.signup(request.body.email, request.body.displayName, request.body.password);
      request.session.userId = result.user.id;
      reply.send(result);
    } catch (error) {
      reply.status(400).send({ error: 'Registration failed', message: error.message });
    }
  });

  fastify.post('/auth/logout', { preHandler: requireAuth }, async (request, reply) => {
    request.session.destroy();
    reply.send({ message: 'Logged out successfully' });
  });

  fastify.get('/auth/me', { preHandler: requireAuth }, async (request, reply) => {
    try {
      const user = authService.getUserById(request.session.userId);
      reply.send({ user });
    } catch (error) {
      reply.status(404).send({ error: 'User not found' });
    }
  });

  // Tournament routes
  fastify.get('/tournaments', async (request, reply) => {
    const page = parseInt(request.query.page) || 1;
    const limit = parseInt(request.query.limit) || 10;
    const tournaments = tournamentService.getAllTournaments({ page, limit });
    reply.send(tournaments);
  });

  fastify.post('/tournaments', { preHandler: requireAuth, schema: schemas.createTournament }, async (request, reply) => {
    try {
      const tournament = tournamentService.createTournament({ ...request.body, createdBy: request.session.userId });
      reply.send(tournament);
    } catch (error) {
      reply.status(400).send({ error: 'Failed to create tournament', message: error.message });
    }
  });

  // Chat routes
  fastify.get('/chat/channels', { preHandler: requireAuth }, async (request, reply) => {
    try {
      const channels = chatService.getUserChannels(request.session.userId);
      reply.send({ channels });
    } catch (error) {
      reply.status(500).send({ error: 'Failed to fetch channels' });
    }
  });

  fastify.get('/chat/channels/:channelId/messages', { preHandler: requireAuth }, async (request, reply) => {
    try {
      const messages = chatService.getChannelMessages(
        request.session.userId,
        request.params.channelId,
        request.query.limit || 50,
        request.query.offset || 0
      );
      reply.send({ messages });
    } catch (error) {
      reply.status(403).send({ error: 'Access denied', message: error.message });
    }
  });

  // WebSocket for match connections
  fastify.register(async function (fastify) {
    fastify.get('/ws/match/:matchId', { websocket: true }, async (connection, request) => {
      const matchId = request.params.matchId;
      const userId = request.session?.userId;
      
      if (!userId) {
        connection.socket.close(1008, 'Authentication required');
        return;
      }

      console.log(`WebSocket connection for match ${matchId}, user ${userId}`);
      matchHub.handleConnection(connection, matchId, userId);
    });
  });

}, { prefix: '/api' });

// Start server
const start = async () => {
  try {
    console.log('🚀 Starting ft_transcendence API server...');
    await fastify.listen({ port: 8080, host: '0.0.0.0' });
    console.log('✅ Server running on http://0.0.0.0:8080');
    console.log('📋 Available routes:');
    console.log('   GET  /api/health - Health check');
    console.log('   POST /api/auth/login - User login');
    console.log('   POST /api/auth/signup - User signup');
    console.log('   GET  /api/tournaments - List tournaments');
    console.log('   GET  /api/chat/channels - Chat channels');
    console.log('   WS   /api/ws/match/:id - WebSocket matches');
  } catch (err) {
    console.error('❌ Server startup failed:', err.message);
    console.error('Stack trace:', err.stack);
    process.exit(1);
  }
};

start();