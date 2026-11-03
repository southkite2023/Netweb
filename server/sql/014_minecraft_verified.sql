BEGIN;
ALTER TABLE minecraft_accounts ADD COLUMN IF NOT EXISTS minecraft_uuid UUID;
CREATE UNIQUE INDEX IF NOT EXISTS minecraft_accounts_uuid_unique ON minecraft_accounts(minecraft_uuid) WHERE minecraft_uuid IS NOT NULL;
CREATE TABLE IF NOT EXISTS minecraft_audit (
 id BIGSERIAL PRIMARY KEY, user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
 event TEXT NOT NULL, detail TEXT NOT NULL DEFAULT '', created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
COMMIT;
