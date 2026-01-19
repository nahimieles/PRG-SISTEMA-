"use client";
import React, { useState, useEffect } from 'react';
import { useMsal } from "@azure/msal-react";
import { loginRequest } from "@/lib/authConfig";
import { initializeGraphClient, getFollowedSites, getSiteDefaultDrive } from "@/lib/onedriveService";
import { useTheme } from "@/contexts/ThemeContext";
import { lightTheme, darkTheme } from "@/lib/colors";
import { Loader2, Users, ArrowRight } from 'lucide-react';
import { useTheme } from '@/components/theme-provider'; // Assuming this path for useTheme
import { darkTheme, lightTheme } from '@/lib/themes'; // Assuming this path for theme objects

const SharePointSites = ({ onSelectSite }) => {
    const { instance, accounts } = useMsal();
    const { isDark } = useTheme();
    const theme = isDark ? darkTheme : lightTheme;

    const [sites, setSites] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Filter and Group Sites
    const processSites = (rawSites) => {
        const processed = [];
        const contabilidadGroup = {
            id: 'group-contabilidad',
            displayName: 'Contabilidad', // Nombre genérico
            isGroup: true,
            subSites: []
        };

        rawSites.forEach(site => {
            if (site.displayName.toLowerCase().includes('contabilidad')) {
                contabilidadGroup.subSites.push(site);
            } else {
                processed.push(site); // Otros sitios (PRG, Auditoría, etc.)
            }
        });

        if (contabilidadGroup.subSites.length > 0) {
            processed.push(contabilidadGroup);
        }

        // Ordenar alfabéticamente
        return processed.sort((a, b) => a.displayName.localeCompare(b.displayName));
    };

    const handleCardClick = (item) => {
        if (item.isGroup) {
            setGroupSelection(item.subSites); // Abrir modal de selección
        } else {
            handleSiteClick(item);
        }
    };

    const [groupSelection, setGroupSelection] = useState(null); // Para el modal de sub-sitios

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
            setSites(processSites(fetchedSites));
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
                <span className="ml-2" style={{ color: theme.textSecondary }}>Cargando grupos...</span>
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
            <div
                className="text-center p-10 rounded-xl border border-dashed"
                style={{ background: theme.surface, borderColor: theme.border }}
            >
                <Users size={48} className="mx-auto mb-4" style={{ color: theme.textSecondary }} />
                <h3 className="text-lg font-semibold" style={{ color: theme.text }}>Sin grupos seguidos</h3>
                <p className="text-sm max-w-sm mx-auto mt-2" style={{ color: theme.textSecondary }}>
                    No vemos grupos autorizados (Contabilidad, Auditoría, PRG). Asegúrate de tener permisos o seguir los sitios.
                </p>
            </div>
        );
    }

    return (
        <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {sites.map((site) => (
                    <div
                        key={site.id}
                        onClick={() => handleCardClick(site)}
                        className="group relative rounded-xl shadow-sm border overflow-hidden cursor-pointer hover:shadow-md transition-all"
                        style={{ background: theme.surface, borderColor: theme.border }}
                    >
                        {/* Header Colorido (Card Top) */}
                        <div className={`${getSiteColor(site.displayName)} h-20 p-4 flex justify-between items-start`}>
                            <div className="w-10 h-10 bg-white/20 rounded flex items-center justify-center text-white font-bold text-sm">
                                {getInitials(site.displayName)}
                            </div>
                            <Users className="text-white/80" size={18} />
                        </div>

                        {/* Content */}
                        <div className="p-4">
                            <h4 className="font-bold truncate mb-1" style={{ color: theme.text }} title={site.displayName}>
                                {site.displayName}
                            </h4>
                            <p className="text-xs" style={{ color: theme.textSecondary }}>
                                {site.isGroup ? `${site.subSites.length} grupos agrupados` : 'Grupo de Trabajo'}
                            </p>

                            <div className="mt-4 flex items-center text-blue-600 text-xs font-semibold opacity-0 group-hover:opacity-100 transition-opacity">
                                Ver archivos <ArrowRight size={12} className="ml-1" />
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Modal de Selección de Grupo (Contabilidad) */}
            {groupSelection && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center p-4"
                    style={{ background: 'rgba(0,0,0,0.7)' }}
                    onClick={() => setGroupSelection(null)}
                >
                    <div
                        className="rounded-xl shadow-2xl w-full max-w-lg overflow-hidden"
                        style={{ background: theme.surface }}
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="p-4 border-b" style={{ borderColor: theme.border }}>
                            <h3 className="font-bold" style={{ color: theme.text }}>Selecciona el grupo específico</h3>
                        </div>
                        <div className="p-4 grid gap-2">
                            {groupSelection.map(subSite => (
                                <button
                                    key={subSite.id}
                                    onClick={() => handleSiteClick(subSite)}
                                    className="flex items-center justify-between p-3 rounded-lg border hover:opacity-80 transition text-left"
                                    style={{ borderColor: theme.border, background: isDark ? '#1a1a2e' : '#f8f9fa' }}
                                >
                                    <span className="font-medium" style={{ color: theme.text }}>{subSite.displayName}</span>
                                    <ArrowRight size={16} style={{ color: theme.textSecondary }} />
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};
export default SharePointSites;
