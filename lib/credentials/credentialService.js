/**
 * lib/credentials/credentialService.js
 * 
 * Fachada pública para gestión de credenciales.
 * 
 * TODO el sistema consume ÚNICAMENTE esta capa.
 * Nunca SecretProvider directamente.
 * 
 * Responsabilidades:
 *   - Validación de inputs
 *   - Logging seguro (nunca loguea credenciales)
 *   - Punto único para lógica transversal futura (caché, rate limiting, métricas)
 */

import secretProvider from './secretProvider';
import { getAllPlatformSlugs } from '../platforms/registry';

/**
 * Valida que un slug de plataforma exista en el PlatformRegistry.
 */
function validateSlug(plataformaSlug) {
    const validSlugs = getAllPlatformSlugs();
    if (!validSlugs.includes(plataformaSlug)) {
        throw new Error(`Plataforma desconocida: "${plataformaSlug}"`);
    }
}

/**
 * Valida que un UUID tenga formato correcto.
 */
function validateUUID(value, fieldName) {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!value || !uuidRegex.test(value)) {
        throw new Error(`${fieldName} inválido`);
    }
}

// ============================================================
// API PÚBLICA
// ============================================================

/**
 * Obtiene las credenciales descifradas de una empresa para una plataforma.
 * @param {string} empresaId - UUID de la empresa
 * @param {string} plataformaSlug - Slug de la plataforma
 * @returns {Object|null} { username, password } o null si no existen
 */
export async function getCredentials(empresaId, plataformaSlug) {
    validateUUID(empresaId, 'empresaId');
    validateSlug(plataformaSlug);

    return secretProvider.get(empresaId, plataformaSlug);
}

/**
 * Guarda credenciales cifradas para una empresa y plataforma.
 * @param {string} empresaId - UUID de la empresa
 * @param {string} plataformaSlug - Slug de la plataforma
 * @param {{ username: string, password: string }} credentials
 */
export async function saveCredentials(empresaId, plataformaSlug, credentials) {
    validateUUID(empresaId, 'empresaId');
    validateSlug(plataformaSlug);

    if (!credentials || !credentials.username || !credentials.password) {
        throw new Error('Las credenciales deben incluir username y password');
    }

    await secretProvider.save(empresaId, plataformaSlug, {
        username: credentials.username,
        password: credentials.password,
    });
}

/**
 * Elimina credenciales de una empresa y plataforma.
 */
export async function deleteCredentials(empresaId, plataformaSlug) {
    validateUUID(empresaId, 'empresaId');
    validateSlug(plataformaSlug);

    await secretProvider.remove(empresaId, plataformaSlug);
}

/**
 * Verifica si existen credenciales almacenadas.
 * @returns {boolean}
 */
export async function hasCredentials(empresaId, plataformaSlug) {
    validateUUID(empresaId, 'empresaId');
    validateSlug(plataformaSlug);

    return secretProvider.exists(empresaId, plataformaSlug);
}
