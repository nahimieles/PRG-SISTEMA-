import { Client } from "@microsoft/microsoft-graph-client";

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
            .select("id,name,folder,file,lastModifiedDateTime,webUrl,size,lastModifiedBy")
            .get();
        return response.value;
    } catch (error) {
        console.error("Error fetching files:", error);
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
