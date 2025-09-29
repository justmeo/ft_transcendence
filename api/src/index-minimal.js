const fastify = require('fastify')({ logger: true });

// Simple in-memory config instead of external config file
const config = {
  sessionSecret: 'dev-secret-key-change-in-production',
  dbPath: './db/transcendence.db'
};

// Initialize basic fastify plugins
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

// Simple auth middleware
const requireAuth = async (request, reply) => {
  if (!request.session.userId) {
    reply.status(401).send({ error: 'Authentication required' });
  }
};

// Register API routes
fastify.register(async function (fastify) {
  
  // Health check endpoint
  fastify.get('/health', async (request, reply) => {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      message: 'ft_transcendence API is running'
    };
  });

  // Simple auth endpoints (mock for now)
  fastify.post('/auth/login', async (request, reply) => {
    const { email, password } = request.body || {};
    
    if (!email || !password) {
      return reply.status(400).send({ error: 'Email and password required' });
    }

    // Mock authentication - accept any email/password for development
    const mockUser = {
      id: 1,
      email: email,
      displayName: email.split('@')[0]
    };

    request.session.userId = mockUser.id;
    reply.send({ 
      message: 'Login successful',
      user: mockUser 
    });
  });

  fastify.post('/auth/signup', async (request, reply) => {
    const { email, displayName, password } = request.body || {};
    
    if (!email || !displayName || !password) {
      return reply.status(400).send({ error: 'All fields required' });
    }

    // Mock signup - create mock user for development
    const mockUser = {
      id: Math.floor(Math.random() * 1000),
      email: email,
      displayName: displayName
    };

    request.session.userId = mockUser.id;
    reply.send({ 
      message: 'Signup successful',
      user: mockUser 
    });
  });

  fastify.post('/auth/logout', async (request, reply) => {
    if (request.session) {
      request.session.destroy();
    }
    reply.send({ message: 'Logged out successfully' });
  });

  fastify.get('/auth/me', { preHandler: requireAuth }, async (request, reply) => {
    // Return mock user data
    const mockUser = {
      id: request.session.userId,
      email: 'user@example.com',
      displayName: 'Test User'
    };
    reply.send({ user: mockUser });
  });

  // Mock tournament endpoints
  fastify.get('/tournaments', async (request, reply) => {
    reply.send({
      tournaments: [],
      message: 'No tournaments available yet'
    });
  });

  fastify.post('/tournaments', { preHandler: requireAuth }, async (request, reply) => {
    reply.send({
      message: 'Tournament creation not implemented yet',
      tournament: { id: 1, name: request.body?.name || 'Mock Tournament' }
    });
  });

  // Mock chat endpoints
  fastify.get('/chat/channels', { preHandler: requireAuth }, async (request, reply) => {
    reply.send({
      channels: [
        {
          id: 1,
          name: 'Global',
          type: 'global',
          last_message: 'Welcome to ft_transcendence!'
        }
      ]
    });
  });

  fastify.get('/chat/channels/:channelId/messages', { preHandler: requireAuth }, async (request, reply) => {
    reply.send({
      messages: [
        {
          id: 1,
          user_id: 1,
          username: 'System',
          content: 'Welcome to the chat!',
          created_at: new Date().toISOString()
        }
      ]
    });
  });

  // Mock WebSocket endpoint for matches
  fastify.register(async function (fastify) {
    fastify.get('/ws/match/:matchId', { websocket: true }, async (connection, request) => {
      const matchId = request.params.matchId;
      console.log(`WebSocket connection for match ${matchId}`);
      
      connection.socket.send(JSON.stringify({
        type: 'connected',
        matchId: matchId,
        message: 'Connected to match'
      }));

      connection.socket.on('message', (message) => {
        console.log('Received WebSocket message:', message.toString());
        // Echo back for now
        connection.socket.send(JSON.stringify({
          type: 'echo',
          data: message.toString()
        }));
      });
    });
  });

}, { prefix: '/api' });

// Start server
const start = async () => {
  try {
    console.log('🚀 Starting ft_transcendence API server (minimal version)...');
    await fastify.listen({ port: 8080, host: '0.0.0.0' });
    console.log('✅ Server running on http://0.0.0.0:8080');
    console.log('📋 Available routes:');
    console.log('   GET  /api/health - Health check');
    console.log('   POST /api/auth/login - Mock login');
    console.log('   POST /api/auth/signup - Mock signup');
    console.log('   GET  /api/tournaments - Mock tournaments');
    console.log('   GET  /api/chat/channels - Mock chat');
    console.log('   WS   /api/ws/match/:id - Mock WebSocket');
    console.log('');
    console.log('🔧 This is a development version with mock data');
  } catch (err) {
    console.error('❌ Server startup failed:', err.message);
    console.error('Stack trace:', err.stack);
    process.exit(1);
  }
};

start();