
DROP POLICY IF EXISTS "Service role only" ON drive_delta_tokens;

CREATE POLICY "Allow all access" ON drive_delta_tokens
    FOR ALL
    USING (true)
    WITH CHECK (true);
