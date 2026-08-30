
CREATE TABLE IF NOT EXISTS business_units (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_unit_id UUID REFERENCES business_units(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS subactivities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    activity_id UUID REFERENCES activities(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE audit_records
ADD COLUMN IF NOT EXISTS business_unit_id UUID REFERENCES business_units(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS activity_id UUID REFERENCES activities(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS subactivity_id UUID REFERENCES subactivities(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS business_unit_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS activity_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS subactivity_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS company_group_id UUID,
ADD COLUMN IF NOT EXISTS company_group_name VARCHAR(255);

ALTER TABLE business_units ENABLE ROW LEVEL SECURITY;
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE subactivities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable all for all users on business_units" ON business_units FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all for all users on activities" ON activities FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all for all users on subactivities" ON subactivities FOR ALL USING (true) WITH CHECK (true);

DO $$
DECLARE
    bu_contabilidad_id UUID;
    bu_auditoria_id UUID;
    bu_asesoria_id UUID;
    bu_devoluciones_id UUID;
    bu_administrativas_id UUID;

    act_contabilidad_id UUID;
    act_control_id UUID;
    act_informes_id UUID;
    act_registro_id UUID;
    act_gestiones_id UUID;

    act_auditoria_id UUID;

    act_negociacion_id UUID;
    act_planificacion_id UUID;
    act_ejecucion_id UUID;
    act_informes_ad_id UUID;

    act_administrativas_id UUID;
    act_administrativas2_id UUID;
BEGIN

    INSERT INTO business_units (name) VALUES ('Contabilidad') RETURNING id INTO bu_contabilidad_id;
    INSERT INTO business_units (name) VALUES ('Auditoría') RETURNING id INTO bu_auditoria_id;
    INSERT INTO business_units (name) VALUES ('Asesoría') RETURNING id INTO bu_asesoria_id;
    INSERT INTO business_units (name) VALUES ('Devoluciones') RETURNING id INTO bu_devoluciones_id;
    INSERT INTO business_units (name) VALUES ('Administrativas') RETURNING id INTO bu_administrativas_id;

    INSERT INTO activities (business_unit_id, name) VALUES (bu_contabilidad_id, 'Contabilidad') RETURNING id INTO act_contabilidad_id;
    INSERT INTO activities (business_unit_id, name) VALUES (bu_contabilidad_id, 'Control') RETURNING id INTO act_control_id;
    INSERT INTO activities (business_unit_id, name) VALUES (bu_contabilidad_id, 'Informes - Reuniones') RETURNING id INTO act_informes_id;
    INSERT INTO activities (business_unit_id, name) VALUES (bu_contabilidad_id, 'Registro') RETURNING id INTO act_registro_id;
    INSERT INTO activities (business_unit_id, name) VALUES (bu_contabilidad_id, 'Gestiones') RETURNING id INTO act_gestiones_id;

    INSERT INTO activities (business_unit_id, name) VALUES (bu_auditoria_id, 'Auditoría') RETURNING id INTO act_auditoria_id;
    INSERT INTO activities (business_unit_id, name) VALUES (bu_auditoria_id, 'Negociación') RETURNING id INTO act_negociacion_id;
    INSERT INTO activities (business_unit_id, name) VALUES (bu_auditoria_id, 'Planificación') RETURNING id INTO act_planificacion_id;
    INSERT INTO activities (business_unit_id, name) VALUES (bu_auditoria_id, 'Ejecución') RETURNING id INTO act_ejecucion_id;
    INSERT INTO activities (business_unit_id, name) VALUES (bu_auditoria_id, 'Informes') RETURNING id INTO act_informes_ad_id;

    INSERT INTO activities (business_unit_id, name) VALUES (bu_administrativas_id, 'Administrativas') RETURNING id INTO act_administrativas_id;

    INSERT INTO subactivities (activity_id, name) VALUES 
        (act_control_id, 'Conciliación de bancos'),
        (act_control_id, 'Conciliación de CxP y anticipos'),
        (act_control_id, 'Conciliación de CxC y anticipos'),
        (act_control_id, 'Revisión de nómina'),
        (act_control_id, 'Análisis de inventarios'),
        (act_control_id, 'Análisis de cuentas'),
        (act_control_id, 'Consultas y guía contable');

    INSERT INTO subactivities (activity_id, name) VALUES 
        (act_informes_id, 'Declaraciones'),
        (act_informes_id, 'Análisis de rentabilidad'),
        (act_informes_id, 'Estados financieros');

    INSERT INTO subactivities (activity_id, name) VALUES 
        (act_informes_ad_id, 'Reporte de obras'),
        (act_informes_ad_id, 'Flujos'),
        (act_informes_ad_id, 'Formularios y otros');

    INSERT INTO subactivities (activity_id, name) VALUES 
        (act_registro_id, 'Facturas de compra'),
        (act_registro_id, 'Facturas de venta'),
        (act_registro_id, 'Depósitos'),
        (act_registro_id, 'Egresos'),
        (act_registro_id, 'Nómina'),
        (act_registro_id, 'Depreciaciones'),
        (act_registro_id, 'Impuestos'),
        (act_registro_id, 'Préstamos'),
        (act_registro_id, 'Archivo');

    INSERT INTO subactivities (activity_id, name) VALUES 
        (act_gestiones_id, 'Depósitos'),
        (act_gestiones_id, 'Entrega de documentos'),
        (act_gestiones_id, 'Visitas al SRI u otras entidades'),
        (act_gestiones_id, 'Movilización a reuniones'),
        (act_gestiones_id, 'Llamadas'),
        (act_gestiones_id, 'Viajes');

    INSERT INTO subactivities (activity_id, name) VALUES 
        (act_administrativas_id, 'Capacitaciones'),
        (act_administrativas_id, 'Gestiones PRG'),
        (act_administrativas_id, 'Almuerzo'),
        (act_administrativas_id, 'Permisos'),
        (act_administrativas_id, 'Vacaciones'),
        (act_administrativas_id, 'Revisión de correos'),
        (act_administrativas_id, 'Reporte de actividades'),
        (act_administrativas_id, 'Pausa activa');

END $$;
