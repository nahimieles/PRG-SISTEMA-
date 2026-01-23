"use client";
import React, { useState, useEffect, useRef } from 'react';
import { useMsal } from "@azure/msal-react";
import { loginRequest } from "@/lib/authConfig";
import { initializeGraphClient, getFiles, searchFiles, deleteItem, createFolder, getPreviewUrl, renameItem, uploadFile, moveItem, getFollowedSites, getSiteDefaultDrive } from "@/lib/onedriveService";
// Add moveGroup to imports
import { getGroupsByParent, createGroup, updateGroup, deleteGroup, hasPermission, moveGroup } from "@/lib/groups"; // Added moveGroup
import { Folder, FileText, FileSpreadsheet, FileIcon, Download, Loader2, ArrowLeft, Search, RefreshCw, Trash2, FolderPlus, X, Edit2, Upload, MoreVertical, Scissors, ClipboardPaste, Plus, Image as ImageIcon, Settings } from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { logAuditAction } from '@/lib/audit';
import { useTheme } from "@/contexts/ThemeContext";
import { lightTheme, darkTheme } from "@/lib/colors";
import SharePointSites from "./SharePointSites";

// Helper to normalize strings
const normalize = (str) => {
    return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
};


// ... (rest of imports)


const OneDriveExplorer = ({ driveId: propDriveId, siteName = "", currentUser, role }) => {
    const { instance, accounts } = useMsal(); // Restored
    const { isDark } = useTheme(); // Restored
    const theme = isDark ? darkTheme : lightTheme; // Restored

    // Navigation: { id, name, type, resourceId, driveId }
    // If propDriveId is provided (legacy mode), we start with it. Otherwise 'root' has no driveId.
    const [breadcrumbs, setBreadcrumbs] = useState([
        { id: 'root', name: 'Inicio', type: 'root', resourceId: null, driveId: propDriveId || null }
    ]);
    const currentPath = breadcrumbs[breadcrumbs.length - 1];

    // Derived driveId from current path (or props if locked)
    const effectiveDriveId = currentPath.driveId || propDriveId;

    // State definitions
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [viewMode, setViewMode] = useState('grid');
    const [activeMenu, setActiveMenu] = useState(null);
    const [clipboard, setClipboard] = useState(null);
    const fileInputRef = useRef(null);

    const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);

    // ... (useEffect for auth remains)

    // Load Content
    useEffect(() => {
        if (currentUser) {
            loadContent();
        }
    }, [currentPath, searchTerm, currentUser, role]); // Trigger on path change (effectiveDriveId changes with path)

    const loadContent = async () => {
        setLoading(true);
        setError(null);
        try {
            let mixedContent = [];

            // SEARCH
            if (searchTerm.trim().length > 0) {
                // If we have a drive context, search it. If not, search groups? 
                // For now, search only if we are in a drive context.
                if (effectiveDriveId) {
                    const fileResults = await searchFiles(searchTerm, effectiveDriveId, "root");
                    mixedContent = fileResults.map(f => ({ ...f, type: f.folder ? 'folder' : 'file' }));
                }
                // TODO: Search groups if no driveId
            } else {
                // NORMAL LISTING
                const { id, type } = currentPath;

                // A. Fetch Groups (Virtual Children)
                // We fetch groups if we are at Root OR inside a Group.
                // Even if we are in a "Linked Group" (which acts as a Drive Root), we might want to show sub-groups?
                // The user said "Groups containing SharePoint Groups".
                // So yes, we can mix.

                // A. Fetch Groups (Virtual Children)
                let groups = [];
                // Only fetch groups if we are NOT inside a physical SharePoint folder (type='folder')
                const isSharePointSiteId = (str) => str && str.includes(',');

                if (type === 'root' || (type === 'group' && !isSharePointSiteId(id))) {
                    const parentId = type === 'root' ? null : id;
                    try {
                        groups = await getGroupsByParent(parentId);
                    } catch (e) {
                        console.error("Error loading groups:", e);
                        // Don't block everything if groups fail, but log it
                    }
                }

                // B. Fetch Sharepoint Sites (Root Only - Visibility for Moving)
                let spSites = [];
                if (type === 'root') {
                    try {
                        const rawSites = await getFollowedSites();
                        spSites = processSitesForExplorer(rawSites);
                    } catch (e) {
                        console.warn("Error fetching sites", e);
                    }
                }

                // C. Fetch Files (SharePoint)
                let files = [];
                if (effectiveDriveId) {
                    const targetFolderId = (type === 'folder') ? id : 'root';
                    try {
                        files = await getFiles(targetFolderId, effectiveDriveId);
                    } catch (e) {
                        console.error("Error fetching files:", e);
                        setError("Error cargando archivos: " + e.message);
                    }
                }

                // D. Merge
                // ... (mapping logic) ...

                const formattedGroups = groups.map(g => ({
                    id: g.id,
                    name: g.name,
                    type: 'group',
                    icon: g.icon,
                    color: g.color || '#3b82f6',
                    description: g.description,
                    image_url: g.image_url,
                    resource_id: g.resource_id,
                    permissions: g.permissions,
                    lastModifiedDateTime: g.updated_at
                }));

                const formattedSites = spSites.map(s => ({
                    id: s.id,
                    name: s.displayName,
                    type: 'site',
                    icon: 'Globe',
                    color: '#059669', // Emerald
                    description: s.description || 'Sitio de SharePoint',
                    lastModifiedDateTime: new Date().toISOString()
                }));

                const formattedFiles = files.filter(f => !['Forms', 'Site Assets', 'Style Library'].includes(f.name)).map(f => ({
                    id: f.id,
                    name: f.name,
                    type: f.folder ? 'folder' : 'file',
                    webUrl: f.webUrl,
                    lastModifiedDateTime: f.lastModifiedDateTime,
                    item: f
                }));

                mixedContent = [...formattedGroups, ...formattedSites, ...formattedFiles];
            }
            setItems(mixedContent);

        } catch (err) {
            console.error(err);
            setError("Error cargando contenido.");
        } finally {
            setLoading(false);
        }
    };

    // Navigation Helpers
    const navigateUp = () => {
        if (breadcrumbs.length > 1) {
            setBreadcrumbs(prev => prev.slice(0, prev.length - 1));
        }
    };

    const handleCreateGroup = async (name) => {
        if (role === 'worker') return alert("No tienes permisos para crear grupos.");
        try {
            await createGroup({
                name,
                parent_id: currentPath.type === 'root' ? null : currentPath.id,
                icon: 'Folder',
                type: 'group'
            }); // Simple default
            loadContent();
        } catch (e) {
            console.error(e);
            alert("Error creando grupo");
        }
    };

    const handleCreateSPFolder = async (name) => {
        if (role === 'worker') return alert("No tienes permisos para crear carpetas.");
        if (!effectiveDriveId) return;
        try {
            const parentId = currentPath.type === 'folder' ? currentPath.id : 'root';
            await createFolder(name, parentId, effectiveDriveId);
            loadContent();
        } catch (e) {
            alert("Error creando carpeta en SharePoint");
        }
    };

    const handleFileUpload = async (e) => {
        if (!e.target.files?.length) return;
        if (!effectiveDriveId) return;

        setLoading(true);
        try {
            const parentId = currentPath.type === 'folder' ? currentPath.id : 'root';
            await uploadFile(e.target.files[0], parentId, effectiveDriveId);
            loadContent();
        } catch (e) {
            console.error(e);
            alert("Error subiendo archivo");
        } finally {
            setLoading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    // Filter Logic (Replicated from SharePointSites)
    const processSitesForExplorer = (rawSites) => {
        const processed = [];
        const seenIds = new Set();

        rawSites.forEach(site => {
            if (seenIds.has(site.id)) return;
            seenIds.add(site.id);

            const name = normalize(site.displayName);

            // 1. BLACKLIST
            if (name.includes('c ltda') || name.includes('cia. ltda')) return;

            // 2. PERMISSIONS
            const username = currentUser?.username?.toLowerCase() || '';
            const isAdmin = role === 'admin' || username === 'valeria';

            // Contabilidad
            if (name.includes('contabilidad')) {
                if (isAdmin) processed.push(site);
                return;
            }

            // Auditoria
            if (name.includes('auditoria')) {
                if (isAdmin) processed.push(site);
                return;
            }

            // PRG
            if (name.includes('prg')) {
                processed.push(site);
                return;
            }
        });
        return processed;
    };

    const handleNavigate = (item) => {
        setSearchTerm('');
        if (item.type === 'site') {
            // Navigate into a Raw Site -> Treat as Root of that Drive
            const resolveSite = async () => {
                setLoading(true);
                try {
                    const dId = await getSiteDefaultDrive(item.id);

                    if (!dId) throw new Error("No Drive ID found for this site");

                    setBreadcrumbs(prev => [...prev, {
                        id: item.id,
                        name: item.name,
                        type: 'group', // Switch to 'group' view mode for simplicity
                        resourceId: dId,
                        driveId: dId
                    }]);
                } catch (e) {
                    console.error("Error resolving site:", e);
                    alert("Error accediendo al sitio: " + e.message);
                } finally {
                    setLoading(false);
                }
            };
            resolveSite();
        } else if (item.type === 'group') {
            // Group Navigation
            // Check if this group links to a Drive
            const linkedDriveId = item.resource_id;
            // If it links, the new path has that driveId. If not, it inherits null (or prop).
            const nextDriveId = linkedDriveId || null;

            setBreadcrumbs(prev => [...prev, {
                id: item.id,
                name: item.name,
                type: 'group',
                resourceId: item.resource_id,
                driveId: nextDriveId
            }]);
        } else if (item.folder || item.type === 'folder') {
            // Folder Navigation (Physical)
            // Functionally, we must stay in the current drive context
            setBreadcrumbs(prev => [...prev, {
                id: item.id,
                name: item.name,
                type: 'folder',
                resourceId: null,
                driveId: currentPath.driveId // Carry over
            }]);
        } else {
            openPreview(item.item || item);
        }
    };

    // ... (handleCreateGroup, handleCreateSPFolder updated to use effectiveDriveId)
    // Helper
    const getCurrentSPTarget = () => {
        if (effectiveDriveId) {
            return currentPath.type === 'folder' ? currentPath.id : 'root';
        }
        return null;
    };

    // ... (rest of actions using getCurrentSPTarget or createGroup)

    const handleLinkSite = async (site, driveId) => {
        // Create a group that acts as a shortcut
        if (!driveId) return alert("Error: Sitio sin Drive ID");
        try {
            await createGroup({
                name: site.displayName || site.name,
                parent_id: currentPath.type === 'root' ? null : currentPath.id,
                type: 'group',
                resource_id: driveId,
                icon: 'Cloud', // Special icon
                description: 'Sitio de SharePoint Vinculado'
            });
            setIsLinkModalOpen(false);
            loadContent();
        } catch (e) {
            console.error(e);
            alert("Error al vincular sitio");
        }
    };

    // ... (render)

    {/* Add Link Button */ }
    {
        (currentPath.type === 'root' || currentPath.type === 'group') && (
            <>
                <button
                    onClick={() => setIsLinkModalOpen(true)}
                    className="p-2 rounded-xl bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/20 hover:bg-green-500/20 transition flex items-center gap-2"
                    title="Vincular SharePoint"
                >
                    <LucideIcons.Link size={18} />
                    <span className="hidden sm:inline text-xs font-bold">Vincular</span>
                </button>
            </>
        )
    }

    // ... inside return, add Modal
    {
        isLinkModalOpen && (
            <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setIsLinkModalOpen(false)}>
                <div className="w-full max-w-2xl bg-white dark:bg-gray-900 rounded-2xl shadow-2xl overflow-hidden max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
                    <div className="p-4 border-b flex justify-between items-center">
                        <h3 className="font-bold">Seleccionar Sitio para Vincular</h3>
                        <button onClick={() => setIsLinkModalOpen(false)}><X /></button>
                    </div>
                    <div className="flex-1 overflow-auto p-4">
                        <SharePointSites
                            onSelectSite={handleLinkSite}
                            currentUser={currentUser}
                            role={role}
                            mode="picker"
                        />
                    </div>
                </div>
            </div>
        )
    }

    // ... rest of render


    const handleDelete = async (item) => {
        if (role === 'worker') return alert("No tienes permisos para eliminar.");
        if (!confirm(`¿Eliminar "${item.name}"?`)) return;
        try {
            if (item.type === 'group') {
                await deleteGroup(item.id);
            } else {
                await deleteItem(item.id, driveId);
                await logAuditAction({
                    action_type: 'DELETE',
                    file_name: item.name,
                    file_path: item.name,
                    worker_name: currentUser?.full_name,
                    metadata: { driveId }
                });
            }
            loadContent();
        } catch (e) { alert("Error al eliminar"); }
    };

    const handleRename = async (item) => {
        if (role === 'worker') return alert("No tienes permisos para renombrar.");
        const newName = prompt("Nuevo nombre:", item.name);
        if (!newName || !newName.trim()) return;
        try {
            if (item.type === 'group') {
                await updateGroup(item.id, { name: newName });
            } else {
                await renameItem(item.id, newName, driveId);
                await logAuditAction({
                    action_type: 'RENAME',
                    file_name: item.name,
                    file_path: newName, // New name
                    worker_name: currentUser?.full_name,
                    metadata: { driveId, oldName: item.name }
                });
            }
            loadContent();
        } catch (e) { alert("Error al renombrar"); }
    };

    // Placeholder for Cut/Paste if needed, or remove if unused in new logic for simplicity first
    const handleCut = (item) => {
        if (role === 'worker') return alert("No tienes permisos para mover elementos.");
        // if (item.type === 'group') return alert("No se puede mover grupos aún."); // REMOVED CONSTRAINT
        setClipboard({ item, action: 'cut', sourceFolder: getCurrentSPTarget() });
        setActiveMenu(null);
    };

    const handlePaste = async () => {
        if (!clipboard) return;

        // Determine Target
        const targetId = currentPath.id === 'root' ? null : currentPath.id; // For Groups: null=root
        const targetType = currentPath.type;

        setLoading(true);
        try {
            if (clipboard.item.type === 'group') {
                // MOVE GROUP
                if (targetType === 'folder' && !currentPath.resourceId) {
                    throw new Error("No puedes mover un grupo dentro de una carpeta física de SharePoint (solo dentro de otros grupos o raíz virtual).");
                }
                await moveGroup(clipboard.item.id, targetId);

            } else if (clipboard.item.type === 'site') {
                // LINK SITE (Move "Raw Site" -> "Group")
                // 1. Get Drive ID
                const driveId = await getSiteDefaultDrive(clipboard.item.id);
                // 2. Create Group Linked
                await createGroup({
                    name: clipboard.item.name,
                    parent_id: targetId,
                    type: 'group',
                    resource_id: driveId,
                    icon: 'Cloud',
                    description: 'Sitio de SharePoint vinculado'
                });
                // We don't "delete" the source site because it's a raw site from Graph, we just created a link.

            } else {
                // MOVE FILE
                const destId = getCurrentSPTarget();
                if (!destId) throw new Error("Destino inválido para archivo.");
                await moveItem(clipboard.item.id, destId, driveId);
                await logAuditAction({
                    action_type: 'MOVE',
                    file_name: clipboard.item.name,
                    file_path: 'Moved to ' + destId,
                    worker_name: currentUser?.full_name,
                    metadata: { driveId, source: clipboard.sourceFolder, dest: destId }
                });
            }

            setClipboard(null);
            loadContent();
            alert("Movido correctamente");
        } catch (e) {
            console.error(e);
            alert(`Error al mover: ${e.message || e}`);
        } finally {
            setLoading(false);
        }
    };

    const getFileIcon = (fileName) => {
        if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) return <FileSpreadsheet className="text-green-600" />;
        if (fileName.endsWith('.docx') || fileName.endsWith('.doc')) return <FileText className="text-blue-600" />;
        if (fileName.endsWith('.pdf')) return <FileText className="text-red-600" />;
        return <FileIcon className="text-gray-500" />;
    };

    const [previewFile, setPreviewFile] = useState(null);

    const openPreview = (file) => {
        setPreviewFile(file);
    };

    const closePreview = () => {
        setPreviewFile(null);
    };

    if (accounts.length === 0) {
        return (
            <div
                className="flex flex-col items-center justify-center p-10 rounded-lg border border-dashed"
                style={{ background: theme.surface, borderColor: theme.border }}
            >
                <p className="text-lg mb-4" style={{ color: theme.textSecondary }}>Conecta tu cuenta para ver tus archivos</p>
                <button
                    onClick={() => instance.loginPopup(loginRequest).catch(e => console.log(e))}
                    className="bg-[#2A5C82] text-white px-6 py-2 rounded-lg hover:bg-[#1e4a6d] transition-colors"
                >
                    Conectar OneDrive
                </button>
            </div>
        );
    }

    return (
        <div
            className="rounded-xl shadow-lg overflow-hidden border"
            style={{ background: theme.surface, borderColor: theme.border }}
        >
            {/* Overlay for closing menu */}
            {activeMenu && <div className="fixed inset-0 z-30" onClick={() => setActiveMenu(null)} />}

            {/* Header / Toolbar */}
            <div className="p-4 border-b flex items-center justify-between flex-wrap gap-4" style={{ borderColor: theme.border }}>
                <div className="flex items-center gap-2 overflow-hidden">
                    {breadcrumbs.length > 1 && (
                        <button onClick={navigateUp} className="p-1 hover:opacity-70 rounded-full transition cursor-pointer">
                            <ArrowLeft size={20} style={{ color: theme.text }} />
                        </button>
                    )}
                    <div className="flex items-center gap-1 text-sm font-semibold truncate" style={{ color: theme.text }}>
                        {breadcrumbs.length > 3 ? (
                            <>
                                <span className="opacity-50">...</span>
                                <span className="opacity-50">/</span>
                                <span>{breadcrumbs[breadcrumbs.length - 2].name}</span>
                                <span className="opacity-50">/</span>
                            </>
                        ) : breadcrumbs.slice(0, -1).map((crumb, i) => (
                            <React.Fragment key={crumb.id}>
                                <span
                                    className="opacity-50 hover:opacity-100 cursor-pointer hover:underline"
                                    onClick={() => {
                                        // Navigate to this crumb
                                        const idx = breadcrumbs.findIndex(b => b.id === crumb.id);
                                        setBreadcrumbs(breadcrumbs.slice(0, idx + 1));
                                    }}
                                >
                                    {crumb.name}
                                </span>
                                <span className="opacity-50">/</span>
                            </React.Fragment>
                        ))}
                        <span className="text-blue-500">{currentPath.name}</span>
                    </div>
                </div>

                <div className="flex gap-2 items-center ml-auto">
                    <div className="relative hidden md:block">
                        <input
                            type="text"
                            placeholder="Buscar..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-8 pr-4 py-1.5 text-sm rounded-lg border focus:outline-none focus:ring-1 focus:ring-blue-500 w-48 transition-all focus:w-64"
                            style={{
                                background: isDark ? 'rgba(255,255,255,0.05)' : 'white',
                                color: theme.text,
                                borderColor: theme.border
                            }}
                        />
                        <Search className="absolute left-2 top-2 text-gray-400" size={16} />
                    </div>

                    <div className="h-6 w-px bg-gray-300 dark:bg-gray-700 mx-1"></div>

                    {/* Action Buttons */}
                    <button
                        onClick={() => loadContent()}
                        disabled={loading}
                        className="p-2 rounded-lg border hover:bg-opacity-50 transition cursor-pointer disabled:opacity-50"
                        style={{ borderColor: theme.border }}
                        title="Actualizar"
                    >
                        <RefreshCw size={16} className={loading ? 'animate-spin' : ''} style={{ color: theme.text }} />
                    </button>

                    {/* NEW: Paste Button */}
                    {clipboard && (
                        <button
                            onClick={handlePaste}
                            className="p-2 rounded-lg border hover:bg-opacity-50 transition cursor-pointer bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800"
                            title={`Pegar ${clipboard.action === 'cut' ? 'cortado' : 'copiado'}`}
                        >
                            <ClipboardPaste size={16} />
                        </button>
                    )}

                    {/* NEW: Upload (Only if SP context) */}
                    {getCurrentSPTarget() && (
                        <>
                            <input
                                type="file"
                                ref={fileInputRef}
                                onChange={handleFileUpload}
                                className="hidden"
                            />
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                className="p-2 rounded-lg border hover:bg-opacity-50 transition cursor-pointer"
                                style={{ borderColor: theme.border }}
                                title="Subir Archivo"
                            >
                                <Upload size={16} style={{ color: theme.text }} />
                            </button>
                        </>
                    )}

                    {/* NEW: Create Group (Only valid contexts) */}
                    {(currentPath.type === 'root' || currentPath.type === 'group') && (
                        <button
                            onClick={() => {
                                // Simple Prompt for now, full modal later if needed
                                const name = prompt("Nombre del Grupo:");
                                if (name && name.trim()) handleCreateGroup(name.trim());
                            }}
                            className="flex items-center gap-2 px-3 py-1.5 rounded-lg border hover:bg-opacity-50 transition cursor-pointer bg-blue-500/10 border-blue-500/20 text-blue-600 dark:text-blue-400"
                            title="Nuevo Grupo"
                        >
                            <Plus size={16} />
                            <span className="text-xs font-bold hidden sm:inline">Grupo</span>
                        </button>
                    )}

                    {/* NEW: Create Folder (Only if SP context) */}
                    {getCurrentSPTarget() && (
                        <button
                            onClick={async () => {
                                const name = prompt('Nombre de la carpeta:');
                                if (name && name.trim()) handleCreateSPFolder(name.trim());
                            }}
                            className="flex items-center gap-2 px-3 py-1.5 rounded-lg border hover:bg-opacity-50 transition cursor-pointer"
                            style={{ borderColor: theme.border }}
                            title="Nueva Carpeta SharePoint"
                        >
                            <FolderPlus size={16} style={{ color: theme.text }} />
                            <span className="text-xs font-bold hidden sm:inline">Carpeta</span>
                        </button>
                    )}

                    <button
                        onClick={() => setViewMode(prev => prev === 'grid' ? 'list' : 'grid')}
                        className="p-2 rounded-lg border hover:bg-opacity-50 transition cursor-pointer"
                        style={{ borderColor: theme.border }}
                    >
                        {viewMode === 'grid' ? (
                            <div className="flex gap-0.5"><div className="w-1 h-1 bg-current rounded-full"></div><div className="w-1 h-1 bg-current rounded-full"></div><div className="w-1 h-1 bg-current rounded-full"></div></div>
                        ) : (
                            <div className="flex flex-col gap-0.5"><div className="w-3 h-0.5 bg-current rounded-full"></div><div className="w-3 h-0.5 bg-current rounded-full"></div></div>
                        )}
                    </button>
                </div>
            </div>

            <div className="p-4 min-h-[300px]">
                {loading ? (
                    <div className={viewMode === 'grid' ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4" : "flex flex-col gap-2"}>
                        {[1, 2, 3, 4, 5].map((i) => (
                            <div
                                key={i}
                                className={`rounded-xl border animate-pulse p-3 ${viewMode === 'list' ? 'flex items-center gap-4 h-16' : 'h-40 flex flex-col items-center justify-center gap-4'}`}
                                style={{ background: isDark ? 'rgba(255,255,255,0.05)' : '#f3f4f6', borderColor: 'transparent' }}
                            >
                                <div className={`bg-gray-300 dark:bg-gray-700 rounded-lg ${viewMode === 'list' ? 'w-10 h-10' : 'w-16 h-16'}`}></div>
                                <div className="space-y-2 w-full px-2">
                                    <div className="h-3 bg-gray-300 dark:bg-gray-700 rounded w-3/4 mx-auto"></div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : error ? (
                    <div className="text-red-500 text-center p-4 bg-red-50 dark:bg-red-900/10 rounded-lg">{error}</div>
                ) : items.length === 0 ? (
                    <div className="text-center p-12 flex flex-col items-center gap-4" style={{ color: theme.textSecondary }}>
                        <div className="p-4 rounded-full bg-gray-100 dark:bg-gray-800">
                            <Folder size={48} className="opacity-20" />
                        </div>
                        <p>Carpeta vacía</p>
                    </div>
                ) : (
                    <div className={viewMode === 'grid' ? "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4" : "flex flex-col gap-2"}>
                        {items
                            .map((item) => {
                                // Determine Icon
                                const isGroup = item.type === 'group' || item.type === 'site';
                                const Icon = isGroup ? (LucideIcons[item.icon] || Folder) : (item.type === 'folder' ? Folder : getFileIcon(item.name)?.type || FileIcon);
                                const itemColor = isGroup ? (item.color || '#0078d4') : (item.type === 'folder' ? '#fbbf24' : '#6b7280');

                                const getInitials = (n) => n.split(' ').map(c => c[0]).slice(0, 2).join('').toUpperCase();

                                // Only show "Card Style" if at Root AND it's a group/site
                                const showAsCard = isGroup && currentPath.type === 'root';

                                return (
                                    <div
                                        key={item.id}
                                        className={`group relative transition-all duration-200 hover:shadow-lg cursor-pointer flex flex-col overflow-hidden bg-white dark:bg-gray-800 border dark:border-gray-700
                                        ${viewMode === 'list' ? 'flex-row items-center gap-4 p-3 min-h-[64px] rounded-lg' : 'shadow-sm rounded-xl ' + (showAsCard ? 'h-40' : 'aspect-[4/3]')}`}
                                        style={{ borderColor: theme.border }}
                                        onClick={() => handleNavigate(item)}
                                    >
                                        {/* Menu Trigger */}
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setActiveMenu(activeMenu === item.id ? null : item.id);
                                            }}
                                            className="absolute top-2 right-2 p-1.5 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 z-10 transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                                        >
                                            <MoreVertical size={16} color={theme.text} />
                                        </button>

                                        {/* Context Menu Dropdown */}
                                        {activeMenu === item.id && (
                                            <div className="absolute right-2 top-8 w-40 bg-white dark:bg-[#1f2937] shadow-xl rounded-lg z-20 border border-gray-200 dark:border-gray-700 overflow-hidden text-sm" onClick={e => e.stopPropagation()}>
                                                <button onClick={() => { setActiveMenu(null); handleRename(item); }} className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center gap-2">
                                                    <Edit2 size={14} /> Renombrar
                                                </button>
                                                <button onClick={() => { setActiveMenu(null); handleDelete(item); }} className="w-full text-left px-4 py-2 hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 flex items-center gap-2">
                                                    <Trash2 size={14} /> Eliminar
                                                </button>
                                                {item.type !== 'group' && item.type !== 'site' && (
                                                    <button onClick={() => handleCut(item)} className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center gap-2 border-t border-gray-100 dark:border-gray-700">
                                                        <Scissors size={14} /> Cortar
                                                    </button>
                                                )}
                                            </div>
                                        )}

                                        {viewMode === 'grid' ? (
                                            // GRID VIEW
                                            showAsCard ? (
                                                // SHAREPOINT CARD STYLE (Only at Root)
                                                <div className="flex flex-col h-full w-full">
                                                    {/* Header Color Strip / Initials */}
                                                    <div className="p-4 flex justify-between items-start">
                                                        <div
                                                            className="w-10 h-10 flex items-center justify-center text-white font-bold text-sm shadow-sm select-none"
                                                            style={{ backgroundColor: itemColor }}
                                                        >
                                                            {getInitials(item.name)}
                                                        </div>
                                                        <LucideIcons.Star size={16} className="text-gray-300 dark:text-gray-600 group-hover:block hidden" />
                                                    </div>

                                                    {/* Content */}
                                                    <div className="px-4 pb-4 flex-1 flex flex-col justify-end">
                                                        <h3 className="font-bold text-gray-800 dark:text-gray-100 text-sm leading-tight line-clamp-2" title={item.name}>
                                                            {item.name}
                                                        </h3>
                                                        <p className="text-[11px] text-gray-500 mt-1 uppercase tracking-wide">Grupo</p>
                                                    </div>
                                                </div>
                                            ) : (
                                                // FILE / FOLDER / GROUP (internal navigation)
                                                <div className="flex flex-col items-center justify-center p-4 h-full relative group/icon">
                                                    <div className="mb-3 transition-transform duration-200 group-hover/icon:scale-110">
                                                        {item.type === 'folder' ?
                                                            <Folder size={48} className="text-yellow-400 fill-yellow-400/20" /> :
                                                            isGroup ? <Icon size={40} color={itemColor} /> :
                                                                <div className="scale-125">{getFileIcon(item.name)}</div>
                                                        }
                                                    </div>
                                                    <p className="text-xs text-center font-medium text-gray-700 dark:text-gray-300 px-2 w-full truncate">
                                                        {item.name}
                                                    </p>
                                                    <p className="text-[10px] text-gray-400 mt-1">
                                                        {isGroup ? 'Grupo' : new Date(item.lastModifiedDateTime).toLocaleDateString()}
                                                    </p>
                                                </div>
                                            )
                                        ) : (
                                            // LIST VIEW
                                            <>
                                                <div className="w-10 h-10 rounded text-white flex items-center justify-center font-bold" style={{ backgroundColor: isGroup ? itemColor : (item.type === 'folder' ? '#fbbf24' : 'transparent') }}>
                                                    {isGroup ? getInitials(item.name) : (item.type === 'folder' ? <Folder size={20} className="text-white" /> : <div className="scale-75">{getFileIcon(item.name)}</div>)}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-medium text-sm truncate" style={{ color: theme.text }}>{item.name}</p>
                                                    <p className="text-[10px] opacity-60 m-0 p-0 line-clamp-1" style={{ color: theme.textSecondary }}>
                                                        {isGroup ? 'Grupo de Trabajo' : `Modificado: ${new Date(item.lastModifiedDateTime).toLocaleDateString()}`}
                                                    </p>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                )
                            })}
                    </div>
                )}
            </div>

            {/* Modal de Vista Previa (Sin Blur Pesado) */}
            {previewFile && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center p-4"
                    style={{ background: 'rgba(0,0,0,0.85)' }}
                    onClick={closePreview}
                >
                    <div
                        className="rounded-2xl shadow-2xl w-full max-w-5xl h-[90vh] flex flex-col overflow-hidden"
                        style={{ background: theme.surface }}
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="p-4 border-b flex justify-between items-center" style={{ borderColor: theme.border }}>
                            <div>
                                <h3 className="font-bold text-lg truncate pr-4" style={{ color: theme.text }}>{previewFile.name}</h3>
                                <p className="text-xs" style={{ color: theme.textSecondary }}>
                                    Modificado por: <strong>{previewFile.lastModifiedBy?.user?.displayName || 'Desconocido'}</strong> el {new Date(previewFile.lastModifiedDateTime).toLocaleString()}
                                </p>
                            </div>
                            <button onClick={closePreview} className="p-2 hover:opacity-70 rounded-full transition cursor-pointer">
                                <X size={24} style={{ color: theme.text }} />
                            </button>
                        </div>

                        <div className="flex-1 p-4 flex flex-col items-center justify-center gap-6 overflow-y-auto" style={{ background: isDark ? '#111' : '#f3f4f6' }}>
                            {/* Show thumbnail or file icon */}
                            {previewFile.thumbnails && previewFile.thumbnails.length > 0 ? (
                                <img
                                    src={previewFile.thumbnails[0].large?.url || previewFile.thumbnails[0].medium?.url || previewFile.thumbnails[0].small?.url}
                                    alt={previewFile.name}
                                    className="max-h-[50vh] w-auto shadow-2xl rounded-lg object-contain"
                                />
                            ) : (
                                <div className="w-32 h-32 flex items-center justify-center rounded-2xl shadow-lg" style={{ background: theme.surface }}>
                                    <div className="scale-[3]">
                                        {getFileIcon(previewFile.name)}
                                    </div>
                                </div>
                            )}

                            <p className="text-sm text-center" style={{ color: theme.textSecondary }}>
                                Haz clic en "Abrir en Office" para ver y editar el documento completo.
                            </p>

                            <div className="flex gap-3 flex-wrap justify-center">
                                <a
                                    href={previewFile.webUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    onClick={() => {
                                        // Log "Edit/Open" Intent
                                        logAuditAction({
                                            action_type: 'OPEN_EDIT', // Custom type for tracking "edits" (proxy)
                                            file_name: previewFile.name,
                                            file_path: currentFolder === 'root' ? '/' : folderHistory.map(f => f.name).join('/') + '/',
                                            worker_name: currentUser?.full_name || 'Desconocido',
                                            metadata: { driveId, url: previewFile.webUrl }
                                        });
                                    }}
                                    className="flex items-center gap-2 bg-[#2A5C82] text-white px-5 py-2.5 rounded-xl font-bold hover:opacity-90 transition shadow-xl cursor-pointer"
                                >
                                    <FileIcon size={18} />
                                    Abrir en Office
                                </a>
                                <button
                                    onClick={async () => {
                                        const newName = prompt('Nuevo nombre:', previewFile.name);
                                        if (!newName || !newName.trim() || newName === previewFile.name) return;
                                        try {
                                            await renameItem(previewFile.id, newName.trim(), driveId);
                                            closePreview();
                                            // Clear cache and reload
                                            setFolderCache({});
                                            loadFiles(currentFolder);
                                        } catch (e) {
                                            alert('Error al renombrar');
                                        }
                                    }}
                                    className="flex items-center gap-2 bg-amber-100 text-amber-700 px-5 py-2.5 rounded-xl font-semibold hover:bg-amber-200 transition cursor-pointer"
                                >
                                    <Edit2 size={18} />
                                    Renombrar
                                </button>
                                <button
                                    onClick={async () => {
                                        if (!confirm(`¿Eliminar "${previewFile.name}"? Esta acción no se puede deshacer.`)) return;
                                        try {
                                            await deleteItem(previewFile.id, driveId);
                                            closePreview();
                                            // Clear cache and reload
                                            setFolderCache({});
                                            loadFiles(currentFolder);
                                        } catch (e) {
                                            alert('Error al eliminar');
                                        }
                                    }}
                                    className="flex items-center gap-2 bg-red-100 text-red-700 px-5 py-2.5 rounded-xl font-semibold hover:bg-red-200 transition cursor-pointer"
                                >
                                    <Trash2 size={18} />
                                    Eliminar
                                </button>
                            </div>
                            <p className="text-xs text-gray-500 text-center max-w-lg">
                                Tip: Para editar, abre en Office. Los cambios se guardarán automáticamente.
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
export default OneDriveExplorer;
