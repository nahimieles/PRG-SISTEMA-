/**
 * lib/credentials/secretProvider.js
 * 
 * Abstracción para almacenamiento de secretos.
 * 
 * Arquitectura:
 *   CredentialService → SecretProvider → SupabaseSecretProvider (actual)
 *   CredentialService → SecretProvider → AzureKeyVaultProvider  (futuro)
 * 
 * El resto del sistema NUNCA debe importar este archivo directamente.
 * Todo acceso a secretos debe pasar por CredentialService.
 */

import { getServiceSupabase } from '../supabase';
import { encrypt, decrypt } from './crypto';

// ============================================================
// INTERFAZ BASE
// ============================================================

/**
 * Clase base que define la interfaz del SecretProvider.
 * Cualquier implementación nueva debe extender esta clase.
 */
class SecretProvider {
    async get(empresaId, plataformaSlug) {
        throw new Error('SecretProvider.get() no implementado');
    }

    async save(empresaId, plataformaSlug, data) {
        throw new Error('SecretProvider.save() no implementado');
    }

    async remove(empresaId, plataformaSlug) {
        throw new Error('SecretProvider.remove() no implementado');
    }

    async exists(empresaId, plataformaSlug) {
        throw new Error('SecretProvider.exists() no implementado');
    }
}

// ============================================================
// IMPLEMENTACIÓN: SUPABASE
// ============================================================

class SupabaseSecretProvider extends SecretProvider {
    /**
     * Obtiene las credenciales descifradas para una empresa y plataforma.
     * @param {string} empresaId - UUID de la empresa
     * @param {string} plataformaSlug - Slug de la plataforma
     * @returns {Object|null} { username, password } o null si no existen
     */
    async get(empresaId, plataformaSlug) {
        const db = getServiceSupabase();
        const { data, error } = await db
            .from('credenciales_plataformas')
            .select('encrypted_data, iv, auth_tag')
            .eq('empresa_id', empresaId)
            .eq('plataforma_slug', plataformaSlug)
            .single();

        if (error || !data) return null;

        try {
            const decrypted = decrypt(data.encrypted_data, data.iv, data.auth_tag);
            return JSON.parse(decrypted);
        } catch {
            // Si falla el descifrado, los datos están corruptos o la clave cambió
            return null;
        }
    }

    /**
     * Guarda credenciales cifradas.
     * @param {string} empresaId - UUID de la empresa
     * @param {string} plataformaSlug - Slug de la plataforma
     * @param {Object} credentials - { username, password }
     */
    async save(empresaId, plataformaSlug, credentials) {
        const plaintext = JSON.stringify(credentials);
        const { encrypted, iv, authTag } = encrypt(plaintext);

        const db = getServiceSupabase();
        const { error } = await db
            .from('credenciales_plataformas')
            .upsert({
                empresa_id: empresaId,
                plataforma_slug: plataformaSlug,
                encrypted_data: encrypted,
                iv: iv,
                auth_tag: authTag,
                updated_at: new Date().toISOString(),
            }, {
                onConflict: 'empresa_id,plataforma_slug',
            });

        if (error) {
            throw new Error(`Error al guardar credenciales: ${error.message}`);
        }
    }

    /**
     * Elimina credenciales de una empresa y plataforma.
     */
    async remove(empresaId, plataformaSlug) {
        const db = getServiceSupabase();
        const { error } = await db
            .from('credenciales_plataformas')
            .delete()
            .eq('empresa_id', empresaId)
            .eq('plataforma_slug', plataformaSlug);

        if (error) {
            throw new Error(`Error al eliminar credenciales: ${error.message}`);
        }
    }

    /**
     * Verifica si existen credenciales para una empresa y plataforma.
     */
    async exists(empresaId, plataformaSlug) {
        const db = getServiceSupabase();
        const { data, error } = await db
            .from('credenciales_plataformas')
            .select('id')
            .eq('empresa_id', empresaId)
            .eq('plataforma_slug', plataformaSlug)
            .single();

        return !!data && !error;
    }
}

// ============================================================
// EXPORT: Instancia del provider activo
// ============================================================

// Para migrar a Azure Key Vault:
//   1. Crear AzureKeyVaultProvider extends SecretProvider
//   2. Cambiar esta línea por: export default new AzureKeyVaultProvider();
export default new SupabaseSecretProvider();
