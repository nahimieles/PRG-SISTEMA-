"use client";
import React, { useEffect, useState } from "react";
import { MsalProvider } from "@azure/msal-react";
import { PublicClientApplication } from "@azure/msal-browser";
import { msalConfig } from "@/lib/authConfig";
import { SharePointProvider } from "@/contexts/SharePointContext";
import { useRouter } from "next/navigation";

export default function MsalWrapper({ children }) {
    const [msalInstance, setMsalInstance] = useState(null);
    const [initializing, setInitializing] = useState(true);
    const router = useRouter();

    useEffect(() => {
        const initializeMsal = async () => {
            try {
                const pca = new PublicClientApplication(msalConfig);

                // Initialize the MSAL instance
                await pca.initialize();

                // Handle redirect result
                try {
                    const result = await pca.handleRedirectPromise();
                    if (result) {
                        console.log("Redirect result handled:", result);
                    }
                } catch (err) {
                    // Ignore known benign errors
                    if (err.errorCode !== 'state_not_found' && err.errorCode !== 'no_token_request_cache_error') {
                        console.error("Redirect Error:", err);
                    }
                }

                // Handle accounts
                const accounts = pca.getAllAccounts();
                if (accounts.length > 0) {
                    pca.setActiveAccount(accounts[0]);

                    // If we are on the auth-callback page, redirect back using soft navigation
                    if (typeof window !== "undefined" && window.location.pathname === '/auth-callback') {
                        // Use router.push to maintain state better than full reload
                        router.push('/administracion#archivos');
                    }
                }

                setMsalInstance(pca);
            } catch (error) {
                console.error("MSAL Initialization Error:", error);
            } finally {
                setInitializing(false);
            }
        };

        if (typeof window !== "undefined") {
            initializeMsal();
        }
    }, [router]);

    if (initializing || !msalInstance) {
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
