
ALTER TABLE attendance_records ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow read access" ON attendance_records;
CREATE POLICY "Allow read access" ON attendance_records
FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow insert" ON attendance_records;
CREATE POLICY "Allow insert" ON attendance_records
FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Allow update" ON attendance_records;
CREATE POLICY "Allow update" ON attendance_records
FOR UPDATE USING (true);
DROP POLICY IF EXISTS "Allow delete" ON attendance_records;
CREATE POLICY "Allow delete" ON attendance_records
FOR DELETE USING (true);
GRANT ALL ON attendance_records TO anon;
GRANT ALL ON attendance_records TO authenticated;
