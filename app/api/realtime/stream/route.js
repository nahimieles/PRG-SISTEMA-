import { addClient, removeClient } from '@/lib/sseBroadcast';

export const dynamic = 'force-dynamic';

/**
 * SSE Stream Endpoint
 *
 * Clients connect here with GET /api/realtime/stream and receive
 * a persistent text/event-stream connection. Events are pushed
 * by graphServerService.js via the shared sseBroadcast module.
 */
export async function GET(req) {
    let clientId;

    const stream = new ReadableStream({
        start(controller) {
            // Register this client in the shared broadcast Set
            clientId = addClient(controller);

            // Send initial handshake
            const init = `data: ${JSON.stringify({ type: 'connected', message: 'SSE Stream conectado' })}\n\n`;
            controller.enqueue(new TextEncoder().encode(init));

            // Send a heartbeat every 30 seconds to keep the connection alive
            const heartbeatInterval = setInterval(() => {
                try {
                    controller.enqueue(new TextEncoder().encode(': heartbeat\n\n'));
                } catch {
                    clearInterval(heartbeatInterval);
                }
            }, 30_000);

            // Clean up when the client disconnects
            req.signal.addEventListener('abort', () => {
                clearInterval(heartbeatInterval);
                removeClient(clientId);
                try { controller.close(); } catch { /* already closed */ }
            });
        },
    });

    return new Response(stream, {
        headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache, no-transform',
            'Connection': 'keep-alive',
            'X-Accel-Buffering': 'no', // Disable Nginx buffering
        },
    });
}
