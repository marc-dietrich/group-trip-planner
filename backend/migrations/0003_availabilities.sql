-- Create availabilities table (per user, per group)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS availabilities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    kind VARCHAR(20) NOT NULL,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT (NOW())
);

CREATE INDEX IF NOT EXISTS idx_availabilities_group_user ON availabilities(group_id, user_id);
CREATE INDEX IF NOT EXISTS idx_availabilities_created_at ON availabilities(created_at);
