CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS users (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  username    TEXT        NOT NULL,
  pin_hash    TEXT        NOT NULL,
  role        TEXT        NOT NULL DEFAULT 'player'
                          CHECK (role IN ('player', 'admin')),
  is_active   BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_login  TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS users_username_lower_idx
  ON users (LOWER(username));
