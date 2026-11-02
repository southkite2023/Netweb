CREATE TABLE IF NOT EXISTS calendar_subscriptions (
 id BIGSERIAL PRIMARY KEY,
 user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 token TEXT NOT NULL UNIQUE CHECK (token ~ '^[A-Za-z0-9_-]{43}$'),
 selection TEXT NOT NULL CHECK (length(selection) <= 16000),
 revision INTEGER NOT NULL DEFAULT 1 CHECK (revision > 0),
 is_default BOOLEAN NOT NULL DEFAULT TRUE,
 created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS calendar_subscriptions_default_user ON calendar_subscriptions(user_id) WHERE is_default;
CREATE INDEX IF NOT EXISTS calendar_subscriptions_user ON calendar_subscriptions(user_id);
