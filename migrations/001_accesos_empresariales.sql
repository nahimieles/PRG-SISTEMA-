-- ============================================================
-- Migración: Accesos Empresariales — Fase 1
-- Fecha: 2026-06-29
-- Descripción: Crea las tablas necesarias para el sistema de
--              accesos empresariales a plataformas externas.
-- ============================================================

-- 1. Columna: sistema contable por empresa
-- Cada empresa tiene un solo sistema contable (o ninguno).
-- El slug referencia al PlatformRegistry en el código.
ALTER TABLE companies 
ADD COLUMN IF NOT EXISTS sistema_contable_slug TEXT;

-- 2. Tabla: acceso_permisos
-- Control granular: usuario + empresa + plataforma
-- Modelo whitelist: si no existe registro, se deniega.
CREATE TABLE IF NOT EXISTS acceso_permisos (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    usuario_id UUID NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
    empresa_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    plataforma_slug TEXT NOT NULL,
    permitido BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(usuario_id, empresa_id, plataforma_slug)
);

CREATE INDEX IF NOT EXISTS idx_acceso_permisos_usuario 
    ON acceso_permisos(usuario_id);
CREATE INDEX IF NOT EXISTS idx_acceso_permisos_empresa 
    ON acceso_permisos(empresa_id);

-- 3. Tabla: credenciales_plataformas
-- Almacena credenciales cifradas con AES-256-GCM.
-- En el futuro será reemplazada por Azure Key Vault.
CREATE TABLE IF NOT EXISTS credenciales_plataformas (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    empresa_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    plataforma_slug TEXT NOT NULL,
    encrypted_data TEXT NOT NULL,
    iv TEXT NOT NULL,
    auth_tag TEXT NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now(),
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(empresa_id, plataforma_slug)
);

-- 4. Tabla: auditoria_accesos
-- Registra cada interacción con plataformas externas.
-- Separada de audit_logs (que audita archivos).
CREATE TABLE IF NOT EXISTS auditoria_accesos (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    usuario_id UUID REFERENCES admin_users(id),
    empresa_id UUID REFERENCES companies(id),
    plataforma_slug TEXT NOT NULL,
    accion TEXT NOT NULL,
    resultado TEXT DEFAULT 'exitoso',
    ip_address TEXT,
    user_agent TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_auditoria_accesos_fecha 
    ON auditoria_accesos(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_auditoria_accesos_usuario 
    ON auditoria_accesos(usuario_id);

-- 5. RLS: acceso_permisos
ALTER TABLE acceso_permisos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_full_access_acceso_permisos" ON acceso_permisos
    FOR ALL USING (true) WITH CHECK (true);

-- 6. RLS: credenciales_plataformas
ALTER TABLE credenciales_plataformas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_full_access_credenciales" ON credenciales_plataformas
    FOR ALL USING (true) WITH CHECK (true);

-- 7. RLS: auditoria_accesos
ALTER TABLE auditoria_accesos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_full_access_auditoria" ON auditoria_accesos
    FOR ALL USING (true) WITH CHECK (true);

-- 8. Seed: otorgar acceso completo a todos los admins actuales
-- para todas las empresas en las 4 plataformas de gobierno.
INSERT INTO acceso_permisos (usuario_id, empresa_id, plataforma_slug, permitido)
SELECT 
    au.id,
    c.id,
    slugs.slug,
    true
FROM admin_users au
CROSS JOIN companies c
CROSS JOIN (
    VALUES ('sri'), ('iess'), ('supercias'), ('ministerio_trabajo')
) AS slugs(slug)
ON CONFLICT (usuario_id, empresa_id, plataforma_slug) DO NOTHING;
