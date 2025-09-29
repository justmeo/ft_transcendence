const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');
const config = require('./config');

class DatabaseManager {
  constructor() {
    this.db = null;
    this.startTime = Date.now();
  }

  async initialize() {
    try {
      // Ensure directory exists
      const dbDir = path.dirname(config.database.file);
      if (!fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, { recursive: true });
      }

      // Initialize database
      this.db = new Database(config.database.file);
      
      // Enable WAL mode for better performance
      this.db.pragma('journal_mode = WAL');
      this.db.pragma('foreign_keys = ON');
      
      console.log(`Database connected: ${config.database.file}`);
      
      // Run migrations
      await this.runMigrations();
      
      return this.db;
    } catch (error) {
      console.error('Database initialization failed:', error);
      throw error;
    }
  }

  async runMigrations() {
    // Create migrations table if it doesn't exist
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS migrations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL,
        executed_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Bootstrap basic tables
    this.runMigration('001_create_users_table', `
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username VARCHAR(50) UNIQUE NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    this.runMigration('002_create_sessions_table', `
      CREATE TABLE IF NOT EXISTS sessions (
        id VARCHAR(255) PRIMARY KEY,
        user_id INTEGER NOT NULL,
        expires_at DATETIME NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    this.runMigration('003_create_games_table', `
      CREATE TABLE IF NOT EXISTS games (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        player1_id INTEGER NOT NULL,
        player2_id INTEGER NOT NULL,
        player1_score INTEGER DEFAULT 0,
        player2_score INTEGER DEFAULT 0,
        status VARCHAR(20) DEFAULT 'pending',
        started_at DATETIME,
        finished_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (player1_id) REFERENCES users(id),
        FOREIGN KEY (player2_id) REFERENCES users(id)
      )
    `);

    console.log('Database migrations completed');
  }

  runMigration(name, sql) {
    const checkMigration = this.db.prepare('SELECT 1 FROM migrations WHERE name = ?');
    const insertMigration = this.db.prepare('INSERT INTO migrations (name) VALUES (?)');
    
    if (!checkMigration.get(name)) {
      try {
        this.db.exec(sql);
        insertMigration.run(name);
        console.log(`Migration executed: ${name}`);
      } catch (error) {
        console.error(`Migration failed: ${name}`, error);
        throw error;
      }
    }
  }

  // Query helper methods
  query(sql, params = []) {
    try {
      const stmt = this.db.prepare(sql);
      return stmt.all(params);
    } catch (error) {
      console.error('Query error:', error, { sql, params });
      throw error;
    }
  }

  queryOne(sql, params = []) {
    try {
      const stmt = this.db.prepare(sql);
      return stmt.get(params);
    } catch (error) {
      console.error('Query error:', error, { sql, params });
      throw error;
    }
  }

  execute(sql, params = []) {
    try {
      const stmt = this.db.prepare(sql);
      return stmt.run(params);
    } catch (error) {
      console.error('Execute error:', error, { sql, params });
      throw error;
    }
  }

  // Transaction helper
  transaction(fn) {
    return this.db.transaction(fn);
  }

  // Get database info
  getInfo() {
    const stats = {
      file: config.database.file,
      uptime: Date.now() - this.startTime,
      tables: this.query("SELECT name FROM sqlite_master WHERE type='table'").map(row => row.name),
      size: fs.existsSync(config.database.file) ? fs.statSync(config.database.file).size : 0
    };
    return stats;
  }

  close() {
    if (this.db) {
      this.db.close();
      console.log('Database connection closed');
    }
  }
}

module.exports = new DatabaseManager();