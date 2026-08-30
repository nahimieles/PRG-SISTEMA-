import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

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
    return EMAIL_TO_NAME[email.toLowerCase().trim()] || null;
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

    return null;
}

async function getAppToken() {
    const { GRAPH_TENANT_ID, GRAPH_CLIENT_ID, GRAPH_CLIENT_SECRET } = process.env;
    const url = `https://login.microsoftonline.com/${GRAPH_TENANT_ID}/oauth2/v2.0/token`;
    const body = new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: GRAPH_CLIENT_ID,
        client_secret: GRAPH_CLIENT_SECRET,
        scope: 'https://graph.microsoft.com/.default',
    });
    const res = await fetch(url, { method: 'POST', body });
    const json = await res.json();
    return json.access_token;
}

export async function GET() {
    try {
        const token = await getAppToken();

        const { data: logs, error } = await supabaseAdmin
            .from('audit_logs')
            .select('*')
            .in('worker_name', ['Paul Rodríguez García', 'Paul Rodriguez Garcia'])
            .order('timestamp', { ascending: false })
            .limit(10);

        if (error) throw error;

        let fixedCount = 0;
        let notFoundCount = 0;
        const updates = [];

        for (const log of logs) {
            const driveId = log.metadata?.driveId;
            const fileId = log.metadata?.fileId;

            if (!driveId || !fileId) continue;

            const url = `https://graph.microsoft.com/v1.0/drives/${driveId}/items/${fileId}?$select=lastModifiedBy,createdBy`;
            const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });

            if (!res.ok) {
                if (log.action_type === 'AUTO_DELETE' || log.action_type === 'AUTO_MODIFY') {
                    await supabaseAdmin.from('audit_logs').update({ worker_name: 'Desconocido' }).eq('id', log.id);
                    fixedCount++;
                }
                notFoundCount++;
                continue;
            }

            const item = await res.json();
            const realUser = extractUser(item) || 'Desconocido';

            updates.push({
                file: log.file_name,
                old: log.worker_name,
                new: realUser,
                graphData: item.lastModifiedBy
            });

            if (realUser !== log.worker_name) {
                await supabaseAdmin.from('audit_logs').update({ worker_name: realUser }).eq('id', log.id);
                fixedCount++;
            }
        }

        return NextResponse.json({ success: true, fixed: fixedCount, totalEvaluated: logs.length, notFoundOnGraph: notFoundCount, updates });
    } catch (e) {
        return NextResponse.json({ error: e.message });
    }
}
