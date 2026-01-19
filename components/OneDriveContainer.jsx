"use client";
import React, { useEffect, useState } from 'react';
import { MsalProvider } from "@azure/msal-react";
import { PublicClientApplication } from "@azure/msal-browser";
import { msalConfig } from "@/lib/authConfig";
import OneDriveExplorer from "@/components/OneDriveExplorer";
import SmartReportGenerator from "@/components/SmartReportGenerator";
import { Loader2 } from 'lucide-react';

// Initialize MSAL logic securely for browser environment
const msalInstance = typeof window !== "undefined" ? new PublicClientApplication(msalConfig) : null;

const OneDriveContainer = () => {
    const [isMsalReady, setIsMsalReady] = useState(false);

    useEffect(() => {
        if (!msalInstance) return;

        const init = async () => {
            try {
                await msalInstance.initialize();
            } catch (e) {
                // Ignore if already initialized
                console.log("MSAL init check:", e);
            }

            // Set active account if available
            if (!msalInstance.getActiveAccount() && msalInstance.getAllAccounts().length > 0) {
                msalInstance.setActiveAccount(msalInstance.getAllAccounts()[0]);
            }

            setIsMsalReady(true);
        };
        init();
    }, []);

    if (!msalInstance || !isMsalReady) {
        return (
            <div className="flex justify-center items-center h-64">
                <Loader2 className="animate-spin text-blue-600" size={32} />
                <span className="ml-3 text-gray-500">Iniciando seguridad...</span>
            </div>
        );
    }

    return (
        <MsalProvider instance={msalInstance}>
            <div className="space-y-6 animate-fade-in">
                <header className="mb-6">
                    <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Mis Documentos (OneDrive)</h2>
                    <p className="text-gray-500 dark:text-gray-400">Acceso seguro a tus archivos sincronizados.</p>
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
};

export default OneDriveContainer;
