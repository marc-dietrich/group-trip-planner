-- Create supporter badge table to retain crown eligibility for 6 months after donation

CREATE TABLE IF NOT EXISTS supporter_badges (
    actor_id VARCHAR(255) PRIMARY KEY REFERENCES actors(id) ON DELETE CASCADE,
    supporter_until TIMESTAMPTZ NOT NULL,
    last_donated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_supporter_badges_supporter_until
    ON supporter_badges (supporter_until);
