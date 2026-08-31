-- Eliminar la versión antigua de la función (que tiene 3 argumentos)
DROP FUNCTION IF EXISTS public.create_new_survey_version(UUID, TEXT, TEXT);

-- Asegurarnos de recargar la caché por si acaso
NOTIFY pgrst, 'reload schema';
