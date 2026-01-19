"use client";
import React from 'react';
import { MsalProvider } from "@azure/msal-react";
import { PublicClientApplication } from "@azure/msal-browser";
import { msalConfig } from "@/lib/authConfig";
import OneDriveExplorer from "@/components/OneDriveExplorer";
import SmartReportGenerator from "@/components/SmartReportGenerator";

// Initialize MSAL outside component to avoid re-instantiation
// Initialize MSAL outside component to avoid re-instantiation
// Ensure this only runs in browser environment
const msalInstance = typeof window !== "undefined" ? new PublicClientApplication(msalConfig) : null;

export default function OneDrivePage() {
    React.useEffect(() => {
        if (!msalInstance) return;

        // Initialize instance if not already active
        const init = async () => {
            try {
                // Check if not initialized before calling initialize
                // Note: msal-browser v3+ handles initialize() differently, but v2 requires it
                await msalInstance.initialize();
            } catch (e) {
                // Ignore if already initialized or other init errors
                console.log("MSAL init check:", e);
            }

            if (!msalInstance.getActiveAccount() && msalInstance.getAllAccounts().length > 0) {
                msalInstance.setActiveAccount(msalInstance.getAllAccounts()[0]);
            }
        };
        init();
    }, []);

    if (!msalInstance) return null; // Avoid rendering on server or if init failed

    return (
        <MsalProvider instance={msalInstance}>
            <div className="p-8 max-w-7xl mx-auto space-y-8">
                <header>
                    <h1 className="text-3xl font-bold text-gray-800">Mis Documentos (OneDrive)</h1>
                    <p className="text-gray-500 mt-2">Accede y sincroniza tu trabajo diario de forma segura.</p>
                </header>

                {/* Sección de Productividad "Inteligente" */}
                <section>
                    <SmartReportGenerator />
                </section>

                {/* Explorador de Archivos Principal */}
                <section>
                    <OneDriveExplorer />
                </section>
            </div>
        </MsalProvider>
    );
}
