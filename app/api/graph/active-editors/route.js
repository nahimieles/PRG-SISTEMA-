import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getAppToken } from '@/lib/graphServerService';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

/**
 * GET /api/graph/active-editors
 *
 * Returns files that were MODIFIED in the last 5 minutes,
 * along with a Graph preview URL for embedding (Office Online).
 *
 * Used by the Admin Document Viewer panel.
 */
export async function GET() {
    try {
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();

        const { data, error } = await supabaseAdmin
            .from('audit_logs')
            .select('file_name, worker_name, company_name, file_path, timestamp, metadata')
            .eq('action_type', 'AUTO_MODIFY')
            .gte('timestamp', fiveMinutesAgo)
            .order('timestamp', { ascending: false });

        if (error) throw error;

        // Deduplicate by fileId — keep only the most recent edit per file
        const seen = new Map();
        for (const row of data || []) {
            const fileId = row.metadata?.fileId;
            if (fileId && !seen.has(fileId)) {
                seen.set(fileId, row);
            }
        }

        const activeEditors = await Promise.all(
            [...seen.values()].map(async (row) => {
                const { driveId, fileId } = row.metadata || {};
                let previewUrl = null;

                // Try to get an Office Online preview URL
                if (driveId && fileId) {
                    try {
                        const token = await getAppToken();
                        const res = await fetch(
                            `https://graph.microsoft.com/v1.0/drives/${driveId}/items/${fileId}/preview`,
                            {
                                method: 'POST',
                                headers: {
                                    Authorization: `Bearer ${token}`,
                                    'Content-Type': 'application/json',
                                },
                                body: JSON.stringify({}),
                                cache: 'no-store',
                            }
                        );
                        if (res.ok) {
                            const preview = await res.json();
                            previewUrl = preview.getUrl || preview.embedUrl || null;
                        }
                    } catch { /* preview not available */ }
                }

                // Calculate edit duration
                const editStart = new Date(row.timestamp);
                const editDurationMs = Date.now() - editStart.getTime();
                const editDurationMin = Math.round(editDurationMs / 60_000);

                return {
                    fileName: row.file_name,
                    user: row.worker_name || 'Usuario desconocido',
                    company: row.company_name || 'Empresa desconocida',
                    path: row.file_path || '/',
                    lastModifiedAt: row.timestamp,
                    editDurationMin,
                    driveId,
                    fileId,
                    previewUrl,
                };
            })
        );

        return NextResponse.json({ success: true, editors: activeEditors });
    } catch (err) {
        console.error('[ActiveEditors API] Error:', err.message);
        return NextResponse.json(
            { success: false, error: err.message, editors: [] },
            { status: 500 }
        );
    }
}
