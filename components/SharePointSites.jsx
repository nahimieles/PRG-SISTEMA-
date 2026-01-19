"use client";
import React, { useState, useEffect } from 'react';
import { useMsal } from "@azure/msal-react";
import { loginRequest } from "@/lib/authConfig";
import { initializeGraphClient, getFollowedSites, getSiteDefaultDrive } from "@/lib/onedriveService";
import { Loader2, Users, ArrowRight } from 'lucide-react';

const SharePointSites = ({ onSelectSite }) => {
    const { instance, accounts } = useMsal();
    const [sites, setSites] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (accounts.length > 0) {
            loadSites();
        }
    }, [accounts]);

    const loadSites = async () => {
        setLoading(true);
        try {
            const request = { ...loginRequest, account: accounts[0] };
            // Ensure token has Sites.Read.All
            const response = await instance.acquireTokenSilent(request).catch(() => instance.acquireTokenRedirect(request));

            initializeGraphClient(response.accessToken);
            const fetchedSites = await getFollowedSites();
            setSites(fetchedSites);
        } catch (err) {
            console.error("Error loading sites:", err);
            setError("No se pudieron cargar los grupos. Asegúrate de 'Seguir' los sitios en SharePoint.");
        } finally {
            setLoading(false);
        }
    };

    const handleSiteClick = async (site) => {
        setLoading(true); // Temporary loading state while fetching drive
        try {
            const driveId = await getSiteDefaultDrive(site.id);
            onSelectSite(site, driveId);
        } catch (err) {
            alert("No se pudo acceder a los documentos de este sitio.");
        } finally {
            setLoading(false);
        }
    };

    // Helper to generate consistent colors based on site name (Style mimic)
    const getSiteColor = (name) => {
        const colors = [
            "bg-teal-600", "bg-orange-600", "bg-pink-700", "bg-indigo-600",
            "bg-purple-600", "bg-blue-600", "bg-cyan-600"
        ];
        let hash = 0;
        for (let i = 0; i < name.length; i++) {
            hash = name.charCodeAt(i) + ((hash << 5) - hash);
        }
        return colors[Math.abs(hash) % colors.length];
    };

    // Helper to get initials
    const getInitials = (name) => {
        return name.substring(0, 2).toUpperCase();
    };

    if (loading && sites.length === 0) {
        return (
            <div className="flex justify-center items-center h-48">
                <Loader2 className="animate-spin text-blue-600" size={32} />
                <span className="ml-2 text-gray-500">Cargando grupos...</span>
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-8 text-center bg-red-50 rounded-xl border border-red-100">
                <p className="text-red-600 mb-4">{error}</p>
                <button onClick={loadSites} className="text-sm font-semibold text-red-700 underline">Intentar de nuevo</button>
            </div>
        );
    }

    if (sites.length === 0) {
        return (
            <div className="text-center p-10 bg-gray-50 rounded-xl border border-dashed border-gray-300">
                <Users size={48} className="mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-semibold text-gray-700">Sin grupos seguidos</h3>
                <p className="text-gray-500 text-sm max-w-sm mx-auto mt-2">
                    No vemos ningún sitio de SharePoint en tu lista de "Seguidos". Ve a SharePoint y marca tus grupos con la estrella ⭐.
                </p>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 animate-fade-in">
            {sites.map((site) => (
                <div
                    key={site.id}
                    onClick={() => handleSiteClick(site)}
                    className="group relative bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden cursor-pointer hover:shadow-md transition-all hover:-translate-y-1"
                >
                    {/* Header Colorido (Card Top) */}
                    <div className={`${getSiteColor(site.displayName)} h-20 p-4 flex justify-between items-start`}>
                        <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded flex items-center justify-center text-white font-bold text-sm">
                            {getInitials(site.displayName)}
                        </div>
                        <Users className="text-white/80" size={18} />
                    </div>

                    {/* Content */}
                    <div className="p-4">
                        <h4 className="font-bold text-gray-800 truncate mb-1" title={site.displayName}>
                            {site.displayName}
                        </h4>
                        <p className="text-xs text-gray-500">Grupo de Trabajo</p>

                        <div className="mt-4 flex items-center text-blue-600 text-xs font-semibold opacity-0 group-hover:opacity-100 transition-opacity">
                            Ver archivos <ArrowRight size={12} className="ml-1" />
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
};

export default SharePointSites;
