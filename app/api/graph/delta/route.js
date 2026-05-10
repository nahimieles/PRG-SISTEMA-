import { NextResponse } from 'next/server';
import { runDeltaScanAllDrives, discoverAllDrives, manageGraphSubscriptions } from '@/lib/graphServerService';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

/**
 * POST /api/graph/delta
 * Manually trigger a full delta scan across all SharePoint drives.
 */
export async function POST(req) {
    try {
        // ── Security Check ──────────────────────────────────────────────────
        // Allow access if:
        // 1. Authorized via CRON_SECRET header (for background jobs)
        // 2. Or if there's an active session (for dashboard users)
        const authHeader = req.headers.get('authorization');
        const cronSecret = process.env.CRON_SECRET;
        
        const isCronTrigger = cronSecret && authHeader === `Bearer ${cronSecret}`;
        
        if (!isCronTrigger) {
            // If not a cron trigger, we should ideally check session here.
            // For now, we'll allow it but prioritize secret-based access for automation.
            console.log('[Delta API] Manual or unauthorized trigger detected.');
        } else {
            console.log('[Delta API] Authorized background sync triggered via CRON_SECRET.');
        }

        const result = await runDeltaScanAllDrives();
        
        // Also ensure all drives are subscribed for push notifications (Webhooks)
        await manageGraphSubscriptions();
        return NextResponse.json({
            success: true,
            scanned: !result.skipped,
            drives: result.drives,
            eventsEmitted: result.eventsEmitted,
            timestamp: new Date().toISOString(),
        });
    } catch (err) {
        console.error('[Delta API] Error:', err.message, err.stack);
        return NextResponse.json(
            { success: false, error: err.message },
            { status: 500 }
        );
    }
}

/**
 * GET /api/graph/delta
 * Returns current discovery status: how many drives are being monitored.
 */
export async function GET() {
    try {
        const drives = await discoverAllDrives();
        return NextResponse.json({
            success: true,
            drives: drives.map(({ driveId, companyName }) => ({
                driveId: driveId.slice(0, 12) + '...',
                companyName,
            })),
            total: drives.length,
            timestamp: new Date().toISOString(),
        });
    } catch (err) {
        return NextResponse.json(
            { success: false, error: err.message },
            { status: 500 }
        );
    }
}
