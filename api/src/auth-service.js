const bcrypt = require('bcrypt');
const database = require('./database');

class AuthService {
  constructor() {
    this.saltRounds = 12; // Strong bcrypt salt rounds
  }

  // Hash password using bcrypt
  async hashPassword(password) {
    try {
      return await bcrypt.hash(password, this.saltRounds);
    } catch (error) {
      throw new Error('Password hashing failed');
    }
  }

  // Verify password against hash
  async verifyPassword(password, hash) {
    try {
      return await bcrypt.compare(password, hash);
    } catch (error) {
      throw new Error('Password verification failed');
    }
  }

  // Create new user
  async createUser(userData) {
    const { email, password, displayName, avatarUrl = null } = userData;

    // Validate input
    if (!email || !password || !displayName) {
      throw new Error('Email, password, and display name are required');
    }

    // Check if user already exists
    const existingUser = database.queryOne(
      'SELECT id FROM users WHERE email = ? OR display_name = ?',
      [email.toLowerCase(), displayName]
    );

    if (existingUser) {
      throw new Error('User with this email or display name already exists');
    }

    // Hash password
    const passwordHash = await this.hashPassword(password);

    // Insert user
    try {
      const result = database.execute(
        `INSERT INTO users (email, password_hash, display_name, avatar_url, created_at, updated_at) 
         VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
        [email.toLowerCase(), passwordHash, displayName, avatarUrl]
      );

      // Return user without password
      return this.getUserById(result.lastInsertRowid);
    } catch (error) {
      if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
        throw new Error('User with this email or display name already exists');
      }
      throw new Error('Failed to create user');
    }
  }

  // Authenticate user
  async authenticateUser(email, password) {
    if (!email || !password) {
      throw new Error('Email and password are required');
    }

    // Get user with password hash
    const user = database.queryOne(
      'SELECT id, email, password_hash, display_name, avatar_url, created_at FROM users WHERE email = ?',
      [email.toLowerCase()]
    );

    if (!user) {
      throw new Error('Invalid email or password');
    }

    // Verify password
    const isValidPassword = await this.verifyPassword(password, user.password_hash);
    if (!isValidPassword) {
      throw new Error('Invalid email or password');
    }

    // Return user without password hash
    const { password_hash, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  // Get user by ID (without password)
  getUserById(userId) {
    const user = database.queryOne(
      'SELECT id, email, display_name, avatar_url, created_at, updated_at FROM users WHERE id = ?',
      [userId]
    );

    if (!user) {
      throw new Error('User not found');
    }

    return user;
  }

  // Update user profile
  async updateUser(userId, updateData) {
    const { displayName, avatarUrl } = updateData;
    const updates = [];
    const values = [];

    if (displayName !== undefined) {
      // Check if display name is taken by another user
      const existingUser = database.queryOne(
        'SELECT id FROM users WHERE display_name = ? AND id != ?',
        [displayName, userId]
      );

      if (existingUser) {
        throw new Error('Display name is already taken');
      }

      updates.push('display_name = ?');
      values.push(displayName);
    }

    if (avatarUrl !== undefined) {
      updates.push('avatar_url = ?');
      values.push(avatarUrl);
    }

    if (updates.length === 0) {
      throw new Error('No valid update fields provided');
    }

    updates.push('updated_at = CURRENT_TIMESTAMP');
    values.push(userId);

    try {
      database.execute(
        `UPDATE users SET ${updates.join(', ')} WHERE id = ?`,
        values
      );

      return this.getUserById(userId);
    } catch (error) {
      if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
        throw new Error('Display name is already taken');
      }
      throw new Error('Failed to update user');
    }
  }

  // Get user stats (placeholder)
  getUserStats(userId) {
    // Get game statistics
    const gameStats = database.queryOne(`
      SELECT 
        COUNT(*) as total_games,
        SUM(CASE WHEN (player1_id = ? AND player1_score > player2_score) OR 
                      (player2_id = ? AND player2_score > player1_score) THEN 1 ELSE 0 END) as wins,
        SUM(CASE WHEN (player1_id = ? AND player1_score < player2_score) OR 
                      (player2_id = ? AND player2_score < player1_score) THEN 1 ELSE 0 END) as losses
      FROM games 
      WHERE (player1_id = ? OR player2_id = ?) AND status = 'finished'
    `, [userId, userId, userId, userId, userId, userId]);

    return {
      totalGames: gameStats?.total_games || 0,
      wins: gameStats?.wins || 0,
      losses: gameStats?.losses || 0,
      winRate: gameStats?.total_games > 0 ? ((gameStats.wins / gameStats.total_games) * 100).toFixed(1) : 0,
      // Placeholder stats
      rank: 'Beginner',
      rating: 1200,
      longestWinStreak: 0,
      favoriteOpponent: null
    };
  }

  // Validate email format
  isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  // Validate password strength
  isValidPassword(password) {
    // At least 6 characters, 1 uppercase, 1 lowercase, 1 number
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{6,}$/;
    return passwordRegex.test(password);
  }

  // Validate display name
  isValidDisplayName(displayName) {
    // 3-50 characters, alphanumeric and underscores only
    const nameRegex = /^[a-zA-Z0-9_]{3,50}$/;
    return nameRegex.test(displayName);
  }
}

module.exports = new AuthService();