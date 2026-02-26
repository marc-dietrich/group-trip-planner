-- Precomputed availability summary cache per group
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS group_availability_summaries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    from_date DATE NOT NULL,
    to_date DATE NOT NULL,
    available_count INTEGER NOT NULL,
    total_members INTEGER NOT NULL,
    updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_group_availability_summaries_group
    ON group_availability_summaries(group_id);

CREATE INDEX IF NOT EXISTS idx_group_availability_summaries_group_from_to
    ON group_availability_summaries(group_id, from_date, to_date);
