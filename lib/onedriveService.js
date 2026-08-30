import { Client } from "@microsoft/microsoft-graph-client";
import { validateFile, SMALL_FILE_THRESHOLD, CHUNK_SIZE, createUploadSession, uploadChunk } from './fileUploadHelpers';
let graphClient = undefined;
export const initializeGraphClient = (accessToken) => {
    graphClient = Client.init({
        authProvider: (done) => {
            done(null, accessToken);
        },
    });
};
export const getFiles = async (folderId = "root", driveId = null) => {
    if (!graphClient) throw new Error("Graph Client not initialized");
    try {
        const endpoint = driveId
            ? `/drives/${driveId}/items/${folderId}/children`
            : `/me/drive/items/${folderId}/children`;
        const response = await graphClient
            .api(endpoint)
            .select("id,name,folder,file,lastModifiedDateTime,webUrl,size,lastModifiedBy,parentReference,@microsoft.graph.downloadUrl")
            .top(200) 
            .get();
        return response.value;
    } catch (error) {
        throw error;
    }
};
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
        throw error;
    }
};
export const getFollowedSites = async () => {
    if (!graphClient) throw new Error("Graph Client not initialized");
    try {
        const followed = await graphClient
            .api("/me/followedSites")
            .select("id,displayName,webUrl,sharepointIds")
            .get();
        const searchContabilidad = await graphClient.api("/sites?search=Contabilidad").select("id,displayName,webUrl").get();
        const searchPRG = await graphClient.api("/sites?search=PRG").select("id,displayName,webUrl").get();
        const searchAuditoria = await graphClient.api("/sites?search=AUDITORIA").select("id,displayName,webUrl").get();
        const allSites = [
            ...followed.value,
            ...searchContabilidad.value,
            ...searchPRG.value,
            ...searchAuditoria.value
        ];
        const uniqueSites = Array.from(new Map(allSites.map(site => [site.id, site])).values());
        return uniqueSites;
    } catch (error) {
        return [];
    }
};
export const getSiteDefaultDrive = async (siteId) => {
    if (!graphClient) throw new Error("Graph Client not initialized");
    try {
        const response = await graphClient
            .api(`/sites/${siteId}/drive`)
            .select("id")
            .get();
        return response.id;
    } catch (error) {
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
        return response.value.filter(item => {
            const date = new Date(item.lastModifiedDateTime || item.remoteItem?.lastModifiedDateTime);
            return date > yesterday;
        });
    } catch (error) {
        return [];
    }
}
export const deleteItem = async (itemId, driveId = null) => {
    if (!graphClient) throw new Error("Graph Client not initialized");
    try {
        const endpoint = driveId
            ? `/drives/${driveId}/items/${itemId}`
            : `/me/drive/items/${itemId}`;
        await graphClient.api(endpoint).delete();
        return true;
    } catch (error) {
        throw error;
    }
};
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
        throw error;
    }
};
export const getPreviewUrl = async (itemId, driveId = null) => {
    if (!graphClient) throw new Error("Graph Client not initialized");
    try {
        const endpoint = driveId
            ? `/drives/${driveId}/items/${itemId}/preview`
            : `/me/drive/items/${itemId}/preview`;
        const response = await graphClient.api(endpoint).post({});
        return response.getUrl || response.embedUrl;
    } catch (error) {
        return null;
    }
};
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
        throw error;
    }
};
export const uploadFile = async (file, parentId, driveId = null, onProgress = null) => {
    if (!graphClient) throw new Error("Graph Client not initialized");
    const validation = validateFile(file);
    if (!validation.valid) {
        throw new Error(validation.error);
    }
    try {
        if (file.size < SMALL_FILE_THRESHOLD) {
            return await uploadSmallFile(file, parentId, driveId, onProgress);
        }
        return await uploadLargeFile(file, parentId, driveId, onProgress);
    } catch (error) {
        throw new Error(`Error al subir archivo: ${error.message || 'Error desconocido'}`);
    }
};
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
        throw error;
    }
};
const uploadLargeFile = async (file, parentId, driveId = null, onProgress = null) => {
    try {
        const path = `/items/${parentId}:/${file.name}`;
        const uploadUrl = await createUploadSession(graphClient, path, driveId);
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
        const endpoint = driveId
            ? `/drives/${driveId}/items/${parentId}:/${file.name}`
            : `/me/drive/items/${parentId}:/${file.name}`;
        const response = await graphClient.api(endpoint).get();
        if (onProgress) onProgress(100);
        return response;
    } catch (error) {
        throw error;
    }
};
export const moveItem = async (itemId, parentId, driveId = null) => {
    if (!graphClient) throw new Error("Graph Client not initialized");
    try {
        const endpoint = driveId
            ? `/drives/${driveId}/items/${itemId}`
            : `/me/drive/items/${itemId}`;
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
        throw error;
    }
};
export const createDriveSubscription = async (driveId, notificationUrl) => {
    if (!graphClient) throw new Error("Graph Client not initialized");
    try {
        const expirationDateTime = new Date();
        expirationDateTime.setDate(expirationDateTime.getDate() + 29);
        const subscription = {
            changeType: "updated",
            notificationUrl: notificationUrl,
            resource: `/drives/${driveId}/root`,
            expirationDateTime: expirationDateTime.toISOString(),
            clientState: process.env.NEXT_PUBLIC_GRAPH_WEBHOOK_SECRET || "prgSecureState123" 
        };
        const response = await graphClient.api("/subscriptions").post(subscription);
        return response;
    } catch (error) {
        throw error;
    }
}
export const getDriveChanges = async (subscriptionId) => {
    if (!graphClient) throw new Error("Graph Client not initialized");
    try {
        const response = await graphClient
            .api("/me/drive/recent")
            .top(5)
            .select("id,name,webUrl,lastModifiedDateTime,lastModifiedBy,parentReference")
            .get();
        return response.value || [];
    } catch (error) {
        return [];
    }
}
export const processFileChange = async (fileData) => {
    const fileName = fileData.name;
    const modifiedBy = fileData.lastModifiedBy?.user?.displayName || "Desconocido";
    const date = new Date(fileData.lastModifiedDateTime).toLocaleString();
    let companyName = "Desconocida";
    if (fileData.parentReference?.path) {
        const pathSegments = decodeURIComponent(fileData.parentReference.path).split('/');
        if (pathSegments.some(s => s.toLowerCase().includes('prg'))) companyName = 'PRG Auditores';
        if (pathSegments.some(s => s.toLowerCase().includes('contabilidad'))) companyName = 'Contabilidad Corp';
        if (companyName === "Desconocida" && pathSegments.length > 3) {
            companyName = pathSegments[3]; 
        }
    }
    return {
        id: fileData.id,
        fileName,
        user: modifiedBy,
        date,
        company: companyName,
        action: 'Modificó adjunto',
        url: fileData.webUrl
    };
}
