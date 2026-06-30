/**
 * lib/credentials/crypto.js
 * 
 * Cifrado AES-256-GCM para credenciales.
 * Solo debe ejecutarse del lado servidor (Server Actions / API Routes).
 * La clave maestra nunca debe almacenarse en la base de datos.
 */

import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;       // 128 bits
const AUTH_TAG_LENGTH = 16;  // 128 bits
const ENCODING = 'base64';

/**
 * Obtiene la clave maestra desde variables de entorno.
 * @returns {Buffer} Clave de 32 bytes
 * @throws {Error} Si la clave no está configurada o es inválida
 */
function getMasterKey() {
    const keyHex = process.env.ENCRYPTION_MASTER_KEY;
    if (!keyHex) {
        throw new Error('ENCRYPTION_MASTER_KEY no está configurada en las variables de entorno');
    }
    const key = Buffer.from(keyHex, 'hex');
    if (key.length !== 32) {
        throw new Error('ENCRYPTION_MASTER_KEY debe ser exactamente 32 bytes (64 caracteres hex)');
    }
    return key;
}

/**
 * Cifra un texto plano usando AES-256-GCM.
 * @param {string} plaintext - Texto a cifrar
 * @returns {{ encrypted: string, iv: string, authTag: string }} Datos cifrados en base64
 */
export function encrypt(plaintext) {
    if (!plaintext || typeof plaintext !== 'string') {
        throw new Error('El texto a cifrar debe ser un string no vacío');
    }

    const key = getMasterKey();
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH });

    let encrypted = cipher.update(plaintext, 'utf8', ENCODING);
    encrypted += cipher.final(ENCODING);

    const authTag = cipher.getAuthTag();

    return {
        encrypted,
        iv: iv.toString(ENCODING),
        authTag: authTag.toString(ENCODING),
    };
}

/**
 * Descifra datos cifrados con AES-256-GCM.
 * @param {string} encrypted - Datos cifrados (base64)
 * @param {string} iv - Vector de inicialización (base64)
 * @param {string} authTag - Tag de autenticación (base64)
 * @returns {string} Texto descifrado
 */
export function decrypt(encrypted, iv, authTag) {
    if (!encrypted || !iv || !authTag) {
        throw new Error('Se requieren encrypted, iv y authTag para descifrar');
    }

    const key = getMasterKey();
    const decipher = crypto.createDecipheriv(
        ALGORITHM,
        key,
        Buffer.from(iv, ENCODING),
        { authTagLength: AUTH_TAG_LENGTH }
    );

    decipher.setAuthTag(Buffer.from(authTag, ENCODING));

    let decrypted = decipher.update(encrypted, ENCODING, 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
}
