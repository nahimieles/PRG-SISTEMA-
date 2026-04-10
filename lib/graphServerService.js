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
 *  5. Persist delta tokens + file baseline in Supabase (notifications flow via Supabase Realtime).
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
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.warn('[Graph] ⚠️  SUPABASE_SERVICE_ROLE_KEY is not set! Using anon key as fallback. Inserts to audit_logs may fail due to RLS policies.');
}

// ─── Module-Level Cache ───────────────────────────────────────────────────────

/** @type {{ token: string, expiresAt: number } | null} */
let _appTokenCache = null;

/**
 * Map of driveId → site/company name.
 * Populated by discoverAllDrives().
 * @type {Map<string, string>}
 */
export const driveCompanyMap = new Map();

/** Scan lock to prevent concurrent scans */
let _scanLock = false;

/** Cached drive list with TTL */
let _cachedDrives = null;
let _cachedDrivesAt = 0;
const DRIVE_CACHE_TTL = 10 * 60 * 1000; // 10 minutes

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
        cache: 'no-store',
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
        cache: 'no-store',
    });

    if (res.status === 401) {
        // Invalidate token and retry once
        _appTokenCache = null;
        const newToken = await getAppToken();
        const retry = await fetch(url, {
            headers: { Authorization: `Bearer ${newToken}` },
            cache: 'no-store',
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
        // Skip system/utility sites that don't contain client work
        const nameLower = companyName.toLowerCase();
        if (nameLower.includes('aplicaciones') || nameLower.includes('communication') || 
            nameLower.includes('sitio de grupo') || nameLower.includes('sitio de comunicación') ||
            nameLower.includes('group for answers') || nameLower.includes('do not delete')) continue;

        try {
            const drivesData = await graphGet(
                `/sites/${site.id}/drives?$select=id,name,driveType`,
                token
            );
            if (!drivesData?.value) continue;

            for (const drive of drivesData.value) {
                // Only document libraries (not personal drives)
                if (drive.driveType === 'personal') continue;
                // Skip non-document drives that waste API calls
                const driveName = (drive.name || '').toLowerCase();
                if (driveName.includes('wiki') || driveName.includes('aplicaciones') || driveName.includes('activos de lado')) continue;
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
        console.error('[Graph] FAILED to save delta token for', driveId.slice(0, 12), ':', err.message);
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
    } catch (err) {
        console.error('[Graph] FAILED to save baseline for file', fileId.slice(0, 12), ':', err.message);
    }
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
            cache: 'no-store',
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


// ─── System Name Filter ──────────────────────────────────────────────────────

const SYSTEM_NAMES = new Set([
    'SharePoint Online Client Extensibility',
    'SharePointOnline ClientExtensibility',
    'Microsoft Office',
    'MicrosoftOffice',
    'PushChannel',
    'System',
    'Sistema',
    'app@sharepoint',
    'SharePoint App',
    'OneDrive',
]);

function isSystemName(name) {
    if (!name) return true;
    const lowerName = name.toLowerCase();
    // Use exact matches or common system prefixes for more precision
    for (const sysName of SYSTEM_NAMES) {
        const sysLower = sysName.toLowerCase();
        if (lowerName === sysLower || lowerName.startsWith(sysLower + ' ')) return true;
    }
    // Specific check for internal service names
    if (lowerName.includes('system') && lowerName.length < 10) return true;
    return false;
}

/**
 * Extract the real human user from a Graph DriveItem.
 * Filters out system/application names and uses email as fallback.
 */
function extractUser(item) {
    // Priority 1: Real human user who last modified
    const modUser = item.lastModifiedBy?.user?.displayName;
    if (modUser && !isSystemName(modUser)) return modUser;

    // Priority 2: Real human user who created the file
    const createUser = item.createdBy?.user?.displayName;
    if (createUser && !isSystemName(createUser)) return createUser;

    // Priority 3: Email-based fallback
    const email = item.lastModifiedBy?.user?.email || item.createdBy?.user?.email;
    if (email && !email.includes('sharepoint') && !email.includes('system')) {
        // 'maria.fernandez@company.com' → 'Maria Fernandez'
        const localPart = email.split('@')[0];
        return localPart.split(/[._-]/).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    }

    // Priority 4: Application name (only if it looks like a person)
    const appName = item.lastModifiedBy?.application?.displayName;
    if (appName && !isSystemName(appName)) return appName;

    return null; // Will be resolved by caller
}

/**
 * Safe wrapper for decodeURIComponent — some SharePoint paths contain
 * invalid percent-encoding (e.g. unescaped % characters) which causes
 * "URI malformed" errors. This catches those and returns the raw path.
 */
function safeDecodeURI(str) {
    if (!str) return '/';
    try {
        return decodeURIComponent(str);
    } catch {
        // Return the raw string if decoding fails
        return str;
    }
}

/**
 * Fetch the full metadata for a single item to get the real user.
 * Used as last resort when delta doesn't include user info.
 */
async function fetchItemUser(driveId, fileId) {
    try {
        const token = await getAppToken();
        const url = `https://graph.microsoft.com/v1.0/drives/${driveId}/items/${fileId}?$select=lastModifiedBy,createdBy`;
        const res = await fetch(url, {
            headers: { Authorization: `Bearer ${token}` },
            cache: 'no-store',
        });
        if (!res.ok) return 'Usuario desconocido';
        const data = await res.json();
        return extractUser(data) || 'Usuario desconocido';
    } catch {
        return 'Usuario desconocido';
    }
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

        const insertPayload = {
            action_type: actionMap[event.action] || 'AUTO_CHANGE',
            file_name: event.fileName,
            file_path: event.filePath || '/',
            worker_name: event.user,
            company_name: event.company,
            // prioritizes the real file modification time from SharePoint.
            timestamp: event.date || new Date().toISOString(), 
            metadata: {
                driveId: event.driveId,
                fileId: event.fileId,
                changeType: event.action,
                eTag: event.eTag,
                webUrl: event.webUrl,
                automatic: true,
                // Store the original file modification date as reference
                fileModifiedDate: event.date,
            },
        };

        const { data, error } = await supabaseAdmin.from('audit_logs').insert([insertPayload]).select();

        if (error) {
            console.error('[Graph] INSERT to audit_logs FAILED:', {
                message: error.message,
                details: error.details,
                hint: error.hint,
                code: error.code,
                event: event.fileName,
            });
            return false;
        }

        console.log(`[Graph] ✓ Logged: ${event.action} "${event.fileName}" by ${event.user}`);
        return true;
    } catch (err) {
        console.error('[Graph] EXCEPTION logging to audit_logs:', err.message);
        return false;
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

            // Try to get the last editor from the baseline's stored user,
            // or fall back to fetching from Graph if it was a known file.
            const deletedByUser = prev.lastModifiedBy || await fetchItemUser(driveId, fileId);

            const event = {
                fileName: prev.name || 'Archivo desconocido',
                user: deletedByUser,
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

        // Extract user — filter system names and use email fallback
        let user = extractUser(item);
        if (!user) {
            // Last resort: fetch the full item from Graph to get the real user
            user = await fetchItemUser(driveId, fileId);
        }

        const currentPath = item.parentReference?.path
            ? safeDecodeURI(item.parentReference.path)
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

            await logToAudit(event);

            const snap = {
                name: item.name,
                lastModifiedDateTime: item.lastModifiedDateTime,
                eTag: item.eTag || null,
                cTag: item.cTag || null,
                parentPath: currentPath,
                parentId: currentParentId,
                lastModifiedBy: user,
                driveId,
            };
            fileBaseline.set(fileId, snap);
            await saveBaselineEntry(fileId, snap, driveId);
            eventsEmitted++;
            continue;
        }

        // ── Determine change type for known files ─────────────────────────
        // IMPORTANT: The Delta API ONLY returns items that actually changed.
        // If an item appears here, it HAS changed — we should always log it.
        const nameChanged = item.name !== prev.name;
        const parentChanged = currentParentId && prev.parentId && currentParentId !== prev.parentId;

        let action;

        if (parentChanged && !nameChanged) {
            action = 'MOVED';
        } else if (nameChanged && item.lastModifiedDateTime === prev.lastModifiedDateTime) {
            action = 'RENAMED';
        } else {
            action = 'MODIFIED';
        }

        console.log(`[Graph]   Detected ${action}: "${item.name}" by ${user}`);

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

        // Update baseline
        const snap = {
            name: item.name,
            lastModifiedDateTime: item.lastModifiedDateTime,
            eTag: item.eTag || null,
            cTag: item.cTag || null,
            parentPath: currentPath,
            parentId: currentParentId,
            lastModifiedBy: user,
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

    const bulkPayloads = items
        .filter(item => !item.deleted && !item.folder)
        .map(item => {
            try {
                return {
                    file_id: item.id,
                    drive_id: driveId,
                    name: item.name,
                    last_modified_date_time: item.lastModifiedDateTime,
                    etag: item.eTag || null,
                    ctag: item.cTag || null,
                    parent_path: item.parentReference?.path ? safeDecodeURI(item.parentReference.path) : '/',
                    parent_id: item.parentReference?.id || null,
                    updated_at: new Date().toISOString()
                };
            } catch (err) {
                console.warn(`[Graph] Skipping item ${item.id} in baseline due to: ${err.message}`);
                return null;
            }
        })
        .filter(Boolean);

    // Insert in batches of 1000 to avoid Supabase payload limits
    const BATCH_SIZE = 1000;
    for (let i = 0; i < bulkPayloads.length; i += BATCH_SIZE) {
        const batch = bulkPayloads.slice(i, i + BATCH_SIZE);
        try {
            await supabaseAdmin.from('file_baseline').upsert(batch, { onConflict: 'file_id' });
        } catch (err) {
            console.error(`[Graph] Failed bulk insert in baseline for ${driveId.slice(0, 12)}:`, err.message);
        }
    }

    if (deltaLink) await saveDeltaToken(driveId, deltaLink);
    console.log(`[Graph] Baseline complete for ${driveId.slice(0, 12)}... inserted ${bulkPayloads.length} items.`);
}

/**
 * Discover all drives and run a delta scan on each one.
 * Call this from the webhook handler or the manual /api/graph/delta endpoint.
 * @returns {Promise<{ drives: number, eventsEmitted: number }>}
 */
export async function runDeltaScanAllDrives() {
    // Prevent concurrent scans
    if (_scanLock) {
        console.log('[Graph] Scan already in progress, skipping.');
        return { drives: 0, eventsEmitted: 0, skipped: true };
    }
    _scanLock = true;

    try {
        // Use cached drives if available
        let drives;
        if (_cachedDrives && (Date.now() - _cachedDrivesAt) < DRIVE_CACHE_TTL) {
            drives = _cachedDrives;
            console.log(`[Graph] Using cached drive list (${drives.length} drives).`);
        } else {
            drives = await discoverAllDrives();
            _cachedDrives = drives;
            _cachedDrivesAt = Date.now();
        }

        let totalEvents = 0;

        // Separate drives into those with tokens (fast) and those needing baseline (slow)
        const withTokens = [];
        const needBaseline = [];

        for (const drive of drives) {
            const token = await loadDeltaToken(drive.driveId);
            if (token) {
                withTokens.push(drive);
            } else {
                needBaseline.push(drive);
            }
        }

        console.log(`[Graph] Drives with token: ${withTokens.length}, needing baseline: ${needBaseline.length}`);

        // Process drives WITH tokens first (these are fast - only delta changes)
        for (const { driveId, companyName } of withTokens) {
            try {
                const n = await runDeltaScanForDrive(driveId, companyName);
                totalEvents += n;
            } catch (err) {
                console.error(`[Graph] Scan failed for drive ${driveId.slice(0, 12)}...: ${err.message}`);
            }
        }

        // Then process up to 2 baselines per scan (to avoid throttling)
        const baselineBatch = needBaseline.slice(0, 2);
        if (baselineBatch.length > 0) {
            console.log(`[Graph] Building baseline for ${baselineBatch.length} of ${needBaseline.length} remaining drives.`);
        }
        for (const { driveId, companyName } of baselineBatch) {
            try {
                const n = await runDeltaScanForDrive(driveId, companyName);
                totalEvents += n;
            } catch (err) {
                console.error(`[Graph] Baseline failed for drive ${driveId.slice(0, 12)}...: ${err.message}`);
            }
        }

        return { drives: drives.length, eventsEmitted: totalEvents };
    } finally {
        _scanLock = false;
    }
}

/**
 * ─── Webhook Subscription Management (Push Notifications) ────────────────────
 */

/**
 * Ensures all discovered drives have an active Graph subscription.
 * Call this from the delta scan endpoint.
 */
export async function manageGraphSubscriptions() {
    try {
        const drives = await discoverAllDrives();
        const token = await getAppToken();
        // Ensure the APP_URL is correctly formatted with https://
        let baseUrl = appUrl.trim();
        if (!baseUrl.startsWith('http')) {
            baseUrl = `https://${baseUrl}`;
        }
        // Remove trailing slash if any
        baseUrl = baseUrl.replace(/\/$/, '');

        const notificationUrl = `${baseUrl}/api/webhooks/graph`;
        console.log(`[Graph] Webhook subscription manager starting. Notification URL: ${notificationUrl}`);

        // 1. Load existing subscriptions from Supabase to check expiration
        const { data: storedSubs } = await supabaseAdmin
            .from('graph_subscriptions')
            .select('*');

        const subMap = new Map(storedSubs?.map(s => [s.drive_id, s]) || []);
        const now = new Date();

        for (const drive of drives) {
            const existing = subMap.get(drive.driveId);
            
            // Renew if no subscription exists or if it expires in less than 24 hours
            const needsRefresh = !existing || (new Date(existing.expiration_date_time) < new Date(now.getTime() + 24 * 60 * 60 * 1000));

            if (needsRefresh) {
                console.log(`[Graph] ${existing ? 'Renewing' : 'Creating'} subscription for drive: ${drive.companyName}`);
                
                try {
                    const sub = await createGraphSubscription(drive.driveId, notificationUrl, token, webhookSecret);
                    
                    await supabaseAdmin.from('graph_subscriptions').upsert({
                        drive_id: drive.driveId,
                        subscription_id: sub.id,
                        expiration_date_time: sub.expirationDateTime,
                        updated_at: new Date().toISOString()
                    }, { onConflict: 'drive_id' });

                    console.log(`[Graph] ✓ Subscribed: ${drive.companyName} (Expires: ${sub.expirationDateTime})`);
                } catch (err) {
                    console.error(`[Graph] Failed to subscribe drive ${drive.driveId}:`, err.message);
                }
            }
        }
    } catch (err) {
        console.error('[Graph] manageGraphSubscriptions error:', err.message);
    }
}

async function createGraphSubscription(driveId, notificationUrl, token, webhookSecret) {
    // Max duration for driveItem subscriptions is ~4230 minutes (approx 3 days)
    const expiration = new Date();
    expiration.setDate(expiration.getDate() + 2); // 2 days is safe

    const payload = {
        changeType: 'updated',
        notificationUrl: notificationUrl,
        resource: `/drives/${driveId}/root`,
        expirationDateTime: expiration.toISOString(),
        clientState: webhookSecret || 'prgSecureState123',
    };

    const res = await fetch('https://graph.microsoft.com/v1.0/subscriptions', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
    });

    if (!res.ok) {
        const text = await res.text();
        throw new Error(`Graph Sub error ${res.status}: ${text}`);
    }

    return res.json();
}
