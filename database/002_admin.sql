CREATE TABLE admin_users (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 email text NOT NULL UNIQUE,
 password_hash text NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE admin_sessions (
 token_hash text PRIMARY KEY,
 admin_id uuid NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
 expires_at timestamptz NOT NULL
);
CREATE INDEX admin_sessions_expiry_idx ON admin_sessions(expires_at);
CREATE TABLE admin_login_attempts (
 attempted_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX admin_login_attempts_time_idx ON admin_login_attempts(attempted_at);
UPDATE events SET time_zone = 'Asia/Kathmandu' WHERE time_zone IS NULL;
