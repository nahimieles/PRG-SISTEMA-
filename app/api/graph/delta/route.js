import { NextResponse } from 'next/server';
import { runDeltaScanAllDrives, discoverAllDrives, manageGraphSubscriptions } from '@/lib/graphServerService';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';
export async function POST(req) {
    try {
        const authHeader = req.headers.get('authorization');
        const cronSecret = process.env.CRON_SECRET;
        const isCronTrigger = cronSecret && authHeader === `Bearer ${cronSecret}`;
        if (!isCronTrigger) {
        } else {
        }
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
        return NextResponse.json(
            { success: false, error: err.message },
            { status: 500 }
        );
    }
}
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
