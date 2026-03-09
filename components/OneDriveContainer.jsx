"use client";
import React, { useEffect, useState } from 'react';
import SharePointSites from "@/components/SharePointSites";
import OneDriveExplorer from "@/components/OneDriveExplorer";
import SmartReportGenerator from "@/components/SmartReportGenerator";
import { ArrowLeft, Building2, LogIn, LogOut } from 'lucide-react';
import { useMsal } from "@azure/msal-react";

import { getUnifiedSession } from "@/lib/auth";

const OneDriveContainer = () => {
    const { instance, accounts } = useMsal();
    const isAuthenticated = accounts && accounts.length > 0;

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

    const handleLogin = () => {
        instance.loginPopup({ scopes: ["Files.ReadWrite.All", "Sites.Read.All"] })
            .catch(e => console.error("Login failed:", e));
    };

    const handleLogout = () => {
        instance.logoutPopup()
            .catch(e => console.error("Logout failed:", e));
    };

    return (
        <div className="space-y-6 animate-fade-in">
            <header className="mb-6 flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                        <Building2 className="text-blue-600" />
                        {selectedSite ? selectedSite.displayName : 'Explorador de archivos'}
                    </h2>
                    <p className="text-gray-500 dark:text-gray-400">
                        {selectedSite ? 'Explorando documentos del grupo' : 'Accede a los archivos de tus grupos de trabajo.'}
                    </p>
                </div>
                {selectedSite && isAuthenticated && (
                    <button
                        onClick={handleBackToSites}
                        className="px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors flex items-center gap-2"
                    >
                        <ArrowLeft size={16} /> Volver a Grupos
                    </button>
                )}
                {isAuthenticated && !selectedSite && (
                    <button
                        onClick={handleLogout}
                        className="px-4 py-2 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors flex items-center gap-2"
                    >
                        <LogOut size={16} /> Cerrar sesión Microsoft
                    </button>
                )}
            </header>

            {/* Contenido Principal */}
            <section className="h-full">
                {!isAuthenticated ? (
                    <div className="flex flex-col items-center justify-center p-12 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
                        <div className="w-16 h-16 bg-blue-50 dark:bg-blue-900/30 rounded-full flex items-center justify-center mb-4">
                            <Building2 className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Conectar a Microsoft 365</h3>
                        <p className="text-gray-500 dark:text-gray-400 text-center max-w-md mb-6">
                            Para ver los archivos de las empresas, necesitas iniciar sesión con tu cuenta de Microsoft autorizada.
                        </p>
                        <button
                            onClick={handleLogin}
                            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-medium shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5"
                        >
                            <LogIn className="w-5 h-5" />
                            Iniciar sesión con Microsoft
                        </button>
                    </div>
                ) : currentUser ? (
                    <OneDriveExplorer
                        driveId={null} // Unified Mode starts at virtual root
                        siteName={'Archivos'}
                        currentUser={currentUser}
                        role={currentRole}
                        disableGroups={true}
                    />
                ) : (
                    <div className="flex items-center justify-center h-64">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    </div>
                )}
            </section>
        </div>
    );
};

export default OneDriveContainer;
