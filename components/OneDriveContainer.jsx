"use client";
import React, { useEffect, useState } from 'react';
import OneDriveExplorer from "@/components/OneDriveExplorer";
import SmartReportGenerator from "@/components/SmartReportGenerator";
import { Loader2 } from 'lucide-react';

const OneDriveContainer = () => {
    // Note: MsalProvider is now in app/layout.jsx, so we can just use the context directly if needed,
    // or simply render the components which use useMsal() internally.

    return (
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
    );
};

export default OneDriveContainer;
