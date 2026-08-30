
ALTER TABLE eventos_calendario ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable all for authenticated users" ON eventos_calendario;

CREATE POLICY "Enable all for all users" ON eventos_calendario FOR ALL USING (true) WITH CHECK (true);
