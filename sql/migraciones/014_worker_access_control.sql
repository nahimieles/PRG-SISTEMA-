-- ==============================================================================
-- MIGRACIÓN: Control de Acceso de Trabajadores a Empresas y Grupos
-- ==============================================================================

-- 1. Tabla pivote para acceso a Grupos Enteros
CREATE TABLE IF NOT EXISTS worker_company_groups_access (
    worker_id UUID REFERENCES workers(id) ON DELETE CASCADE,
    group_id UUID REFERENCES company_groups(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT now(),
    PRIMARY KEY (worker_id, group_id)
);

-- 2. Tabla pivote para acceso a Empresas Individuales
CREATE TABLE IF NOT EXISTS worker_companies_access (
    worker_id UUID REFERENCES workers(id) ON DELETE CASCADE,
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT now(),
    PRIMARY KEY (worker_id, company_id)
);

-- 3. Índices para mejorar rendimiento de consultas
CREATE INDEX IF NOT EXISTS idx_worker_groups_access_worker ON worker_company_groups_access(worker_id);
CREATE INDEX IF NOT EXISTS idx_worker_companies_access_worker ON worker_companies_access(worker_id);

-- 4. Habilitar Row Level Security (RLS)
ALTER TABLE worker_company_groups_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE worker_companies_access ENABLE ROW LEVEL SECURITY;

-- 5. Políticas de seguridad (Permitir lectura y escritura a todos los usuarios autenticados o anónimos para la UI actual)
-- Como el sistema maneja la seguridad en el frontend por ahora, abrimos la política a 'true'
CREATE POLICY "Enable all for all users" ON worker_company_groups_access FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all for all users" ON worker_companies_access FOR ALL USING (true) WITH CHECK (true);
