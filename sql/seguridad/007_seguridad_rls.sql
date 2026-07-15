-- ========================================================================================
-- SEGURIDAD 007: POLÍTICAS DE ROW LEVEL SECURITY (RLS)
-- ========================================================================================

-- 1. Habilitar RLS en todas las tablas nuevas
ALTER TABLE catalogo_unidades_negocio ENABLE ROW LEVEL SECURITY;
ALTER TABLE catalogo_actividades ENABLE ROW LEVEL SECURITY;
ALTER TABLE catalogo_subactividades ENABLE ROW LEVEL SECURITY;
ALTER TABLE catalogo_tipos_incidencia ENABLE ROW LEVEL SECURITY;
ALTER TABLE catalogo_tipos_capacitacion ENABLE ROW LEVEL SECURITY;
ALTER TABLE catalogo_estados ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE metas_colaborador ENABLE ROW LEVEL SECURITY;
ALTER TABLE incidencias ENABLE ROW LEVEL SECURITY;
ALTER TABLE tareas ENABLE ROW LEVEL SECURITY;
ALTER TABLE vacaciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE capacitaciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE eventos_calendario ENABLE ROW LEVEL SECURITY;
ALTER TABLE notificaciones ENABLE ROW LEVEL SECURITY;

-- 2. Políticas de Catálogos (Lectura pública / Escritura solo service_role o admin validado por app)
-- Nota: La app usa el cliente anon/service_role de Supabase. Las escrituras se hacen 
-- desde server actions con getServiceSupabase() que salta RLS.
-- Por tanto, para anon, solo permitimos SELECT.

CREATE POLICY "Lectura pública de unidades" ON catalogo_unidades_negocio FOR SELECT USING (true);
CREATE POLICY "Lectura pública de actividades" ON catalogo_actividades FOR SELECT USING (true);
CREATE POLICY "Lectura pública de subactividades" ON catalogo_subactividades FOR SELECT USING (true);
CREATE POLICY "Lectura pública de tipos incidencia" ON catalogo_tipos_incidencia FOR SELECT USING (true);
CREATE POLICY "Lectura pública de tipos capacitacion" ON catalogo_tipos_capacitacion FOR SELECT USING (true);
CREATE POLICY "Lectura pública de estados" ON catalogo_estados FOR SELECT USING (true);
CREATE POLICY "Lectura pública de configuracion" ON system_settings FOR SELECT USING (true);

-- 3. Políticas de Tablas Funcionales (Lectura y Escritura controlada)
-- Tareas
CREATE POLICY "Lectura de tareas" ON tareas FOR SELECT USING (true);
CREATE POLICY "Inserción de tareas (Worker)" ON tareas FOR INSERT WITH CHECK (true);
CREATE POLICY "Actualización de tareas" ON tareas FOR UPDATE USING (true);

-- Vacaciones
CREATE POLICY "Lectura de vacaciones" ON vacaciones FOR SELECT USING (true);
CREATE POLICY "Inserción de vacaciones" ON vacaciones FOR INSERT WITH CHECK (true);
CREATE POLICY "Actualización de vacaciones" ON vacaciones FOR UPDATE USING (true);

-- Capacitaciones
CREATE POLICY "Lectura de capacitaciones" ON capacitaciones FOR SELECT USING (true);
CREATE POLICY "Inserción de capacitaciones" ON capacitaciones FOR INSERT WITH CHECK (true);
CREATE POLICY "Actualización de capacitaciones" ON capacitaciones FOR UPDATE USING (true);

-- Incidencias
CREATE POLICY "Lectura de incidencias" ON incidencias FOR SELECT USING (true);

-- Eventos Calendario
CREATE POLICY "Lectura de eventos" ON eventos_calendario FOR SELECT USING (true);

-- Notificaciones
CREATE POLICY "Lectura de notificaciones" ON notificaciones FOR SELECT USING (true);
CREATE POLICY "Actualización de notificaciones" ON notificaciones FOR UPDATE USING (true);
CREATE POLICY "Inserción de notificaciones" ON notificaciones FOR INSERT WITH CHECK (true);

-- Metas
CREATE POLICY "Lectura de metas" ON metas_colaborador FOR SELECT USING (true);

-- System Audit Logs (Solo lectura para admin via API, nadie inserta manual excepto triggers)
CREATE POLICY "Nadie lee logs excepto service_role" ON system_audit_logs FOR SELECT USING (false);
