"use client";
import React, { useEffect, useState } from "react";
import { MsalProvider } from "@azure/msal-react";
import { PublicClientApplication } from "@azure/msal-browser";
import { msalConfig } from "@/lib/authConfig";
import { SharePointProvider } from "@/contexts/SharePointContext";

// Initialize MSAL outside component to avoid re-initialization on re-renders
const msalInstance = typeof window !== "undefined" ? new PublicClientApplication(msalConfig) : null;

export default function MsalWrapper({ children }) {
    const [isMsalInitialized, setIsMsalInitialized] = useState(false);

    const initializedRef = React.useRef(false);

    useEffect(() => {
        if (!msalInstance || initializedRef.current) return;
        initializedRef.current = true;

        const initializeMsal = async () => {
            try {
                await msalInstance.initialize();

                // Handle redirect result if returning from Azure
                await msalInstance.handleRedirectPromise().catch(err => {
                    console.error("Redirect Error:", err);
                });

                // Set active account if available
                const accounts = msalInstance.getAllAccounts();
                if (accounts.length > 0 && !msalInstance.getActiveAccount()) {
                    msalInstance.setActiveAccount(accounts[0]);
                }

                setIsMsalInitialized(true);
            } catch (error) {
                console.error("MSAL Initialization Error:", error);
                setIsMsalInitialized(true); // Allow app to load even on error
            }
        };

        initializeMsal();
    }, []);

    if (!msalInstance || !isMsalInitialized) {
        // Return children immediately to not block the UI, or a loading spinner if preferred.
        // In this dashboard layout, blocking might look weird, so we render children.
        // Auth-dependent components will handle their "loading" state locally.
        return <>{children}</>;
    }

    return (
        <MsalProvider instance={msalInstance}>
            <SharePointProvider>
                {children}
            </SharePointProvider>
        </MsalProvider>
    );
}
