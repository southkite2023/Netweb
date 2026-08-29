CREATE TABLE IF NOT EXISTS badges (
  key VARCHAR(40) PRIMARY KEY,
  name VARCHAR(80) NOT NULL,
  emoji VARCHAR(16) NOT NULL,
  description VARCHAR(200) NOT NULL,
  rule_type VARCHAR(24) NOT NULL DEFAULT 'manual' CHECK (rule_type IN ('automatic','manual','future_automatic')),
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO badges(key, name, emoji, description, rule_type, sort_order) VALUES
  ('bug_hunter', 'Bug Hunter', '🐛', '提交 5 个有效 Bug', 'future_automatic', 10),
  ('thinker', 'Thinker', '💡', '5 个建议被采用', 'future_automatic', 20),
  ('minecraft_pioneer', 'Minecraft Pioneer', '⛏', 'Minecraft Server 成员', 'manual', 30),
  ('founding_member', 'Founding Member', '🌱', '网站 Beta 阶段注册（2026.12.31 前）', 'automatic', 40),
  ('contribution_1000', '1000 Contribution', '🔥', '贡献值达到 1000', 'automatic', 50)
ON CONFLICT (key) DO UPDATE SET
  name = EXCLUDED.name,
  emoji = EXCLUDED.emoji,
  description = EXCLUDED.description,
  rule_type = EXCLUDED.rule_type,
  sort_order = EXCLUDED.sort_order;

CREATE TABLE IF NOT EXISTS user_badges (
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  badge_key VARCHAR(40) NOT NULL REFERENCES badges(key) ON DELETE CASCADE,
  source VARCHAR(24) NOT NULL DEFAULT 'manual',
  awarded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, badge_key)
);

CREATE INDEX IF NOT EXISTS user_badges_user_id_idx ON user_badges(user_id);

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS equipped_badge_key VARCHAR(40) REFERENCES badges(key) ON DELETE SET NULL;

-- Existing Beta accounts are Founding Members. The cutoff is the end of
-- 2026-12-31 in China Standard Time (UTC+08:00).
INSERT INTO user_badges(user_id, badge_key, source)
SELECT id, 'founding_member', 'automatic'
FROM users
WHERE created_at < TIMESTAMPTZ '2027-01-01 00:00:00+08'
ON CONFLICT DO NOTHING;

INSERT INTO user_badges(user_id, badge_key, source)
SELECT id, 'contribution_1000', 'automatic'
FROM users
WHERE contribution_points >= 1000
ON CONFLICT DO NOTHING;
