"use client";
import React from 'react';
import dynamic from 'next/dynamic';
const OneDriveExplorer = dynamic(() => import("@/components/OneDriveExplorer"), { ssr: false });
const SmartReportGenerator = dynamic(() => import("@/components/SmartReportGenerator"), { ssr: false });
export default function OneDrivePage() {
    return (
        <div className="p-8 max-w-7xl mx-auto space-y-8">
            <header>
                <h1 className="text-3xl font-bold text-gray-800">Mis Documentos (OneDrive)</h1>
                <p className="text-gray-500 mt-2">Accede y sincroniza tu trabajo diario de forma segura.</p>
            </header>
            {}
            <section>
                <SmartReportGenerator />
            </section>
            {}
            <section>
                <OneDriveExplorer />
            </section>
        </div>
    );
}
