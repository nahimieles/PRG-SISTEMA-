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
            .select("id,name,folder,file,lastModifiedDateTime,webUrl,size,thumbnails")
            .expand("thumbnails")
            .get();
        return response.value;
    } catch (error) {
        console.error("Error fetching files:", error);
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
