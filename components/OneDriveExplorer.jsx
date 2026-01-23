"use client";
import React, { useState, useEffect, useRef } from 'react';
import { useMsal } from "@azure/msal-react";
import { loginRequest } from "@/lib/authConfig";
import { initializeGraphClient, getFiles, searchFiles, deleteItem, createFolder, getPreviewUrl, renameItem, uploadFile, moveItem } from "@/lib/onedriveService";
// Add moveGroup to imports
import { getGroupsByParent, createGroup, updateGroup, deleteGroup, hasPermission, moveGroup } from "@/lib/groups"; // Added moveGroup

// ... (rest of imports)

// ... (inside component)

// CUT / PASTE (MOVE) LOGIC
const handleCut = (item) => {
    // Now allows groups!
    setClipboard({ item, action: 'cut', sourceFolder: currentPath });
    setActiveMenu(null);
    toast.info(`Portapapeles: ${item.name}`); // Feedback
};

const handlePaste = async () => {
    if (!clipboard) return;

    // Determine Target
    const targetId = currentPath.id === 'root' ? null : currentPath.id; // For Groups: null=root
    const targetType = currentPath.type;

    // SP Target (for files)
    const spTargetId = getCurrentSPTarget();

    setLoading(true);
    try {
        if (clipboard.item.type === 'group') {
            // MOVE GROUP
            if (targetType === 'folder' && !currentPath.resourceId) {
                throw new Error("No puedes mover un grupo dentro de una carpeta física de SharePoint (solo dentro de otros grupos o raíz virtual).");
            }

            // If we are int a 'group' path, parent is id. If root, parent is null.
            await moveGroup(clipboard.item.id, targetId);

        } else {
            // MOVE FILE
            const destId = getCurrentSPTarget();
            if (!destId) throw new Error("Destino inválido para archivo.");
            await moveItem(clipboard.item.id, destId, driveId);
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

// ... (rendering)

return (
    <div
        className="rounded-2xl shadow-2xl overflow-hidden border border-white/20 backdrop-blur-xl" // Glassmorphism container
        style={{
            background: isDark ? 'rgba(30, 41, 59, 0.7)' : 'rgba(255, 255, 255, 0.8)',
            borderColor: theme.border
        }}
    >
        {/* Header / Toolbar - Enhanced */}
        <div className="p-5 border-b flex items-center justify-between flex-wrap gap-4 bg-gradient-to-r from-transparent via-white/5 to-transparent" style={{ borderColor: theme.border }}>
            {/* ... (breadcrumb logic same as before but styled) ... */}
            <div className="flex items-center gap-2 overflow-hidden">
                {breadcrumbs.length > 1 && (
                    <button onClick={navigateUp} className="p-2 hover:bg-black/5 dark:hover:bg-white/10 rounded-full transition cursor-pointer">
                        <ArrowLeft size={20} style={{ color: theme.text }} />
                    </button>
                )}
                {/* ... breadcrumbs ... */}
                <div className="flex items-center gap-1 text-sm font-bold tracking-tight truncate" style={{ color: theme.text }}>
                    {breadcrumbs.slice(Math.max(0, breadcrumbs.length - 3)).map((crumb, i, arr) => (
                        <React.Fragment key={crumb.id}>
                            <span
                                className={`cursor-pointer hover:underline ${i === arr.length - 1 ? 'text-blue-600 dark:text-blue-400' : 'opacity-60'}`}
                                onClick={() => {
                                    const idx = breadcrumbs.findIndex(b => b.id === crumb.id);
                                    setBreadcrumbs(breadcrumbs.slice(0, idx + 1));
                                }}
                            >
                                {crumb.name}
                            </span>
                            {i < arr.length - 1 && <span className="opacity-40">/</span>}
                        </React.Fragment>
                    ))}
                </div>
            </div>

            {/* ... (actions) ... */}
            <div className="flex gap-3 items-center ml-auto">
                {/* ... Search ... */}
                <div className="relative hidden md:block group">
                    <input
                        type="text"
                        placeholder="Buscar..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-9 pr-4 py-2 text-sm rounded-xl border-0 ring-1 ring-gray-200 dark:ring-gray-700 focus:ring-2 focus:ring-blue-500 w-48 transition-all focus:w-72 bg-gray-50/50 dark:bg-gray-800/50"
                        style={{ color: theme.text }}
                    />
                    <Search className="absolute left-3 top-2.5 text-gray-400 group-focus-within:text-blue-500 transition-colors" size={16} />
                </div>

                {/* ... Actions ... */}
                {/* Buttons with refined styling */}
                <button onClick={() => loadContent()} className="p-2 rounded-xl hover:bg-black/5 dark:hover:bg-white/10 transition text-gray-500 hover:text-current">
                    <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
                </button>

                {/* Paste Button */}
                {clipboard && (
                    <button
                        onClick={handlePaste}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 text-white shadow-lg shadow-blue-500/30 hover:bg-blue-700 hover:scale-105 transition-all text-xs font-bold uppercase tracking-wide"
                    >
                        <ClipboardPaste size={16} /> PEGAR
                    </button>
                )}

                {/* Add Group/Folder Buttons - More Premium */}
                {(currentPath.type === 'root' || currentPath.type === 'group') && (
                    <button
                        onClick={() => { const name = prompt("Nombre del Grupo:"); if (name?.trim()) handleCreateGroup(name.trim()); }}
                        className="p-2 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 hover:bg-indigo-500/20 transition flex items-center gap-2"
                        title="Nuevo Grupo"
                    >
                        <Plus size={18} />
                        <span className="hidden sm:inline text-xs font-bold">Grupo</span>
                    </button>
                )}

                {getCurrentSPTarget() && (
                    <button
                        onClick={async () => { const name = prompt('Nombre carpeta:'); if (name?.trim()) handleCreateSPFolder(name.trim()); }}
                        className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 hover:bg-amber-500/20 transition flex items-center gap-2"
                        title="Nueva Carpeta"
                    >
                        <FolderPlus size={18} />
                        <span className="hidden sm:inline text-xs font-bold">Carpeta</span>
                    </button>
                )}
            </div>
        </div>

        {/* Content Area - Enhanced Grid */}
        <div className="p-6 min-h-[400px] bg-gray-50/30 dark:bg-black/20">
            {/* ... (loader/error/empty logic) ... */}

            {/* Grid Items - Premium Card Design */}
            <div className={viewMode === 'grid' ? "grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6" : "flex flex-col gap-3"}>
                {items.map((item) => {
                    // ... (icon logic) ...
                    const isGroup = item.type === 'group';
                    const Icon = isGroup ? (LucideIcons[item.icon] || Folder) : (item.type === 'folder' ? Folder : getFileIcon(item.name)?.type || FileIcon);
                    const itemColor = isGroup ? (item.color || '#6366f1') : (item.type === 'folder' ? '#f59e0b' : '#6b7280');

                    return (
                        <div
                            key={item.id}
                            className={`group relative rounded-2xl transition-all duration-300 cursor-pointer overflow-hidden
                                        ${viewMode === 'list'
                                    ? 'flex items-center gap-4 p-3 hover:bg-white/50 dark:hover:bg-white/5 border border-transparent hover:border-gray-200 dark:hover:border-gray-700'
                                    : 'aspect-[4/3] flex flex-col hover:-translate-y-1 hover:shadow-2xl hover:shadow-black/10 border border-gray-200/50 dark:border-white/5 bg-white dark:bg-[#1a1a1a]'
                                }`}
                            onClick={() => handleNavigate(item)}
                        >
                            {/* More Menu (Code same, just better positioning) */}
                            <button
                                onClick={(e) => { e.stopPropagation(); setActiveMenu(activeMenu === item.id ? null : item.id); }}
                                className="absolute top-3 right-3 p-1.5 rounded-full bg-white/90 dark:bg-black/50 hover:bg-white text-gray-700 dark:text-gray-200 shadow-sm opacity-0 group-hover:opacity-100 transition-all z-20"
                            >
                                <MoreVertical size={16} />
                            </button>

                            {/* ... Context Menu ... */}

                            {viewMode === 'grid' ? (
                                <>
                                    <div className="flex-1 w-full relative flex items-center justify-center p-6 bg-gradient-to-b from-gray-50/50 to-transparent dark:from-white/5">
                                        {/* Background Image for Groups */}
                                        {isGroup && item.image_url && (
                                            <>
                                                <div
                                                    className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-110 opacity-90"
                                                    style={{ backgroundImage: `url(${item.image_url})` }}
                                                />
                                                <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors" />
                                            </>
                                        )}

                                        {/* Icon */}
                                        <div className={`relative z-10 transition-transform duration-300 group-hover:scale-110 drop-shadow-xl ${isGroup && item.image_url ? 'text-white' : ''}`}>
                                            <Icon size={item.type === 'folder' || isGroup ? 56 : 48} color={isGroup && item.image_url ? '#fff' : itemColor} strokeWidth={1.5} />
                                        </div>

                                        {/* Badges */}
                                        {isGroup && (
                                            <div className="absolute bottom-2 left-3 px-2 py-1 rounded-md bg-white/90 dark:bg-black/60 backdrop-blur-md text-[10px] font-bold uppercase tracking-wider shadow-sm flex items-center gap-1">
                                                Grupo
                                            </div>
                                        )}
                                    </div>

                                    {/* Footer */}
                                    <div className="h-14 px-4 flex flex-col justify-center border-t border-gray-100 dark:border-white/5 bg-white/50 dark:bg-white/[0.02] backdrop-blur-sm">
                                        <p className="text-sm font-semibold truncate text-gray-700 dark:text-gray-200 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                            {item.name}
                                        </p>
                                        <p className="text-[10px] text-gray-400 truncate">
                                            {new Date(item.lastModifiedDateTime).toLocaleDateString()}
                                        </p>
                                    </div>
                                </>
                            ) : (
                                // LIST VIEW (Simplified)
                                <>
                                    <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-gray-100 dark:bg-white/10">
                                        <Icon size={20} color={itemColor} />
                                    </div>
                                    <div className="flex-1">
                                        <p className="font-semibold text-sm">{item.name}</p>
                                        <p className="text-xs opacity-50">{new Date(item.lastModifiedDateTime).toLocaleDateString()}</p>
                                    </div>
                                </>
                            )}
                        </div>
                    )
                })}
            </div>
        </div>
        {/* ... Modal ... */}
    </div>
)
import { Folder, FileText, FileSpreadsheet, FileIcon, Download, Loader2, ArrowLeft, Search, RefreshCw, Trash2, FolderPlus, X, Edit2, Upload, MoreVertical, Scissors, ClipboardPaste, Plus, Image as ImageIcon, Settings } from 'lucide-react'; // Added icons
import * as LucideIcons from 'lucide-react';
import { logAuditAction } from '@/lib/audit';

import { useTheme } from "@/contexts/ThemeContext";
import { lightTheme, darkTheme } from "@/lib/colors";

// ... imports
import SharePointSites from "./SharePointSites"; // Import Picker

// ... inside component
const OneDriveExplorer = ({ driveId: propDriveId, siteName = "", currentUser, role }) => {
    // ... hooks

    // Navigation: { id, name, type, resourceId, driveId }
    // If propDriveId is provided (legacy mode), we start with it. Otherwise 'root' has no driveId.
    const [breadcrumbs, setBreadcrumbs] = useState([
        { id: 'root', name: 'Inicio', type: 'root', resourceId: null, driveId: propDriveId || null }
    ]);
    const currentPath = breadcrumbs[breadcrumbs.length - 1];

    // Derived driveId from current path (or props if locked)
    const effectiveDriveId = currentPath.driveId || propDriveId;

    const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);

    // ... (useEffect for auth remains)

    // Load Content
    useEffect(() => {
        loadContent();
    }, [currentPath, searchTerm]); // Trigger on path change (effectiveDriveId changes with path)

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

                // Fetch groups where parent_id = currentPath.id (if it's a group) or null (if root)
                let groups = [];
                // Only fetch groups if we are NOT inside a physical SharePoint folder (type='folder')
                if (type === 'root' || type === 'group') {
                    const parentId = type === 'root' ? null : id;
                    groups = await getGroupsByParent(parentId);
                }

                // B. Fetch Files (SharePoint)
                let files = [];
                if (effectiveDriveId) {
                    // If we have a DriveID, we fetch files.
                    // If we are at the "Root" of this drive (type='group' with resource_id), folder is 'root'.
                    // If we are deep in a folder (type='folder'), folder is id.
                    const targetFolderId = (type === 'folder') ? id : 'root';
                    try {
                        files = await getFiles(targetFolderId, effectiveDriveId);
                    } catch (e) {
                        console.warn("Error fetching files", e);
                        // If generic error, maybe don't block groups
                    }
                }

                // C. Merge
                const formattedGroups = groups.map(g => ({
                    id: g.id,
                    name: g.name,
                    type: 'group',
                    icon: g.icon,
                    color: g.color || '#3b82f6',
                    description: g.description,
                    image_url: g.image_url,
                    resource_id: g.resource_id, // This might be a driveId
                    permissions: g.permissions,
                    lastModifiedDateTime: g.updated_at
                }));

                const formattedFiles = files.filter(f => !['Forms', 'Site Assets', 'Style Library'].includes(f.name)).map(f => ({
                    id: f.id,
                    name: f.name,
                    type: f.folder ? 'folder' : 'file',
                    webUrl: f.webUrl,
                    lastModifiedDateTime: f.lastModifiedDateTime,
                    item: f
                }));

                mixedContent = [...formattedGroups, ...formattedFiles];
            }
            setItems(mixedContent);

        } catch (err) {
            console.error(err);
            setError("Error cargando contenido.");
        } finally {
            setLoading(false);
        }
    };

    const handleNavigate = (item) => {
        setSearchTerm('');
        if (item.type === 'group') {
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
        const newName = prompt("Nuevo nombre:", item.name);
        if (!newName || !newName.trim()) return;
        try {
            if (item.type === 'group') {
                await updateGroup(item.id, { name: newName });
            } else {
                await renameItem(item.id, newName, driveId);
            }
            loadContent();
        } catch (e) { alert("Error al renombrar"); }
    };

    // Placeholder for Cut/Paste if needed, or remove if unused in new logic for simplicity first
    const handleCut = (item) => {
        if (item.type === 'group') return alert("No se puede mover grupos aún.");
        setClipboard({ item, action: 'cut', sourceFolder: getCurrentSPTarget() });
        setActiveMenu(null);
    };

    const handlePaste = async () => {
        // simplified paste logic for SP only
        if (!clipboard) return;
        const targetId = getCurrentSPTarget();
        if (!targetId) return alert("Destino no válido.");
        setLoading(true);
        try {
            await moveItem(clipboard.item.id, targetId, driveId);
            setClipboard(null);
            loadContent();
        } catch (e) { alert("Error al mover"); }
        finally { setLoading(false); }
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
                                const isGroup = item.type === 'group';
                                const Icon = isGroup ? (LucideIcons[item.icon] || Folder) : (item.type === 'folder' ? Folder : getFileIcon(item.name)?.type || FileIcon);
                                const itemColor = isGroup ? (item.color || '#3b82f6') : (item.type === 'folder' ? '#fbbf24' : '#6b7280'); // Groups blue, folders yellow

                                return (
                                    <div
                                        key={item.id}
                                        className={`group relative rounded-xl border transition-all duration-300 hover:shadow-lg cursor-pointer flex flex-col overflow-hidden
                                        ${viewMode === 'list' ? 'flex-row items-center gap-4 p-3 min-h-[64px]' : 'p-0 aspect-[4/3]'}`}
                                        style={{
                                            background: isDark ? (isGroup ? '#1e293b' : '#111827') : (isGroup ? '#f8fafc' : '#ffffff'),
                                            borderColor: theme.border
                                        }}
                                        onClick={() => handleNavigate(item)}
                                    >
                                        {/* Menu Trigger */}
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setActiveMenu(activeMenu === item.id ? null : item.id);
                                            }}
                                            className="absolute top-2 right-2 p-1.5 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 z-10 transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                                            style={{ background: isDark ? 'rgba(0,0,0,0.5)' : 'rgba(255,255,255,0.8)' }}
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
                                                {item.type !== 'group' && (
                                                    <button onClick={() => handleCut(item)} className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center gap-2 border-t border-gray-100 dark:border-gray-700">
                                                        <Scissors size={14} /> Cortar
                                                    </button>
                                                )}
                                            </div>
                                        )}

                                        {viewMode === 'grid' ? (
                                            // GRID VIEW
                                            <>
                                                {/* Thumbnail / Icon Area */}
                                                <div
                                                    className="flex-1 w-full relative overflow-hidden flex items-center justify-center p-4 bg-gradient-to-br"
                                                    style={{
                                                        background: isGroup && item.image_url
                                                            ? `url(${item.image_url}) center/cover`
                                                            : (isGroup ? `linear-gradient(135deg, ${itemColor}10, ${itemColor}30)` : 'transparent')
                                                    }}
                                                >
                                                    {isGroup && item.image_url && <div className="absolute inset-0 bg-black/30" />}

                                                    {!item.image_url && (
                                                        <div className="transition-transform duration-300 group-hover:scale-110 shadow-sm rounded-xl p-2 bg-white dark:bg-gray-800/50 backdrop-blur-sm">
                                                            {isGroup ? <Icon size={40} color={itemColor} /> :
                                                                (item.type === 'folder' ? <Folder size={48} className="text-yellow-400 fill-yellow-400/20" /> : <div className="scale-125">{getFileIcon(item.name)}</div>)
                                                            }
                                                        </div>
                                                    )}

                                                    {/* Group Badge */}
                                                    {isGroup && (
                                                        <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-black/40 text-white backdrop-blur-md">
                                                            Grupo
                                                        </div>
                                                    )}
                                                    {item.resource_id && isGroup && (
                                                        <div className="absolute top-2 left-2 p-1 rounded-full bg-blue-500 text-white shadow" title="Vinculado a SharePoint">
                                                            <LucideIcons.Cloud size={10} />
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Footer Area */}
                                                <div className="h-10 px-3 flex items-center justify-between border-t w-full bg-white dark:bg-[#1a1a1a]" style={{ borderColor: theme.border }}>
                                                    <p className="text-xs font-medium truncate w-[90%]" style={{ color: theme.text }}>{item.name}</p>
                                                </div>
                                            </>
                                        ) : (
                                            // LIST VIEW
                                            <>
                                                <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-gray-100 dark:bg-gray-800">
                                                    {isGroup ? <Icon size={20} color={itemColor} /> :
                                                        (item.type === 'folder' ? <Folder size={20} className="text-yellow-400" /> : getFileIcon(item.name))}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-medium text-sm truncate" style={{ color: theme.text }}>{item.name}</p>
                                                    <p className="text-[10px] opacity-60 m-0 p-0 line-clamp-1" style={{ color: theme.textSecondary }}>
                                                        {isGroup ? (item.description || 'Grupo Personalizado') :
                                                            `Modificado: ${new Date(item.lastModifiedDateTime).toLocaleDateString()}`}
                                                    </p>
                                                </div>
                                                {isGroup && (
                                                    <span className="px-2 py-1 rounded text-[10px] bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 font-medium">
                                                        GRUPO
                                                    </span>
                                                )}
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
