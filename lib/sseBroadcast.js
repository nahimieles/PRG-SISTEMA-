/**
 * Shared SSE Broadcast Module
 *
 * Maintains a module-level Set of active SSE controller references.
 * Because Next.js (in dev and in single-instance production) shares
 * the Node.js module cache, any API route that imports this file
 * will work with the same Set — enabling cross-route broadcasting.
 */

/** @type {Set<{ controller: ReadableStreamDefaultController, id: string }>} */
const clients = new Set();

let _clientIdCounter = 0;

/**
 * Register a new SSE client.
 * @param {ReadableStreamDefaultController} controller
 * @returns {string} clientId — use this to remove the client later
 */
export function addClient(controller) {
    const id = String(++_clientIdCounter);
    clients.add({ controller, id });
    console.log(`[SSE] Client connected. Total: ${clients.size}`);
    return id;
}

/**
 * Remove a disconnected SSE client.
 * @param {string} clientId
 */
export function removeClient(clientId) {
    for (const client of clients) {
        if (client.id === clientId) {
            clients.delete(client);
            break;
        }
    }
    console.log(`[SSE] Client disconnected. Total: ${clients.size}`);
}

/**
 * Broadcast a JSON-serialisable event to all connected SSE clients.
 * Dead clients are automatically pruned.
 * @param {object} data
 */
export function broadcastEvent(data) {
    const message = `data: ${JSON.stringify(data)}\n\n`;
    const encoded = new TextEncoder().encode(message);
    const dead = [];

    for (const client of clients) {
        try {
            client.controller.enqueue(encoded);
        } catch {
            dead.push(client.id);
        }
    }

    // Prune dead clients
    for (const id of dead) removeClient(id);

    if (clients.size > 0) {
        console.log(`[SSE] Broadcast to ${clients.size} client(s):`, data.action, data.fileName);
    }
}

/** @returns {number} */
export function getClientCount() {
    return clients.size;
}
