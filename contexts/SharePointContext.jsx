"use client";
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useMsal } from "@azure/msal-react";
import { loginRequest } from "@/lib/authConfig";
import { initializeGraphClient, getFollowedSites, getSiteDefaultDrive } from "@/lib/onedriveService";

const SharePointContext = createContext(null);

export const useSharePointData = () => {
    const context = useContext(SharePointContext);
    if (!context) {
        return { sites: [], loading: false, error: null, loadSites: () => { } };
    }
    return context;
};

export const SharePointProvider = ({ children }) => {
    const { instance, accounts } = useMsal();
    const [sites, setSites] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [isInitialized, setIsInitialized] = useState(false);

    const loadSites = useCallback(async () => {
        if (accounts.length === 0 || loading) return;

        setLoading(true);
        setError(null);
        try {
            const request = { ...loginRequest, account: accounts[0] };
            const response = await instance.acquireTokenSilent(request).catch(() => instance.acquireTokenPopup(request));
            initializeGraphClient(response.accessToken);
            const fetchedSites = await getFollowedSites();
            setSites(fetchedSites);
            setIsInitialized(true);
        } catch (err) {
            console.error("SharePoint preload error:", err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [accounts, instance, loading]);

    // Auto-load when accounts are available
    useEffect(() => {
        if (accounts.length > 0 && !isInitialized && !loading) {
            loadSites();
        }
    }, [accounts, isInitialized, loading, loadSites]);

    return (
        <SharePointContext.Provider value={{ sites, loading, error, loadSites, isInitialized }}>
            {children}
        </SharePointContext.Provider>
    );
};

export default SharePointProvider;
