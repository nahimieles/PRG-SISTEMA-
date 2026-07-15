-- ============================================================================
-- ENCUESTA: PREGUNTAS PARA ASISTENTE CONTABLE
-- Por favor, corre este script en el editor SQL de Supabase.
-- ============================================================================

DO $$
DECLARE
    v_survey_id UUID;
BEGIN
    -- 0. Limpiamos la encuesta previa si se intenta correr este script multiples veces
    DELETE FROM public.recruitment_surveys WHERE access_token = 'asistente_contable_token_random_32_chars_';

    -- 1. Insertamos la encuesta nueva y guardamos su ID
    INSERT INTO public.recruitment_surveys (title, description, version, access_token, is_active)
    VALUES (
        'PREGUNTAS PARA ASISTENTE CONTABLE', 
        'Por favor completa este cuestionario técnico para la vacante de Asistente Contable.',
        1,
        'asistente_contable_token_random_32_chars_', 
        true
    ) RETURNING id INTO v_survey_id;

    -- 2. Insertamos las preguntas

    -- P1 (Radio)
    INSERT INTO public.recruitment_questions (survey_id, text, type, options, order_index, is_required)
    VALUES (v_survey_id, 'Un contribuyente calificado como "Agente de Retención" debe emitir el comprobante de retención en un plazo máximo de:', 'multiple_choice', '["5 días desde la fecha del comprobante de venta.", "10 días desde la fecha del comprobante de venta.", "15 días del mes siguiente."]'::jsonb, 1, true);

    -- P2 (MultiText)
    INSERT INTO public.recruitment_questions (survey_id, text, type, options, order_index, is_required)
    VALUES (v_survey_id, 'Realice el asiento contable simple para la compra de suministros de oficina por $100 + IVA, pagando con transferencia bancaria (asuma que no hay retenciones para este ejercicio):', 'multi_text', '["Debe", "Haber"]'::jsonb, 2, true);

    -- P3 (Text)
    INSERT INTO public.recruitment_questions (survey_id, text, type, options, order_index, is_required)
    VALUES (v_survey_id, '¿Qué es el RIMPE y cuáles son sus dos subcategorías principales?', 'text', NULL, 3, true);

    -- P4 (Radio)
    INSERT INTO public.recruitment_questions (survey_id, text, type, options, order_index, is_required)
    VALUES (v_survey_id, '¿Cuál es el porcentaje actual de aporte personal al IESS para un trabajador en relación de dependencia?', 'multiple_choice', '["12.15%", "9.45%", "11.15%"]'::jsonb, 4, true);

    -- P5 (Radio)
    INSERT INTO public.recruitment_questions (survey_id, text, type, options, order_index, is_required)
    VALUES (v_survey_id, '¿Cómo se calcula el pago de la Decimocuarta Remuneración (Bono Escolar) en la región Sierra/Amazonía y Costa/Insular?', 'multiple_choice', '["Es la doceava parte de lo ganado en el año.", "Es un Salario Básico Unificado (SBU) vigente.", "Es el 15% de las utilidades."]'::jsonb, 5, true);

    -- P6 (Radio)
    INSERT INTO public.recruitment_questions (survey_id, text, type, options, order_index, is_required)
    VALUES (v_survey_id, 'Conciliación Tributaria: ¿Cuál es el tratamiento contable y tributario de los "Gastos No Deducibles" al calcular el Impuesto a la Renta?', 'multiple_choice', '["Se restan de la utilidad contable para bajar el impuesto.", "Se suman a la utilidad contable para determinar la base imponible."]'::jsonb, 6, true);

    -- P7 (Text)
    INSERT INTO public.recruitment_questions (survey_id, text, type, options, order_index, is_required)
    VALUES (v_survey_id, 'Escriba 4 Ejemplos de gastos no deducibles', 'text', NULL, 7, true);

    -- P8 (Radio)
    INSERT INTO public.recruitment_questions (survey_id, text, type, options, order_index, is_required)
    VALUES (v_survey_id, 'Retenciones de IVA: Si una empresa calificada como "Contribuyente Especial" compra servicios de consultoría a una "Persona Natural no obligada a llevar contabilidad", ¿qué porcentaje de IVA debe retener?', 'multiple_choice', '["30%", "70%", "100%"]'::jsonb, 8, true);

    -- P9 (Radio)
    INSERT INTO public.recruitment_questions (survey_id, text, type, options, order_index, is_required)
    VALUES (v_survey_id, 'Activos Fijos: Según la técnica contable y el SRI, ¿cuál es el porcentaje anual de depreciación para "Equipos de Computación y Software"?', 'multiple_choice', '["10% (10 años)", "20% (5 años)", "33.33% (3 años)"]'::jsonb, 9, true);

    -- P10 (Radio)
    INSERT INTO public.recruitment_questions (survey_id, text, type, options, order_index, is_required)
    VALUES (v_survey_id, 'Impuesto a la Renta: ¿Qué sucede si el "Crédito Tributario de IVA" acumulado por una empresa es mayor al IVA en ventas durante varios meses?', 'multiple_choice', '["El valor se pierde al finalizar el año fiscal.", "Se mantiene en el activo como Crédito Tributario para futuras compensaciones o devolución.", "El SRI emite una multa por exceso de compras."]'::jsonb, 10, true);

    -- P11 (Radio)
    INSERT INTO public.recruitment_questions (survey_id, text, type, options, order_index, is_required)
    VALUES (v_survey_id, '¿En qué cuenta de balance se registra el deterioro de la Cartera de Clientes (Cuentas por Cobrar) que se considera incobrable?', 'multiple_choice', '["Una cuenta de Pasivo Corriente.", "Una cuenta de Activo con saldo acreedor (Regularizadora de activo).", "Directamente contra la cuenta de Capital."]'::jsonb, 11, true);

    -- P12 (Radio)
    INSERT INTO public.recruitment_questions (survey_id, text, type, options, order_index, is_required)
    VALUES (v_survey_id, '¿Cuál es el código de retención que se aplica actualmente para la compra de "Bienes Muebles de naturaleza corporal" (compra de mercadería estándar)?', 'multiple_choice', '["Código 312 (1.75%)", "Código 343 (10%)", "Código 332 (2%)"]'::jsonb, 12, true);

    -- P13 (MultiText)
    INSERT INTO public.recruitment_questions (survey_id, text, type, options, order_index, is_required)
    VALUES (v_survey_id, 'Un trabajador tiene un sueldo de $600,00. En el mes de marzo acumuló 5 horas suplementarias (con recargo del 50%). Calcule:', 'multi_text', '["El valor de la hora normal", "El valor total a recibir por las 5 horas suplementarias"]'::jsonb, 13, true);

    -- P14 (MultiText)
    INSERT INTO public.recruitment_questions (survey_id, text, type, options, order_index, is_required)
    VALUES (v_survey_id, 'Compras con Retenciones: Una empresa (Agente de Retención) compra mercadería a un contribuyente especial por un valor de $2,500 + IVA (15%). El pago se realiza a crédito. Determine:', 'multi_text', '["Valor del IVA", "Valor de Retención de IR (Código 312 - 1.75%)", "Valor neto a pagar al proveedor"]'::jsonb, 14, true);

    -- P15 (MultiText)
    INSERT INTO public.recruitment_questions (survey_id, text, type, options, order_index, is_required)
    VALUES (v_survey_id, 'Se compra una maquinaria por $12,000 el 1 de enero. Según la ley, se deprecia en 10 años (10% anual). Calcule:', 'multi_text', '["Gasto de depreciación mensual", "Asiento contable (Debe)", "Asiento contable (Haber)"]'::jsonb, 15, true);

    -- P16 (Text)
    INSERT INTO public.recruitment_questions (survey_id, text, type, options, order_index, is_required)
    VALUES (v_survey_id, '¿Qué es un sistema contable y cuáles son sus principales modulos?', 'text', NULL, 16, true);

    -- P17 (Text)
    INSERT INTO public.recruitment_questions (survey_id, text, type, options, order_index, is_required)
    VALUES (v_survey_id, 'Describa como organizaría ud un archivo de comprobantes', 'text', NULL, 17, true);

    -- P18 (Text)
    INSERT INTO public.recruitment_questions (survey_id, text, type, options, order_index, is_required)
    VALUES (v_survey_id, '¿Qué es una conciliación bancaria?', 'text', NULL, 18, true);

    -- P19 (Text)
    INSERT INTO public.recruitment_questions (survey_id, text, type, options, order_index, is_required)
    VALUES (v_survey_id, '¿Cuáles son las principales obligaciones con las entidades de control que tiene una compañía?', 'text', NULL, 19, true);

    -- P20 (Text)
    INSERT INTO public.recruitment_questions (survey_id, text, type, options, order_index, is_required)
    VALUES (v_survey_id, '¿Cuál es la diferencia entre medicina e insumo médico?', 'text', NULL, 20, true);

END $$;
