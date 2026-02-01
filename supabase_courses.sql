-- 1. Actualizar tabla companies para soportar login
ALTER TABLE companies ADD COLUMN IF NOT EXISTS username text UNIQUE;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS password text; -- Hashed password
ALTER TABLE companies ADD COLUMN IF NOT EXISTS logo_url text; -- Opcional, para branding

-- 2. Crear tabla de cursos
CREATE TABLE IF NOT EXISTS courses (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    title text NOT NULL,
    description text,
    file_url text NOT NULL, -- URL del PDF o imágenes en Storage
    cover_image text, -- URL de la miniatura
    created_by uuid REFERENCES admin_users(id), -- Opcional, si queremos trackear quién lo creó
    created_at timestamptz DEFAULT now()
);

-- 3. Crear tabla de asignaciones (Relación Many-to-Many)
CREATE TABLE IF NOT EXISTS course_assignments (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    course_id uuid REFERENCES courses(id) ON DELETE CASCADE,
    company_id uuid REFERENCES companies(id) ON DELETE CASCADE,
    assigned_at timestamptz DEFAULT now(),
    UNIQUE(course_id, company_id) -- Evitar duplicados
);

-- 4. Policies (Row Level Security) - IMPORTANTE
-- Habilitar RLS
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_assignments ENABLE ROW LEVEL SECURITY;

-- Politicas para Cursos
-- Admins pueden ver y editar todo
CREATE POLICY "Admins can manage courses" 
ON courses FOR ALL 
USING (auth.role() = 'service_role' OR EXISTS (
    SELECT 1 FROM admin_users WHERE admin_users.id::text = auth.uid()::text
)); -- Nota: Esto asume que usas Supabase Auth o tu propio auth. 
-- Si usas tu propio auth simple en 'admin_users' y no Supabase Auth real,
-- estas policies no aplicarán automáticamente si no usas JWT de Supabase.
-- Dado el código actual (localStorage session), probablemente no estemos usando RLS de Supabase Auth.
-- Por compatibilidad con el código existente que usa 'suapbase-js' client anon key:
-- Vamos a dejarlo abierto o manejado por lógica de aplicación, 
-- pero es buena práctica definirlas si migramos a Auth real.

-- Asumiendo que el cliente es público por ahora y filtramos en frontend/backend logic como en el resto de la app:
CREATE POLICY "Public read access for courses"
ON courses FOR SELECT
TO anon
USING (true);

-- Politicas para Asignaciones
CREATE POLICY "Public read access for assignments"
ON course_assignments FOR SELECT
TO anon
USING (true);
