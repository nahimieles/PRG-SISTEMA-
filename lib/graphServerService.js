
import { createClient } from '@supabase/supabase-js';
const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);
if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
}
let _appTokenCache = null;
export const driveCompanyMap = new Map();
let _scanLock = false;
let _cachedDrives = null;
let _cachedDrivesAt = 0;
const DRIVE_CACHE_TTL = 10 * 60 * 1000; 
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
    return _appTokenCache.token;
}
async function graphGet(path, token) {
    const url = path.startsWith('https://') ? path : `https://graph.microsoft.com/v1.0${path}`;
    const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store',
    });
    if (res.status === 401) {
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
        if (res.status === 404) return null;
        throw new Error(`[Graph] ${res.status} on ${url}: ${text.slice(0, 200)}`);
    }
    return res.json();
}
export async function discoverAllDrives() {
    const now = Date.now();
    if (_cachedDrives && _cachedDrivesAt > now - DRIVE_CACHE_TTL) {
        driveCompanyMap.clear();
        for (const d of _cachedDrives) {
            driveCompanyMap.set(d.driveId, d.companyName);
        }
        return _cachedDrives;
    }
    const token = await getAppToken();
    driveCompanyMap.clear();
    let siteUrl = 'https://graph.microsoft.com/v1.0/sites?search=*&$select=id,displayName,name,webUrl';
    const allSites = [];
    while (siteUrl) {
        const data = await graphGet(siteUrl, token);
        if (!data) break;
        allSites.push(...(data.value || []));
        siteUrl = data['@odata.nextLink'] || null;
    }
    const drives = [];
    for (const site of allSites) {
        const companyName =
            site.displayName ||
            site.name ||
            new URL(site.webUrl || 'https://unknown').hostname;
        if (!companyName || companyName.toLowerCase() === 'root') continue;
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
                if (drive.driveType === 'personal') continue;
                const driveName = (drive.name || '').toLowerCase();
                if (driveName.includes('wiki') || driveName.includes('aplicaciones') || driveName.includes('activos de lado')) continue;
                driveCompanyMap.set(drive.id, companyName);
                drives.push({ driveId: drive.id, companyName });
            }
        } catch (err) {
        }
    }
    _cachedDrives = drives;
    _cachedDrivesAt = Date.now();
    return drives;
}
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
    }
}
async function deleteBaselineEntry(fileId) {
    try {
        await supabaseAdmin.from('file_baseline').delete().eq('file_id', fileId);
    } catch {  }
}
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
            return 'RESET';
        }
        if (res.status === 401) {
            _appTokenCache = null;
            token = await getAppToken();
            continue; 
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
    const fromMap = driveCompanyMap.get(driveId);
    if (fromMap) return fromMap;
    return 'Empresa desconocida';
}
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
    for (const sysName of SYSTEM_NAMES) {
        const sysLower = sysName.toLowerCase();
        if (lowerName === sysLower || lowerName.startsWith(sysLower + ' ')) return true;
    }
    if (lowerName.includes('system') && lowerName.length < 10) return true;
    return false;
}
const EMAIL_TO_NAME = {
    'manager@prg.com.ec': 'Paul Rodríguez García',
    'account1@prg.com.ec': 'Danny Suárez',
    'administracion@prg.com.ec': 'Maria Teresa Fernández Bravo',
    'prg.audex@gmail.com': 'Eddy Campuzano',
    'audex2@prg.com.ec': 'Eddy Campuzano',
    'account3@prg.com.ec': 'Sebastián Morales',
    'account2@prg.com.ec': 'Lisbeth',
};
const DISPLAY_NAME_CORRECTIONS = {
    'Valeria Almeida': 'Eddy Campuzano',
};
function resolveEmailToName(email) {
    if (!email) return null;
    const lower = email.toLowerCase().trim();
    return EMAIL_TO_NAME[lower] || null;
}
function correctDisplayName(name) {
    if (!name) return name;
    return DISPLAY_NAME_CORRECTIONS[name] || name;
}
function extractUser(item) {
    const modEmail = item.lastModifiedBy?.user?.email;
    const mappedFromEmail = resolveEmailToName(modEmail);
    if (mappedFromEmail) return mappedFromEmail;
    const modUser = item.lastModifiedBy?.user?.displayName;
    if (modUser && !isSystemName(modUser)) return correctDisplayName(modUser);
    if (modEmail && !modEmail.includes('sharepoint') && !modEmail.includes('system')) {
        const localPart = modEmail.split('@')[0];
        return localPart.split(/[._-]/).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    }
    const appName = item.lastModifiedBy?.application?.displayName;
    if (appName && !isSystemName(appName)) return correctDisplayName(appName);
    return null; 
}
function safeDecodeURI(str) {
    if (!str) return '/';
    try {
        return decodeURIComponent(str);
    } catch {
        return str;
    }
}
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
            timestamp: event.date || new Date().toISOString(), 
            metadata: {
                driveId: event.driveId,
                fileId: event.fileId,
                changeType: event.action,
                eTag: event.eTag,
                webUrl: event.webUrl,
                automatic: true,
                fileModifiedDate: event.date,
            },
        };
        const { error } = await supabaseAdmin.from('audit_logs').insert([insertPayload]);

        if (error) {
            return false;
        }
        return true;
    } catch (err) {
        return false;
    }
}
export async function runDeltaScanForDrive(driveId, companyOverride) {
    const token = await getAppToken();
    const company = companyOverride || driveCompanyMap.get(driveId) || 'Empresa desconocida';
    const selectFields = 'id,name,lastModifiedDateTime,lastModifiedBy,createdBy,eTag,cTag,file,folder,parentReference,deleted,webUrl';
    let storedToken = await loadDeltaToken(driveId);
    if (!storedToken) {
        await buildBaseline(driveId, company, token, selectFields);
        return 0; 
    }
    const startUrl = storedToken;

    let result = await fetchDeltaPages(startUrl, token);
    if (result === 'RESET') {
        await saveDeltaToken(driveId, null);
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
    const itemIdsToCheck = items.filter(i => (!i.folder || i.deleted)).map(i => i.id);
    const fileBaseline = new Map();
    if (itemIdsToCheck.length > 0) {
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
    for (const item of items) {
        if (item.folder && !item.deleted) continue;
        const fileId = item.id;
        if (item.deleted) {
            const prev = fileBaseline.get(fileId);
            if (!prev) continue; 
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
        let user = extractUser(item);
        if (!user) {
            user = await fetchItemUser(driveId, fileId);
        }
        const currentPath = item.parentReference?.path
            ? safeDecodeURI(item.parentReference.path)
            : '/';
        const currentParentId = item.parentReference?.id || null;
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
    return eventsEmitted;
}
async function buildBaseline(driveId, company, token, selectFields) {
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
                return null;
            }
        })
        .filter(Boolean);
    const BATCH_SIZE = 1000;
    for (let i = 0; i < bulkPayloads.length; i += BATCH_SIZE) {
        const batch = bulkPayloads.slice(i, i + BATCH_SIZE);
        try {
            await supabaseAdmin.from('file_baseline').upsert(batch, { onConflict: 'file_id' });
        } catch (err) {
        }
    }
    if (deltaLink) await saveDeltaToken(driveId, deltaLink);
}
export async function runDeltaScanAllDrives() {
    if (_scanLock) {
        return { drives: 0, eventsEmitted: 0, skipped: true };
    }
    _scanLock = true;
    try {
        let drives;
        if (_cachedDrives && (Date.now() - _cachedDrivesAt) < DRIVE_CACHE_TTL) {
            drives = _cachedDrives;
        } else {
            drives = await discoverAllDrives();
            _cachedDrives = drives;
            _cachedDrivesAt = Date.now();
        }
        let totalEvents = 0;
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
        for (const { driveId, companyName } of withTokens) {
            try {
                const n = await runDeltaScanForDrive(driveId, companyName);
                totalEvents += n;
            } catch (err) {
            }
        }
        const baselineBatch = needBaseline.slice(0, 2);
        if (baselineBatch.length > 0) {
        }
        for (const { driveId, companyName } of baselineBatch) {
            try {
                const n = await runDeltaScanForDrive(driveId, companyName);
                totalEvents += n;
            } catch (err) {
            }
        }
        return { drives: drives.length, eventsEmitted: totalEvents };
    } finally {
        _scanLock = false;
    }
}
export async function manageGraphSubscriptions() {
    try {
        const drives = await discoverAllDrives();
        const token = await getAppToken();
        const appUrl = process.env.APP_URL || '';
        const webhookSecret = process.env.GRAPH_WEBHOOK_SECRET;
        if (!appUrl) {
            return;
        }
        // Ensure the APP_URL is correctly formatted with https://
        let baseUrl = appUrl.trim();
        if (!baseUrl.startsWith('http')) {
            baseUrl = `https://${baseUrl}`;
        }
        baseUrl = baseUrl.replace(/\/$/, '');
        const notificationUrl = `${baseUrl}/api/webhooks/graph`;
        // 1. Load existing subscriptions from Supabase to check expiration
        const { data: storedSubs } = await supabaseAdmin
            .from('graph_subscriptions')
            .select('*');
        const subMap = new Map(storedSubs?.map(s => [s.drive_id, s]) || []);
        const now = new Date();
        for (const drive of drives) {
            const existing = subMap.get(drive.driveId);

            const needsRefresh = !existing || (new Date(existing.expiration_date_time) < new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000));

            if (needsRefresh) {

                try {
                    const sub = existing?.subscription_id
                        ? await renewGraphSubscription(existing.subscription_id, token)
                        : await createGraphSubscription(drive.driveId, notificationUrl, token, webhookSecret);

                    await supabaseAdmin.from('graph_subscriptions').upsert({
                        drive_id: drive.driveId,
                        subscription_id: sub.id,
                        expiration_date_time: sub.expirationDateTime,
                        updated_at: new Date().toISOString()
                    }, { onConflict: 'drive_id' });
                } catch (err) {
                    if (existing?.subscription_id) {

                        try {
                            const sub = await createGraphSubscription(drive.driveId, notificationUrl, token, webhookSecret);
                            await supabaseAdmin.from('graph_subscriptions').upsert({
                                drive_id: drive.driveId,
                                subscription_id: sub.id,
                                expiration_date_time: sub.expirationDateTime,
                                updated_at: new Date().toISOString()
                            }, { onConflict: 'drive_id' });

                        } catch (createErr) {

                        }
                    } else {

                    }
                }
            }
        }
    } catch (err) {
    }
}

function getGraphSubscriptionExpiration() {
    const expiration = new Date();
    expiration.setDate(expiration.getDate() + 27);
    return expiration.toISOString();
}

async function renewGraphSubscription(subscriptionId, token) {
    const res = await fetch(`https://graph.microsoft.com/v1.0/subscriptions/${subscriptionId}`, {
        method: 'PATCH',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            expirationDateTime: getGraphSubscriptionExpiration()
        })
    });

    if (!res.ok) {
        const text = await res.text();
        throw new Error(`Graph Sub renew error ${res.status}: ${text}`);
    }

    return res.json();
}

async function createGraphSubscription(driveId, notificationUrl, token, webhookSecret) {
    const payload = {
        changeType: 'updated',
        notificationUrl: notificationUrl,
        resource: `/drives/${driveId}/root`,
        expirationDateTime: getGraphSubscriptionExpiration(),
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
