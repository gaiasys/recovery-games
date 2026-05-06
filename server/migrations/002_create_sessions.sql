CREATE TABLE IF NOT EXISTS sessions (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  jwt_jti           TEXT        UNIQUE,
  grade_band        TEXT,
  session_start     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  session_end       TIMESTAMPTZ,
  completion_status TEXT        NOT NULL DEFAULT 'active'
                                CHECK (completion_status IN ('active', 'completed', 'abandoned')),
  exit_type         TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS sessions_user_id_idx ON sessions (user_id);
CREATE INDEX IF NOT EXISTS sessions_jti_idx     ON sessions (jwt_jti);
