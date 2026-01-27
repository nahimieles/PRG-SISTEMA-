// OneDrive Change Detection Service
// Uses polling to detect file changes and generate automatic activities

import { supabase } from './supabase';
import { logAuditAction } from './audit';
import { getFiles } from './onedriveService';

// Store for tracking file states
let fileStateCache = new Map();
let pollingInterval = null;

// Helper: Normalize strings for comparison
const normalize = (str) => str ? str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim() : "";

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
        // 1. Fetch Context Data (Workers & Companies) for Correlation
        const { data: workers } = await supabase.from('workers').select('id, full_name, user_id');
        const { data: companies } = await supabase.from('companies').select('id, name');

        // 2. Get files from OneDrive
        const files = await getFilesFromDrive(driveId);

        // 3. Process Files
        for (const file of files) {
            const cacheKey = `${driveId}:${file.id}`;
            const cachedFile = fileStateCache.get(cacheKey);

            if (!cachedFile) {
                // New file detected
                await logFileChange('CREATE', file, driveId, workers, companies);
                updateCache(cacheKey, file);
            } else {
                // Check for modifications
                if (file.lastModifiedDateTime !== cachedFile.lastModified) {
                    await logFileChange('MODIFY', file, driveId, workers, companies);
                    updateCache(cacheKey, file);
                }

                // Check for renames
                if (file.name !== cachedFile.name) {
                    await logFileChange('RENAME', file, driveId, workers, companies, cachedFile.name);
                    updateCache(cacheKey, file);
                }
            }
        }

        // 4. Check for deleted files
        const currentFileIds = new Set(files.map(f => `${driveId}:${f.id}`));
        for (const [cacheKey, cachedFile] of fileStateCache.entries()) {
            if (cacheKey.startsWith(`${driveId}:`) && !currentFileIds.has(cacheKey)) {
                await logFileChange('DELETE', cachedFile, driveId, workers, companies);
                fileStateCache.delete(cacheKey);
            }
        }

    } catch (error) {
        console.error('Error scanning for changes:', error);
    }
}

function updateCache(key, file) {
    fileStateCache.set(key, {
        id: file.id,
        name: file.name,
        lastModified: file.lastModifiedDateTime,
        size: file.size,
        parentReference: file.parentReference,
        lastModifiedBy: file.lastModifiedBy
    });
}

/**
 * Log a file change as an audit activity
 */
async function logFileChange(changeType, file, driveId, workers = [], companies = [], oldName = null) {
    try {
        // --- CORRELATION LOGIC ---

        // 1. Identify Worker
        let workerId = null;
        let workerName = 'Sistema';

        const modifiedBy = file.lastModifiedBy?.user?.displayName;
        if (modifiedBy) {
            workerName = modifiedBy;
            // Try to find in workers list
            const matchedWorker = workers.find(w => normalize(w.full_name) === normalize(modifiedBy));
            if (matchedWorker) {
                workerId = matchedWorker.id;
                // If we want to strictly use the system name, uncomment:
                // workerName = matchedWorker.full_name; 
            }
        } else {
            // Fallback to current session user if available? 
            // Usually change detection runs in background or context where we rely on file metadata.
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                // But wait, if it's a polled change from another user, we shouldn't attribute to current user.
                // Only attribute to current user if we are sure (e.g. upload). 
                // Here we trust OneDrive metadata first.
            }
        }

        // 2. Identify Company
        let companyId = null;
        let companyName = null;

        const path = file.parentReference?.path || '';
        // Example path: "/drive/root:/PRG Auditores/Contabilidad"
        // We want to extract "PRG Auditores"

        if (path) {
            // Decode URI component just in case
            const decodedPath = decodeURIComponent(path);
            const pathParts = decodedPath.split('/');

            // Find logic: Iterate parts and check if any matches a company name
            for (const part of pathParts) {
                const matchedCompany = companies.find(c => normalize(c.name) === normalize(part));
                if (matchedCompany) {
                    companyId = matchedCompany.id;
                    companyName = matchedCompany.name;
                    break; // Use the first match (usually top folder)
                }
            }
        }


        // --- LOGGING ---
        let actionType = '';
        let description = '';

        switch (changeType) {
            case 'CREATE':
                actionType = 'AUTO_CREATE';
                description = `Creado: ${file.name}`;
                break;
            case 'MODIFY':
                actionType = 'AUTO_MODIFY';
                description = `Modificado: ${file.name}`;
                break;
            case 'RENAME':
                actionType = 'AUTO_RENAME';
                description = `Renombrado: ${oldName} -> ${file.name}`;
                break;
            case 'DELETE':
                actionType = 'AUTO_DELETE';
                description = `Eliminado: ${file.name}`;
                break;
        }

        const logEntry = {
            action_type: actionType,
            file_name: file.name,
            file_path: file.parentReference?.path || '/',
            worker_id: workerId,      // Correlated ID
            worker_name: workerName,  // Display Name (from OneDrive or System)
            company_id: companyId,    // Correlated ID
            company_name: companyName,// Correlated Name
            metadata: {
                driveId,
                fileId: file.id,
                changeType,
                timestamp: new Date().toISOString(),
                automatic: true,
                oldName: oldName || undefined,
                description
            }
        };

        await logAuditAction(logEntry);
        console.log(`Logged ${changeType} for ${file.name} by ${workerName} [${companyName || 'No Company'}]`);

    } catch (error) {
        console.error('Error logging file change:', error);
    }
}

async function getFilesFromDrive(driveId) {
    try {
        const files = await getFiles('root', driveId);
        return files || [];
    } catch (error) {
        console.error('Error getting files for change detection:', error);
        return [];
    }
}

export async function triggerManualScan(driveId) {
    console.log('Triggering manual scan...');
    await scanForChanges(driveId);
}

export function getFileCacheState() {
    return {
        totalFiles: fileStateCache.size,
        files: Array.from(fileStateCache.entries()).map(([key, value]) => ({
            key,
            ...value
        }))
    };
}

export function clearFileCache() {
    fileStateCache.clear();
    console.log('File cache cleared');
}

