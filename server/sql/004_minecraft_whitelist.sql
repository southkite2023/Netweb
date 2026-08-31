CREATE TABLE IF NOT EXISTS minecraft_accounts (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  minecraft_name VARCHAR(16) NOT NULL CHECK (minecraft_name ~ '^[A-Za-z0-9_]{3,16}$'),
  status VARCHAR(16) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','active','error')),
  sync_message TEXT NOT NULL DEFAULT '',
  synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS minecraft_accounts_name_ci_unique
ON minecraft_accounts (lower(minecraft_name));

CREATE INDEX IF NOT EXISTS minecraft_accounts_status_idx
ON minecraft_accounts(status);
