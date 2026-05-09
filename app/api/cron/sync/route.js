import { NextResponse } from 'next/server';
import { runDeltaScanAllDrives, manageGraphSubscriptions } from '@/lib/graphServerService';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

export async function GET(req) {
    try {
        const authHeader = req.headers.get('authorization');
        const cronSecret = process.env.CRON_SECRET;
        
        // Verificamos que venga de Vercel Cron
        if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        console.log('[Cron Sync] Executing automatic background sync...');
        
        const result = await runDeltaScanAllDrives();
        await manageGraphSubscriptions();
        
        return NextResponse.json({
            success: true,
            scanned: !result.skipped,
            drives: result.drives,
            eventsEmitted: result.eventsEmitted,
            timestamp: new Date().toISOString(),
        });
    } catch (err) {
        console.error('[Cron Sync] Error:', err.message, err.stack);
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
}
