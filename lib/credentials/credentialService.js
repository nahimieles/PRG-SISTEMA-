
import secretProvider from './secretProvider';
import { getAllPlatformSlugs } from '../platforms/registry';

function validateSlug(plataformaSlug) {
    const validSlugs = getAllPlatformSlugs();
    if (!validSlugs.includes(plataformaSlug)) {
        throw new Error(`Plataforma desconocida: "${plataformaSlug}"`);
    }
}

function validateUUID(value, fieldName) {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!value || !uuidRegex.test(value)) {
        throw new Error(`${fieldName} inválido`);
    }
}

export async function getCredentials(empresaId, plataformaSlug) {
    validateUUID(empresaId, 'empresaId');
    validateSlug(plataformaSlug);

    return secretProvider.get(empresaId, plataformaSlug);
}

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

export async function deleteCredentials(empresaId, plataformaSlug) {
    validateUUID(empresaId, 'empresaId');
    validateSlug(plataformaSlug);

    await secretProvider.remove(empresaId, plataformaSlug);
}

export async function hasCredentials(empresaId, plataformaSlug) {
    validateUUID(empresaId, 'empresaId');
    validateSlug(plataformaSlug);

    return secretProvider.exists(empresaId, plataformaSlug);
}
