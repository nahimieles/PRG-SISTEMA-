import { Client } from "@microsoft/microsoft-graph-client";
import { validateFile, SMALL_FILE_THRESHOLD, CHUNK_SIZE, createUploadSession, uploadChunk } from './fileUploadHelpers';

let graphClient = undefined;

// Initialize Graph Client
export const initializeGraphClient = (accessToken) => {
    graphClient = Client.init({
        authProvider: (done) => {
            done(null, accessToken);
        },
    });
};

// Get specific folder files from a specific Drive
export const getFiles = async (folderId = "root", driveId = null) => {
    if (!graphClient) throw new Error("Graph Client not initialized");

    try {
        // If driveId is provided, use /drives/{driveId}, otherwise use /me/drive (Personal)
        const endpoint = driveId
            ? `/drives/${driveId}/items/${folderId}/children`
            : `/me/drive/items/${folderId}/children`;

        const response = await graphClient
            .api(endpoint)
            .select("id,name,folder,file,lastModifiedDateTime,webUrl,size,lastModifiedBy,@microsoft.graph.downloadUrl")
            .top(200) // Limit to 200 items per page to ensure speed
            .get();
        return response.value;
    } catch (error) {
        console.error("Error fetching files:", error);
        throw error;
    }
};

// Search for files within a specific folder (Recursive/Deep Search)
export const searchFiles = async (query, driveId = null, folderId = "root") => {
    if (!graphClient) throw new Error("Graph Client not initialized");
    if (!query) return [];

    try {
        const endpoint = driveId
            ? `/drives/${driveId}/items/${folderId}/search(q='${query}')`
            : `/me/drive/items/${folderId}/search(q='${query}')`;

        const response = await graphClient
            .api(endpoint)
            .select("id,name,folder,file,lastModifiedDateTime,webUrl,size,lastModifiedBy")
            .get();

        return response.value;
    } catch (error) {
        console.error("Error searching files:", error);
        throw error;
    }
};

// Get User's Followed Sites + Search for relevant Corporate Sites (STRICT FILTERING)
export const getFollowedSites = async () => {
    if (!graphClient) throw new Error("Graph Client not initialized");

    try {
        // 1. Get Followed Sites
        const followed = await graphClient
            .api("/me/followedSites")
            .select("id,displayName,webUrl,sharepointIds")
            .get();

        // 2. Explicit Search (Broad enough to catch, then we filter)
        const searchContabilidad = await graphClient.api("/sites?search=Contabilidad").select("id,displayName,webUrl").get();
        const searchPRG = await graphClient.api("/sites?search=PRG").select("id,displayName,webUrl").get();
        const searchAuditoria = await graphClient.api("/sites?search=AUDITORIA").select("id,displayName,webUrl").get();

        // 3. Merge
        const allSites = [
            ...followed.value,
            ...searchContabilidad.value,
            ...searchPRG.value,
            ...searchAuditoria.value
        ];

        // 4. Deduplicate
        const uniqueSites = Array.from(new Map(allSites.map(site => [site.id, site])).values());

        return uniqueSites;
    } catch (error) {
        console.error("Error fetching sites:", error);
        return [];
    }
};

// Get the default Document Library Drive ID for a Site
export const getSiteDefaultDrive = async (siteId) => {
    if (!graphClient) throw new Error("Graph Client not initialized");

    try {
        const response = await graphClient
            .api(`/sites/${siteId}/drive`)
            .select("id")
            .get();
        return response.id;
    } catch (error) {
        console.error("Error fetching site drive:", error);
        throw error;
    }
};

export const getRecentFiles = async () => {
    if (!graphClient) throw new Error("Graph Client not initialized");

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    try {
        const response = await graphClient
            .api("/me/drive/recent")
            .select("id,name,webUrl,lastModifiedDateTime,remoteItem")
            .get();

        // Filter for files modified in the last 24h
        return response.value.filter(item => {
            const date = new Date(item.lastModifiedDateTime || item.remoteItem?.lastModifiedDateTime);
            return date > yesterday;
        });
    } catch (error) {
        console.error("Error checking recent files:", error);
        return [];
    }
}

// Delete a file or folder
export const deleteItem = async (itemId, driveId = null) => {
    if (!graphClient) throw new Error("Graph Client not initialized");

    try {
        const endpoint = driveId
            ? `/drives/${driveId}/items/${itemId}`
            : `/me/drive/items/${itemId}`;

        await graphClient.api(endpoint).delete();
        return true;
    } catch (error) {
        console.error("Error deleting item:", error);
        throw error;
    }
};

// Create a new folder
export const createFolder = async (parentId, folderName, driveId = null) => {
    if (!graphClient) throw new Error("Graph Client not initialized");

    try {
        const endpoint = driveId
            ? `/drives/${driveId}/items/${parentId}/children`
            : `/me/drive/items/${parentId}/children`;

        const response = await graphClient
            .api(endpoint)
            .post({
                name: folderName,
                folder: {},
                "@microsoft.graph.conflictBehavior": "rename"
            });

        return response;
    } catch (error) {
        console.error("Error creating folder:", error);
        throw error;
    }
};

// Get embed preview URL for Office documents
export const getPreviewUrl = async (itemId, driveId = null) => {
    if (!graphClient) throw new Error("Graph Client not initialized");

    try {
        const endpoint = driveId
            ? `/drives/${driveId}/items/${itemId}/preview`
            : `/me/drive/items/${itemId}/preview`;

        const response = await graphClient.api(endpoint).post({});
        return response.getUrl || response.embedUrl;
    } catch (error) {
        console.error("Error getting preview URL:", error);
        return null;
    }
};

// Rename a file or folder
export const renameItem = async (itemId, newName, driveId = null) => {
    if (!graphClient) throw new Error("Graph Client not initialized");

    try {
        const endpoint = driveId
            ? `/drives/${driveId}/items/${itemId}`
            : `/me/drive/items/${itemId}`;

        const response = await graphClient
            .api(endpoint)
            .patch({ name: newName });

        return response;
    } catch (error) {
        console.error("Error renaming item:", error);
        throw error;
    }
};

// Upload a file with validation, chunking for large files, and progress tracking
export const uploadFile = async (file, parentId, driveId = null, onProgress = null) => {
    if (!graphClient) throw new Error("Graph Client not initialized");


    // Validate file
    const validation = validateFile(file);
    if (!validation.valid) {
        throw new Error(validation.error);
    }

    try {
        // For small files, use simple upload
        if (file.size < SMALL_FILE_THRESHOLD) {
            return await uploadSmallFile(file, parentId, driveId, onProgress);
        }

        // For large files, use chunked upload
        return await uploadLargeFile(file, parentId, driveId, onProgress);
    } catch (error) {
        console.error("Error uploading file:", error);
        throw new Error(`Error al subir archivo: ${error.message || 'Error desconocido'}`);
    }
};

// Upload small file (< 4MB) using simple PUT
const uploadSmallFile = async (file, parentId, driveId = null, onProgress = null) => {
    try {
        const endpoint = driveId
            ? `/drives/${driveId}/items/${parentId}:/${file.name}:/content`
            : `/me/drive/items/${parentId}:/${file.name}:/content`;

        if (onProgress) onProgress(0);

        const response = await graphClient
            .api(endpoint)
            .put(file);

        if (onProgress) onProgress(100);

        return response;
    } catch (error) {
        console.error("Error in simple upload:", error);
        throw error;
    }
};

// Upload large file (>= 4MB) using chunked upload session
const uploadLargeFile = async (file, parentId, driveId = null, onProgress = null) => {

    try {
        // Create upload session
        const path = `/items/${parentId}:/${file.name}`;
        const uploadUrl = await createUploadSession(graphClient, path, driveId);

        // Upload file in chunks
        const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
        let uploadedBytes = 0;

        for (let i = 0; i < totalChunks; i++) {
            const start = i * CHUNK_SIZE;
            const end = Math.min(start + CHUNK_SIZE, file.size);
            const chunk = file.slice(start, end);

            await uploadChunk(uploadUrl, chunk, start, end, file.size);

            uploadedBytes = end;
            if (onProgress) {
                const progress = Math.round((uploadedBytes / file.size) * 100);
                onProgress(progress);
            }
        }

        // Get the uploaded file info
        const endpoint = driveId
            ? `/drives/${driveId}/items/${parentId}:/${file.name}`
            : `/me/drive/items/${parentId}:/${file.name}`;

        const response = await graphClient.api(endpoint).get();

        if (onProgress) onProgress(100);

        return response;
    } catch (error) {
        console.error("Error in chunked upload:", error);
        throw error;
    }
};

// Move a file or folder
export const moveItem = async (itemId, parentId, driveId = null) => {
    if (!graphClient) throw new Error("Graph Client not initialized");

    try {
        const endpoint = driveId
            ? `/drives/${driveId}/items/${itemId}`
            : `/me/drive/items/${itemId}`;

        // parentReference requires id
        const body = {
            parentReference: {
                id: parentId
            }
        };

        const response = await graphClient
            .api(endpoint)
            .patch(body);

        return response;
    } catch (error) {
        console.error("Error moving item:", error);
        throw error;
    }
};
