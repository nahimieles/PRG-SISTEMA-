import { NextResponse } from 'next/server';
import { runDeltaScanAllDrives, discoverAllDrives, driveCompanyMap } from '@/lib/graphServerService';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

/**
 * POST /api/graph/delta
 * Manually trigger a full delta scan across all SharePoint drives.
 */
export async function POST() {
    try {
        const result = await runDeltaScanAllDrives();
        return NextResponse.json({
            success: true,
            scanned: !result.skipped,
            drives: result.drives,
            eventsEmitted: result.eventsEmitted,
            timestamp: new Date().toISOString(),
        });
    } catch (err) {
        console.error('[Delta API] Error:', err.message);
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
