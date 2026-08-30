
export const MAX_FILE_SIZE = 250 * 1024 * 1024; 
export const CHUNK_SIZE = 4 * 1024 * 1024; 
export const SMALL_FILE_THRESHOLD = 4 * 1024 * 1024; 
export const validateFile = (file, maxSize = MAX_FILE_SIZE) => {
    if (!file) {
        return { valid: false, error: "No se proporcionó archivo" };
    }
    if (file.size === 0) {
        return { valid: false, error: "El archivo está vacío" };
    }
    if (file.size > maxSize) {
        const maxSizeMB = (maxSize / 1024 / 1024).toFixed(0);
        return {
            valid: false,
            error: `El archivo es demasiado grande. Máximo: ${maxSizeMB}MB`
        };
    }
    if (!file.name || file.name.trim() === '') {
        return { valid: false, error: "El archivo no tiene nombre válido" };
    }
    // Check for potentially problematic characters
    const invalidChars = /[<>:"|?*]/;
    if (invalidChars.test(file.name)) {
        return {
            valid: false,
            error: "El nombre del archivo contiene caracteres no permitidos"
        };
    }
    return { valid: true, error: null };
};
/**
 * Create an upload session for large files
 * @param {Object} graphClient - Microsoft Graph client
 * @param {string} path - Upload path
 * @param {string} driveId - Drive ID (optional)
 * @returns {Promise<string>} - Upload URL
 */
export const createUploadSession = async (graphClient, path, driveId = null) => {
    if (!graphClient) {
        throw new Error("Graph Client not initialized");
    }
    try {
        const endpoint = driveId
            ? `/drives/${driveId}${path}:/createUploadSession`
            : `/me/drive${path}:/createUploadSession`;
        const response = await graphClient
            .api(endpoint)
            .post({
                item: {
                    "@microsoft.graph.conflictBehavior": "rename"
                }
            });
        return response.uploadUrl;
    } catch (error) {
        throw new Error(`No se pudo crear sesión de carga: ${error.message}`);
    }
};
/**
 * Upload a chunk of a file
 * @param {string} uploadUrl - Upload session URL
 * @param {Blob} chunk - File chunk to upload
 * @param {number} start - Start byte position
 * @param {number} end - End byte position
 * @param {number} total - Total file size
 * @returns {Promise<Object>} - Upload response
 */
export const uploadChunk = async (uploadUrl, chunk, start, end, total) => {
    try {
        const response = await fetch(uploadUrl, {
            method: 'PUT',
            headers: {
                'Content-Length': chunk.size.toString(),
                'Content-Range': `bytes ${start}-${end - 1}/${total}`
            },
            body: chunk
        });
        if (!response.ok) {
            throw new Error(`Error en chunk upload: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        throw error;
    }
};
export const retryOperation = async (operation, maxRetries = 3, baseDelay = 1000) => {
    let lastError;
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            return await operation();
        } catch (error) {
            lastError = error;
            if (attempt < maxRetries) {
                const delay = baseDelay * Math.pow(2, attempt);
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
    }
    throw lastError;
};
export const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
};
export const getFileExtension = (filename) => {
    if (!filename) return '';
    const parts = filename.split('.');
    return parts.length > 1 ? parts.pop().toLowerCase() : '';
};
export const isFileTypeAllowed = (filename, allowedExtensions = []) => {
    if (allowedExtensions.length === 0) return true;
    const ext = getFileExtension(filename);
    return allowedExtensions.includes(ext);
};
