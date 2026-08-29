ALTER TABLE users
  ADD COLUMN IF NOT EXISTS avatar_filename VARCHAR(160);

CREATE TABLE IF NOT EXISTS comments (
  id BIGSERIAL PRIMARY KEY,
  project_id VARCHAR(32) NOT NULL,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  parent_id BIGINT REFERENCES comments(id) ON DELETE CASCADE,
  content VARCHAR(2000) NOT NULL CHECK (char_length(content) BETWEEN 1 AND 2000),
  status VARCHAR(16) NOT NULL DEFAULT 'visible' CHECK (status IN ('visible','deleted')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS comments_project_created_idx ON comments(project_id, created_at);
CREATE INDEX IF NOT EXISTS comments_user_idx ON comments(user_id);
CREATE INDEX IF NOT EXISTS comments_parent_idx ON comments(parent_id);

CREATE TABLE IF NOT EXISTS feedback (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(16) NOT NULL CHECK (type IN ('bug','suggestion')),
  title VARCHAR(120) NOT NULL CHECK (char_length(title) BETWEEN 3 AND 120),
  content VARCHAR(4000) NOT NULL CHECK (char_length(content) BETWEEN 10 AND 4000),
  project_id VARCHAR(32),
  page_url VARCHAR(500) NOT NULL DEFAULT '',
  status VARCHAR(20) NOT NULL DEFAULT 'new' CHECK (status IN ('new','reviewing','valid','fixed','adopted','rejected')),
  admin_note VARCHAR(2000) NOT NULL DEFAULT '',
  reviewed_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS feedback_user_idx ON feedback(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS feedback_status_idx ON feedback(status, created_at DESC);
CREATE INDEX IF NOT EXISTS feedback_type_idx ON feedback(type, created_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS contribution_reference_once_idx
  ON contribution_events(type, reference_type, reference_id)
  WHERE reference_type IS NOT NULL AND reference_id IS NOT NULL;

UPDATE badges
SET rule_type='automatic'
WHERE key IN ('bug_hunter','thinker');

-- Backfill automatic feedback badges when migrating an installation that
-- already contains reviewed feedback.
INSERT INTO user_badges(user_id, badge_key, source)
SELECT user_id, 'bug_hunter', 'automatic'
FROM feedback
WHERE type='bug' AND status IN ('valid','fixed')
GROUP BY user_id
HAVING COUNT(*) >= 5
ON CONFLICT DO NOTHING;

INSERT INTO user_badges(user_id, badge_key, source)
SELECT user_id, 'thinker', 'automatic'
FROM feedback
WHERE type='suggestion' AND status='adopted'
GROUP BY user_id
HAVING COUNT(*) >= 5
ON CONFLICT DO NOTHING;
