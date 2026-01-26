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
 * Download the backup ZIP file
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
export const logBackupAction = async (workerName, fileCount, totalSize) => {
    try {
        await supabase.from('audit_logs').insert([{
            action_type: 'BACKUP',
            file_name: `Respaldo completo (${fileCount} archivos)`,
            file_path: 'SharePoint Backup',
            worker_name: workerName,
            metadata: { fileCount, totalSize },
            timestamp: new Date().toISOString()
        }]);
    } catch (error) {
        console.error('Error logging backup action:', error);
    }
};
