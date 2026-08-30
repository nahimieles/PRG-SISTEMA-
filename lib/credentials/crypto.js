
import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;       
const AUTH_TAG_LENGTH = 16;  
const ENCODING = 'base64';

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
