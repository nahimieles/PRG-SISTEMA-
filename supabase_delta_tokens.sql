-- Migration: Create drive_delta_tokens table for Microsoft Graph Delta Query tracking
-- Run this in your Supabase SQL editor.

CREATE TABLE IF NOT EXISTS drive_delta_tokens (
    drive_id   TEXT        PRIMARY KEY,
    delta_link TEXT        NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Optional: Add an index for quick lookup by drive ID (already covered by PRIMARY KEY,
-- but included here for clarity).
-- CREATE UNIQUE INDEX IF NOT EXISTS idx_drive_delta_tokens_drive_id ON drive_delta_tokens(drive_id);

-- Row-Level Security: Only allow the service role (server-side) to read/write tokens.
ALTER TABLE drive_delta_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role only" ON drive_delta_tokens
    FOR ALL
    USING (auth.role() = 'service_role');
