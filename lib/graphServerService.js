/**
 * graphServerService.js
 *
 * Server-side (Node.js only) Microsoft Graph service.
 * Uses Client Credentials flow — no user login required.
 *
 * Responsibilities:
 *  1. Acquire and cache an app-level access token.
 *  2. Auto-discover all SharePoint sites and their document library drives.
 *  3. Run Delta Queries per drive to detect:
 *       CREATED | MODIFIED | DELETED | RENAMED | MOVED
 *  4. Extract user (lastModifiedBy / createdBy) and company (site.name).
 *  5. Broadcast events via sseBroadcast.broadcastEvent().
 *  6. Persist delta tokens + file baseline in Supabase.
 *  7. Log events to audit_logs.
 *
 * Required env vars (server-side only, no NEXT_PUBLIC_ prefix):
 *   GRAPH_TENANT_ID
 *   GRAPH_CLIENT_ID
 *   GRAPH_CLIENT_SECRET
 *   GRAPH_WEBHOOK_SECRET
 */

import { createClient } from '@supabase/supabase-js';

// ─── Supabase Admin Client (server-side) ─────────────────────────────────────

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// ─── Module-Level Cache ───────────────────────────────────────────────────────

/** @type {{ token: string, expiresAt: number } | null} */
let _appTokenCache = null;

/**
 * Map of driveId → site/company name.
 * Populated by discoverAllDrives().
 * @type {Map<string, string>}
 */
export const driveCompanyMap = new Map();

// ─── Token Acquisition ────────────────────────────────────────────────────────

/**
 * Get (or refresh) the app-level Graph access token.
 * @returns {Promise<string>}
 */
export async function getAppToken() {
    const now = Date.now();
    if (_appTokenCache && _appTokenCache.expiresAt > now + 60_000) {
        return _appTokenCache.token;
    }

    const { GRAPH_TENANT_ID, GRAPH_CLIENT_ID, GRAPH_CLIENT_SECRET } = process.env;

    if (!GRAPH_TENANT_ID || !GRAPH_CLIENT_ID || !GRAPH_CLIENT_SECRET) {
        throw new Error(
            '[Graph] Missing env vars: GRAPH_TENANT_ID, GRAPH_CLIENT_ID, GRAPH_CLIENT_SECRET'
        );
    }

    const url = `https://login.microsoftonline.com/${GRAPH_TENANT_ID}/oauth2/v2.0/token`;
    const body = new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: GRAPH_CLIENT_ID,
        client_secret: GRAPH_CLIENT_SECRET,
        scope: 'https://graph.microsoft.com/.default',
    });

    const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body,
    });

    if (!res.ok) {
        const text = await res.text();
        throw new Error(`[Graph] Token error ${res.status}: ${text.slice(0, 300)}`);
    }

    const json = await res.json();
    _appTokenCache = {
        token: json.access_token,
        expiresAt: now + json.expires_in * 1000,
    };

    console.log('[Graph] App token acquired.');
    return _appTokenCache.token;
}

// ─── Generic Graph Fetch ──────────────────────────────────────────────────────

async function graphGet(path, token) {
    const url = path.startsWith('https://') ? path : `https://graph.microsoft.com/v1.0${path}`;
    const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
    });

    if (res.status === 401) {
        // Invalidate token and retry once
        _appTokenCache = null;
        const newToken = await getAppToken();
        const retry = await fetch(url, {
            headers: { Authorization: `Bearer ${newToken}` },
        });
        if (!retry.ok) {
            const t = await retry.text();
            throw new Error(`[Graph] ${retry.status} on ${url}: ${t.slice(0, 200)}`);
        }
        return retry.json();
    }

    if (!res.ok) {
        const text = await res.text();
        // Return empty for 404 (drive/site may be inaccessible)
        if (res.status === 404) return null;
        throw new Error(`[Graph] ${res.status} on ${url}: ${text.slice(0, 200)}`);
    }

    return res.json();
}

// ─── Site & Drive Discovery ───────────────────────────────────────────────────

/**
 * Fetches all SharePoint sites and their document library drives.
 * Populates driveCompanyMap (driveId → companyName).
 * @returns {Promise<Array<{ driveId: string, companyName: string }>>}
 */
export async function discoverAllDrives() {
    const token = await getAppToken();
    driveCompanyMap.clear();

    let siteUrl = 'https://graph.microsoft.com/v1.0/sites?search=*&$select=id,displayName,name,webUrl';
    const allSites = [];

    // Paginate through all sites
    while (siteUrl) {
        const data = await graphGet(siteUrl, token);
        if (!data) break;
        allSites.push(...(data.value || []));
        siteUrl = data['@odata.nextLink'] || null;
    }

    console.log(`[Graph] Found ${allSites.length} SharePoint site(s).`);

    const drives = [];

    for (const site of allSites) {
        // Use displayName first, fallback to name, fallback to webUrl hostname
        const companyName =
            site.displayName ||
            site.name ||
            new URL(site.webUrl || 'https://unknown').hostname;

        // Skip root/personal/system sites
        if (!companyName || companyName.toLowerCase() === 'root') continue;

        try {
            const drivesData = await graphGet(
                `/sites/${site.id}/drives?$select=id,name,driveType`,
                token
            );
            if (!drivesData?.value) continue;

            for (const drive of drivesData.value) {
                // Only document libraries (not personal drives)
                if (drive.driveType === 'personal') continue;
                driveCompanyMap.set(drive.id, companyName);
                drives.push({ driveId: drive.id, companyName });
                console.log(`[Graph]   Drive "${drive.name}" → "${companyName}" (${drive.id.slice(0, 12)}...)`);
            }
        } catch (err) {
            console.warn(`[Graph] Could not fetch drives for site "${companyName}": ${err.message}`);
        }
    }

    console.log(`[Graph] Total drives to monitor: ${drives.length}`);
    return drives;
}

// ─── Supabase Persistence ─────────────────────────────────────────────────────

async function loadDeltaToken(driveId) {
    try {
        const { data } = await supabaseAdmin
            .from('drive_delta_tokens')
            .select('delta_link')
            .eq('drive_id', driveId)
            .single();
        return data?.delta_link || null;
    } catch {
        return null;
    }
}

async function saveDeltaToken(driveId, deltaLink) {
    try {
        await supabaseAdmin.from('drive_delta_tokens').upsert(
            { drive_id: driveId, delta_link: deltaLink, updated_at: new Date().toISOString() },
            { onConflict: 'drive_id' }
        );
    } catch (err) {
        console.warn('[Graph] Could not save delta token:', err.message);
    }
}



async function saveBaselineEntry(fileId, entry, driveId) {
    try {
        await supabaseAdmin.from('file_baseline').upsert(
            {
                file_id: fileId,
                drive_id: driveId,
                name: entry.name,
                last_modified_date_time: entry.lastModifiedDateTime,
                etag: entry.eTag || null,
                ctag: entry.cTag || null,
                parent_path: entry.parentPath || null,
                parent_id: entry.parentId || null,
                updated_at: new Date().toISOString(),
            },
            { onConflict: 'file_id' }
        );
    } catch { /* best-effort */ }
}

async function deleteBaselineEntry(fileId) {
    try {
        await supabaseAdmin.from('file_baseline').delete().eq('file_id', fileId);
    } catch { /* best-effort */ }
}

// ─── Delta Fetch (handles pagination + 410 reset) ────────────────────────────

/**
 * @param {string} startUrl
 * @param {string} token
 * @returns {Promise<{ items: object[], deltaLink: string | null } | 'RESET' | null>}
 */
async function fetchDeltaPages(startUrl, token) {
    const allItems = [];
    let url = startUrl;
    let finalDeltaLink = null;

    while (url) {
        const res = await fetch(url, {
            headers: { Authorization: `Bearer ${token}` },
        });

        if (res.status === 410) {
            console.warn('[Graph] deltaLink expired (410) — full reset required.');
            return 'RESET';
        }

        if (res.status === 401) {
            _appTokenCache = null;
            token = await getAppToken();
            continue; // retry same url
        }

        if (!res.ok) {
            const text = await res.text();
            throw new Error(`[Graph] Delta fetch ${res.status}: ${text.slice(0, 200)}`);
        }

        const json = await res.json();
        allItems.push(...(json.value || []));
        url = json['@odata.nextLink'] || null;
        if (!url) finalDeltaLink = json['@odata.deltaLink'] || null;
    }

    return { items: allItems, deltaLink: finalDeltaLink };
}

// ─── Company Extraction ───────────────────────────────────────────────────────

/**
 * Extract the client company name from a SharePoint DriveItem.
 *
 * Real SharePoint structure:
 *   /sites/AUDITORIA/Shared Documents/ACUIFARZ CIA LTDA/Contabilidad/file.xlsx
 *                                     ^^^^^^^^^^^^^^^^
 *                                     This is the company (client folder)
 *
 * Priority:
 *  1. First folder after "Shared Documents" in parentReference.path
 *  2. First segment after /root:/ (OneDrive drive-relative)
 *  3. driveCompanyMap (site name fallback)
 *  4. 'Empresa desconocida'
 */
function extractCompany(driveId, item) {
    const rawPath = item.parentReference?.path || '';

    if (rawPath) {
        const decoded = decodeURIComponent(rawPath);

        // ── Primary: folder right after "Shared Documents" ──
        const sharedDocsMatch = decoded.match(/Shared Documents\/([^/]+)/i);
        if (sharedDocsMatch) {
            const segment = sharedDocsMatch[1].trim();
            if (segment) return segment;
        }

        // ── Secondary: first segment after /root:/ (OneDrive personal) ──
        const afterRoot = decoded.split(/\/root:\//i)[1];
        if (afterRoot) {
            const first = afterRoot.split('/').filter(Boolean)[0];
            if (first && first !== 'root') return first.trim();
        }
    }

    // ── Tertiary: site name from discovery (generic fallback) ──
    const fromMap = driveCompanyMap.get(driveId);
    if (fromMap) return fromMap;

    return 'Empresa desconocida';
}


// ─── Audit Logging ────────────────────────────────────────────────────────────

async function logToAudit(event) {
    try {
        const actionMap = {
            CREATED: 'AUTO_CREATE',
            MODIFIED: 'AUTO_MODIFY',
            DELETED: 'AUTO_DELETE',
            RENAMED: 'AUTO_RENAME',
            MOVED: 'AUTO_MOVE',
        };

        await supabaseAdmin.from('audit_logs').insert([{
            action_type: actionMap[event.action] || 'AUTO_CHANGE',
            file_name: event.fileName,
            file_path: event.filePath || '/',
            worker_name: event.user,
            company_name: event.company,
            timestamp: event.date || new Date().toISOString(),
            metadata: {
                driveId: event.driveId,
                fileId: event.fileId,
                changeType: event.action,
                eTag: event.eTag,
                webUrl: event.webUrl,
                automatic: true,
            },
        }]);
    } catch (err) {
        console.warn('[Graph] Could not log to audit_logs:', err.message);
    }
}

// ─── Core Delta Scan ──────────────────────────────────────────────────────────

/**
 * Run a delta scan for a single drive.
 * @param {string} driveId
 * @param {string} [companyOverride] - If provided, skips map lookup.
 * @returns {Promise<number>} Number of events emitted.
 */
export async function runDeltaScanForDrive(driveId, companyOverride) {
    const token = await getAppToken();

    const company = companyOverride || driveCompanyMap.get(driveId) || 'Empresa desconocida';
    const selectFields = 'id,name,lastModifiedDateTime,lastModifiedBy,createdBy,eTag,cTag,file,folder,parentReference,deleted,webUrl';

    // ── First-time initialization guard (Serverless Safe) ─────────────────
    let storedToken = await loadDeltaToken(driveId);

    if (!storedToken) {
        console.log(`[Graph] Drive ${driveId.slice(0, 12)}... — no stored deltaLink, building silent baseline.`);
        await buildBaseline(driveId, company, token, selectFields);
        return 0; // No events emitted on initialization
    }

    const baseUrl = 'https://graph.microsoft.com/v1.0';
    const startUrl = storedToken;

    let result = await fetchDeltaPages(startUrl, token);

    // Handle expired delta token
    if (result === 'RESET') {
        await saveDeltaToken(driveId, null);
        // Rebuild baseline silently
        await buildBaseline(driveId, company, token, selectFields);
        return 0;
    }

    if (!result) return 0;

    const { items, deltaLink } = result;
    let eventsEmitted = 0;

    if (items.length === 0) {
        if (deltaLink) await saveDeltaToken(driveId, deltaLink);
        return 0;
    }

    // ── Load specific items from baseline (Stateless Serverless implementation) ──
    const itemIdsToCheck = items.filter(i => (!i.folder || i.deleted)).map(i => i.id);
    const fileBaseline = new Map();

    if (itemIdsToCheck.length > 0) {
        // Query Supabase for these specific IDs
        const { data } = await supabaseAdmin
            .from('file_baseline')
            .select('file_id, name, last_modified_date_time, etag, ctag, parent_path, parent_id, drive_id')
            .eq('drive_id', driveId)
            .in('file_id', itemIdsToCheck);
        
        if (data) {
            for (const row of data) {
                fileBaseline.set(row.file_id, {
                    name: row.name,
                    lastModifiedDateTime: row.last_modified_date_time,
                    eTag: row.etag,
                    cTag: row.ctag,
                    parentPath: row.parent_path,
                    parentId: row.parent_id,
                    driveId: row.drive_id,
                });
            }
        }
    }

    console.log(`[Graph] Drive ${driveId.slice(0, 12)}... — ${items.length} changed item(s).`);

    for (const item of items) {
        // Skip folders — only process files
        if (item.folder && !item.deleted) continue;

        const fileId = item.id;

        // ── DELETED ────────────────────────────────────────────────────────
        if (item.deleted) {
            const prev = fileBaseline.get(fileId);
            if (!prev) continue; // Unknown file, skip

            const event = {
                fileName: prev.name || 'Archivo desconocido',
                user: 'Desconocido',
                company,
                date: new Date().toISOString(),
                action: 'DELETED',
                filePath: prev.parentPath || '/',
                driveId,
                fileId,
            };

            await logToAudit(event);
            fileBaseline.delete(fileId);
            await deleteBaselineEntry(fileId);
            eventsEmitted++;
            continue;
        }

        const prev = fileBaseline.get(fileId);

        // Extract user
        const user =
            item.lastModifiedBy?.user?.displayName ||
            item.createdBy?.user?.displayName ||
            item.lastModifiedBy?.application?.displayName ||
            'Usuario desconocido';

        const currentPath = item.parentReference?.path
            ? decodeURIComponent(item.parentReference.path)
            : '/';

        const currentParentId = item.parentReference?.id || null;

        // ── CREATED ────────────────────────────────────────────────────────
        if (!prev) {
            const event = {
                fileName: item.name,
                user,
                company: extractCompany(driveId, item) || company,
                date: item.lastModifiedDateTime || new Date().toISOString(),
                action: 'CREATED',
                filePath: currentPath,
                driveId,
                fileId,
                eTag: item.eTag,
                webUrl: item.webUrl,
            };

            broadcastEvent(event);
            await logToAudit(event);

            const snap = {
                name: item.name,
                lastModifiedDateTime: item.lastModifiedDateTime,
                eTag: item.eTag || null,
                cTag: item.cTag || null,
                parentPath: currentPath,
                parentId: currentParentId,
                driveId,
            };
            fileBaseline.set(fileId, snap);
            await saveBaselineEntry(fileId, snap, driveId);
            eventsEmitted++;
            continue;
        }

        // ── Determine change type for known files ─────────────────────────
        const nameChanged = item.name !== prev.name;
        const parentChanged = currentParentId && prev.parentId && currentParentId !== prev.parentId;
        const dateChanged = item.lastModifiedDateTime && item.lastModifiedDateTime !== prev.lastModifiedDateTime;
        const eTagChanged = item.eTag && prev.eTag && item.eTag !== prev.eTag;
        const cTagChanged = item.cTag && prev.cTag && item.cTag !== prev.cTag;
        const contentChanged = dateChanged || eTagChanged || cTagChanged;

        let action = null;

        if (parentChanged && !nameChanged) {
            action = 'MOVED';
        } else if (nameChanged && !contentChanged) {
            action = 'RENAMED';
        } else if (contentChanged) {
            action = 'MODIFIED';
        } else if (nameChanged && contentChanged) {
            // Both renamed and modified — treat as MODIFIED
            action = 'MODIFIED';
        }

        if (action) {
            const event = {
                fileName: item.name,
                user,
                company: extractCompany(driveId, item) || company,
                date: item.lastModifiedDateTime || new Date().toISOString(),
                action,
                filePath: currentPath,
                driveId,
                fileId,
                eTag: item.eTag,
                webUrl: item.webUrl,
                oldName: action === 'RENAMED' ? prev.name : undefined,
                oldPath: action === 'MOVED' ? prev.parentPath : undefined,
            };

            await logToAudit(event);
            eventsEmitted++;
        }

        // Update baseline
        const snap = {
            name: item.name,
            lastModifiedDateTime: item.lastModifiedDateTime,
            eTag: item.eTag || null,
            cTag: item.cTag || null,
            parentPath: currentPath,
            parentId: currentParentId,
            driveId,
        };
        fileBaseline.set(fileId, snap);
        await saveBaselineEntry(fileId, snap, driveId);
    }

    if (deltaLink) await saveDeltaToken(driveId, deltaLink);

    console.log(`[Graph] Drive ${driveId.slice(0, 12)}... — ${eventsEmitted} event(s) emitted.`);
    return eventsEmitted;
}

/**
 * Build a silent baseline for a drive (used after reset or first run).
 * No events are emitted.
 */
async function buildBaseline(driveId, company, token, selectFields) {
    console.log(`[Graph] Building baseline for drive ${driveId.slice(0, 12)}...`);
    const url = `https://graph.microsoft.com/v1.0/drives/${driveId}/root/delta?$select=${selectFields}`;
    const result = await fetchDeltaPages(url, token);
    if (!result || result === 'RESET') return;

    const { items, deltaLink } = result;

    for (const item of items) {
        if (item.deleted || item.folder) continue;
        const snap = {
            name: item.name,
            lastModifiedDateTime: item.lastModifiedDateTime,
            eTag: item.eTag || null,
            cTag: item.cTag || null,
            parentPath: item.parentReference?.path ? decodeURIComponent(item.parentReference.path) : '/',
            parentId: item.parentReference?.id || null,
            driveId,
        };
        await saveBaselineEntry(item.id, snap, driveId);
    }

    if (deltaLink) await saveDeltaToken(driveId, deltaLink);
    console.log(`[Graph] Baseline complete.`);
}

/**
 * Discover all drives and run a delta scan on each one.
 * Call this from the webhook handler or the manual /api/graph/delta endpoint.
 * @returns {Promise<{ drives: number, eventsEmitted: number }>}
 */
export async function runDeltaScanAllDrives() {
    const drives = await discoverAllDrives();
    let totalEvents = 0;

    for (const { driveId, companyName } of drives) {
        try {
            const n = await runDeltaScanForDrive(driveId, companyName);
            totalEvents += n;
        } catch (err) {
            console.error(`[Graph] Scan failed for drive ${driveId.slice(0, 12)}...: ${err.message}`);
        }
    }

    return { drives: drives.length, eventsEmitted: totalEvents };
}
