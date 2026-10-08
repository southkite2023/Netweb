BEGIN;
CREATE TABLE IF NOT EXISTS user_favorites (
 user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 path VARCHAR(300) NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), PRIMARY KEY(user_id,path)
);
CREATE TABLE IF NOT EXISTS user_preferences (
 user_id BIGINT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
 language VARCHAR(2) CHECK(language IN ('zh','en','ja')),
 theme VARCHAR(5) CHECK(theme IN ('dark','light')),
 updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS user_notifications (
 user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 key VARCHAR(200) NOT NULL, payload JSONB NOT NULL,
 created_at TIMESTAMPTZ NOT NULL, PRIMARY KEY(user_id,key)
);
CREATE INDEX IF NOT EXISTS user_notifications_time_idx ON user_notifications(user_id,created_at DESC);
CREATE TABLE IF NOT EXISTS notification_reads (
 user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 key VARCHAR(200) NOT NULL, read_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), PRIMARY KEY(user_id,key)
);
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS device VARCHAR(200) NOT NULL DEFAULT 'Existing device';
COMMIT;
