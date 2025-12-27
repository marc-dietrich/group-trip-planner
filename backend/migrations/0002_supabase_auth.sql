-- Add Supabase-backed user tables and link actors
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY,
    display_name VARCHAR(150),
    email VARCHAR(255),
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT (NOW())
);

CREATE TABLE IF NOT EXISTS user_actors (
    actor_id VARCHAR(255) PRIMARY KEY,
    user_id UUID REFERENCES users(id),
    claimed_at TIMESTAMP WITHOUT TIME ZONE DEFAULT (NOW())
);

ALTER TABLE group_members
    ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id);
