-- ========================================================================================
-- MIGRACIÓN 005: CONFIGURACIÓN GLOBAL Y NOTIFICACIONES
-- ========================================================================================

-- 1. Tabla de Configuración Global (system_settings)
CREATE TABLE IF NOT EXISTS system_settings (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    description TEXT,
    updated_at TIMESTAMPTZ DEFAULT now(),
    updated_by UUID REFERENCES admin_users(id)
);

-- Ejemplos de parámetros iniciales
INSERT INTO system_settings (key, value, description)
VALUES 
    ('WORK_HOURS_PER_DAY', '8', 'Horas de la jornada laboral estándar'),
    ('VACATION_DAYS_YEAR', '15', 'Días de vacaciones generados por año de trabajo'),
    ('ALLOW_VACATION_ROLLOVER', 'true', 'Permitir acumulación de días de vacaciones de años anteriores'),
    ('PRIMARY_COLOR_HEX', '"#3498db"', 'Color primario del tema del sistema')
ON CONFLICT (key) DO NOTHING;

-- 2. Tabla de Notificaciones
CREATE TABLE IF NOT EXISTS notificaciones (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    worker_id UUID NOT NULL REFERENCES workers(id) ON DELETE CASCADE,
    titulo TEXT NOT NULL,
    mensaje TEXT NOT NULL,
    tipo TEXT NOT NULL, -- 'tarea', 'vacacion', 'sistema', 'evento', 'capacitacion'
    leida BOOLEAN DEFAULT false,
    entidad_relacionada_id UUID, -- ID de la tarea, vacación, etc. (Opcional)
    created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_notificaciones_worker_leida ON notificaciones(worker_id, leida);
