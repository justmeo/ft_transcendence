require('dotenv').config();
const fastify = require('fastify')({ logger: true });
const Database = require('better-sqlite3');
const path = require('path');

const resolveDbPath = () => {
  const rawPath = (process.env.DATABASE_URL || './db/transcendence.db').replace('sqlite:', '');
  if (path.isAbsolute(rawPath)) {
    return rawPath;
  }
  return path.resolve(process.cwd(), rawPath);
};

// Basic runtime config driven by environment variables
const config = {
  sessionSecret: process.env.SESSION_SECRET || 'dev-secret-key-change-in-production',
  dbPath: resolveDbPath(),
  port: parseInt(process.env.API_PORT || '8080', 10),
  host: process.env.API_HOST || '0.0.0.0'
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
    );

    CREATE TABLE IF NOT EXISTS chat_channels (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT,
      type TEXT NOT NULL,
      created_at TEXT NOT NULL,
      user1_id INTEGER,
      user2_id INTEGER,
      FOREIGN KEY (user1_id) REFERENCES users(id),
      FOREIGN KEY (user2_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS chat_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      channel_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      message TEXT NOT NULL,
      message_type TEXT DEFAULT 'text',
      created_at TEXT NOT NULL,
      FOREIGN KEY (channel_id) REFERENCES chat_channels(id),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );
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

  // Chat endpoints
  fastify.get('/chat/channels', { preHandler: requireAuth }, async (request, reply) => {
    try {
      const userId = request.session.userId;

      // Get all channels user is part of
      const channels = db.prepare(`
        SELECT
          c.*,
          (SELECT message FROM chat_messages WHERE channel_id = c.id ORDER BY created_at DESC LIMIT 1) as last_message,
          CASE
            WHEN c.type = 'dm' AND c.user1_id != ? THEN u1.display_name
            WHEN c.type = 'dm' AND c.user2_id != ? THEN u2.display_name
            ELSE c.name
          END as display_name,
          CASE
            WHEN c.type = 'dm' AND c.user1_id != ? THEN c.user1_id
            WHEN c.type = 'dm' AND c.user2_id != ? THEN c.user2_id
            ELSE NULL
          END as other_user_id
        FROM chat_channels c
        LEFT JOIN users u1 ON c.user1_id = u1.id
        LEFT JOIN users u2 ON c.user2_id = u2.id
        WHERE c.type = 'global' OR c.user1_id = ? OR c.user2_id = ?
        ORDER BY c.id
      `).all(userId, userId, userId, userId, userId, userId);

      // Ensure Global channel exists
      if (!channels.find(c => c.type === 'global')) {
        db.prepare('INSERT OR IGNORE INTO chat_channels (name, type, created_at) VALUES (?, ?, ?)').run('Global', 'global', new Date().toISOString());
        const globalChannel = db.prepare('SELECT * FROM chat_channels WHERE type = ?').get('global');
        channels.unshift({ ...globalChannel, last_message: null, display_name: 'Global', other_user_id: null });
      }

      reply.send({ channels });
    } catch (error) {
      console.error('Get channels error:', error);
      reply.status(500).send({ error: 'Failed to get channels' });
    }
  });

  fastify.get('/chat/channels/:channelId/messages', { preHandler: requireAuth }, async (request, reply) => {
    try {
      const channelId = parseInt(request.params.channelId);
      const messages = db.prepare(`
        SELECT m.*, u.display_name, u.avatar_url
        FROM chat_messages m
        JOIN users u ON m.user_id = u.id
        WHERE m.channel_id = ?
        ORDER BY m.created_at ASC
        LIMIT 100
      `).all(channelId);

      reply.send({ messages });
    } catch (error) {
      console.error('Get messages error:', error);
      reply.status(500).send({ error: 'Failed to get messages' });
    }
  });

  fastify.post('/chat/channels/:channelId/messages', { preHandler: requireAuth }, async (request, reply) => {
    try {
      const channelId = parseInt(request.params.channelId);
      const { message } = request.body || {};
      const userId = request.session.userId;

      if (!message || !message.trim()) {
        return reply.status(400).send({ error: 'Message is required' });
      }

      const result = db.prepare(`
        INSERT INTO chat_messages (channel_id, user_id, message, created_at)
        VALUES (?, ?, ?, ?)
      `).run(channelId, userId, message.trim(), new Date().toISOString());

      const newMessage = db.prepare(`
        SELECT m.*, u.display_name, u.avatar_url
        FROM chat_messages m
        JOIN users u ON m.user_id = u.id
        WHERE m.id = ?
      `).get(result.lastInsertRowid);

      reply.send({ message: newMessage });
    } catch (error) {
      console.error('Send message error:', error);
      reply.status(500).send({ error: 'Failed to send message' });
    }
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
    await fastify.listen({ port: config.port, host: config.host });
    console.log(`✅ Server running on http://${config.host}:${config.port}`);
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
