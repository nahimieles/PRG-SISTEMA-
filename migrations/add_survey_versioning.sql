-- 1. Añadimos la columna para agrupar las versiones de una misma prueba.
-- Apunta a la ID original (la versión 1 de la prueba).
ALTER TABLE public.recruitment_surveys 
ADD COLUMN IF NOT EXISTS parent_survey_id UUID REFERENCES public.recruitment_surveys(id) ON DELETE CASCADE;

-- 2. Aseguramos que las pruebas existentes sean su propio "padre" para mantener la consistencia.
UPDATE public.recruitment_surveys
SET parent_survey_id = id
WHERE parent_survey_id IS NULL;

-- 3. Creamos una Función (Stored Procedure) en Supabase para crear una nueva versión de la prueba.
-- Esto inactiva la vieja y devuelve el ID de la nueva para que el frontend inserte las preguntas.
CREATE OR REPLACE FUNCTION create_new_survey_version(p_old_survey_id UUID, p_title TEXT, p_description TEXT)
RETURNS UUID AS $$
DECLARE
    v_new_survey_id UUID;
    v_old_survey RECORD;
    v_new_version INTEGER;
    v_new_token TEXT;
BEGIN
    -- Obtener la prueba antigua
    SELECT * INTO v_old_survey FROM public.recruitment_surveys WHERE id = p_old_survey_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Prueba no encontrada';
    END IF;

    -- Marcar antigua como inactiva (para que ya no acepte nuevas respuestas pero no se borre)
    UPDATE public.recruitment_surveys SET is_active = false WHERE id = p_old_survey_id;

    -- Generar nuevo token (obligatorio porque es UNIQUE en la base de datos) y subir la versión
    v_new_version := v_old_survey.version + 1;
    v_new_token := 'tkn_' || replace(gen_random_uuid()::text, '-', '');

    -- Insertar la nueva versión
    INSERT INTO public.recruitment_surveys (
        title, description, version, access_token, is_active, parent_survey_id
    ) VALUES (
        p_title,
        p_description,
        v_new_version,
        v_new_token,
        true,
        COALESCE(v_old_survey.parent_survey_id, v_old_survey.id)
    ) RETURNING id INTO v_new_survey_id;

    RETURN v_new_survey_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
