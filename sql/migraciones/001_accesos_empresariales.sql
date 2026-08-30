
ALTER TABLE companies 
ADD COLUMN IF NOT EXISTS sistema_contable_slug TEXT;

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

ALTER TABLE acceso_permisos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_full_access_acceso_permisos" ON acceso_permisos
    FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE credenciales_plataformas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_full_access_credenciales" ON credenciales_plataformas
    FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE auditoria_accesos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_full_access_auditoria" ON auditoria_accesos
    FOR ALL USING (true) WITH CHECK (true);

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
