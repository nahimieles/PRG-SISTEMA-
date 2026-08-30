
CREATE TABLE IF NOT EXISTS catalogo_unidades_negocio (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    nombre TEXT NOT NULL UNIQUE,
    descripcion TEXT,
    activo BOOLEAN DEFAULT true,
    orden INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS catalogo_actividades (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    unidad_negocio_id UUID NOT NULL REFERENCES catalogo_unidades_negocio(id) ON DELETE CASCADE,
    nombre TEXT NOT NULL,
    descripcion TEXT,
    activo BOOLEAN DEFAULT true,
    orden INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(unidad_negocio_id, nombre)
);
CREATE INDEX IF NOT EXISTS idx_actividades_unidad ON catalogo_actividades(unidad_negocio_id);

CREATE TABLE IF NOT EXISTS catalogo_subactividades (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    actividad_id UUID NOT NULL REFERENCES catalogo_actividades(id) ON DELETE CASCADE,
    nombre TEXT NOT NULL,
    descripcion TEXT,
    activo BOOLEAN DEFAULT true,
    orden INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(actividad_id, nombre)
);
CREATE INDEX IF NOT EXISTS idx_subactividades_actividad ON catalogo_subactividades(actividad_id);

CREATE TABLE IF NOT EXISTS catalogo_tipos_incidencia (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    nombre TEXT NOT NULL UNIQUE,
    descripcion TEXT,
    color TEXT,
    activo BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS catalogo_tipos_capacitacion (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    nombre TEXT NOT NULL UNIQUE,
    descripcion TEXT,
    activo BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS catalogo_estados (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    entidad TEXT NOT NULL, 
    nombre TEXT NOT NULL,
    color TEXT,
    orden INT DEFAULT 0,
    activo BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(entidad, nombre)
);

ALTER TABLE company_groups ADD COLUMN IF NOT EXISTS descripcion TEXT;
ALTER TABLE company_groups ADD COLUMN IF NOT EXISTS codigo_interno TEXT;
