"use client";
import React, { useState, useEffect } from 'react';
import { useMsal } from "@azure/msal-react";
import { loginRequest } from "@/lib/authConfig";
import { initializeGraphClient, getFollowedSites, getSiteDefaultDrive } from "@/lib/onedriveService";
import { useTheme } from "@/contexts/ThemeContext";
import { lightTheme, darkTheme } from "@/lib/colors";
import { Loader2, Users, ArrowRight, Search } from 'lucide-react';


const SharePointSites = ({ onSelectSite, role, currentUser }) => {
    const { instance, accounts } = useMsal();
    const { isDark } = useTheme();
    const theme = isDark ? darkTheme : lightTheme;

    const [sites, setSites] = useState([]);
    const [loading, setLoading] = useState(false);
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
            setSites(processSites(fetchedSites));
        } catch (err) {
            console.error("Error loading sites:", err);
            setError("No se pudieron cargar los grupos. Asegúrate de 'Seguir' los sitios en SharePoint.");
        } finally {
            setLoading(false);
        }
    };

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
            const name = site.displayName.toLowerCase();

            if (name.includes('contabilidad')) {
                contabilidadGroup.subSites.push(site);
                return;
            }

            if (name.includes('auditoria')) {
                const isAdmin = role === 'admin';
                const isValeria = currentUser?.username?.toLowerCase() === 'valeria';
                if (isAdmin || isValeria) {
                    processed.push(site);
                }
                return;
            }

            if (name.includes('prg auditores')) {
                processed.push(site);
                return;
            }
        });

        if (contabilidadGroup.subSites.length > 0) {
            processed.push(contabilidadGroup);
        }

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

    const [searchTerm, setSearchTerm] = useState('');

    // ... (rest of logic)

    return (
        <>
            <div className="space-y-4">
                {/* Search Bar for Sites */}
                <div className="flex gap-2 mb-4">
                    <div className="relative flex-1">
                        <input
                            type="text"
                            placeholder="Buscar grupo o carpeta..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 text-sm rounded-lg border focus:outline-none focus:ring-1 focus:ring-blue-500"
                            style={{
                                background: theme.surface,
                                color: theme.text,
                                borderColor: theme.border
                            }}
                        />
                        <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
                    </div>
                </div>

                {/* Folder Grid View */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {sites
                        .filter(site => site.displayName.toLowerCase().includes(searchTerm.toLowerCase()))
                        .map((site) => (
                            <div
                                key={site.id}
                                onClick={() => handleCardClick(site)}
                                className="group relative p-4 rounded-xl border transition-all hover:bg-opacity-50 cursor-pointer flex flex-col items-center gap-3 hover:shadow-sm"
                                style={{ background: theme.surface, borderColor: theme.border }}
                            >
                                <div className="relative">
                                    <div className="w-16 h-16 flex items-center justify-center bg-blue-50 dark:bg-blue-900/20 rounded-2xl">
                                        <Users className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                                    </div>
                                    {site.isGroup && (
                                        <span className="absolute -top-1 -right-1 bg-yellow-500 text-white text-[10px] px-1.5 py-0.5 rounded-full border border-white dark:border-gray-800">
                                            {site.subSites.length}
                                        </span>
                                    )}
                                </div>

                                <div className="text-center w-full">
                                    <h4 className="font-semibold text-sm truncate w-full px-2" style={{ color: theme.text }} title={site.displayName}>
                                        {site.displayName}
                                    </h4>
                                    <p className="text-xs mt-1" style={{ color: theme.textSecondary }}>
                                        {site.isGroup ? 'Carpeta de Grupo' : 'Sitio de Trabajo'}
                                    </p>
                                </div>
                            </div>
                        ))}
                </div>

                {sites.filter(site => site.displayName.toLowerCase().includes(searchTerm.toLowerCase())).length === 0 && (
                    <div className="text-center py-10 opacity-50">
                        <p>No se encontraron grupos con ese nombre.</p>
                    </div>
                )}
            </div>

            {/* Modal de Selección de Grupo (Contabilidad) */}
            {
                groupSelection && (
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
                )
            }
        </>
    );
};
export default SharePointSites;
