import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';

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

// Since this route runs securely on the backend, we use the service role key to bypass RLS,
// OR we can just use anon key and let our strict RLS policies handle it.
// However, reading questions requires bypassing RLS or ensuring policies allow it based on the token.
// The architectural plan specified backend validation. Using the generic supabase client with admin powers (or passing token logic) is preferred.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // Requires service role to safely validate

const getSupabaseAdmin = () => {
   if (!supabaseServiceKey) {
       console.warn("Missing SUPABASE_SERVICE_ROLE_KEY, falling back to ANONYMOUS. This may fail if RLS read is restricted.");
       return createClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
   }
   return createClient(supabaseUrl, supabaseServiceKey);
};

export async function GET(request, { params }) {
    const { interviewId } = await params;
    
    const supabase = getSupabaseAdmin();

    try {
        // 1. Validate Survey Exists, is Active
        const { data: survey, error: surveyError } = await supabase
            .from('recruitment_surveys')
            .select('id, title, description, version, is_active')
            .eq('id', interviewId)
            .single();

        if (surveyError || !survey) {
            return NextResponse.json({ error: 'Entrevista no encontrada o token inválido.' }, { status: 404 });
        }

        if (!survey.is_active) {
            return NextResponse.json({ error: 'La entrevista ya no está activa.' }, { status: 403 });
        }

        // 2. Fetch Questions
        const { data: questions, error: questionsError } = await supabase
            .from('recruitment_questions')
            .select('id, text, type, options, is_required')
            .eq('survey_id', interviewId)
            .order('order_index', { ascending: true });

        if (questionsError) {
            throw new Error('Error fetching questions');
        }

        return NextResponse.json({ survey, questions });

    } catch (error) {
        console.error('API Entrevista GET Error:', error);
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
            return NextResponse.json({ error: 'Entrevista inválida o inactiva.' }, { status: 403 });
        }

        // 2. Cargar todas las preguntas para validar
        const { data: questions } = await supabase
            .from('recruitment_questions')
            .select('id, is_required, type')
            .eq('survey_id', interviewId);

        if (!questions) {
            return NextResponse.json({ error: 'No se encontraron preguntas.' }, { status: 404 });
        }

        // 3. Validar respuestas
        const questionMap = new Map(questions.map(q => [q.id, q]));
        const responseDataMap = new Map(responses.map(r => [r.question_id, r.response_value]));

        // Asegurar que no hay question_ids inválidos
        for (const resp of responses) {
            if (!questionMap.has(resp.question_id)) {
                return NextResponse.json({ error: `Pregunta inválida: ${resp.question_id}` }, { status: 400 });
            }
            // Aquí se podría añadir validación estricta de JSON según el `type` de pregunta
        }

        // Asegurar que las preguntas requeridas están respondidas
        for (const q of questions) {
            if (q.is_required && (!responseDataMap.has(q.id) || responseDataMap.get(q.id) === null || responseDataMap.get(q.id) === '')) {
                return NextResponse.json({ error: 'Faltan respuestas en preguntas obligatorias.' }, { status: 400 });
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

        // Insert responses
        const responseInserts = responses.map(r => ({
            candidate_id: newCandidateId,
            question_id: r.question_id,
            response_value: r.response_value
        }));

        const { error: responsesError } = await supabase
            .from('recruitment_responses')
            .insert(responseInserts);

        if (responsesError) {
             console.error("Responses Insert Error:", responsesError);
             return NextResponse.json({ error: 'Error BD (Respuestas): ' + responsesError.message }, { status: 500 });
        }

        return NextResponse.json({ success: true, message: 'Entrevista completada exitosamente.' });

    } catch (error) {
        console.error('API Entrevista POST Error:', error);
        return NextResponse.json({ error: 'Error interno del servidor.' }, { status: 500 });
    }
}
