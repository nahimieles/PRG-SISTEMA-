import { Client } from "@microsoft/microsoft-graph-client";

let graphClient = undefined;

export const initializeGraphClient = (accessToken) => {
    graphClient = Client.init({
        authProvider: (done) => {
            done(null, accessToken);
        },
    });
};

export const getFiles = async (folderId = "root") => {
    if (!graphClient) throw new Error("Graph Client not initialized");

    try {
        const response = await graphClient
            .api(`/me/drive/items/${folderId}/children`)
            .select("id,name,folder,file,lastModifiedDateTime,webUrl,size")
            .get();
        return response.value;
    } catch (error) {
        console.error("Error fetching files:", error);
        throw error;
    }
};

export const getRecentFiles = async () => {
    if (!graphClient) throw new Error("Graph Client not initialized");

    // Change detection: Get files modified in the last 24 hours
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const dateString = yesterday.toISOString();

    try {
        // Search for items modified after dateString
        // Note: Graph API search might be limited, but delta query is better for sync.
        // For simplicity and read-only safety, we list recent items from the drive.
        const response = await graphClient
            .api("/me/drive/recent")
            .get();

        // Filter locally just to be sure if API returns older ones
        return response.value.filter(file => new Date(file.lastModifiedDateTime) > yesterday);
    } catch (error) {
        console.error("Error checking recent files:", error);
        return [];
    }
}
