"use client";
import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useMsal } from "@azure/msal-react";
import { loginRequest } from "@/lib/authConfig";
import { initializeGraphClient, getFollowedSites } from "@/lib/onedriveService";

const SharePointContext = createContext(null);

export const useSharePointData = () => {
    const context = useContext(SharePointContext);
    if (!context) {
        return { sites: [], loading: false, error: null, loadSites: () => { }, getCachedDriveId: () => null, cacheDriveId: () => { } };
    }
    return context;
};

export const SharePointProvider = ({ children }) => {
    const { instance, accounts } = useMsal();
    const [sites, setSites] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [isInitialized, setIsInitialized] = useState(false);

    // Cache for drive IDs to avoid repeated API calls
    const driveIdCache = useRef(new Map());

    const loadSites = useCallback(async () => {
        if (accounts.length === 0 || loading) return;

        setLoading(true);
        setError(null);
        try {
            const request = {
                ...loginRequest,
                account: accounts[0]
            };

            // Try to get token silently
            const response = await instance.acquireTokenSilent(request).catch(async (err) => {
                console.warn("Silent token acquisition failed. Error:", err.errorCode);
                // DO NOT trigger redirect automatically here to avoid infinite loops on localhost
                // If silent fails, we simply won't load the sites automatically, 
                // and the user will have to trigger a login manually if needed.
                throw err;
            });

            if (response && response.accessToken) {
                initializeGraphClient(response.accessToken);
                const fetchedSites = await getFollowedSites();
                setSites(fetchedSites);
                setIsInitialized(true);
            }
        } catch (err) {
            console.error("SharePoint preload error:", err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [accounts, instance, loading]);

    // Get cached drive ID or null
    const getCachedDriveId = useCallback((siteId) => {
        return driveIdCache.current.get(siteId) || null;
    }, []);

    // Cache a drive ID for a site
    const cacheDriveId = useCallback((siteId, driveId) => {
        driveIdCache.current.set(siteId, driveId);
    }, []);

    // Auto-load when accounts are available
    useEffect(() => {
        if (accounts.length > 0 && !isInitialized && !loading) {
            loadSites();
        }
    }, [accounts, isInitialized, loading, loadSites]);

    return (
        <SharePointContext.Provider value={{
            sites,
            loading,
            error,
            loadSites,
            isInitialized,
            getCachedDriveId,
            cacheDriveId
        }}>
            {children}
        </SharePointContext.Provider>
    );
};

export default SharePointProvider;
