ALTER TABLE public.recruitment_surveys 
ADD COLUMN IF NOT EXISTS is_graded BOOLEAN NOT NULL DEFAULT false;

-- Actualizar el procedimiento create_new_survey_version para incluir is_graded
CREATE OR REPLACE FUNCTION create_new_survey_version(p_old_survey_id UUID, p_title TEXT, p_description TEXT, p_is_graded BOOLEAN DEFAULT false)
RETURNS UUID AS $$
DECLARE
    v_new_survey_id UUID;
    v_old_survey RECORD;
    v_new_version INTEGER;
    v_new_token TEXT;
BEGIN
    SELECT * INTO v_old_survey FROM public.recruitment_surveys WHERE id = p_old_survey_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Prueba no encontrada';
    END IF;

    UPDATE public.recruitment_surveys SET is_active = false WHERE id = p_old_survey_id;

    v_new_version := v_old_survey.version + 1;
    v_new_token := 'tkn_' || replace(gen_random_uuid()::text, '-', '');

    INSERT INTO public.recruitment_surveys (
        title, description, version, access_token, is_active, parent_survey_id, is_graded
    ) VALUES (
        p_title,
        p_description,
        v_new_version,
        v_new_token,
        true,
        COALESCE(v_old_survey.parent_survey_id, v_old_survey.id),
        p_is_graded
    ) RETURNING id INTO v_new_survey_id;

    RETURN v_new_survey_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Refrescar el esquema de la caché de PostgREST para Supabase
NOTIFY pgrst, 'reload schema';