
CREATE TABLE IF NOT EXISTS system_audit_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    table_name TEXT NOT NULL,
    record_id UUID NOT NULL,
    action TEXT NOT NULL, 
    old_data JSONB,
    new_data JSONB,
    changed_by_user TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE OR REPLACE FUNCTION log_audit_event() RETURNS TRIGGER AS $$
DECLARE
    v_old_data JSONB;
    v_new_data JSONB;
    v_changed_by TEXT;
BEGIN

    BEGIN
        v_changed_by := current_setting('request.jwt.claim.sub', true);
    EXCEPTION WHEN OTHERS THEN
        v_changed_by := 'system';
    END;

    IF v_changed_by IS NULL OR v_changed_by = '' THEN
        v_changed_by := 'system';
    END IF;

    IF TG_OP = 'INSERT' THEN
        v_new_data := to_jsonb(NEW);
        INSERT INTO system_audit_logs (table_name, record_id, action, new_data, changed_by_user)
        VALUES (TG_TABLE_NAME, NEW.id, 'INSERT', v_new_data, v_changed_by);
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        v_old_data := to_jsonb(OLD);
        v_new_data := to_jsonb(NEW);

        IF v_old_data <> v_new_data THEN
            INSERT INTO system_audit_logs (table_name, record_id, action, old_data, new_data, changed_by_user)
            VALUES (TG_TABLE_NAME, NEW.id, 'UPDATE', v_old_data, v_new_data, v_changed_by);
        END IF;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        v_old_data := to_jsonb(OLD);
        INSERT INTO system_audit_logs (table_name, record_id, action, old_data, changed_by_user)
        VALUES (TG_TABLE_NAME, OLD.id, 'DELETE', v_old_data, v_changed_by);
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS audit_records_trigger ON audit_records;
CREATE TRIGGER audit_records_trigger AFTER INSERT OR UPDATE OR DELETE ON audit_records FOR EACH ROW EXECUTE FUNCTION log_audit_event();

DROP TRIGGER IF EXISTS workers_trigger ON workers;
CREATE TRIGGER workers_trigger AFTER INSERT OR UPDATE OR DELETE ON workers FOR EACH ROW EXECUTE FUNCTION log_audit_event();

DROP TRIGGER IF EXISTS companies_trigger ON companies;
CREATE TRIGGER companies_trigger AFTER INSERT OR UPDATE OR DELETE ON companies FOR EACH ROW EXECUTE FUNCTION log_audit_event();

DROP TRIGGER IF EXISTS tareas_trigger ON tareas;
CREATE TRIGGER tareas_trigger AFTER INSERT OR UPDATE OR DELETE ON tareas FOR EACH ROW EXECUTE FUNCTION log_audit_event();

DROP TRIGGER IF EXISTS vacaciones_trigger ON vacaciones;
CREATE TRIGGER vacaciones_trigger AFTER INSERT OR UPDATE OR DELETE ON vacaciones FOR EACH ROW EXECUTE FUNCTION log_audit_event();

DROP TRIGGER IF EXISTS capacitaciones_trigger ON capacitaciones;
CREATE TRIGGER capacitaciones_trigger AFTER INSERT OR UPDATE OR DELETE ON capacitaciones FOR EACH ROW EXECUTE FUNCTION log_audit_event();

DROP TRIGGER IF EXISTS incidencias_trigger ON incidencias;
CREATE TRIGGER incidencias_trigger AFTER INSERT OR UPDATE OR DELETE ON incidencias FOR EACH ROW EXECUTE FUNCTION log_audit_event();
