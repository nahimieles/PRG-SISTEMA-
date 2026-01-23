"use client";
import React, { useState, useEffect, useRef } from 'react';
import { useMsal } from "@azure/msal-react";
import { loginRequest } from "@/lib/authConfig";
import { initializeGraphClient, getFiles, searchFiles, deleteItem, createFolder, getPreviewUrl, renameItem, uploadFile, moveItem } from "@/lib/onedriveService";
import { getGroupsByParent, createGroup, updateGroup, deleteGroup, hasPermission } from "@/lib/groups";
import { Folder, FileText, FileSpreadsheet, FileIcon, Download, Loader2, ArrowLeft, Search, RefreshCw, Trash2, FolderPlus, X, Edit2, Upload, MoreVertical, Scissors, ClipboardPaste, Plus, Image as ImageIcon, Settings } from 'lucide-react'; // Added icons
import * as LucideIcons from 'lucide-react';
import { logAuditAction } from '@/lib/audit';

import { useTheme } from "@/contexts/ThemeContext";
import { lightTheme, darkTheme } from "@/lib/colors";
import { toast } from 'sonner'; // Assuming sonner is available or use alias

// Helper to normalize strings for comparison (remove accents, case insensitive)
const normalize = (str) => {
    return str ? str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim() : "";
};

const OneDriveExplorer = ({ driveId, siteName = "", currentUser, role }) => {
    const { instance, accounts } = useMsal();
    const { isDark } = useTheme();
    const theme = isDark ? darkTheme : lightTheme;

    // Unified State
    const [items, setItems] = useState([]); // Mixed groups and files
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // Navigation State: Stack of objects { id, name, type: 'group' | 'folder' | 'root', resourceId? }
    const [breadcrumbs, setBreadcrumbs] = useState([{ id: 'root', name: 'Inicio', type: 'root', resourceId: null }]);
    const currentPath = breadcrumbs[breadcrumbs.length - 1];

    const [viewMode, setViewMode] = useState('grid');
    const [searchTerm, setSearchTerm] = useState('');
    const [activeMenu, setActiveMenu] = useState(null);
    const [clipboard, setClipboard] = useState(null);
    const fileInputRef = useRef(null);

    // Group Creation/Edit State
    const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
    const [editingGroup, setEditingGroup] = useState(null);

    // Cache
    const [cache, setCache] = useState({});
    const CACHE_DURATION = 5 * 60 * 1000;

    // Load viewMode
    useEffect(() => {
        const savedView = localStorage.getItem('onedrive_view_mode');
        if (savedView) setViewMode(savedView);
    }, []);

    // Save viewMode
    useEffect(() => {
        localStorage.setItem('onedrive_view_mode', viewMode);
    }, [viewMode]);

    // Initial Auth
    useEffect(() => {
        if (accounts.length > 0 && driveId) {
            const request = { ...loginRequest, account: accounts[0] };
            instance.acquireTokenSilent(request).then((response) => {
                initializeGraphClient(response.accessToken);
            }).catch((e) => {
                instance.acquireTokenRedirect(request);
            });
        }
    }, [accounts, instance, driveId]);

    // Load Content when Path Changes
    useEffect(() => {
        if (driveId) {
            loadContent();
        }
    }, [currentPath, driveId, searchTerm]);

    const loadContent = async () => {
        setLoading(true);
        setError(null);

        try {
            let mixedContent = [];

            if (searchTerm.trim().length > 0) {
                const fileResults = await searchFiles(searchTerm, driveId, "root");
                mixedContent = fileResults.map(f => ({ ...f, type: f.folder ? 'folder' : 'file' }));
            } else {
                const { id, type, resourceId } = currentPath;

                // 1. Fetch Groups
                let groups = [];
                if (type === 'root' || type === 'group') {
                    const parentId = type === 'root' ? null : id;
                    groups = await getGroupsByParent(parentId);
                }

                // 2. Fetch Files
                let files = [];
                const targetFolderId = resourceId || (type === 'folder' ? id : null);

                // If at ROOT, check if we should fetch root files (Unified View)
                // For now, if at 'root' and we have groups, maybe we DON'T show files unless explicitly asked, 
                // but user said "Groups INSIDE the view of files...". So we merge.
                if (type === 'root') {
                    try {
                        files = await getFiles('root', driveId);
                    } catch (e) { console.warn("Could not fetch root files", e); }
                } else if (targetFolderId) {
                    files = await getFiles(targetFolderId, driveId);
                }

                // 3. Merge & Format
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

                const formattedFiles = files.filter(f => !['Forms', 'Site Assets', 'Style Library'].includes(f.name)).map(f => ({
                    id: f.id,
                    name: f.name,
                    type: f.folder ? 'folder' : 'file',
                    webUrl: f.webUrl,
                    lastModifiedDateTime: f.lastModifiedDateTime,
                    item: f // Keep original ref
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
            setBreadcrumbs(prev => [...prev, { id: item.id, name: item.name, type: 'group', resourceId: item.resource_id }]);
        } else if (item.folder || item.type === 'folder') {
            // Handle both unified 'folder' type and raw 'folder' property from search
            setBreadcrumbs(prev => [...prev, { id: item.id, name: item.name, type: 'folder', resourceId: null }]);
        } else {
            openPreview(item.item || item);
        }
    };

    const navigateUp = () => {
        if (breadcrumbs.length <= 1) return;
        setBreadcrumbs(prev => prev.slice(0, -1));
    };

    // Actions Context Helpers
    const getCurrentSPTarget = () => {
        if (currentPath.type === 'folder') return currentPath.id;
        if (currentPath.resourceId) return currentPath.resourceId;
        if (currentPath.type === 'root') return 'root';
        return null;
    };

    const handleCreateGroup = async (name) => {
        if (currentPath.type !== 'root' && currentPath.type !== 'group') return alert("Solo puedes crear grupos dentro de otros grupos o en el inicio.");
        try {
            await createGroup({
                name,
                parent_id: currentPath.type === 'root' ? null : currentPath.id,
                type: 'group',
                permissions: ['admin', 'manager']
            });
            loadContent();
        } catch (e) { alert('Error al crear grupo'); }
    };

    const handleCreateSPFolder = async (name) => {
        const targetId = getCurrentSPTarget();
        if (!targetId) return alert("Esta ubicación no es una carpeta de SharePoint.");
        try {
            await createFolder(targetId, name, driveId);
            loadContent();
        } catch (e) { alert('Error al crear carpeta'); }
    };

    const handleFileUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const targetId = getCurrentSPTarget();
        if (!targetId) return alert("Ubicación no válida para subir archivos.");

        setLoading(true);
        try {
            await uploadFile(targetId, file, driveId);
            await logAuditAction({
                action_type: 'UPLOAD',
                file_name: file.name,
                file_path: breadcrumbs.map(b => b.name).join('/'),
                worker_name: currentUser?.full_name || 'Desconocido',
                metadata: { size: file.size, driveId }
            });
            loadContent();
        } catch (e) { alert("Error al subir"); }
        finally { if (fileInputRef.current) fileInputRef.current.value = ''; }
    };

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
