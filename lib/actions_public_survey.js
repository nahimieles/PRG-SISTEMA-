'use server';
import { getServiceSupabase } from './supabase';
import { cleanText } from './security';

export async function getPublicSurveyAction(surveyId) {
    try {
        const adminDb = getServiceSupabase();
        
        // Obtener la prueba por ID
        const { data: survey, error } = await adminDb
            .from('recruitment_surveys')
            .select('*')
            .eq('id', surveyId)
            .single();
            
        if (error) {
            if (error.code === 'PGRST116') { // No rows found
                return { success: false, error: 'Prueba no encontrada' };
            }
            throw error;
        }
        
        if (!survey.is_active) {
            return { success: false, error: 'Esta prueba ya no está disponible.' };
        }
        
        // Obtener las preguntas de la prueba
        const { data: questions, error: qErr } = await adminDb
            .from('recruitment_questions')
            .select('*')
            .eq('survey_id', surveyId)
            .order('order_index', { ascending: true });
            
        if (qErr) throw qErr;
        
        return { success: true, survey, questions: questions || [] };
    } catch (error) {
        return { success: false, error: 'Error de conexión con el servidor.' };
    }
}

export async function submitPublicSurveyAction(surveyId, candidateData, responses) {
    try {
        const adminDb = getServiceSupabase();
        
        // 1. Validar que la prueba exista y esté activa
        const { data: survey, error: sErr } = await adminDb
            .from('recruitment_surveys')
            .select('is_active, is_graded, version')
            .eq('id', surveyId)
            .single();
            
        if (sErr || !survey) return { success: false, error: 'Prueba no válida.' };
        if (!survey.is_active) return { success: false, error: 'Esta prueba ha sido cerrada.' };
        
        // 2. Crear candidato
        const { data: candidate, error: cErr } = await adminDb
            .from('recruitment_candidates')
            .insert([{
                survey_id: surveyId,
                survey_version: survey.version || 1,
                full_name: cleanText(candidateData.full_name, 180),
                email: cleanText(candidateData.email, 180)
            }])
            .select()
            .single();
            
        if (cErr) throw cErr;
        
        // 3. Preparar respuestas
        const responsesToInsert = responses.map(r => ({
            candidate_id: candidate.id,
            question_id: r.question_id,
            response_value: { text: r.response_text, score: survey.is_graded ? (r.score || 0) : null }
        }));
        
        if (responsesToInsert.length > 0) {
            const { error: rErr } = await adminDb
                .from('recruitment_responses')
                .insert(responsesToInsert);
                
            if (rErr) throw rErr;
        }
        
        return { success: true };
    } catch (error) {
        console.error('[submitPublicSurveyAction] Error completo:', error);
        return { success: false, error: 'Error al enviar la prueba. Inténtalo de nuevo. Detalle: ' + (error?.message || String(error)) };
    }
}
