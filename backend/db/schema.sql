-- ft_transcendence database schema
-- SQLite database initialization

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    username        TEXT UNIQUE NOT NULL,
    email           TEXT UNIQUE NOT NULL,
    password_hash   TEXT,          -- null if OAuth only
    twofa_enabled   BOOLEAN DEFAULT 0,
    twofa_secret    TEXT,          -- secret key for 2FA
    google_id       TEXT UNIQUE,   -- for Google Sign-in
    avatar_url      TEXT,
    created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Sessions table (if using session-based auth)
CREATE TABLE IF NOT EXISTS sessions (
    id VARCHAR(255) PRIMARY KEY,
    user_id INTEGER NOT NULL,
    expires_at DATETIME NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Friends table (added missing semicolon)
CREATE TABLE IF NOT EXISTS friends (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id         INTEGER NOT NULL,
    friend_id       INTEGER NOT NULL,
    status          TEXT CHECK(status IN ('pending','accepted','blocked')),
    created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id),
    FOREIGN KEY(friend_id) REFERENCES users(id)
);

-- Tournaments table (added missing semicolon)
CREATE TABLE IF NOT EXISTS tournaments (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    name            TEXT NOT NULL,
    created_by      INTEGER NOT NULL,   -- who started it
    created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
    status          TEXT CHECK(status IN ('upcoming','ongoing','finished')),
    FOREIGN KEY(created_by) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS tournament_players (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    tournament_id   INTEGER NOT NULL,
    user_id         INTEGER NOT NULL,
    alias           TEXT NOT NULL,   -- can differ from username
    FOREIGN KEY(tournament_id) REFERENCES tournaments(id),
    FOREIGN KEY(user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS matches (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    tournament_id   INTEGER,
    player1_id      INTEGER NOT NULL,
    player2_id      INTEGER NOT NULL,
    winner_id       INTEGER,
    score_p1        INTEGER DEFAULT 0,
    score_p2        INTEGER DEFAULT 0,
    started_at      DATETIME,
    finished_at     DATETIME,
    FOREIGN KEY(tournament_id) REFERENCES tournaments(id),
    FOREIGN KEY(player1_id) REFERENCES users(id),
    FOREIGN KEY(player2_id) REFERENCES users(id),
    FOREIGN KEY(winner_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS game_history (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    match_id        INTEGER NOT NULL,
    user_id         INTEGER NOT NULL,
    score           INTEGER,
    result          TEXT CHECK(result IN ('win','loss')),
    created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(match_id) REFERENCES matches(id),
    FOREIGN KEY(user_id) REFERENCES users(id)
);

-- Optional chat system
CREATE TABLE IF NOT EXISTS chat_messages (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    sender_id       INTEGER NOT NULL,
    receiver_id     INTEGER NOT NULL,
    message         TEXT NOT NULL,
    created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(sender_id) REFERENCES users(id),
    FOREIGN KEY(receiver_id) REFERENCES users(id)
);