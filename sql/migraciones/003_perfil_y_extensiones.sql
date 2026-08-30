
ALTER TABLE workers ADD COLUMN IF NOT EXISTS cargo TEXT;
ALTER TABLE workers ADD COLUMN IF NOT EXISTS departamento TEXT;
ALTER TABLE workers ADD COLUMN IF NOT EXISTS supervisor_id UUID REFERENCES workers(id);
ALTER TABLE workers ADD COLUMN IF NOT EXISTS fecha_ingreso DATE;
ALTER TABLE workers ADD COLUMN IF NOT EXISTS estado_laboral TEXT DEFAULT 'activo';
ALTER TABLE workers ADD COLUMN IF NOT EXISTS telefono TEXT;
ALTER TABLE workers ADD COLUMN IF NOT EXISTS observaciones TEXT;
ALTER TABLE workers ADD COLUMN IF NOT EXISTS foto_url TEXT;
ALTER TABLE workers ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'worker'; 
ALTER TABLE workers ADD COLUMN IF NOT EXISTS codigo_interno TEXT;

ALTER TABLE audit_records ADD COLUMN IF NOT EXISTS unidad_negocio_id UUID REFERENCES catalogo_unidades_negocio(id);
ALTER TABLE audit_records ADD COLUMN IF NOT EXISTS actividad_id UUID REFERENCES catalogo_actividades(id);
ALTER TABLE audit_records ADD COLUMN IF NOT EXISTS subactividad_id UUID REFERENCES catalogo_subactividades(id);
ALTER TABLE audit_records ADD COLUMN IF NOT EXISTS cliente_id UUID REFERENCES companies(id);
ALTER TABLE audit_records ADD COLUMN IF NOT EXISTS estado TEXT DEFAULT 'completada';
ALTER TABLE audit_records ADD COLUMN IF NOT EXISTS notas TEXT;

ALTER TABLE audit_records ADD COLUMN IF NOT EXISTS origen TEXT DEFAULT 'web';
ALTER TABLE audit_records ADD COLUMN IF NOT EXISTS tipo_registro TEXT DEFAULT 'manual';
ALTER TABLE audit_records ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES admin_users(id);
ALTER TABLE audit_records ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES admin_users(id);
ALTER TABLE audit_records ADD COLUMN IF NOT EXISTS fecha_real DATE;
ALTER TABLE audit_records ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb; 

CREATE TABLE IF NOT EXISTS metas_colaborador (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    worker_id UUID NOT NULL REFERENCES workers(id) ON DELETE CASCADE,
    periodo TEXT NOT NULL, 
    fecha_inicio DATE NOT NULL,
    fecha_fin DATE NOT NULL,
    horas_objetivo NUMERIC(5,2),
    tareas_objetivo INT,
    metricas_json JSONB,
    activo BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_metas_worker_fecha ON metas_colaborador(worker_id, fecha_inicio, fecha_fin);
