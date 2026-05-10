import { NextResponse } from 'next/server';
import { getSurveyQuestionsAction } from '@/lib/actions';
import { getServiceSupabase } from '@/lib/supabase';
import { randomUUID } from 'crypto';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Extremely basic in-memory rate limiting (IP -> timestamps)
// In a serverless environment (Vercel), this may reset per instance, 
// but it mitigates basic spam. For production, Redis (Upstash) is recommended.
const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW_MS = 60000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 5;

function checkRateLimit(ip) {
    if (!ip) return true; // Can't limit what we can't identify reliably under some proxies
    
    const now = Date.now();
    const timestamps = rateLimitMap.get(ip) || [];
    const validTimestamps = timestamps.filter(t => now - t < RATE_LIMIT_WINDOW_MS);
    
    if (validTimestamps.length >= MAX_REQUESTS_PER_WINDOW) {
        return false;
    }
    
    validTimestamps.push(now);
    rateLimitMap.set(ip, validTimestamps);
    return true;
}



const getSupabaseAdmin = () => {
   const client = getServiceSupabase();
   if (!client) throw new Error('Error de configuración en el servidor (Supabase Admin)');
   return client;
};

export async function GET(request, { params }) {
    const { interviewId } = await params;
    
    const supabase = getSupabaseAdmin();

    try {
        // 1. Validate Survey Exists, is Active
        const { data: survey, error: surveyError } = await supabase
            .from('recruitment_surveys')
            .select('id, title, description, version, is_active, parent_survey_id')
            .eq('id', interviewId)
            .single();

        if (surveyError || !survey) {
            return NextResponse.json({ error: 'Prueba no encontrada o token inválido.' }, { status: 404 });
        }

        if (!survey.is_active) {
            return NextResponse.json({ error: 'La prueba ya no está activa.' }, { status: 403 });
        }

        // 2. Fetch Questions (Using our robust server action that recovers from parent if empty)
        const parentId = survey.parent_survey_id || survey.id;
        const { success, questions, error: qErr } = await getSurveyQuestionsAction(interviewId, parentId);
        
        if (!success) {
            throw new Error(qErr || 'Error fetching questions');
        }

        return NextResponse.json({ survey, questions });

    } catch (error) {
        console.error('API Prueba GET Error:', error);
        return NextResponse.json({ error: 'Error interno del servidor.' }, { status: 500 });
    }
}

export async function POST(request, { params }) {
    const { interviewId } = await params;
    
    // IP Rate Limiting
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
    if (!checkRateLimit(ip)) {
        return NextResponse.json({ error: 'Demasiadas solicitudes. Por favor, intenta más tarde.' }, { status: 429 });
    }

    try {
        const body = await request.json();
        const { candidate, responses } = body;

        // Validar campos obligatorios del candidato
        if (!candidate || !candidate.full_name || !candidate.email) {
            return NextResponse.json({ error: 'Faltan datos requeridos del candidato (Nombre, Email).' }, { status: 400 });
        }

        const supabase = getSupabaseAdmin();

        // 1. Validar Encuesta
        const { data: survey } = await supabase
            .from('recruitment_surveys')
            .select('id, version, is_active')
            .eq('id', interviewId)
            .single();

        if (!survey || !survey.is_active) {
            return NextResponse.json({ error: 'Prueba inválida o inactiva.' }, { status: 403 });
        }

        // 2. Cargar preguntas de seguridad (intentamos validar con cualquier versión disponible)
        const parentId = survey.parent_survey_id || survey.id;
        
        // Buscamos todas las versiones de esta encuesta
        const { data: allVersions } = await supabase
            .from('recruitment_surveys')
            .select('id')
            .or(`id.eq.${parentId},parent_survey_id.eq.${parentId}`);
            
        const surveyIds = allVersions && allVersions.length > 0 
            ? allVersions.map(v => v.id) 
            : [interviewId, parentId].filter(Boolean);

        const { data: questions } = await supabase
            .from('recruitment_questions')
            .select('id, is_required, type, survey_id')
            .in('survey_id', surveyIds);

        // 3. Procesar respuestas
        // Si no hay preguntas en la BD para validar (caso raro), confiamos en lo que envía el candidato
        // para no bloquear el proceso de reclutamiento.
        const questionMap = questions ? new Map(questions.map(q => [q.id, q])) : new Map();
        
        // Filtramos las respuestas válidas si tenemos preguntas, si no, las aceptamos todas
        const validResponses = (questions && questions.length > 0)
            ? responses.filter(resp => questionMap.has(resp.question_id))
            : responses;
            
        const responseDataMap = new Map(validResponses.map(r => [r.question_id, r.response_value]));

        // Validar obligatorias SOLO si tenemos la lista de preguntas
        if (questions && questions.length > 0) {
            const currentVersionQuestions = questions.filter(q => q.survey_id === interviewId);
            const targetQs = currentVersionQuestions.length > 0 ? currentVersionQuestions : questions;
            
            for (const q of targetQs) {
                if (q.is_required && (!responseDataMap.has(q.id) || !responseDataMap.get(q.id))) {
                    // No bloqueamos con error 400, solo advertimos en consola y permitimos seguir 
                    // si hay al menos algunas respuestas.
                    console.warn(`Missing required question: ${q.id}`);
                }
            }
        }

        // --- Iniciar inserciones ---
        // Generamos el ID a nivel de API para evitar requerir SELECT powers (RLS)
        const newCandidateId = randomUUID();

        // Insert candidate sin select() para que no falle RLS (solo insert permitido)
        const { error: candidateError } = await supabase
            .from('recruitment_candidates')
            .insert({
                id: newCandidateId,
                survey_id: interviewId,
                survey_version: survey.version,
                full_name: candidate.full_name,
                email: candidate.email,
                phone: candidate.phone || null,
                status: 'new'
            });

        if (candidateError) {
            console.error("Candidate Insert Error:", candidateError);
            return NextResponse.json({ error: 'Error BD (Candidato): ' + candidateError.message }, { status: 500 });
        }

        // Insert responses (FILTRANDO solo IDs que sean UUIDs válidos para evitar errores de BD)
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        const responseInserts = validResponses
            .filter(r => uuidRegex.test(r.question_id))
            .map(r => ({
                candidate_id: newCandidateId,
                question_id: r.question_id,
                response_value: r.response_value
            }));

        if (responseInserts.length > 0) {
            const { error: responsesError } = await supabase
                .from('recruitment_responses')
                .insert(responseInserts);

            if (responsesError) {
                 console.error("Responses Insert Error:", responsesError);
                 return NextResponse.json({ error: 'Error BD (Respuestas): ' + responsesError.message }, { status: 500 });
            }
        }

        return NextResponse.json({ success: true, message: 'Prueba completada exitosamente.' });

    } catch (error) {
        console.error('API Prueba POST Error:', error);
        return NextResponse.json({ error: 'Error interno del servidor.' }, { status: 500 });
    }
}
