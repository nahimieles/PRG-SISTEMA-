import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

export async function GET() {
    const results = {};
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, key);

    // Count all tokens
    const { data: tokens, error: te } = await sb
        .from('drive_delta_tokens')
        .select('drive_id, updated_at');
    results.totalTokens = te ? { error: te.message } : { count: tokens?.length, drives: tokens?.map(t => ({ id: t.drive_id.slice(0, 20) + '...', at: t.updated_at })) };

    // Count baseline entries
    const { count, error: be } = await sb
        .from('file_baseline')
        .select('*', { count: 'exact', head: true });
    results.totalBaseline = be ? { error: be.message } : { count };

    // Latest audit logs  
    const { data: logs, error: le } = await sb
        .from('audit_logs')
        .select('action_type, file_name, timestamp')
        .order('timestamp', { ascending: false })
        .limit(5);
    results.latestLogs = le ? { error: le.message } : logs;

    return NextResponse.json(results, { status: 200 });
}
