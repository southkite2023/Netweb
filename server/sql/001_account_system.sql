CREATE TABLE IF NOT EXISTS users (
  id BIGSERIAL PRIMARY KEY,
  username VARCHAR(24) UNIQUE NOT NULL CHECK (username ~ '^[A-Za-z0-9_-]{3,24}$'),
  email VARCHAR(254) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  display_name VARCHAR(40) NOT NULL,
  bio VARCHAR(280) NOT NULL DEFAULT '',
  website VARCHAR(300) NOT NULL DEFAULT '',
  role VARCHAR(16) NOT NULL DEFAULT 'user' CHECK (role IN ('user','moderator','admin')),
  contribution_points INTEGER NOT NULL DEFAULT 5 CHECK (contribution_points >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS sessions (
  id BIGSERIAL PRIMARY KEY, user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash CHAR(64) UNIQUE NOT NULL, expires_at TIMESTAMPTZ NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS sessions_user_id_idx ON sessions(user_id);
CREATE INDEX IF NOT EXISTS sessions_expires_at_idx ON sessions(expires_at);
CREATE TABLE IF NOT EXISTS contribution_events (
  id BIGSERIAL PRIMARY KEY, user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL, points INTEGER NOT NULL, reason TEXT NOT NULL,
  reference_type VARCHAR(30), reference_id VARCHAR(80), created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
