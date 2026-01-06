-- Create actors table and migrate availabilities to actor-based identity
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS actors (
    id VARCHAR(255) PRIMARY KEY,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add actor_id to availabilities and relax user_id requirement for guests
ALTER TABLE availabilities ADD COLUMN IF NOT EXISTS actor_id VARCHAR(255);
UPDATE availabilities SET actor_id = COALESCE(actor_id, user_id::text) WHERE actor_id IS NULL;
ALTER TABLE availabilities ALTER COLUMN actor_id SET NOT NULL;
ALTER TABLE availabilities ALTER COLUMN user_id DROP NOT NULL;
CREATE INDEX IF NOT EXISTS idx_availabilities_actor_id ON availabilities(actor_id);
