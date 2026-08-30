
ALTER TABLE companies ADD COLUMN IF NOT EXISTS username text UNIQUE;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS password text; 
ALTER TABLE companies ADD COLUMN IF NOT EXISTS logo_url text; 
CREATE TABLE IF NOT EXISTS courses (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    title text NOT NULL,
    description text,
    file_url text NOT NULL, 
    cover_image text, 
    created_by uuid REFERENCES admin_users(id), 
    created_at timestamptz DEFAULT now()
);
CREATE TABLE IF NOT EXISTS course_assignments (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    course_id uuid REFERENCES courses(id) ON DELETE CASCADE,
    company_id uuid REFERENCES companies(id) ON DELETE CASCADE,
    assigned_at timestamptz DEFAULT now(),
    UNIQUE(course_id, company_id) 
);
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_assignments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage courses" 
ON courses FOR ALL 
USING (auth.role() = 'service_role' OR EXISTS (
    SELECT 1 FROM admin_users WHERE admin_users.id::text = auth.uid()::text
)); 
CREATE POLICY "Public read access for courses"
ON courses FOR SELECT
TO anon
USING (true);
CREATE POLICY "Public read access for assignments"
ON course_assignments FOR SELECT
TO anon
USING (true);
