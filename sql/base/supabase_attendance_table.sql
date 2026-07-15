-- =============================================
-- TABLA DE REGISTROS DE ASISTENCIA
-- Ejecutar este SQL en la consola de Supabase
-- =============================================

-- Crear tabla de asistencia
CREATE TABLE IF NOT EXISTS attendance_records (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  worker_id UUID REFERENCES workers(id) ON DELETE CASCADE,
  worker_name TEXT NOT NULL,
  check_in_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  check_out_time TIMESTAMPTZ,
  total_hours DECIMAL(5,2),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para mejor rendimiento
CREATE INDEX IF NOT EXISTS idx_attendance_worker ON attendance_records(worker_id);
CREATE INDEX IF NOT EXISTS idx_attendance_status ON attendance_records(status);
CREATE INDEX IF NOT EXISTS idx_attendance_check_in ON attendance_records(check_in_time);

-- Row Level Security (RLS) - Opcional pero recomendado
-- ALTER TABLE attendance_records ENABLE ROW LEVEL SECURITY;

-- Políticas de seguridad (descomentar si se habilita RLS)
-- CREATE POLICY "Enable all access for now" ON attendance_records FOR ALL USING (true);
