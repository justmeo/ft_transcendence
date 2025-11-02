const fastify = require('fastify')({ logger: true });
const Database = require('better-sqlite3');
const path = require('path');

// Simple in-memory config
const config = {
  sessionSecret: 'dev-secret-key-change-in-production',
  dbPath: '/app/db/transcendence.db'
};

// Initialize SQLite database
let db;
try {
  db = new Database(config.dbPath);
  console.log('✅ SQLite database connected');

  // Create users table if it doesn't exist
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      display_name TEXT NOT NULL,
      password TEXT NOT NULL,
      avatar_url TEXT,
      created_at TEXT NOT NULL,
      total_games INTEGER DEFAULT 0,
      wins INTEGER DEFAULT 0,
      losses INTEGER DEFAULT 0,
      rating INTEGER DEFAULT 1000
    )
  `);

  console.log('✅ Database tables initialized');
} catch (error) {
  console.error('❌ Database initialization failed:', error);
  process.exit(1);
}

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

  // Auth endpoints with SQLite storage
  fastify.post('/auth/signup', async (request, reply) => {
    const { email, displayName, password, avatarUrl } = request.body || {};

    if (!email || !displayName || !password) {
      return reply.status(400).send({ error: 'Email, display name, and password are required' });
    }

    try {
      // Check if user already exists
      const existingUser = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
      if (existingUser) {
        return reply.status(400).send({ error: 'Email already registered' });
      }

      // Insert new user
      const result = db.prepare(`
        INSERT INTO users (email, display_name, password, avatar_url, created_at)
        VALUES (?, ?, ?, ?, ?)
      `).run(email, displayName, password, avatarUrl || null, new Date().toISOString());

      const userId = result.lastInsertRowid;

      // Get the created user
      const newUser = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);

      // Set session
      request.session.userId = userId;

      // Return user without password
      const { password: _, ...userResponse } = newUser;
      reply.send({
        message: 'Signup successful',
        user: userResponse
      });
    } catch (error) {
      console.error('Signup error:', error);
      reply.status(500).send({ error: 'Signup failed' });
    }
  });

  fastify.post('/auth/login', async (request, reply) => {
    const { email, password } = request.body || {};

    if (!email || !password) {
      return reply.status(400).send({ error: 'Email and password required' });
    }

    try {
      // Find user by email
      const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);

      if (!user) {
        return reply.status(401).send({ error: 'Invalid email or password' });
      }

      // Check password (in production, compare hashed passwords!)
      if (user.password !== password) {
        return reply.status(401).send({ error: 'Invalid email or password' });
      }

      // Set session
      request.session.userId = user.id;

      // Return user without password
      const { password: _, ...userResponse } = user;
      reply.send({
        message: 'Login successful',
        user: userResponse
      });
    } catch (error) {
      console.error('Login error:', error);
      reply.status(500).send({ error: 'Login failed' });
    }
  });

  fastify.post('/auth/logout', async (request, reply) => {
    if (request.session) {
      request.session.destroy();
    }
    reply.send({ message: 'Logged out successfully' });
  });

  fastify.get('/auth/me', { preHandler: requireAuth }, async (request, reply) => {
    try {
      const user = db.prepare('SELECT * FROM users WHERE id = ?').get(request.session.userId);

      if (!user) {
        return reply.status(404).send({ error: 'User not found' });
      }

      // Return user without password
      const { password: _, ...userResponse } = user;
      reply.send({ user: userResponse });
    } catch (error) {
      console.error('Get user error:', error);
      reply.status(500).send({ error: 'Failed to get user' });
    }
  });

  // Profile endpoint
  fastify.get('/profile', { preHandler: requireAuth }, async (request, reply) => {
    try {
      const user = db.prepare('SELECT * FROM users WHERE id = ?').get(request.session.userId);

      if (!user) {
        return reply.status(404).send({ error: 'User not found' });
      }

      // Return user without password
      const { password: _, ...userResponse } = user;
      reply.send(userResponse);
    } catch (error) {
      console.error('Get profile error:', error);
      reply.status(500).send({ error: 'Failed to get profile' });
    }
  });

  // Profile stats endpoint
  fastify.get('/profile/stats', { preHandler: requireAuth }, async (request, reply) => {
    try {
      const user = db.prepare('SELECT * FROM users WHERE id = ?').get(request.session.userId);

      if (!user) {
        return reply.status(404).send({ error: 'User not found' });
      }

      // Calculate win rate
      const winRate = user.total_games > 0
        ? ((user.wins / user.total_games) * 100).toFixed(1) + '%'
        : '0%';

      // Return stats
      reply.send({
        totalGames: user.total_games,
        wins: user.wins,
        losses: user.losses,
        winRate: winRate,
        rank: user.rating >= 1200 ? 'Gold' : user.rating >= 1000 ? 'Silver' : 'Bronze',
        rating: user.rating,
        longestWinStreak: 0, // TODO: Track this
        favoriteOpponent: null // TODO: Track this
      });
    } catch (error) {
      console.error('Get stats error:', error);
      reply.status(500).send({ error: 'Failed to get stats' });
    }
  });

  // Update profile endpoint
  fastify.put('/profile', { preHandler: requireAuth }, async (request, reply) => {
    try {
      const { displayName, avatarUrl } = request.body || {};

      if (displayName) {
        db.prepare('UPDATE users SET display_name = ? WHERE id = ?')
          .run(displayName, request.session.userId);
      }

      if (avatarUrl !== undefined) {
        db.prepare('UPDATE users SET avatar_url = ? WHERE id = ?')
          .run(avatarUrl, request.session.userId);
      }

      const user = db.prepare('SELECT * FROM users WHERE id = ?').get(request.session.userId);
      const { password: _, ...userResponse } = user;

      reply.send({
        message: 'Profile updated successfully',
        user: userResponse
      });
    } catch (error) {
      console.error('Update profile error:', error);
      reply.status(500).send({ error: 'Failed to update profile' });
    }
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

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, closing database...');
  db.close();
  process.exit(0);
});

// Start server
const start = async () => {
  try {
    console.log('🚀 Starting ft_transcendence API server with SQLite...');
    await fastify.listen({ port: 8080, host: '0.0.0.0' });
    console.log('✅ Server running on http://0.0.0.0:8080');
    console.log('📋 Available routes:');
    console.log('   GET  /api/health - Health check');
    console.log('   POST /api/auth/signup - User signup');
    console.log('   POST /api/auth/login - User login');
    console.log('   POST /api/auth/logout - User logout');
    console.log('   GET  /api/auth/me - Get current user');
    console.log('   GET  /api/profile - Get user profile');
    console.log('   GET  /api/tournaments - Mock tournaments');
    console.log('   GET  /api/chat/channels - Mock chat');
    console.log('   WS   /api/ws/match/:id - Mock WebSocket');
    console.log('');
    console.log('💾 Using SQLite database at:', config.dbPath);
    console.log('📊 User data will persist across restarts');
  } catch (err) {
    console.error('❌ Server startup failed:', err.message);
    console.error('Stack trace:', err.stack);
    db.close();
    process.exit(1);
  }
};

start();
