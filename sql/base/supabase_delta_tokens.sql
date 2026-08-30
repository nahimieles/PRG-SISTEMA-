
CREATE TABLE IF NOT EXISTS drive_delta_tokens (
    drive_id   TEXT        PRIMARY KEY,
    delta_link TEXT        NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE drive_delta_tokens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role only" ON drive_delta_tokens
    FOR ALL
    USING (auth.role() = 'service_role');
