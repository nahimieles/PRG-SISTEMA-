"use client";
import React from 'react';
import dynamic from 'next/dynamic';
// import { MsalProvider } from "@azure/msal-react";
// import { PublicClientApplication } from "@azure/msal-browser";
// import { msalConfig } from "@/lib/authConfig";

// Dynamic imports for MSAL-dependent components to avoid SSR issues
const OneDriveExplorer = dynamic(() => import("@/components/OneDriveExplorer"), { ssr: false });
const SmartReportGenerator = dynamic(() => import("@/components/SmartReportGenerator"), { ssr: false });

export default function OneDrivePage() {
    return (
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
    );
}

