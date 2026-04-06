-- Fix: Allow anon key to read/write drive_delta_tokens
-- The original policy only allows service_role, but the app uses anon key
-- Run this in your Supabase SQL Editor

-- Drop the restrictive policy
DROP POLICY IF EXISTS "Service role only" ON drive_delta_tokens;

-- Create a permissive policy (same as file_baseline)
CREATE POLICY "Allow all access" ON drive_delta_tokens
    FOR ALL
    USING (true)
    WITH CHECK (true);
