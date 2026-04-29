ALTER TABLE groups
    ADD COLUMN IF NOT EXISTS history_after_days INT NOT NULL DEFAULT 30;

UPDATE groups
SET history_after_days = 30
WHERE history_after_days IS NULL OR history_after_days < 1;
