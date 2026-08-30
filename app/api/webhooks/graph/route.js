import { after, NextResponse } from 'next/server';
import { runDeltaScanForDrive, runDeltaScanAllDrives } from '@/lib/graphServerService';
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';
export const maxDuration = 60;
export async function POST(req) {
    const url = new URL(req.url);
    const validationToken = url.searchParams.get('validationToken');
    if (validationToken) {
        return new NextResponse(validationToken, {
            status: 200,
            headers: { 'Content-Type': 'text/plain' },
        });
    }
    let payload;
    try {
        payload = await req.json();
    } catch {
        return new NextResponse(null, { status: 202 });
    }
    after(async () => {
        try {
            try {
                const summary = {
                    items: Array.isArray(payload?.value) ? payload.value.length : 0,
                    keys: Object.keys(payload || {})
                };
                console.debug('[Webhook] Received notification summary:', summary);
            } catch (e) {
                console.debug('[Webhook] Received notification (unable to summarize)');
            }
            await processNotifications(payload);
        } catch (err) {
        }
    });
    return new NextResponse(null, { status: 202 });
}
async function processNotifications(payload) {
    if (!payload?.value || !Array.isArray(payload.value)) return;
    const { GRAPH_WEBHOOK_SECRET } = process.env;
    const processedDrives = new Set();
    for (const notification of payload.value) {
        const { resource, clientState, subscriptionId } = notification;
        if (GRAPH_WEBHOOK_SECRET && clientState !== GRAPH_WEBHOOK_SECRET) {
            continue;
        }
        const driveMatch = resource?.match(/drives\/([^/]+)/);
        if (driveMatch) {
            const driveId = driveMatch[1];
            if (!processedDrives.has(driveId)) {
                processedDrives.add(driveId);
                await runDeltaScanForDrive(driveId).catch((err) =>
                );
            }
        } else {
            await runDeltaScanAllDrives().catch((err) =>
            );
            break; 
        }
    }
}
