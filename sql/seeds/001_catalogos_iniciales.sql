
INSERT INTO catalogo_unidades_negocio (nombre, descripcion, orden) VALUES
('Contabilidad', 'Servicios contables generales', 1),
('Auditoría', 'Servicios de auditoría externa e interna', 2),
('Asesoría', 'Asesoría tributaria y financiera', 3),
('Devoluciones', 'Gestión de devoluciones tributarias', 4),
('Administrativas', 'Actividades internas de la firma', 5)
ON CONFLICT (nombre) DO NOTHING;

INSERT INTO catalogo_actividades (unidad_negocio_id, nombre, orden)
SELECT id, unnest(ARRAY['Control','Informes - Reuniones','Registro','Gestiones']), unnest(ARRAY[1,2,3,4])
FROM catalogo_unidades_negocio WHERE nombre = 'Contabilidad'
ON CONFLICT (unidad_negocio_id, nombre) DO NOTHING;

INSERT INTO catalogo_actividades (unidad_negocio_id, nombre, orden)
SELECT id, unnest(ARRAY['Negociación','Planificación','Ejecución','Informes']), unnest(ARRAY[1,2,3,4])
FROM catalogo_unidades_negocio WHERE nombre = 'Auditoría'
ON CONFLICT (unidad_negocio_id, nombre) DO NOTHING;

INSERT INTO catalogo_actividades (unidad_negocio_id, nombre, orden)
SELECT id, 'Administrativas', 1
FROM catalogo_unidades_negocio WHERE nombre = 'Administrativas'
ON CONFLICT (unidad_negocio_id, nombre) DO NOTHING;

INSERT INTO catalogo_subactividades (actividad_id, nombre, orden)
SELECT a.id, unnest(ARRAY[
    'Conciliación de bancos', 'Conciliación de CxP y anticipos', 'Conciliación de CxC y anticipos',
    'Revisión de nómina', 'Análisis de inventarios', 'Análisis de cuentas', 'Consultas y guía contable'
]), generate_series(1,7)
FROM catalogo_actividades a JOIN catalogo_unidades_negocio u ON a.unidad_negocio_id = u.id
WHERE u.nombre = 'Contabilidad' AND a.nombre = 'Control'
ON CONFLICT (actividad_id, nombre) DO NOTHING;

INSERT INTO catalogo_subactividades (actividad_id, nombre, orden)
SELECT a.id, unnest(ARRAY[
    'Declaraciones', 'Análisis de rentabilidad', 'Estados financieros',
    'Informes', 'Reporte de obras', 'Flujos', 'Formularios y otros'
]), generate_series(1,7)
FROM catalogo_actividades a JOIN catalogo_unidades_negocio u ON a.unidad_negocio_id = u.id
WHERE u.nombre = 'Contabilidad' AND a.nombre = 'Informes - Reuniones'
ON CONFLICT (actividad_id, nombre) DO NOTHING;

INSERT INTO catalogo_subactividades (actividad_id, nombre, orden)
SELECT a.id, unnest(ARRAY[
    'Facturas de compra', 'Facturas de venta', 'Depósitos', 'Egresos', 'Nómina', 
    'Depreciaciones', 'Impuestos', 'Préstamos', 'Archivo'
]), generate_series(1,9)
FROM catalogo_actividades a JOIN catalogo_unidades_negocio u ON a.unidad_negocio_id = u.id
WHERE u.nombre = 'Contabilidad' AND a.nombre = 'Registro'
ON CONFLICT (actividad_id, nombre) DO NOTHING;

INSERT INTO catalogo_subactividades (actividad_id, nombre, orden)
SELECT a.id, unnest(ARRAY[
    'Capacitaciones', 'Gestiones PRG', 'Almuerzo', 'Permisos', 
    'Vacaciones', 'Revisión de correos', 'Reporte de actividades', 'Pausa activa'
]), generate_series(1,8)
FROM catalogo_actividades a JOIN catalogo_unidades_negocio u ON a.unidad_negocio_id = u.id
WHERE u.nombre = 'Administrativas' AND a.nombre = 'Administrativas'
ON CONFLICT (actividad_id, nombre) DO NOTHING;

INSERT INTO catalogo_tipos_incidencia (nombre, color) VALUES
('Llamado de atención', '#e74c3c'), ('Reconocimiento', '#27ae60'), ('Felicitación', '#3498db'),
('Sanción', '#c0392b'), ('Observación', '#f39c12'), ('Amonestación', '#e67e22')
ON CONFLICT (nombre) DO NOTHING;

INSERT INTO catalogo_tipos_capacitacion (nombre) VALUES
('Interna'), ('Externa'), ('Virtual'), ('Certificación'), ('Seminario'), ('Taller')
ON CONFLICT (nombre) DO NOTHING;

INSERT INTO catalogo_estados (entidad, nombre, color, orden) VALUES
('tarea', 'Pendiente', '#f39c12', 1), ('tarea', 'En proceso', '#3498db', 2), ('tarea', 'Finalizada', '#27ae60', 3), ('tarea', 'Cancelada', '#95a5a6', 4),
('vacacion', 'Pendiente', '#f39c12', 1), ('vacacion', 'Aprobada', '#27ae60', 2), ('vacacion', 'Rechazada', '#e74c3c', 3), ('vacacion', 'Cancelada', '#95a5a6', 4),
('capacitacion', 'Pendiente', '#f39c12', 1), ('capacitacion', 'En curso', '#3498db', 2), ('capacitacion', 'Aprobado', '#27ae60', 3), ('capacitacion', 'Reprobado', '#e74c3c', 4), ('capacitacion', 'Vencido', '#95a5a6', 5),
('actividad', 'Completada', '#27ae60', 1), ('actividad', 'En progreso', '#3498db', 2), ('actividad', 'Pendiente', '#f39c12', 3)
ON CONFLICT (entidad, nombre) DO NOTHING;

INSERT INTO company_groups (name, descripcion, codigo_interno, type)
SELECT 'Semanales', 'Clientes con frecuencia de atención semanal', 'C1', 'group'
WHERE NOT EXISTS (SELECT 1 FROM company_groups WHERE name = 'Semanales');

INSERT INTO company_groups (name, descripcion, codigo_interno, type)
SELECT 'Quincenales', 'Clientes con frecuencia de atención quincenal', 'C2', 'group'
WHERE NOT EXISTS (SELECT 1 FROM company_groups WHERE name = 'Quincenales');

INSERT INTO company_groups (name, descripcion, codigo_interno, type)
SELECT 'Mensuales', 'Clientes con frecuencia de atención mensual', 'C3', 'group'
WHERE NOT EXISTS (SELECT 1 FROM company_groups WHERE name = 'Mensuales');

INSERT INTO company_groups (name, descripcion, codigo_interno, type)
SELECT 'Sin actividad', 'Clientes sin actividad reciente', NULL, 'group'
WHERE NOT EXISTS (SELECT 1 FROM company_groups WHERE name = 'Sin actividad');

INSERT INTO company_groups (name, descripcion, codigo_interno, type)
SELECT 'RIMPE', 'Clientes del Régimen RIMPE', NULL, 'group'
WHERE NOT EXISTS (SELECT 1 FROM company_groups WHERE name = 'RIMPE');

INSERT INTO company_groups (name, descripcion, codigo_interno, type)
SELECT 'Personas Naturales Activas', 'Personas naturales con actividad económica', NULL, 'group'
WHERE NOT EXISTS (SELECT 1 FROM company_groups WHERE name = 'Personas Naturales Activas');
