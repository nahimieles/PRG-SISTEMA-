-- =============================================
-- CORREGIR PERMISOS DE LA TABLA ATTENDANCE_RECORDS
-- Ejecutar este SQL en la consola de Supabase
-- =============================================

-- Opción 1: Deshabilitar RLS completamente (más fácil pero menos seguro)
ALTER TABLE attendance_records DISABLE ROW LEVEL SECURITY;

-- O si prefieres mantener RLS habilitado, usar estas políticas:
-- (Descomentar las líneas de abajo si quieres usar RLS)

-- ALTER TABLE attendance_records ENABLE ROW LEVEL SECURITY;

-- Política para permitir lectura a todos los usuarios autenticados
-- DROP POLICY IF EXISTS "Allow read access" ON attendance_records;
-- CREATE POLICY "Allow read access" ON attendance_records
--   FOR SELECT USING (true);

-- Política para permitir inserción
-- DROP POLICY IF EXISTS "Allow insert" ON attendance_records;
-- CREATE POLICY "Allow insert" ON attendance_records
--   FOR INSERT WITH CHECK (true);

-- Política para permitir actualización
-- DROP POLICY IF EXISTS "Allow update" ON attendance_records;
-- CREATE POLICY "Allow update" ON attendance_records
--   FOR UPDATE USING (true);

-- Política para permitir eliminación (solo admin)
-- DROP POLICY IF EXISTS "Allow delete" ON attendance_records;
-- CREATE POLICY "Allow delete" ON attendance_records
--   FOR DELETE USING (true);

-- También verificar que la tabla tenga los permisos correctos para anon key
GRANT ALL ON attendance_records TO anon;
GRANT ALL ON attendance_records TO authenticated;
