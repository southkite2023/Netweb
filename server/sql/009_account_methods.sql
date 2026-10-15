BEGIN;
CREATE TABLE IF NOT EXISTS auth_phone_challenges (
 id UUID PRIMARY KEY, phone VARCHAR(20) NOT NULL,
 purpose VARCHAR(16) NOT NULL CHECK(purpose IN ('register','login','bind','manage')),
 user_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
 scheme_name VARCHAR(20) NOT NULL DEFAULT '',
 code_hash CHAR(64) NOT NULL, ip_hash CHAR(64) NOT NULL,
 attempts INTEGER NOT NULL DEFAULT 0, sent BOOLEAN NOT NULL DEFAULT FALSE,
 used_at TIMESTAMPTZ, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), expires_at TIMESTAMPTZ NOT NULL
);
CREATE INDEX IF NOT EXISTS auth_phone_recipient_time ON auth_phone_challenges(phone,created_at);
CREATE INDEX IF NOT EXISTS auth_phone_ip_time ON auth_phone_challenges(ip_hash,created_at);
ALTER TABLE auth_email_challenges DROP CONSTRAINT IF EXISTS auth_email_challenges_purpose_check;
ALTER TABLE auth_email_challenges ADD CONSTRAINT auth_email_challenges_purpose_check CHECK(purpose IN ('register','reset','verify','bind','manage'));
ALTER TABLE auth_email_challenges ADD COLUMN IF NOT EXISTS user_id BIGINT REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE auth_oauth_states ADD COLUMN IF NOT EXISTS purpose VARCHAR(16) NOT NULL DEFAULT 'login';
COMMIT;
