"use client";
import React from 'react';
import { MsalProvider } from "@azure/msal-react";
import { PublicClientApplication } from "@azure/msal-browser";
import { msalConfig } from "@/lib/authConfig";
import OneDriveExplorer from "@/components/OneDriveExplorer";
import SmartReportGenerator from "@/components/SmartReportGenerator";

// Initialize MSAL outside component to avoid re-instantiation
const msalInstance = new PublicClientApplication(msalConfig);

export default function OneDrivePage() {
    // Need to initialize msal instance (async in newer versions, but basic setup here for simplicity)
    // Ideally this is done in a top-level layout provider or context.
    // For this specific module isolation, we wrap it here.

    // Note: In Next.js 14+ w/ App Router, it's safer to init MSAL in a client-side wrapper.
    // We'll rely on this being a "use client" page.

    React.useEffect(() => {
        // Initialize instance if not already active
        if (!msalInstance.getActiveAccount() && msalInstance.getAllAccounts().length > 0) {
            msalInstance.setActiveAccount(msalInstance.getAllAccounts()[0]);
        }
        // Next.js fast refresh might need checking init status, but PCA handles it mostly.
        const init = async () => {
            await msalInstance.initialize();
        };
        init();

    }, []);

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
