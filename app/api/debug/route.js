import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET() {
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  
  const { data: surveys } = await supabase.from('recruitment_surveys').select('id, parent_survey_id, version, title');
  const { data: questions } = await supabase.from('recruitment_questions').select('id, survey_id, text');
  
  return NextResponse.json({ surveys, questions });
}
