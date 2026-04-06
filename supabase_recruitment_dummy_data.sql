-- ============================================================================
-- DUMMY DATA FOR RECRUITMENT MODULE
-- Run this AFTER supabase_recruitment_module.sql to populate initial test data.
-- ============================================================================

-- Variables
DO $$
DECLARE
    v_survey_id UUID;
    v_company_id UUID;
BEGIN
    -- 1. Try to get a dummy company if companies table exists. If not, it will just insert NULL.
    BEGIN
        SELECT id INTO v_company_id FROM public.companies LIMIT 1;
    EXCEPTION WHEN OTHERS THEN
        v_company_id := NULL;
    END;

    -- 2. Insert a dummy survey
    INSERT INTO public.recruitment_surveys (title, description, version, access_token, is_active)
    VALUES (
        'Cuestionario de Habilidades React / Next.js', 
        'Por favor completa este breve cuestionario para la vacante de Desarrollador Frontend.',
        1,
        'testtoken_abc123_testtoken_abc123_32char', -- 40 chars
        true
    ) RETURNING id INTO v_survey_id;

    -- 3. Insert questions for this survey
    
    -- Q1: Open Text
    INSERT INTO public.recruitment_questions (survey_id, text, type, options, order_index, is_required)
    VALUES (
        v_survey_id, 
        '¿Por qué te interesa esta vacante?', 
        'text', 
        NULL, 
        1, 
        true
    );

    -- Q2: Multiple Choice (Single answer theoretically handled via UI or specific type)
    INSERT INTO public.recruitment_questions (survey_id, text, type, options, order_index, is_required)
    VALUES (
        v_survey_id, 
        'Selecciona los frameworks UI con los que tienes experiencia en producción.', 
        'multiple_choice', 
        '["TailwindCSS", "Material-UI", "Chakra UI", "Bootstrap"]'::jsonb, 
        2, 
        true
    );

    -- Q3: Scale (1 to 5)
    INSERT INTO public.recruitment_questions (survey_id, text, type, options, order_index, is_required)
    VALUES (
        v_survey_id, 
        '¿Cómo calificarías tu nivel de dominio en TypeScript (1 = Básico, 5 = Experto)?', 
        'scale', 
        '{"min": 1, "max": 5}'::jsonb, 
        3, 
        true
    );

END $$;
