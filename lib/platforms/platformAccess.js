
import { getServiceSupabase } from '../supabase';
import { getPlatform, getStandardPlatforms, getAccountingPlatform } from './registry';
import { createConnector } from './connectors/index';
export async function checkPermission(userId, empresaId, plataformaSlug) {
    const db = getServiceSupabase();
    const { data, error } = await db
        .from('acceso_permisos')
        .select('permitido')
        .eq('usuario_id', userId)
        .eq('empresa_id', empresaId)
        .eq('plataforma_slug', plataformaSlug)
        .single();
    if (error || !data) return false;
    return data.permitido === true;
}
export async function getUserPermissions(userId) {
    const db = getServiceSupabase();
    const { data, error } = await db
        .from('acceso_permisos')
        .select('empresa_id, plataforma_slug')
        .eq('usuario_id', userId)
        .eq('permitido', true);
    if (error || !data) return {};
    const permisos = {};
    for (const row of data) {
        if (!permisos[row.empresa_id]) {
            permisos[row.empresa_id] = [];
        }
        permisos[row.empresa_id].push(row.plataforma_slug);
    }
    return permisos;
}
export async function accessPlatform(userId, empresaId, plataformaSlug, skipAutomation = false) {
    const platform = getPlatform(plataformaSlug);
    if (!platform) {
        return { success: false, error: 'Plataforma no encontrada' };
    }
    const hasPermission = await checkPermission(userId, empresaId, plataformaSlug);
    if (!hasPermission) {
        return { success: false, error: 'No tiene permisos para acceder a esta plataforma' };
    }
    try {
        const connector = createConnector(plataformaSlug);
        if (skipAutomation) {
            return { success: true, url: platform.url, method: 'manual' };
        }
        const result = await connector.access({ userId, empresaId });
        return result;
    } catch (error) {
        return { success: false, error: error.message || 'Error al acceder a la plataforma' };
    }
}
export async function logAccess({
    userId,
    empresaId,
    plataformaSlug,
    accion,
    resultado = 'exitoso',
    ipAddress = null,
    userAgent = null,
    metadata = {},
}) {
    try {
        const db = getServiceSupabase();
        await db.from('auditoria_accesos').insert([{
            usuario_id: userId,
            empresa_id: empresaId,
            plataforma_slug: plataformaSlug,
            accion,
            resultado,
            ip_address: ipAddress,
            user_agent: userAgent,
            metadata,
        }]);
    } catch (error) {
    }
}
