/**
 * lib/platforms/platformAccess.js
 * 
 * PlatformAccessService — Orquestador central de accesos a plataformas.
 * 
 * Flujo:
 *   1. Verificar permisos (usuario + empresa + plataforma)
 *   2. Resolver plataforma desde PlatformRegistry
 *   3. Crear conector y ejecutar acceso
 *   4. Registrar auditoría
 *   5. Retornar resultado
 * 
 * Este servicio solo se ejecuta del lado servidor.
 */

import { getServiceSupabase } from '../supabase';
import { getPlatform, getStandardPlatforms, getAccountingPlatform } from './registry';
import { createConnector } from './connectors/index';

// ============================================================
// PERMISOS
// ============================================================

/**
 * Verifica si un usuario tiene permiso para acceder a una plataforma
 * de una empresa específica.
 * 
 * @param {string} userId - UUID del usuario
 * @param {string} empresaId - UUID de la empresa
 * @param {string} plataformaSlug - Slug de la plataforma
 * @returns {Promise<boolean>}
 */
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

/**
 * Obtiene todos los permisos de un usuario, agrupados por empresa.
 * 
 * @param {string} userId - UUID del usuario
 * @returns {Promise<Object>} { [empresaId]: ['sri', 'iess', ...] }
 */
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

// ============================================================
// ACCESO A PLATAFORMAS
// ============================================================

/**
 * Ejecuta el acceso a una plataforma.
 * 
 * @param {string} userId - UUID del usuario
 * @param {string} empresaId - UUID de la empresa
 * @param {string} plataformaSlug - Slug de la plataforma
 * @returns {Promise<{ success: boolean, url?: string, method?: string, error?: string }>}
 */
export async function accessPlatform(userId, empresaId, plataformaSlug) {
    // 1. Verificar que la plataforma existe en el registry
    const platform = getPlatform(plataformaSlug);
    if (!platform) {
        return { success: false, error: 'Plataforma no encontrada' };
    }

    // 2. Verificar permisos
    const hasPermission = await checkPermission(userId, empresaId, plataformaSlug);
    if (!hasPermission) {
        return { success: false, error: 'No tiene permisos para acceder a esta plataforma' };
    }

    // 3. Crear conector y ejecutar acceso
    try {
        const connector = createConnector(plataformaSlug);
        const result = await connector.access({ empresaId, userId });
        return result;
    } catch (error) {
        return { success: false, error: error.message || 'Error al acceder a la plataforma' };
    }
}

// ============================================================
// AUDITORÍA
// ============================================================

/**
 * Registra un acceso a plataforma en la tabla de auditoría.
 * 
 * @param {Object} params
 * @param {string} params.userId
 * @param {string} params.empresaId
 * @param {string} params.plataformaSlug
 * @param {string} params.accion - 'abrir_url', 'login_automatico', etc.
 * @param {string} params.resultado - 'exitoso', 'fallido', 'timeout'
 * @param {string} [params.ipAddress]
 * @param {string} [params.userAgent]
 * @param {Object} [params.metadata]
 */
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
        // La auditoría no debe bloquear el flujo principal
        console.error('Error registrando auditoría de acceso:', error.message);
    }
}
