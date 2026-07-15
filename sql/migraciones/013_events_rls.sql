-- Habilitar RLS para eventos_calendario
ALTER TABLE eventos_calendario ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Enable all for authenticated users" ON eventos_calendario;

-- Crear política abierta para testing (el frontend filtra)
CREATE POLICY "Enable all for all users" ON eventos_calendario FOR ALL USING (true) WITH CHECK (true);
