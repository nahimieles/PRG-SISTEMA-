
CREATE TABLE IF NOT EXISTS incidencias (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    worker_id UUID NOT NULL REFERENCES workers(id) ON DELETE CASCADE,
    tipo_id UUID NOT NULL REFERENCES catalogo_tipos_incidencia(id),
    descripcion TEXT NOT NULL,
    registrado_por UUID REFERENCES admin_users(id),
    registrado_por_nombre TEXT,
    fecha DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_incidencias_worker ON incidencias(worker_id);

CREATE TABLE IF NOT EXISTS tareas (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    nombre TEXT NOT NULL,
    descripcion TEXT,
    responsable_id UUID NOT NULL REFERENCES workers(id) ON DELETE CASCADE,
    asignado_por UUID REFERENCES admin_users(id),
    asignado_por_nombre TEXT,
    fecha_creacion DATE DEFAULT CURRENT_DATE,
    fecha_limite DATE,
    prioridad TEXT DEFAULT 'media',
    estado TEXT DEFAULT 'pendiente',
    notas TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_tareas_responsable ON tareas(responsable_id);
CREATE INDEX IF NOT EXISTS idx_tareas_estado ON tareas(estado);

CREATE TABLE IF NOT EXISTS vacaciones (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    worker_id UUID NOT NULL REFERENCES workers(id) ON DELETE CASCADE,
    fecha_inicio DATE NOT NULL,
    fecha_fin DATE NOT NULL,
    dias_solicitados NUMERIC(4,1) NOT NULL,
    estado TEXT DEFAULT 'pendiente',
    aprobado_por UUID REFERENCES admin_users(id),
    aprobado_por_nombre TEXT,
    fecha_aprobacion TIMESTAMPTZ,
    observaciones TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_vacaciones_worker ON vacaciones(worker_id);
CREATE INDEX IF NOT EXISTS idx_vacaciones_estado ON vacaciones(estado);

CREATE TABLE IF NOT EXISTS capacitaciones (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    worker_id UUID NOT NULL REFERENCES workers(id) ON DELETE CASCADE,
    tipo_id UUID REFERENCES catalogo_tipos_capacitacion(id),
    nombre_curso TEXT NOT NULL,
    institucion TEXT,
    instructor TEXT,
    modalidad TEXT,
    fecha_inicio DATE,
    fecha_fin DATE,
    duracion_horas NUMERIC(6,1),
    estado TEXT DEFAULT 'pendiente',
    certificado_url TEXT,
    observaciones TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_capacitaciones_worker ON capacitaciones(worker_id);

CREATE TABLE IF NOT EXISTS eventos_calendario (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    titulo TEXT NOT NULL,
    descripcion TEXT,
    tipo TEXT NOT NULL, 
    fecha DATE NOT NULL,
    hora TIME,
    hora_fin TIME,
    responsable_id UUID REFERENCES workers(id),
    empresa_id UUID REFERENCES companies(id),
    colaboradores_ids UUID[],
    estado TEXT DEFAULT 'activo',
    recurrente BOOLEAN DEFAULT false,
    color TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_eventos_fecha ON eventos_calendario(fecha);
CREATE INDEX IF NOT EXISTS idx_eventos_tipo ON eventos_calendario(tipo);
