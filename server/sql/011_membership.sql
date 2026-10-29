CREATE TABLE IF NOT EXISTS membership_orders (
 id VARCHAR(40) PRIMARY KEY,
 user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 plan_id VARCHAR(24) NOT NULL CHECK(plan_id IN ('monthly_6','monthly_18','monthly_25')),
 amount NUMERIC(10,2) NOT NULL CHECK(amount>0),
 status VARCHAR(16) NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','paid')),
 trade_no VARCHAR(64) UNIQUE,
 created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 paid_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS membership_orders_user_idx ON membership_orders(user_id,created_at);
CREATE TABLE IF NOT EXISTS memberships (
 user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 plan_id VARCHAR(24) NOT NULL,
 expires_at TIMESTAMPTZ NOT NULL,
 PRIMARY KEY(user_id,plan_id)
);
