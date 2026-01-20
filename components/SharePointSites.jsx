"use client";
import React, { useState, useEffect } from 'react';
import { useMsal } from "@azure/msal-react";
import { loginRequest } from "@/lib/authConfig";
import { initializeGraphClient, getFollowedSites, getSiteDefaultDrive } from "@/lib/onedriveService";
import { useTheme } from "@/contexts/ThemeContext";
import { lightTheme, darkTheme } from "@/lib/colors";
import { Loader2, Users, ArrowRight, Search, RefreshCw } from 'lucide-react';
import { useSharePointData } from "@/contexts/SharePointContext";


// Helper to normalize strings
const normalize = (str) => {
    return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
};

const SharePointSites = ({ onSelectSite, role, currentUser }) => {
    const { instance, accounts } = useMsal();
    const { isDark } = useTheme();
    const theme = isDark ? darkTheme : lightTheme;

    // Use preloaded data from context
    const { sites: preloadedSites, loading: preloading, loadSites: preloadSites, isInitialized } = useSharePointData();

    const [sites, setSites] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [groupSelection, setGroupSelection] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');

    // Use preloaded sites if available, otherwise load manually
    useEffect(() => {
        if (isInitialized && preloadedSites.length > 0) {
            setSites(processSites(preloadedSites));
        } else if (accounts.length > 0 && role && !isInitialized) {
            loadSites();
        }
    }, [accounts, role, currentUser, isInitialized, preloadedSites]);

    const loadSites = async () => {
        setLoading(true);
        try {
            const request = { ...loginRequest, account: accounts[0] };
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
            displayName: 'Contabilidad',
            isGroup: true,
            subSites: []
        };

        const seenIds = new Set();

        rawSites.forEach(site => {
            if (seenIds.has(site.id)) return;
            seenIds.add(site.id);

            const name = normalize(site.displayName);

            // 1. BLACKLIST: Exclude "C LTDA" or specific noise
            if (name.includes('c ltda') || name.includes('cia. ltda')) return;

            // 2. CONTABILIDAD: Group all "Contabilidad" sites (Restricted)
            if (name.includes('contabilidad')) {
                const username = currentUser?.username?.toLowerCase() || '';
                const isAdmin = role === 'admin' || username === 'valeria';

                if (isAdmin) {
                    contabilidadGroup.subSites.push(site);
                }
                return;
            }

            // 3. AUDITORIA: Restricted Access
            if (name.includes('auditoria')) {
                // IMPORTANT: "PRG AUDITORES" does not contain "auditoria" (usually), 
                // but if it did, we'd handle it. "AUDITORIA" is the target.
                const username = currentUser?.username?.toLowerCase() || '';
                const isAdmin = role === 'admin' || username === 'valeria';

                if (isAdmin) {
                    processed.push(site);
                }
                return; // Hide for everyone else
            }

            // 4. PRG AUDITORES: Main Site (Allow for everyone)
            if (name.includes('prg auditores')) {
                processed.push(site);
                return;
            }

            // 5. OTHERS: Hide unknown sites to be safe (strict whitelist)
            // Only PRG, Contabilidad, and Auditoria (if admin) are allowed.
            // Anything else is considered noise and is skipped.
            return;
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

    // Duplicate useEffect and state moved to top

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

    if (accounts.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center p-10 h-64 text-center rounded-xl border border-dashed"
                style={{ borderColor: theme.border, background: theme.surface }}>
                <Users size={48} className="mb-4 text-gray-400" />
                <h3 className="text-xl font-semibold mb-2" style={{ color: theme.text }}>Conexión Requerida</h3>
                <p className="mb-6 max-w-md" style={{ color: theme.textSecondary }}>
                    Necesitamos conectar con tu cuenta de Microsoft para mostrar los grupos de SharePoint.
                </p>
                <button
                    onClick={() => instance.loginPopup(loginRequest).catch(e => console.log(e))}
                    className="px-6 py-2 rounded-lg font-medium text-white transition-colors flex items-center gap-2"
                    style={{ background: '#2A5C82' }}
                >
                    <Search size={18} />
                    Conectar Microsoft 365
                </button>
            </div>
        );
    }

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

    // searchTerm moved to top

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
                    <button
                        onClick={loadSites}
                        disabled={loading}
                        className="px-4 py-2 text-sm font-medium rounded-lg border transition-colors flex items-center gap-2 hover:bg-blue-50 dark:hover:bg-blue-900/20 disabled:opacity-50"
                        style={{ borderColor: theme.border, color: theme.text }}
                        title="Sincronizar grupos"
                    >
                        <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                        Sincronizar
                    </button>
                </div>

                {/* Folder Grid View */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {sites
                        .filter(site => site.displayName.toLowerCase().includes(searchTerm.toLowerCase()))
                        .map((site) => (
                            <div
                                key={site.id}
                                onClick={() => handleCardClick(site)}
                                className="group relative p-4 rounded-xl border transition-all duration-300 hover:scale-[1.02] hover:shadow-xl hover:border-blue-300/50 cursor-pointer flex flex-col items-center gap-3 animate-fade-in-up"
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
                                        className="flex items-center justify-between p-3 rounded-lg border transition-all duration-300 hover:scale-[1.02] hover:shadow-md hover:border-blue-300 transform text-left animate-fade-in"
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
