"use client";
import React, { useEffect, useState } from 'react';
import SharePointSites from "@/components/SharePointSites";
import OneDriveExplorer from "@/components/OneDriveExplorer";
import SmartReportGenerator from "@/components/SmartReportGenerator";
import { ArrowLeft, Building2 } from 'lucide-react';

import { getUnifiedSession } from "@/lib/auth";

const OneDriveContainer = () => {
    const [selectedSite, setSelectedSite] = useState(null);
    const [selectedDriveId, setSelectedDriveId] = useState(null);
    const [currentUser, setCurrentUser] = useState(null);
    const [currentRole, setCurrentRole] = useState(null);

    useEffect(() => {
        const session = getUnifiedSession();
        if (session) {
            setCurrentUser(session.user);
            setCurrentRole(session.role);
        }
    }, []);

    const handleSiteSelect = (site, driveId) => {
        setSelectedSite(site);
        setSelectedDriveId(driveId);
    };

    const handleBackToSites = () => {
        setSelectedSite(null);
        setSelectedDriveId(null);
    };

    return (
        <div className="space-y-6 animate-fade-in">
            <header className="mb-6 flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                        <Building2 className="text-blue-600" />
                        {selectedSite ? selectedSite.displayName : 'Hub Corporativo'}
                    </h2>
                    <p className="text-gray-500 dark:text-gray-400">
                        {selectedSite ? 'Explorando documentos del grupo' : 'Accede a los archivos de tus grupos de trabajo.'}
                    </p>
                </div>
                {selectedSite && (
                    <button
                        onClick={handleBackToSites}
                        className="px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors flex items-center gap-2"
                    >
                        <ArrowLeft size={16} /> Volver a Grupos
                    </button>
                )}
            </header>



            {/* Contenido Principal */}
            <section>
                {!selectedSite ? (
                    <SharePointSites onSelectSite={handleSiteSelect} />
                ) : (
                    <OneDriveExplorer
                        driveId={selectedDriveId}
                        siteName={selectedSite.displayName}
                        currentUser={currentUser}
                        role={currentRole}
                    />
                )}
            </section>
        </div>
    );
};

export default OneDriveContainer;
