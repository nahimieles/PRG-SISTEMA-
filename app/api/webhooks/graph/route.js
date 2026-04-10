import { NextResponse } from 'next/server';
import { runDeltaScanForDrive, runDeltaScanAllDrives, getAppToken } from '@/lib/graphServerService';

/**
 * Microsoft Graph Webhook Handler
 *
 * Handles two types of Graph requests:
 *  1. Validation — Microsoft sends ?validationToken= when creating a subscription.
 *     Must reply with the token as plain text (200).
 *  2. Notifications — Microsoft sends a POST with changed resource info.
 *     Must reply with 202 within 3 seconds, then process asynchronously.
 */

export async function POST(req) {
    // ── 1. Webhook Validation ───────────────────────────────────────────────
    const url = new URL(req.url);
    const validationToken = url.searchParams.get('validationToken');

    if (validationToken) {
        return new NextResponse(validationToken, {
            status: 200,
            headers: { 'Content-Type': 'text/plain' },
        });
    }

    // ── 2. Notification Processing ─────────────────────────────────────────
    // Respond 202 IMMEDIATELY — Graph requires < 3 second acknowledgement
    let payload;
    try {
        payload = await req.json();
    } catch {
        return new NextResponse(null, { status: 202 });
    }

    // Await process so Vercel Serverless doesn't terminate the lambda early
    try {
        console.log('[Webhook] Received notification payload:', JSON.stringify(payload, null, 2));
        await processNotifications(payload);
    } catch (err) {
        console.error('[Webhook] Processing error:', err.message);
    }

    return new NextResponse(null, { status: 202 });
}

async function processNotifications(payload) {
    if (!payload?.value || !Array.isArray(payload.value)) return;

    const { GRAPH_WEBHOOK_SECRET } = process.env;
    const processedDrives = new Set();

    for (const notification of payload.value) {
        const { resource, clientState, subscriptionId } = notification;

        // Security check
        if (GRAPH_WEBHOOK_SECRET && clientState !== GRAPH_WEBHOOK_SECRET) {
            console.warn('[Webhook] Invalid clientState — notification rejected.');
            continue;
        }

        console.log(`[Webhook] Notification: resource="${resource}" sub="${subscriptionId}"`);

        // Extract driveId from resource path
        // Examples:
        //   drives/{driveId}/root
        //   drives/{driveId}/items/{itemId}
        //   sites/{siteId}/drive/root
        const driveMatch = resource?.match(/drives\/([^/]+)/);
        if (driveMatch) {
            const driveId = driveMatch[1];
            if (!processedDrives.has(driveId)) {
                processedDrives.add(driveId);
                await runDeltaScanForDrive(driveId).catch((err) =>
                    console.error(`[Webhook] Scan failed for drive ${driveId}:`, err.message)
                );
            }
        } else {
            // Unknown resource format — run full scan across all drives
            console.log('[Webhook] Could not extract driveId — running full scan.');
            await runDeltaScanAllDrives().catch((err) =>
                console.error('[Webhook] Full scan failed:', err.message)
            );
            break; // One full scan is enough
        }
    }
}
