BEGIN;
CREATE TABLE IF NOT EXISTS auth_email_challenges (
 id UUID PRIMARY KEY, email VARCHAR(254) NOT NULL, purpose VARCHAR(16) NOT NULL CHECK(purpose IN ('register','reset','verify')),
 code_hash CHAR(64) NOT NULL, ip_hash CHAR(64) NOT NULL, attempts INTEGER NOT NULL DEFAULT 0,
 sent BOOLEAN NOT NULL DEFAULT FALSE, used_at TIMESTAMPTZ, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), expires_at TIMESTAMPTZ NOT NULL
);
CREATE INDEX IF NOT EXISTS auth_email_recipient_time ON auth_email_challenges(email,created_at);
CREATE INDEX IF NOT EXISTS auth_email_ip_time ON auth_email_challenges(ip_hash,created_at);
COMMIT;
