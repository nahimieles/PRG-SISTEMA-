
import { getServiceSupabase } from '../supabase';
import { encrypt, decrypt } from './crypto';

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

class SupabaseSecretProvider extends SecretProvider {
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

            return null;
        }
    }

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

export default new SupabaseSecretProvider();
