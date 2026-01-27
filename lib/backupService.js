"use client";
import { supabase } from './supabase';

/**
 * SharePoint Backup Service
 * Downloads all files from SharePoint sites and creates a downloadable backup
 */

// We'll import the graph client dynamically from onedriveService
// since it's initialized there

/**
 * Get all files recursively from a folder using fetch
 * @param {string} accessToken - Microsoft access token
 * @param {string} driveId - The drive ID
 * @param {string} folderId - The folder ID (defaults to 'root')
 * @param {string} path - Current path for display
 */
export const getAllFilesRecursive = async (accessToken, driveId, folderId = 'root', path = '') => {
    const files = [];

    try {
        const endpoint = `https://graph.microsoft.com/v1.0/drives/${driveId}/items/${folderId}/children?$select=id,name,folder,file,size,@microsoft.graph.downloadUrl&$top=200`;

        const response = await fetch(endpoint, {
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`API Error: ${response.status}`);
        }

        const data = await response.json();

        for (const item of data.value || []) {
            const itemPath = path ? `${path}/${item.name}` : item.name;

            if (item.folder) {
                // Recursively get files from subfolders
                const subFiles = await getAllFilesRecursive(accessToken, driveId, item.id, itemPath);
                files.push(...subFiles);
            } else if (item['@microsoft.graph.downloadUrl']) {
                files.push({
                    id: item.id,
                    name: item.name,
                    path: itemPath,
                    size: item.size,
                    downloadUrl: item['@microsoft.graph.downloadUrl']
                });
            }
        }
    } catch (error) {
        console.error(`Error fetching files from ${path}:`, error);
    }

    return files;
};

/**
 * Download a file as blob
 */
export const downloadFileAsBlob = async (url) => {
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Download failed: ${response.status}`);
        return await response.blob();
    } catch (error) {
        console.error('Error downloading file:', error);
        throw error;
    }
};

/**
 * Create a backup of all sites
 * @param {string} accessToken - Microsoft access token
 * @param {Array} sites - Array of site objects with id, displayName, driveId
 * @param {Function} onProgress - Progress callback (current, total, currentFile)
 * @returns {Promise<Blob>} - ZIP file blob
 */
export const createFullBackup = async (accessToken, sites, onProgress) => {
    // Dynamic import of JSZip (client-side only)
    const JSZip = (await import('jszip')).default;
    const zip = new JSZip();

    let totalFiles = 0;
    let processedFiles = 0;

    // First, collect all files from all sites
    const allSiteFiles = [];

    for (const site of sites) {
        if (!site.driveId) continue;

        onProgress?.(0, 0, `Escaneando ${site.displayName}...`);

        try {
            const files = await getAllFilesRecursive(accessToken, site.driveId);
            allSiteFiles.push({
                siteName: site.displayName,
                driveId: site.driveId,
                files
            });
            totalFiles += files.length;
        } catch (error) {
            console.error(`Error scanning site ${site.displayName}:`, error);
        }
    }

    if (totalFiles === 0) {
        throw new Error('No se encontraron archivos para respaldar');
    }

    // Now download files with progress
    for (const siteData of allSiteFiles) {
        const siteFolder = zip.folder(siteData.siteName.replace(/[/\\?%*:|"<>]/g, '-'));

        for (const file of siteData.files) {
            try {
                onProgress?.(processedFiles, totalFiles, file.path);

                const blob = await downloadFileAsBlob(file.downloadUrl);
                siteFolder.file(file.path, blob);

                processedFiles++;
            } catch (error) {
                console.error(`Failed to download ${file.path}:`, error);
                processedFiles++;
            }
        }
    }

    onProgress?.(totalFiles, totalFiles, 'Comprimiendo...');

    // Generate ZIP file
    const zipBlob = await zip.generateAsync({
        type: 'blob',
        compression: 'DEFLATE',
        compressionOptions: { level: 6 }
    }, (metadata) => {
        onProgress?.(totalFiles, totalFiles, `Comprimiendo... ${metadata.percent.toFixed(0)}%`);
    });

    return zipBlob;
};

/**
 * Create backup folder in OneDrive if it doesn't exist
 */
const getOrCreateBackupFolder = async (accessToken) => {
    const BACKUP_FOLDER_NAME = 'Backups_PRG';

    try {
        // First, try to get the folder
        const checkResponse = await fetch(
            `https://graph.microsoft.com/v1.0/me/drive/root:/${BACKUP_FOLDER_NAME}`,
            {
                headers: { 'Authorization': `Bearer ${accessToken}` }
            }
        );

        if (checkResponse.ok) {
            const folder = await checkResponse.json();
            return folder.id;
        }

        // Create the folder
        const createResponse = await fetch(
            'https://graph.microsoft.com/v1.0/me/drive/root/children',
            {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    name: BACKUP_FOLDER_NAME,
                    folder: {},
                    '@microsoft.graph.conflictBehavior': 'replace'
                })
            }
        );

        if (!createResponse.ok) {
            throw new Error(`Failed to create backup folder: ${createResponse.status}`);
        }

        const newFolder = await createResponse.json();
        return newFolder.id;
    } catch (error) {
        console.error('Error getting/creating backup folder:', error);
        throw error;
    }
};

/**
 * Upload backup ZIP to OneDrive
 * @param {string} accessToken - Microsoft access token
 * @param {Blob} zipBlob - The ZIP file blob
 * @param {string} filename - The filename for the backup
 * @param {Function} onProgress - Progress callback
 */
export const uploadBackupToOneDrive = async (accessToken, zipBlob, filename, onProgress) => {
    try {
        onProgress?.('Preparando subida a OneDrive...');

        // Get or create backup folder
        const folderId = await getOrCreateBackupFolder(accessToken);

        // For files smaller than 4MB, use simple upload
        if (zipBlob.size < 4 * 1024 * 1024) {
            const response = await fetch(
                `https://graph.microsoft.com/v1.0/me/drive/items/${folderId}:/${filename}:/content`,
                {
                    method: 'PUT',
                    headers: {
                        'Authorization': `Bearer ${accessToken}`,
                        'Content-Type': 'application/zip'
                    },
                    body: zipBlob
                }
            );

            if (!response.ok) {
                throw new Error(`Upload failed: ${response.status}`);
            }

            const result = await response.json();
            return result;
        }

        // For larger files, use upload session
        onProgress?.('Creando sesión de subida...');
        const sessionResponse = await fetch(
            `https://graph.microsoft.com/v1.0/me/drive/items/${folderId}:/${filename}:/createUploadSession`,
            {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    item: { '@microsoft.graph.conflictBehavior': 'replace' }
                })
            }
        );

        if (!sessionResponse.ok) {
            throw new Error(`Failed to create upload session: ${sessionResponse.status}`);
        }

        const session = await sessionResponse.json();
        const uploadUrl = session.uploadUrl;

        // Upload in chunks (10MB chunks)
        const CHUNK_SIZE = 10 * 1024 * 1024;
        const totalSize = zipBlob.size;
        let uploadedBytes = 0;

        while (uploadedBytes < totalSize) {
            const chunkEnd = Math.min(uploadedBytes + CHUNK_SIZE, totalSize);
            const chunk = zipBlob.slice(uploadedBytes, chunkEnd);

            const uploadResponse = await fetch(uploadUrl, {
                method: 'PUT',
                headers: {
                    'Content-Length': String(chunk.size),
                    'Content-Range': `bytes ${uploadedBytes}-${chunkEnd - 1}/${totalSize}`
                },
                body: chunk
            });

            if (!uploadResponse.ok && uploadResponse.status !== 202) {
                throw new Error(`Chunk upload failed: ${uploadResponse.status}`);
            }

            uploadedBytes = chunkEnd;
            const percent = Math.round((uploadedBytes / totalSize) * 100);
            onProgress?.(`Subiendo a OneDrive... ${percent}%`);

            // If complete, return the result
            if (uploadResponse.status === 200 || uploadResponse.status === 201) {
                return await uploadResponse.json();
            }
        }
    } catch (error) {
        console.error('Error uploading backup to OneDrive:', error);
        throw error;
    }
};

/**
 * Get list of backups from OneDrive
 */
export const getBackupsList = async (accessToken) => {
    const BACKUP_FOLDER_NAME = 'Backups_PRG';

    try {
        const response = await fetch(
            `https://graph.microsoft.com/v1.0/me/drive/root:/${BACKUP_FOLDER_NAME}:/children?$select=id,name,size,createdDateTime,@microsoft.graph.downloadUrl&$orderby=createdDateTime desc`,
            {
                headers: { 'Authorization': `Bearer ${accessToken}` }
            }
        );

        if (!response.ok) {
            // Folder might not exist yet
            return [];
        }

        const data = await response.json();
        return data.value || [];
    } catch (error) {
        console.error('Error getting backups list:', error);
        return [];
    }
};

/**
 * Download the backup ZIP file locally
 */
export const downloadBackup = (blob, filename) => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
};

/**
 * Log backup action to database
 */
export const logBackupAction = async (workerName, fileCount, totalSize, destination = 'local') => {
    try {
        await supabase.from('audit_logs').insert([{
            action_type: 'BACKUP',
            file_name: `Respaldo completo (${fileCount} archivos)`,
            file_path: destination === 'onedrive' ? 'OneDrive Backup' : 'Local Download',
            worker_name: workerName,
            metadata: { fileCount, totalSize, destination },
            timestamp: new Date().toISOString()
        }]);
    } catch (error) {
        console.error('Error logging backup action:', error);
    }
};
