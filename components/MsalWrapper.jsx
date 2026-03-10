"use client";
import React, { useEffect, useState } from "react";
import { MsalProvider } from "@azure/msal-react";
import { PublicClientApplication, EventType } from "@azure/msal-browser";
import { msalConfig } from "@/lib/authConfig";
import { SharePointProvider } from "@/contexts/SharePointContext";
import { useRouter } from "next/navigation";

// Instantiate MSAL outside the React component lifecycle to prevent 
// React Strict Mode from double-initializing and wiping the OAuth URL hash 
// before token extraction.
let msalInstance = null;
let initializationPromise = null;

if (typeof window !== "undefined") {
    msalInstance = new PublicClientApplication(msalConfig);
}

// Export so other modules (e.g. changeDetectionService) can call acquireTokenSilent
export { msalInstance };

// Scopes needed for OneDrive/SharePoint operations
const GRAPH_SCOPES = ["Files.ReadWrite.All", "Sites.Read.All"];

export default function MsalWrapper({ children }) {
    const [isReady, setIsReady] = useState(false);
    const router = useRouter();

    useEffect(() => {
        if (!msalInstance) return; // Wait for CSR

        const initializeMsal = async () => {
            // Prevent multiple initializations in Strict Mode
            if (initializationPromise) {
                await initializationPromise;
                setIsReady(true);
                return;
            }

            initializationPromise = (async () => {
                try {
                    // Initialize the MSAL instance
                    await msalInstance.initialize();

                    const refreshAccessToken = async (account) => {
                        try {
                            const request = { scopes: GRAPH_SCOPES, account };
                            let tokenResp;
                            try {
                                tokenResp = await msalInstance.acquireTokenSilent(request);
                            } catch (err) {
                                if (err.name === "InteractionRequiredAuthError" || err.errorCode === "monitor_window_timeout") {
                                    console.warn("Silent token refresh failed, triggering popup fallback...", err);
                                    tokenResp = await msalInstance.acquireTokenPopup(request);
                                } else {
                                    throw err;
                                }
                            }

                            if (typeof window !== 'undefined') {
                                window.__msalAccessToken = tokenResp.accessToken;
                            }
                            return tokenResp.accessToken;
                        } catch (err) {
                            console.error("Token refresh completely failed:", err);
                            return null;
                        }
                    };

                    // Proactive background refresh every 45 min (tokens expire at 60 min)
                    setInterval(async () => {
                        const account = msalInstance.getActiveAccount();
                        if (account) await refreshAccessToken(account);
                    }, 45 * 60 * 1000);

                    // Listen for the login success event and route the user cleanly
                    msalInstance.addEventCallback(async (event) => {
                        if (event.eventType === EventType.LOGIN_SUCCESS && event.payload.account) {
                            msalInstance.setActiveAccount(event.payload.account);
                            await refreshAccessToken(event.payload.account);
                            if (window.location.pathname === '/auth-callback') {
                                router.push('/administracion#archivos');
                            }
                        }
                    });

                    // Handle redirect result (parsing the URL Hash after OAuth)
                    try {
                        const result = await msalInstance.handleRedirectPromise();
                        if (result) {
                            console.log("Redirect result handled directly:", result);
                        }
                    } catch (err) {
                        // Ignore known benign errors (e.g. state missing handles manual refresh)
                        if (err.errorCode !== 'state_not_found' && err.errorCode !== 'no_token_request_cache_error') {
                            console.error("Redirect Error:", err);
                        }
                    }

                    // Handle accounts gracefully on mount
                    const accounts = msalInstance.getAllAccounts();
                    if (accounts.length > 0) {
                        msalInstance.setActiveAccount(accounts[0]);
                        await refreshAccessToken(accounts[0]);
                        // Hard Redirect logic if we are stuck on auth-callback manually
                        if (window.location.pathname === '/auth-callback') {
                            router.push('/administracion#archivos');
                        }
                    }
                } catch (error) {
                    console.error("MSAL Initialization Error:", error);
                }
            })();

            await initializationPromise;
            setIsReady(true);
        };

        initializeMsal();
    }, [router]);

    if (!isReady || !msalInstance) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-[#0f1419] text-white">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500 mb-4"></div>
                <p className="font-medium animate-pulse text-blue-400">Iniciando servicios...</p>
            </div>
        );
    }

    return (
        <MsalProvider instance={msalInstance}>
            <SharePointProvider>
                {children}
            </SharePointProvider>
        </MsalProvider>
    );
}
