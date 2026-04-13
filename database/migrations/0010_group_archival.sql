ALTER TABLE groups
    ADD COLUMN IF NOT EXISTS last_interaction_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
    ADD COLUMN IF NOT EXISTS is_archived BOOLEAN NOT NULL DEFAULT FALSE;

UPDATE groups
SET last_interaction_at = COALESCE(last_interaction_at, created_at);

CREATE INDEX IF NOT EXISTS idx_groups_is_archived ON groups(is_archived);
CREATE INDEX IF NOT EXISTS idx_groups_last_interaction_at ON groups(last_interaction_at);
