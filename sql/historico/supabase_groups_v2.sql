-- Add visual fields to company_groups
ALTER TABLE company_groups 
ADD COLUMN IF NOT EXISTS image_url text,
ADD COLUMN IF NOT EXISTS description text;

-- Ensure permissions is robust (it already exists as jsonb, ensuring default)
ALTER TABLE company_groups 
ALTER COLUMN permissions SET DEFAULT '["admin", "manager"]'::jsonb;

-- Seed Data (The specific groups requested)
-- We use DO block to prevent duplicates if run multiple times
DO $$
DECLARE
    prg_id uuid;
BEGIN
    -- 1. AUDITORIA EXTERNA
    IF NOT EXISTS (SELECT 1 FROM company_groups WHERE name = 'AUDITORIA EXTERNA' AND parent_id IS NULL) THEN
        INSERT INTO company_groups (name, type, icon, color, permissions)
        VALUES ('AUDITORIA EXTERNA', 'group', 'FileText', '#F4A460', '["admin", "manager"]');
    END IF;

    -- 2. ASESORIA CONTABLE
    IF NOT EXISTS (SELECT 1 FROM company_groups WHERE name = 'ASESORIA CONTABLE' AND parent_id IS NULL) THEN
        INSERT INTO company_groups (name, type, icon, color, permissions)
        VALUES ('ASESORIA CONTABLE', 'group', 'Calculator', '#F4A460', '["admin", "manager"]');
    END IF;

    -- 3. OTRAS ASESORIAS
    IF NOT EXISTS (SELECT 1 FROM company_groups WHERE name = 'OTRAS ASESORIAS' AND parent_id IS NULL) THEN
        INSERT INTO company_groups (name, type, icon, color, permissions)
        VALUES ('OTRAS ASESORIAS', 'group', 'Briefcase', '#F4A460', '["admin", "manager"]');
    END IF;

    -- 4. PRG AUDITORES C. LTDA. (Parent for subgroups)
    IF NOT EXISTS (SELECT 1 FROM company_groups WHERE name = 'PRG AUDITORES C. LTDA.' AND parent_id IS NULL) THEN
        INSERT INTO company_groups (name, type, icon, color, permissions)
        VALUES ('PRG AUDITORES C. LTDA.', 'group', 'Building2', '#F4A460', '["admin", "manager"]')
        RETURNING id INTO prg_id;
    ELSE
        SELECT id INTO prg_id FROM company_groups WHERE name = 'PRG AUDITORES C. LTDA.' AND parent_id IS NULL;
    END IF;

    -- Subgroups for PRG AUDITORES C. LTDA.
    IF prg_id IS NOT NULL THEN
        -- LEGAL
        IF NOT EXISTS (SELECT 1 FROM company_groups WHERE name = 'LEGAL' AND parent_id = prg_id) THEN
            INSERT INTO company_groups (name, type, icon, permissions, parent_id)
            VALUES ('LEGAL', 'folder', 'Scale', '["admin", "manager"]', prg_id);
        END IF;

        -- CONTABILIDAD
        IF NOT EXISTS (SELECT 1 FROM company_groups WHERE name = 'CONTABILIDAD' AND parent_id = prg_id) THEN
            INSERT INTO company_groups (name, type, icon, permissions, parent_id)
            VALUES ('CONTABILIDAD', 'folder', 'Calculator', '["admin", "manager"]', prg_id);
        END IF;

        -- PROPUESTAS
        IF NOT EXISTS (SELECT 1 FROM company_groups WHERE name = 'PROPUESTAS' AND parent_id = prg_id) THEN
            INSERT INTO company_groups (name, type, icon, permissions, parent_id)
            VALUES ('PROPUESTAS', 'folder', 'FileSignature', '["admin", "manager"]', prg_id);
        END IF;

        -- CONTRATOS
        IF NOT EXISTS (SELECT 1 FROM company_groups WHERE name = 'CONTRATOS' AND parent_id = prg_id) THEN
            INSERT INTO company_groups (name, type, icon, permissions, parent_id)
            VALUES ('CONTRATOS', 'folder', 'ScrollText', '["admin", "manager"]', prg_id);
        END IF;

        -- RECURSOS HUMANOS
        IF NOT EXISTS (SELECT 1 FROM company_groups WHERE name = 'RECURSOS HUMANOS' AND parent_id = prg_id) THEN
            INSERT INTO company_groups (name, type, icon, permissions, parent_id)
            VALUES ('RECURSOS HUMANOS', 'folder', 'Users', '["admin", "manager"]', prg_id);
        END IF;

         -- ACTIVIDADES
        IF NOT EXISTS (SELECT 1 FROM company_groups WHERE name = 'ACTIVIDADES' AND parent_id = prg_id) THEN
            INSERT INTO company_groups (name, type, icon, permissions, parent_id)
            VALUES ('ACTIVIDADES', 'folder', 'Activity', '["admin", "manager"]', prg_id);
        END IF;

         -- CAPACITACIONES
        IF NOT EXISTS (SELECT 1 FROM company_groups WHERE name = 'CAPACITACIONES' AND parent_id = prg_id) THEN
            INSERT INTO company_groups (name, type, icon, permissions, parent_id)
            VALUES ('CAPACITACIONES', 'folder', 'GraduationCap', '["admin", "manager"]', prg_id);
        END IF;
    END IF;

END $$;
