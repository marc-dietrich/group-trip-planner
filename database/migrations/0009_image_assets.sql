CREATE TABLE IF NOT EXISTS image_assets (
    id UUID PRIMARY KEY,
    owner_type VARCHAR(30) NOT NULL,
    owner_user_id UUID NULL REFERENCES users(id) ON DELETE SET NULL,
    owner_group_id UUID NULL REFERENCES groups(id) ON DELETE CASCADE,
    s3_bucket VARCHAR(255) NOT NULL,
    s3_key VARCHAR(1024) NOT NULL UNIQUE,
    mime_type VARCHAR(100) NOT NULL,
    size_bytes INTEGER NOT NULL CHECK (size_bytes > 0),
    width INTEGER NOT NULL CHECK (width > 0),
    height INTEGER NOT NULL CHECK (height > 0),
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_image_assets_owner_type ON image_assets(owner_type);
CREATE INDEX IF NOT EXISTS ix_image_assets_owner_user_id ON image_assets(owner_user_id);
CREATE INDEX IF NOT EXISTS ix_image_assets_owner_group_id ON image_assets(owner_group_id);
CREATE INDEX IF NOT EXISTS ix_image_assets_created_at ON image_assets(created_at DESC);
