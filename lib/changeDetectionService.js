// OneDrive Change Detection Service
// Uses polling to detect file changes and generate automatic activities

import { supabase } from './supabase';
import { logAuditAction } from './audit';

// Store for tracking file states
let fileStateCache = new Map();
let pollingInterval = null;

/**
 * Initialize the change detection service
 * @param {string} driveId - The OneDrive drive ID to monitor
 * @param {number} intervalMinutes - Polling interval in minutes (default: 5)
 */
export async function initializeChangeDetection(driveId, intervalMinutes = 5) {
    if (pollingInterval) {
        console.warn('Change detection already running');
        return;
    }

    console.log(`Starting OneDrive change detection for drive ${driveId} (polling every ${intervalMinutes} minutes)`);

    // Initial scan
    await scanForChanges(driveId);

    // Set up polling
    pollingInterval = setInterval(async () => {
        await scanForChanges(driveId);
    }, intervalMinutes * 60 * 1000);
}

/**
 * Stop the change detection service
 */
export function stopChangeDetection() {
    if (pollingInterval) {
        clearInterval(pollingInterval);
        pollingInterval = null;
        console.log('OneDrive change detection stopped');
    }
}

/**
 * Scan for file changes in OneDrive
 * @param {string} driveId - The drive ID to scan
 */
async function scanForChanges(driveId) {
    try {
        // Get current user from session
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            console.warn('No authenticated user for change detection');
            return;
        }

        // Get files from OneDrive (this would use Microsoft Graph API)
        // For now, we'll use a placeholder - you'll need to integrate with onedriveService.js
        const files = await getFilesFromDrive(driveId);

        // Compare with cached state
        for (const file of files) {
            const cacheKey = `${driveId}:${file.id}`;
            const cachedFile = fileStateCache.get(cacheKey);

            if (!cachedFile) {
                // New file detected
                await logFileChange('CREATE', file, driveId, user);
                fileStateCache.set(cacheKey, {
                    id: file.id,
                    name: file.name,
                    lastModified: file.lastModifiedDateTime,
                    size: file.size
                });
            } else {
                // Check for modifications
                if (file.lastModifiedDateTime !== cachedFile.lastModified) {
                    await logFileChange('MODIFY', file, driveId, user);
                    fileStateCache.set(cacheKey, {
                        id: file.id,
                        name: file.name,
                        lastModified: file.lastModifiedDateTime,
                        size: file.size
                    });
                }

                // Check for renames
                if (file.name !== cachedFile.name) {
                    await logFileChange('RENAME', file, driveId, user, cachedFile.name);
                    fileStateCache.set(cacheKey, {
                        id: file.id,
                        name: file.name,
                        lastModified: file.lastModifiedDateTime,
                        size: file.size
                    });
                }
            }
        }

        // Check for deleted files
        const currentFileIds = new Set(files.map(f => `${driveId}:${f.id}`));
        for (const [cacheKey, cachedFile] of fileStateCache.entries()) {
            if (cacheKey.startsWith(`${driveId}:`) && !currentFileIds.has(cacheKey)) {
                await logFileChange('DELETE', cachedFile, driveId, user);
                fileStateCache.delete(cacheKey);
            }
        }

    } catch (error) {
        console.error('Error scanning for changes:', error);
    }
}

/**
 * Log a file change as an audit activity
 */
async function logFileChange(changeType, file, driveId, user, oldName = null) {
    try {
        let actionType = '';
        let description = '';

        switch (changeType) {
            case 'CREATE':
                actionType = 'AUTO_CREATE';
                description = `Archivo creado automáticamente: ${file.name}`;
                break;
            case 'MODIFY':
                actionType = 'AUTO_MODIFY';
                description = `Archivo modificado automáticamente: ${file.name}`;
                break;
            case 'RENAME':
                actionType = 'AUTO_RENAME';
                description = `Archivo renombrado: ${oldName} → ${file.name}`;
                break;
            case 'DELETE':
                actionType = 'AUTO_DELETE';
                description = `Archivo eliminado: ${file.name}`;
                break;
        }

        await logAuditAction({
            action_type: actionType,
            file_name: file.name,
            file_path: file.parentReference?.path || '/',
            worker_name: user.email || 'Sistema',
            metadata: {
                driveId,
                fileId: file.id,
                changeType,
                timestamp: new Date().toISOString(),
                automatic: true,
                oldName: oldName || undefined
            }
        });

        console.log(`Logged ${changeType} for file: ${file.name}`);
    } catch (error) {
        console.error('Error logging file change:', error);
    }
}

/**
 * Get files from a drive (placeholder - integrate with onedriveService.js)
 * This should use the Microsoft Graph API to get files
 */
async function getFilesFromDrive(driveId) {
    // TODO: Integrate with onedriveService.js
    // For now, return empty array
    // In production, this would call:
    // return await getFiles('root', driveId);
    return [];
}

/**
 * Manually trigger a scan for changes
 * @param {string} driveId - The drive ID to scan
 */
export async function triggerManualScan(driveId) {
    console.log('Triggering manual scan...');
    await scanForChanges(driveId);
}

/**
 * Get the current state of the file cache
 */
export function getFileCacheState() {
    return {
        totalFiles: fileStateCache.size,
        files: Array.from(fileStateCache.entries()).map(([key, value]) => ({
            key,
            ...value
        }))
    };
}

/**
 * Clear the file cache
 */
export function clearFileCache() {
    fileStateCache.clear();
    console.log('File cache cleared');
}
