-- Yuashie Radio · Project 003 · v0.3.0

CREATE TABLE IF NOT EXISTS radio_profiles (
  user_id BIGINT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  callsign VARCHAR(20) UNIQUE NOT NULL,
  operator_class CHAR(1) NOT NULL CHECK (operator_class IN ('A','B','C')),
  callsign_country CHAR(2) NOT NULL DEFAULT 'CN',
  verification_status VARCHAR(16) NOT NULL DEFAULT 'unverified' CHECK (verification_status IN ('unverified','verified')),
  qth VARCHAR(120) NOT NULL DEFAULT '',
  rig VARCHAR(120) NOT NULL DEFAULT '',
  antenna VARCHAR(160) NOT NULL DEFAULT '',
  default_power_w NUMERIC(9,2) CHECK (default_power_w IS NULL OR (default_power_w >= 0 AND default_power_w <= 1000000)),
  bio VARCHAR(500) NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (callsign = UPPER(callsign)),
  CHECK (callsign ~ '^[A-Z0-9/]{3,20}$')
);
CREATE INDEX IF NOT EXISTS radio_profiles_callsign_idx ON radio_profiles(callsign);

CREATE TABLE IF NOT EXISTS qso_logs (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  my_callsign VARCHAR(20) NOT NULL,
  remote_callsign VARCHAR(20) NOT NULL,
  qso_date DATE NOT NULL,
  qso_time TIME NOT NULL,
  frequency_mhz NUMERIC(12,6) NOT NULL CHECK (frequency_mhz > 0 AND frequency_mhz <= 1000000),
  mode VARCHAR(20) NOT NULL,
  rst_sent VARCHAR(12) NOT NULL DEFAULT '',
  rst_received VARCHAR(12) NOT NULL DEFAULT '',
  power_sent_w NUMERIC(9,2) CHECK (power_sent_w IS NULL OR (power_sent_w >= 0 AND power_sent_w <= 1000000)),
  power_received_w NUMERIC(9,2) CHECK (power_received_w IS NULL OR (power_received_w >= 0 AND power_received_w <= 1000000)),
  qth VARCHAR(120) NOT NULL DEFAULT '',
  rig VARCHAR(120) NOT NULL DEFAULT '',
  antenna VARCHAR(160) NOT NULL DEFAULT '',
  notes VARCHAR(1000) NOT NULL DEFAULT '',
  qsl_requested BOOLEAN NOT NULL DEFAULT FALSE,
  qsl_sent BOOLEAN NOT NULL DEFAULT FALSE,
  qsl_received BOOLEAN NOT NULL DEFAULT FALSE,
  matched_qso_id BIGINT REFERENCES qso_logs(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS qso_logs_user_date_idx ON qso_logs(user_id, qso_date DESC, qso_time DESC);
CREATE INDEX IF NOT EXISTS qso_logs_remote_callsign_idx ON qso_logs(remote_callsign);

CREATE TABLE IF NOT EXISTS qsl_templates (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(80) NOT NULL,
  image_filename VARCHAR(180) NOT NULL,
  is_default BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS qsl_templates_user_idx ON qsl_templates(user_id, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS qsl_templates_one_default_idx ON qsl_templates(user_id) WHERE is_default;

CREATE TABLE IF NOT EXISTS qsl_messages (
  id BIGSERIAL PRIMARY KEY,
  sender_user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  receiver_user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  qso_id BIGINT REFERENCES qso_logs(id) ON DELETE SET NULL,
  qsl_template_id BIGINT REFERENCES qsl_templates(id) ON DELETE SET NULL,
  sender_callsign VARCHAR(20) NOT NULL,
  receiver_callsign VARCHAR(20) NOT NULL,
  image_filename VARCHAR(180) NOT NULL,
  qso_snapshot JSONB NOT NULL,
  message VARCHAR(300) NOT NULL DEFAULT '',
  status VARCHAR(16) NOT NULL DEFAULT 'sent' CHECK (status IN ('sent','received','confirmed')),
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  received_at TIMESTAMPTZ,
  confirmed_at TIMESTAMPTZ,
  CHECK (sender_user_id <> receiver_user_id)
);
CREATE INDEX IF NOT EXISTS qsl_messages_receiver_idx ON qsl_messages(receiver_user_id, sent_at DESC);
CREATE INDEX IF NOT EXISTS qsl_messages_sender_idx ON qsl_messages(sender_user_id, sent_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS qsl_message_once_per_qso_idx ON qsl_messages(sender_user_id, qso_id) WHERE qso_id IS NOT NULL;

INSERT INTO badges(key, name, emoji, description, rule_type, sort_order)
VALUES ('radio_operator', 'Radio Operator', '📻', '已绑定业余无线电呼号', 'automatic', 35)
ON CONFLICT (key) DO UPDATE SET
  name=EXCLUDED.name,
  emoji=EXCLUDED.emoji,
  description=EXCLUDED.description,
  rule_type=EXCLUDED.rule_type,
  sort_order=EXCLUDED.sort_order;

INSERT INTO user_badges(user_id, badge_key, source)
SELECT user_id, 'radio_operator', 'automatic'
FROM radio_profiles
ON CONFLICT DO NOTHING;
