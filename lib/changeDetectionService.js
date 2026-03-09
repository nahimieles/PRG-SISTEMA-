/**
 * OneDrive / SharePoint Change Detection Service
 *
 * Architecture:
 *  1. Uses Microsoft Graph Delta Queries for efficient, incremental change detection.
 *  2. Delta tokens are persisted in localStorage (client-side, no extra DB table needed).
 *     Falls back to Supabase if available.
 *  3. A separate in-memory baseline (also seeded from localStorage) tracks the last
 *     known state of every file so we can distinguish CREATE vs MODIFY vs RENAME vs DELETE.
 *  4. On every scan the access token is refreshed silently via MSAL before the request.
 */

import { supabase } from './supabase';
import { logAuditAction } from './audit';

// ─── Module State ─────────────────────────────────────────────────────────────

let pollingInterval = null;

/**
 * Baseline: fileId → { name, lastModifiedDateTime, eTag, cTag }
 * Loaded from / saved to localStorage so it survives page refreshes.
 */
let fileBaseline = new Map();

// ─── Helpers ──────────────────────────────────────────────────────────────────

const normalize = (str) =>
    str ? str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim() : "";

/**
 * Extract the company name from a SharePoint parentReference.path.
 *
 * Real SharePoint path structure:
 *   /drives/b!xxx/root:/EMPRESA/subfolder         (drive-relative, folder is company)
 *   /sites/SITE/Shared Documents/EMPRESA/subf...  (site-relative)
 *
 * For site-relative paths we take the first segment AFTER "Shared Documents".
 * For drive-relative paths (/root:/) we take the first segment after the root.
 *
 * @param {string} rawPath - parentReference.path from Graph API
 * @returns {string}
 */
function extractCompanyFromPath(rawPath) {
    if (!rawPath) return 'Sin empresa';
    const decoded = decodeURIComponent(rawPath);

    // Site-relative: /sites/.../Shared Documents/EMPRESA/...
    // Also handles: /Shared Documents/EMPRESA/...
    const sharedDocsMatch = decoded.match(/Shared Documents\/([^/]+)/i);
    if (sharedDocsMatch) {
        const segment = sharedDocsMatch[1].trim();
        return segment || 'Sin empresa';
    }

    // Drive-relative on OneDrive: /drives/xxx/root:/EMPRESA/...
    const afterRoot = decoded.split(/\/root:\//i)[1];
    if (afterRoot) {
        const first = afterRoot.split('/').filter(Boolean)[0];
        if (first) return first.trim();
    }

    return 'Sin empresa';
}

const GRAPH_SCOPES = ["Files.ReadWrite.All", "Sites.Read.All"];

// ─── Local Persistence (localStorage + optional Supabase fallback) ─────────────


function lsKey(driveId, suffix) {
    return `cds_${driveId}_${suffix}`;
}

function loadDeltaTokenSync(driveId) {
    try { return localStorage.getItem(lsKey(driveId, 'delta')) || null; } catch { return null; }
}

function saveDeltaTokenSync(driveId, token) {
    try {
        if (token) localStorage.setItem(lsKey(driveId, 'delta'), token);
        else localStorage.removeItem(lsKey(driveId, 'delta'));
    } catch { /* storage full or unavailable */ }
}

function loadBaselineSync(driveId) {
    try {
        const raw = localStorage.getItem(lsKey(driveId, 'baseline'));
        if (!raw) return new Map();
        return new Map(JSON.parse(raw));
    } catch { return new Map(); }
}

function saveBaselineSync(driveId, map) {
    try {
        localStorage.setItem(lsKey(driveId, 'baseline'), JSON.stringify([...map.entries()]));
    } catch { /* storage full */ }
}

// Async Supabase copy (best-effort, doesn't block scans)
async function syncDeltaTokenToSupabase(driveId, token) {
    try {
        await supabase.from('drive_delta_tokens').upsert(
            { drive_id: driveId, delta_link: token, updated_at: new Date().toISOString() },
            { onConflict: 'drive_id' }
        );
    } catch { /* table may not exist */ }
}

// ─── MSAL Token Acquisition ───────────────────────────────────────────────────

async function getAccessToken() {
    // 1. Use cached token if present (refreshed proactively by MsalWrapper every 45 min)
    const cached = typeof window !== 'undefined' ? window.__msalAccessToken : null;
    if (cached) return cached;

    // 2. Silent refresh via exported msalInstance
    try {
        const { msalInstance } = await import('@/components/MsalWrapper');
        if (!msalInstance) return null;
        const account = msalInstance.getActiveAccount();
        if (!account) return null;
        const resp = await msalInstance.acquireTokenSilent({ scopes: GRAPH_SCOPES, account });
        if (typeof window !== 'undefined') window.__msalAccessToken = resp.accessToken;
        return resp.accessToken;
    } catch {
        return null;
    }
}

async function getAccessTokenForce() {
    // Force a fresh token (call this after a 401)
    if (typeof window !== 'undefined') window.__msalAccessToken = null;
    return getAccessToken();
}

// ─── Microsoft Graph Delta Fetch ──────────────────────────────────────────────

async function graphFetch(url, accessToken) {
    return fetch(url, {
        headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
        }
    });
}

async function fetchDeltaPages(startUrl) {
    let allItems = [];
    let finalDeltaLink = null;
    let url = startUrl;
    let token = await getAccessToken();

    if (!token) {
        console.warn('[ChangeDetection] No access token available — scan skipped.');
        return null; // Signal: can't scan
    }

    let retriedAfter401 = false;

    while (url) {
        let res = await graphFetch(url, token);

        // Auto-refresh on 401 once per request chain
        if (res.status === 401 && !retriedAfter401) {
            console.warn('[ChangeDetection] 401 — silently refreshing token...');
            token = await getAccessTokenForce();
            if (!token) return null;
            retriedAfter401 = true;
            res = await graphFetch(url, token); // Retry with new token
        }

        if (!res.ok) {
            const body = await res.text();
            if (res.status === 410) {
                // deltaLink expired — caller must do a fresh full scan
                console.warn('[ChangeDetection] Delta link expired (410) — resetting.');
                return 'RESET';
            }
            throw new Error(`Graph API ${res.status}: ${body.slice(0, 200)}`);
        }

        const json = await res.json();
        allItems = allItems.concat(json.value || []);

        if (json['@odata.nextLink']) {
            url = json['@odata.nextLink'];
            retriedAfter401 = false;
        } else {
            finalDeltaLink = json['@odata.deltaLink'] || null;
            url = null;
        }
    }

    return { items: allItems, deltaLink: finalDeltaLink };
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Start the change detection polling loop.
 * @param {string} driveId          - OneDrive / SharePoint drive ID to monitor
 * @param {number} intervalMinutes  - How often to poll (default: 5 minutes)
 */
export async function initializeChangeDetection(driveId, intervalMinutes = 5) {
    if (pollingInterval) return; // Already running

    console.log(`[ChangeDetection] Starting for drive ${driveId} every ${intervalMinutes} min.`);

    // Load persisted baseline from localStorage
    fileBaseline = loadBaselineSync(driveId);
    const hasBaseline = fileBaseline.size > 0;

    if (!hasBaseline) {
        // First ever run: do a silent full scan to establish baseline, no logging
        await doBaselineScan(driveId);
    }

    // Start polling loop
    pollingInterval = setInterval(() => scanForChanges(driveId), intervalMinutes * 60 * 1000);

    // Also run one scan right away after baseline
    if (hasBaseline) {
        await scanForChanges(driveId);
    }
}

export function stopChangeDetection() {
    if (pollingInterval) {
        clearInterval(pollingInterval);
        pollingInterval = null;
        console.log('[ChangeDetection] Stopped.');
    }
}

export async function triggerManualScan(driveId) {
    console.log('[ChangeDetection] Manual scan triggered.');
    await scanForChanges(driveId);
}

export function resetDeltaAndBaseline(driveId) {
    saveDeltaTokenSync(driveId, null);
    saveBaselineSync(driveId, new Map());
    fileBaseline.clear();
    console.log('[ChangeDetection] Reset complete. Next start will rebuild from scratch.');
}

// ─── Baseline Scan (silent, no audit logging) ─────────────────────────────────

async function doBaselineScan(driveId) {
    console.log('[ChangeDetection] Building initial baseline (silent)...');
    const baseUrl = 'https://graph.microsoft.com/v1.0';
    const deltaUrl = `${baseUrl}/drives/${driveId}/root/delta` +
        `?$select=id,name,lastModifiedDateTime,lastModifiedBy,eTag,cTag,file,folder,parentReference,deleted`;

    const result = await fetchDeltaPages(deltaUrl);
    if (!result || result === 'RESET') return;

    const { items, deltaLink } = result;

    fileBaseline.clear();
    for (const item of items) {
        if (!item.deleted) {
            fileBaseline.set(item.id, {
                name: item.name,
                lastModifiedDateTime: item.lastModifiedDateTime,
                eTag: item.eTag || null,
                cTag: item.cTag || null
            });
        }
    }

    saveDeltaTokenSync(driveId, deltaLink);
    saveBaselineSync(driveId, fileBaseline);
    if (deltaLink) syncDeltaTokenToSupabase(driveId, deltaLink);

    console.log(`[ChangeDetection] Baseline: ${fileBaseline.size} files catalogued.`);
}

// ─── Change Scan ──────────────────────────────────────────────────────────────

async function scanForChanges(driveId) {
    const storedToken = loadDeltaTokenSync(driveId);

    if (!storedToken) {
        // No delta token means baseline scan never completed — retry it
        await doBaselineScan(driveId);
        return;
    }

    let result = await fetchDeltaPages(storedToken);

    // If delta expired (410) do a full reset and rebuild
    if (result === 'RESET') {
        saveDeltaTokenSync(driveId, null);
        await doBaselineScan(driveId);
        return;
    }

    if (!result) return; // No token, scan skipped

    const { items, deltaLink } = result;

    if (items.length === 0) {
        // No changes since last scan
        if (deltaLink) {
            saveDeltaTokenSync(driveId, deltaLink);
            syncDeltaTokenToSupabase(driveId, deltaLink);
        }
        return;
    }

    console.log(`[ChangeDetection] ${items.length} changed item(s) since last scan.`);

    // Load correlation data (Supabase client is not a standard Promise — never use .catch() directly)
    const { data: workersData, error: workersError } = await supabase.from('workers').select('id, full_name');
    const { data: companiesData, error: companiesError } = await supabase.from('companies').select('id, name');
    const workers = workersError || !Array.isArray(workersData) ? [] : workersData;
    const companies = companiesError || !Array.isArray(companiesData) ? [] : companiesData;

    for (const item of items) {
        if (item.deleted) {
            if (fileBaseline.has(item.id)) {
                const prev = fileBaseline.get(item.id);
                await logChange('DELETE', { ...item, name: item.name || prev.name }, driveId, workers, companies);
                fileBaseline.delete(item.id);
            }
            continue;
        }

        const prev = fileBaseline.get(item.id);

        if (!prev) {
            // Never seen this file — it's new
            await logChange('CREATE', item, driveId, workers, companies);
            fileBaseline.set(item.id, snapshot(item));
        } else {
            // Known file — check for real changes
            const dateChanged = item.lastModifiedDateTime && item.lastModifiedDateTime !== prev.lastModifiedDateTime;
            const eTagChanged = item.eTag && prev.eTag && item.eTag !== prev.eTag;
            const cTagChanged = item.cTag && prev.cTag && item.cTag !== prev.cTag;
            const nameChanged = item.name !== prev.name;

            if (dateChanged || eTagChanged || cTagChanged || nameChanged) {
                const changeType = nameChanged && !dateChanged ? 'RENAME' : 'MODIFY';
                await logChange(changeType, item, driveId, workers, companies, nameChanged ? prev.name : null);
                fileBaseline.set(item.id, snapshot(item));
            }
            // Else: item appeared in delta for a structural reason (permissions, etc.) but didn't actually change
        }
    }

    // Persist updated state
    saveDeltaTokenSync(driveId, deltaLink);
    saveBaselineSync(driveId, fileBaseline);
    if (deltaLink) syncDeltaTokenToSupabase(driveId, deltaLink);
}

function snapshot(item) {
    return {
        name: item.name,
        lastModifiedDateTime: item.lastModifiedDateTime,
        eTag: item.eTag || null,
        cTag: item.cTag || null
    };
}

// ─── Audit Logging ────────────────────────────────────────────────────────────

async function logChange(changeType, item, driveId, workers, companies, oldName = null) {
    try {
        // Resolve worker
        let workerId = null;
        let workerName = 'Sistema';
        const displayName = item.lastModifiedBy?.user?.displayName;
        if (displayName) {
            workerName = displayName;
            const match = workers.find(w => normalize(w.full_name) === normalize(displayName));
            if (match) workerId = match.id;
        }

        // Resolve company from path:
        // The real structure is: /sites/SITE/Shared Documents/EMPRESA/subfolder/file
        // So the company is the FIRST folder immediately after "Shared Documents".
        let companyName = null;
        const rawPath = item.parentReference?.path || '';
        if (rawPath) {
            companyName = extractCompanyFromPath(rawPath);
        }

        const labels = {
            CREATE: { action: 'AUTO_CREATE', desc: `Creado: ${item.name}` },
            MODIFY: { action: 'AUTO_MODIFY', desc: `Modificado: ${item.name}` },
            DELETE: { action: 'AUTO_DELETE', desc: `Eliminado: ${item.name || 'Archivo'}` },
            RENAME: { action: 'AUTO_RENAME', desc: `Renombrado: ${oldName} → ${item.name}` }
        };
        const label = labels[changeType] || { action: 'AUTO_CHANGE', desc: item.name };

        await logAuditAction({
            action_type: label.action,
            file_name: item.name || 'Desconocido',
            file_path: rawPath || '/',
            worker_id: workerId,
            worker_name: workerName,
            company_name: companyName,
            metadata: {
                driveId,
                fileId: item.id,
                changeType,
                lastModifiedDateTime: item.lastModifiedDateTime,
                eTag: item.eTag,
                oldName: oldName || undefined,
                timestamp: new Date().toISOString(),
                automatic: true,
                description: label.desc
            }
        });

        console.log(`[ChangeDetection] ✓ ${changeType}: "${item.name}" by ${workerName} [${companyName || '—'}] at ${item.lastModifiedDateTime}`);
    } catch (err) {
        console.error('[ChangeDetection] Logging error:', err.message);
    }
}
