CREATE TABLE IF NOT EXISTS astracct_parameters (
 user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 account_id TEXT NOT NULL,
 payload TEXT NOT NULL,
 updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 PRIMARY KEY(user_id,account_id)
);
