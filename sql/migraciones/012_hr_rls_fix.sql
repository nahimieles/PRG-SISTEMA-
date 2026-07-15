-- Fix RLS para las tablas de HR (Permitir acceso anónimo y autenticado)

DROP POLICY IF EXISTS "Enable all for authenticated users" ON hr_tasks;
DROP POLICY IF EXISTS "Enable all for authenticated users" ON hr_trainings;
DROP POLICY IF EXISTS "Enable all for authenticated users" ON hr_vacations;

CREATE POLICY "Enable all for all users" ON hr_tasks FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all for all users" ON hr_trainings FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all for all users" ON hr_vacations FOR ALL USING (true) WITH CHECK (true);
