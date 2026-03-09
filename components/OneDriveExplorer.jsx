"use client";
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useMsal } from "@azure/msal-react";
import { loginRequest } from "@/lib/authConfig";
import { initializeGraphClient, getFiles, searchFiles, deleteItem, createFolder, getPreviewUrl, renameItem, uploadFile, moveItem, getFollowedSites, getSiteDefaultDrive } from "@/lib/onedriveService";
// Add moveGroup to imports
import { getGroupsByParent, createGroup, updateGroup, deleteGroup, hasPermission, moveGroup } from "@/lib/groups"; // Added moveGroup
import { Folder, FileText, FileSpreadsheet, FileIcon, Download, Loader2, ArrowLeft, Search, RefreshCw, Trash2, FolderPlus, X, Edit2, Upload, MoreVertical, Scissors, ClipboardPaste, Plus, Image as ImageIcon, Settings } from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { logAuditAction } from '@/lib/audit';
import { initializeChangeDetection } from '@/lib/changeDetectionService';
import { useTheme } from "@/contexts/ThemeContext";
import { useSharePointData } from "@/contexts/SharePointContext";
import { lightTheme, darkTheme } from "@/lib/colors";
import SharePointSites from "./SharePointSites";
import FilePreview from "./FilePreview";

// Helper to normalize strings
const normalize = (str) => {
    return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
};


// ... (rest of imports)


const OneDriveExplorer = ({ driveId: propDriveId, siteName = "", currentUser, role, disableGroups = false }) => {
    const { instance, accounts, inProgress } = useMsal();
    const { isDark } = useTheme();
    const theme = isDark ? darkTheme : lightTheme;
    const { getCachedDriveId, cacheDriveId } = useSharePointData();

    // Navigation: { id, name, type, resourceId, driveId }
    // If propDriveId is provided (legacy mode), we start with it. Otherwise 'root' has no driveId.
    const [breadcrumbs, setBreadcrumbs] = useState([
        { id: 'root', name: 'Inicio', type: 'root', resourceId: null, driveId: propDriveId || null }
    ]);
    const currentPath = breadcrumbs[breadcrumbs.length - 1];

    // Derived driveId from current path (or props if locked)
    const effectiveDriveId = currentPath.driveId || propDriveId;

    // Auto-start change detection when entering a drive
    useEffect(() => {
        if (effectiveDriveId) {
            console.log('Initializing change detection for drive:', effectiveDriveId);
            initializeChangeDetection(effectiveDriveId);
        }
    }, [effectiveDriveId]);

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

    // Upload State
    const [uploadProgress, setUploadProgress] = useState(0);
    const [uploadError, setUploadError] = useState(null);

    // Drag & Drop State
    const [draggedItem, setDraggedItem] = useState(null);
    const [dragOverItem, setDragOverItem] = useState(null);

    // Undo/Redo State
    const [undoStack, setUndoStack] = useState([]);
    const [redoStack, setRedoStack] = useState([]);

    // File Preview State
    const [previewFile, setPreviewFile] = useState(null);

    // ... (useEffect for auth remains)

    // Load Content
    useEffect(() => {
        if (currentUser) {
            loadContent();
        }
    }, [currentPath, searchTerm, currentUser, role]); // Trigger on path change (effectiveDriveId changes with path)

    // Keyboard shortcuts for undo/redo
    useEffect(() => {
        const handleKeyDown = (e) => {
            // Ctrl+Z or Cmd+Z for undo
            if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
                e.preventDefault();
                handleUndo();
            }
            // Ctrl+Y or Ctrl+Shift+Z or Cmd+Shift+Z for redo
            if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
                e.preventDefault();
                handleRedo();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [undoStack, redoStack]);

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

                // Helper to check if ID is a SharePoint site ID
                const isSharePointSiteId = (str) => str && str.includes(',');

                // Determine what to fetch
                const shouldFetchGroups = !disableGroups && (type === 'root' || (type === 'group' && !isSharePointSiteId(id)));
                const shouldFetchSites = type === 'root';
                const shouldFetchFiles = !!effectiveDriveId;

                // PARALLEL FETCH: Load all data sources simultaneously for better performance
                const [groupsResult, sitesResult, filesResult] = await Promise.all([
                    // A. Fetch Groups (Virtual Children) - Pass user/role to avoid session timeout issues
                    shouldFetchGroups
                        ? getGroupsByParent(type === 'root' ? null : id, { user: currentUser, role }).catch(e => {
                            console.error("Error loading groups:", e);
                            return [];
                        })
                        : Promise.resolve([]),

                    // B. Fetch SharePoint Sites (Root Only)
                    shouldFetchSites
                        ? getFollowedSites().catch(e => {
                            console.warn("Error fetching sites:", e);
                            return [];
                        })
                        : Promise.resolve([]),

                    // C. Fetch Files from SharePoint
                    shouldFetchFiles
                        ? getFiles(type === 'folder' ? id : 'root', effectiveDriveId).catch(e => {
                            console.error("Error fetching files:", e);
                            setError("Error cargando archivos: " + e.message);
                            return [];
                        })
                        : Promise.resolve([])
                ]);

                const groups = groupsResult;
                const spSites = shouldFetchSites ? processSitesForExplorer(sitesResult) : [];
                const files = filesResult;

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

    // State declarations moved to top of component for proper initialization order

    const handleFileUpload = async (e) => {
        if (!e.target.files?.length) return;

        const file = e.target.files[0];

        if (!effectiveDriveId) {
            alert("No hay un contexto de OneDrive activo. Por favor, navega a un sitio de SharePoint primero.");
            if (fileInputRef.current) fileInputRef.current.value = '';
            return;
        }

        setLoading(true);
        setUploadProgress(0);
        setUploadError(null);

        try {
            const parentId = currentPath.type === 'folder' ? currentPath.id : 'root';

            // Upload with progress tracking
            await uploadFile(
                file,
                parentId,
                effectiveDriveId,
                (progress) => setUploadProgress(progress)
            );

            // Log audit action
            await logAuditAction({
                action_type: 'UPLOAD',
                file_name: file.name,
                file_path: currentPath.name,
                worker_name: currentUser?.full_name,
                metadata: {
                    driveId: effectiveDriveId,
                    fileSize: file.size,
                    folder: currentPath.name
                }
            });

            await loadContent();
            alert(`✓ Archivo "${file.name}" subido correctamente`);
        } catch (error) {
            console.error(error);
            setUploadError(error.message);
            alert(`Error al subir archivo: ${error.message}`);
        } finally {
            setLoading(false);
            setUploadProgress(0);
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
            const isAdmin = role === 'admin' ||
                (currentUser?.username?.toLowerCase() === 'valeria');

            // 1. PRG — check FIRST so 'CIA LTDA' in the name doesn't hit blacklist
            if (name.includes('prg')) {
                if (isAdmin) processed.push(site);
                return;
            }

            // 2. BLACKLIST — noisy sites (runs only for non-PRG sites)
            if (name.includes('c ltda') || name.includes('cia ltda') || name.includes('cia. ltda')) return;

            // 3. Contabilidad (admin only)
            if (name.includes('contabilidad')) {
                if (isAdmin) processed.push(site);
                return;
            }

            // 4. Auditoria (admin only)
            if (name.includes('auditoria')) {
                if (isAdmin) processed.push(site);
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
                    // Try cache first for faster navigation
                    let dId = getCachedDriveId(item.id);

                    if (!dId) {
                        // Not cached, fetch from API
                        dId = await getSiteDefaultDrive(item.id);
                        if (dId) {
                            // Cache for future use
                            cacheDriveId(item.id, dId);
                        }
                    }

                    if (!dId) throw new Error("No Drive ID found for this site");

                    setBreadcrumbs(prev => [...prev, {
                        id: item.id,
                        name: item.name,
                        type: 'group',
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
                    className="p-2 rounded-xl bg-green-500/10 border border-green-500/20 hover:bg-green-500/20 transition flex items-center gap-2"
                    style={{ color: isDark ? '#4ade80' : '#16a34a' }}
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
                <div className="w-full max-w-2xl rounded-xl shadow-lg overflow-hidden max-h-[80vh] flex flex-col" style={{ backgroundColor: isDark ? '#111827' : '#ffffff' }} onClick={e => e.stopPropagation()}>
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


    // Handler for creating SharePoint folders
    const handleCreateSPFolder = async (folderName) => {
        if (role === 'worker') {
            alert("No tienes permisos para crear carpetas.");
            return;
        }

        if (!folderName || !folderName.trim()) {
            alert("Por favor ingresa un nombre válido para la carpeta.");
            return;
        }

        const spTarget = getCurrentSPTarget();
        if (!spTarget || !spTarget.driveId) {
            alert("No se puede crear carpeta aquí. No hay contexto de SharePoint.");
            return;
        }

        setLoading(true);
        try {
            // Determine parent: if inside a folder use folder id, otherwise use 'root'
            const parentId = currentPath.type === 'folder' ? currentPath.id : 'root';

            await createFolder(parentId, folderName.trim(), spTarget.driveId);

            // Log the action
            await logAuditAction({
                action_type: 'CREATE_FOLDER',
                file_name: folderName.trim(),
                file_path: currentPath.name || 'Root',
                worker_name: currentUser?.full_name,
                metadata: { driveId: spTarget.driveId, parentId }
            });

            // Reload content
            loadContent();
        } catch (error) {
            console.error("Error creating folder:", error);
            alert(`Error al crear la carpeta: ${error.message || 'Error desconocido'}`);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (item) => {
        if (role === 'worker') return alert("No tienes permisos para eliminar.");
        if (!confirm(`¿Eliminar "${item.name}"?`)) return;

        setLoading(true);
        setActiveMenu(null);
        try {
            if (item.type === 'group') {
                await deleteGroup(item.id);
            } else {
                if (!item.id) throw new Error("El elemento no tiene un ID válido para eliminar.");
                await deleteItem(item.id, effectiveDriveId);
                await logAuditAction({
                    action_type: 'DELETE',
                    file_name: item.name,
                    file_path: currentPath.name || '/',
                    worker_name: currentUser?.full_name,
                    metadata: { driveId: effectiveDriveId, itemId: item.id }
                });
            }
            await loadContent();
        } catch (e) {
            console.error("Error deleting:", e);
            alert(`Error al eliminar "${item.name}": ${e.message || 'Error desconocido'}`);
        } finally {
            setLoading(false);
        }
    };

    const handleRename = async (item) => {
        if (role === 'worker') return alert("No tienes permisos para renombrar.");
        const newName = prompt("Nuevo nombre:", item.name);
        if (!newName || !newName.trim()) return;
        try {
            if (item.type === 'group') {
                await updateGroup(item.id, { name: newName });
            } else {
                await renameItem(item.id, newName, effectiveDriveId);
                await logAuditAction({
                    action_type: 'RENAME',
                    file_name: item.name,
                    file_path: newName, // New name
                    worker_name: currentUser?.full_name,
                    metadata: { driveId: effectiveDriveId, oldName: item.name }
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
                await moveItem(clipboard.item.id, destId, effectiveDriveId);
                await logAuditAction({
                    action_type: 'MOVE',
                    file_name: clipboard.item.name,
                    file_path: 'Moved to ' + destId,
                    worker_name: currentUser?.full_name,
                    metadata: { driveId: effectiveDriveId, source: clipboard.sourceFolder, dest: destId }
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

    // Drag & Drop Handlers
    const handleDragStart = (e, item) => {
        if (role === 'worker') {
            e.preventDefault();
            return;
        }

        setDraggedItem(item);
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', item.id);

        // Add visual feedback
        if (e.target) {
            e.target.style.opacity = '0.5';
        }
    };

    const handleDragEnd = (e) => {
        if (e.target) {
            e.target.style.opacity = '1';
        }
        setDraggedItem(null);
        setDragOverItem(null);
    };

    const handleDragOver = (e, item) => {
        e.preventDefault();
        e.stopPropagation();

        if (!draggedItem || draggedItem.id === item.id) return;

        // Only allow dropping into folders or groups
        const canDropHere = item.type === 'folder' || item.type === 'group';

        if (canDropHere) {
            setDragOverItem(item.id);
            e.dataTransfer.dropEffect = 'move';
        } else {
            e.dataTransfer.dropEffect = 'none';
        }
    };

    const handleDragLeave = (e) => {
        e.preventDefault();
        setDragOverItem(null);
    };

    const handleDrop = async (e, targetItem) => {
        e.preventDefault();
        e.stopPropagation();

        if (!draggedItem || draggedItem.id === targetItem.id) {
            setDraggedItem(null);
            setDragOverItem(null);
            return;
        }

        setLoading(true);
        setDragOverItem(null);

        try {
            // Moving a GROUP
            if (draggedItem.type === 'group') {
                if (targetItem.type === 'folder' && !targetItem.resource_id) {
                    throw new Error("No puedes mover un grupo dentro de una carpeta física de SharePoint");
                }

                const newParentId = targetItem.type === 'group' ? targetItem.id : null;
                const originalParentId = currentPath.type === 'root' ? null : currentPath.id;

                await moveGroup(draggedItem.id, newParentId);

                // Track for undo
                addToUndoStack({
                    type: 'MOVE_GROUP',
                    itemId: draggedItem.id,
                    itemName: draggedItem.name,
                    originalParentId,
                    newParentId
                });

                await logAuditAction({
                    action_type: 'MOVE',
                    file_name: draggedItem.name,
                    file_path: `Grupo movido a ${targetItem.name}`,
                    worker_name: currentUser?.full_name,
                    metadata: {
                        sourceType: 'group',
                        targetType: targetItem.type,
                        targetName: targetItem.name
                    }
                });
            }
            // Moving a FILE or FOLDER
            else {
                // Can only move files/folders within SharePoint context
                if (!effectiveDriveId) {
                    throw new Error("No hay contexto de SharePoint para mover archivos");
                }

                // Target must be a folder in the same drive
                if (targetItem.type !== 'folder') {
                    throw new Error("Solo puedes mover archivos a carpetas");
                }

                const originalParentId = currentPath.type === 'folder' ? currentPath.id : 'root';

                await moveItem(draggedItem.id, targetItem.id, effectiveDriveId);

                // Track for undo
                addToUndoStack({
                    type: 'MOVE_FILE',
                    itemId: draggedItem.id,
                    itemName: draggedItem.name,
                    originalParentId,
                    newParentId: targetItem.id,
                    driveId: effectiveDriveId
                });

                await logAuditAction({
                    action_type: 'MOVE',
                    file_name: draggedItem.name,
                    file_path: `Movido a ${targetItem.name}`,
                    worker_name: currentUser?.full_name,
                    metadata: {
                        driveId: effectiveDriveId,
                        sourceFolder: currentPath.name,
                        targetFolder: targetItem.name
                    }
                });
            }

            await loadContent();
            setDraggedItem(null);
        } catch (error) {
            console.error("Error en drag & drop:", error);
            alert(`Error al mover: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    // --- Memoized Items Rendering ---
    // IMPORTANT: Must be AFTER all functions it references (handleDragStart,
    // handleDragEnd, handleDragOver, handleDragLeave, handleDrop, handleNavigate,
    // handleRename, handleDelete, handleCut, getFileIcon) to avoid
    // "Cannot access before initialization" errors.
    const renderedItems = useMemo(() => items.map((item) => {
        // Determine Icon
        const isGroup = item.type === 'group' || item.type === 'site';
        const Icon = isGroup ? (LucideIcons[item.icon] || Folder) : (item.type === 'folder' ? Folder : getFileIcon(item.name)?.type || FileIcon);
        const itemColor = isGroup ? (item.color || '#0078d4') : (item.type === 'folder' ? '#fbbf24' : '#6b7280');
        const getInitials = (n) => n.split(' ').map(c => c[0]).slice(0, 2).join('').toUpperCase();
        const showAsCard = isGroup && currentPath.type === 'root';
        const isDraggable = role !== 'worker';
        const isDropTarget = (item.type === 'folder' || item.type === 'group');
        const isDraggedOver = dragOverItem === item.id;

        return (
            <div
                key={item.id}
                draggable={isDraggable}
                onDragStart={(e) => handleDragStart(e, item)}
                onDragEnd={handleDragEnd}
                onDragOver={isDropTarget ? (e) => handleDragOver(e, item) : undefined}
                onDragLeave={isDropTarget ? handleDragLeave : undefined}
                onDrop={isDropTarget ? (e) => handleDrop(e, item) : undefined}
                className={`group relative transition-all duration-200 hover:shadow-lg cursor-pointer flex flex-col border
                    ${viewMode === 'list' ? 'flex-row items-center gap-4 p-3 min-h-[64px] rounded-lg' : 'shadow-sm rounded-xl ' + (showAsCard ? 'h-40' : 'aspect-[4/3]')}
                    ${isDraggedOver ? 'ring-2 ring-blue-500 ring-offset-2' : ''}
                    ${isDraggable ? 'cursor-move' : ''}`}
                style={{
                    backgroundColor: isDraggedOver ? (isDark ? 'rgba(30, 58, 138, 0.2)' : '#eff6ff') : (isDark ? '#1f2937' : '#ffffff'),
                    borderColor: isDraggedOver ? '#3b82f6' : theme.border
                }}
                onClick={() => handleNavigate(item)}
            >
                <button
                    onMouseDown={(e) => { e.stopPropagation(); }}
                    onClick={(e) => { e.stopPropagation(); setActiveMenu(activeMenu === item.id ? null : item.id); }}
                    className="absolute top-2 right-2 p-1.5 rounded-full z-10 transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                    style={{ backgroundColor: 'transparent' }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = isDark ? '#374151' : '#e5e7eb'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                    <MoreVertical size={16} color={theme.text} />
                </button>
                {activeMenu === item.id && (
                    <div className="absolute right-2 top-8 w-44 shadow-xl rounded-lg z-[9999] overflow-hidden text-sm"
                        style={{ backgroundColor: isDark ? '#1f2937' : '#ffffff', borderColor: isDark ? '#374151' : '#e5e7eb', borderWidth: '1px', borderStyle: 'solid', color: theme.text }}
                        onMouseDown={(e) => e.stopPropagation()}
                        onClick={e => e.stopPropagation()}>
                        <button
                            onMouseDown={(e) => e.stopPropagation()}
                            onClick={() => { setActiveMenu(null); handleRename(item); }}
                            className="w-full text-left px-4 py-2 flex items-center gap-2"
                            style={{ backgroundColor: 'transparent' }}
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = isDark ? '#374151' : '#f3f4f6'}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}>
                            <Edit2 size={14} /> Renombrar
                        </button>
                        <button
                            onMouseDown={(e) => e.stopPropagation()}
                            onClick={() => { setActiveMenu(null); handleDelete(item); }}
                            className="w-full text-left px-4 py-2 text-red-500 flex items-center gap-2"
                            style={{ backgroundColor: 'transparent' }}
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = isDark ? 'rgba(127, 29, 29, 0.2)' : '#fef2f2'}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}>
                            <Trash2 size={14} /> Eliminar
                        </button>
                        {item.type !== 'group' && item.type !== 'site' && (
                            <button
                                onMouseDown={(e) => e.stopPropagation()}
                                onClick={() => { setActiveMenu(null); handleCut(item); }}
                                className="w-full text-left px-4 py-2 flex items-center gap-2"
                                style={{ backgroundColor: 'transparent', borderTopWidth: '1px', borderTopColor: isDark ? '#374151' : '#f3f4f6' }}
                                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = isDark ? '#374151' : '#f3f4f6'}
                                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}>
                                <Scissors size={14} /> Cortar
                            </button>
                        )}
                    </div>
                )}
                {viewMode === 'grid' ? (
                    showAsCard ? (
                        <div className="flex flex-col h-full w-full">
                            <div className="p-4 flex justify-between items-start">
                                <div className="w-10 h-10 flex items-center justify-center text-white font-bold text-sm shadow-sm select-none" style={{ backgroundColor: itemColor }}>
                                    {getInitials(item.name)}
                                </div>
                                <LucideIcons.Star size={16} className="group-hover:block hidden" style={{ color: isDark ? '#4b5563' : '#d1d5db' }} />
                            </div>
                            <div className="px-4 pb-4 flex-1 flex flex-col justify-end">
                                <h3 className="font-bold text-sm leading-tight line-clamp-2" style={{ color: isDark ? '#f3f4f6' : '#1f2937' }} title={item.name}>{item.name}</h3>
                                <p className="text-[11px] text-gray-500 mt-1 uppercase tracking-wide">Grupo</p>
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center p-4 h-full relative group/icon">
                            <div className="mb-3 transition-transform duration-200 group-hover/icon:scale-110">
                                {item.type === 'folder' ? <Folder size={48} className="text-yellow-400 fill-yellow-400/20" /> :
                                    isGroup ? <Icon size={40} color={itemColor} /> : <div className="scale-125">{getFileIcon(item.name)}</div>}
                            </div>
                            <p className="text-xs text-center font-medium px-2 w-full truncate" style={{ color: isDark ? '#d1d5db' : '#374151' }}>{item.name}</p>
                            <p className="text-[10px] text-gray-400 mt-1">{isGroup ? 'Grupo' : new Date(item.lastModifiedDateTime).toLocaleDateString()}</p>
                        </div>
                    )
                ) : (
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
        );
    }), [items, viewMode, activeMenu, dragOverItem, currentPath.type, isDark, theme, role,
        handleDragStart, handleDragEnd, handleDragOver, handleDragLeave, handleDrop,
        handleNavigate, handleRename, handleDelete, handleCut, getFileIcon]);
    // --- End of renderedItems ---

    // Undo/Redo Handlers
    const addToUndoStack = (operation) => {
        setUndoStack(prev => [...prev, operation]);
        setRedoStack([]); // Clear redo stack when new operation is performed
    };

    const handleUndo = async () => {
        if (undoStack.length === 0) {
            alert('No hay operaciones para deshacer');
            return;
        }

        const operation = undoStack[undoStack.length - 1];
        setLoading(true);

        try {
            // Reverse the operation
            if (operation.type === 'MOVE_GROUP') {
                await moveGroup(operation.itemId, operation.originalParentId);
            } else if (operation.type === 'MOVE_FILE') {
                await moveItem(operation.itemId, operation.originalParentId, operation.driveId);
            }

            // Move operation from undo to redo stack
            setUndoStack(prev => prev.slice(0, -1));
            setRedoStack(prev => [...prev, operation]);

            await loadContent();
        } catch (error) {
            console.error('Error en undo:', error);
            alert(`Error al deshacer: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    const handleRedo = async () => {
        if (redoStack.length === 0) {
            alert('No hay operaciones para rehacer');
            return;
        }

        const operation = redoStack[redoStack.length - 1];
        setLoading(false);

        try {
            // Re-apply the operation
            if (operation.type === 'MOVE_GROUP') {
                await moveGroup(operation.itemId, operation.newParentId);
            } else if (operation.type === 'MOVE_FILE') {
                await moveItem(operation.itemId, operation.newParentId, operation.driveId);
            }

            // Move operation from redo to undo stack
            setRedoStack(prev => prev.slice(0, -1));
            setUndoStack(prev => [...prev, operation]);

            await loadContent();
        } catch (error) {
            console.error('Error en redo:', error);
            alert(`Error al rehacer: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    // previewFile state moved to top of component

    const openPreview = (file) => {
        setPreviewFile(file);
    };

    const closePreview = () => {
        setPreviewFile(null);
    };

    // --- AUTH CHECK ---
    if (accounts.length === 0) {
        if (inProgress !== 'none') {
            return (
                <div
                    className="flex flex-col items-center justify-center p-20 rounded-xl border-2 border-dashed"
                    style={{
                        backgroundColor: isDark ? 'rgba(17, 24, 39, 0.5)' : 'rgba(249, 250, 251, 0.5)',
                        borderColor: isDark ? '#1f2937' : '#e5e7eb'
                    }}
                >
                    <Loader2 className="w-10 h-10 animate-spin text-blue-500 mb-4" />
                    <p className="text-gray-500 font-medium">Autenticando con Microsoft...</p>
                </div>
            );
        }

        const handleLogin = async () => {
            try {
                await instance.loginRedirect(loginRequest);
            } catch (error) {
                console.error("Login failed:", error);
            }
        };

        return (
            <div
                className="flex flex-col items-center justify-center p-10 rounded-xl border-2 border-dashed transition-all hover:border-blue-500/50"
                style={{ background: theme.surface, borderColor: theme.border }}
            >
                <div className="p-4 bg-blue-500/10 rounded-full mb-4">
                    <LucideIcons.Cloud size={40} className="text-blue-500" />
                </div>
                <h3 className="text-xl font-bold mb-2">Conectar con Microsoft</h3>
                <p className="text-sm mb-6 text-center max-w-xs" style={{ color: theme.textSecondary }}>
                    Necesitas vincular tu cuenta de OneDrive para acceder a los archivos y sitios de SharePoint.
                </p>
                <button
                    onClick={handleLogin}
                    className="bg-[#2A5C82] text-white px-8 py-3 rounded-xl hover:bg-[#1e4a6d] transition-all hover:scale-105 active:scale-95 font-bold shadow-lg flex items-center gap-2"
                >
                    <LucideIcons.LogIn size={20} />
                    Conectar OneDrive
                </button>
            </div>
        );
    }
    // ------------------

    return (
        <div
            className="rounded-xl shadow-lg border"
            style={{ background: theme.surface, borderColor: theme.border, overflow: 'visible' }}
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

                    <div className="h-6 w-px mx-1" style={{ backgroundColor: isDark ? '#374151' : '#d1d5db' }}></div>

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
                            className="p-2 rounded-lg border hover:bg-opacity-50 transition cursor-pointer"
                            style={{
                                backgroundColor: isDark ? 'rgba(30, 58, 138, 0.2)' : '#eff6ff',
                                color: isDark ? '#60a5fa' : '#2563eb',
                                borderColor: isDark ? '#1e3a8a' : '#bfdbfe'
                            }}
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
                            className="flex items-center gap-2 px-3 py-1.5 rounded-lg border hover:bg-opacity-50 transition cursor-pointer bg-blue-500/10 border-blue-500/20"
                            style={{ color: isDark ? '#60a5fa' : '#2563eb' }}
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
                                <div className={`rounded-lg ${viewMode === 'list' ? 'w-10 h-10' : 'w-16 h-16'}`} style={{ backgroundColor: isDark ? '#374151' : '#d1d5db' }}></div>
                                <div className="space-y-2 w-full px-2">
                                    <div className="h-3 rounded w-3/4 mx-auto" style={{ backgroundColor: isDark ? '#374151' : '#d1d5db' }}></div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : error ? (
                    <div className="text-red-500 text-center p-4 rounded-lg" style={{ backgroundColor: isDark ? 'rgba(127, 29, 29, 0.1)' : '#fef2f2' }}>{error}</div>
                ) : items.length === 0 ? (
                    <div className="text-center p-12 flex flex-col items-center gap-4" style={{ color: theme.textSecondary }}>
                        <div className="p-4 rounded-full" style={{ backgroundColor: isDark ? '#1f2937' : '#f3f4f6' }}>
                            <Folder size={48} className="opacity-20" />
                        </div>
                        <p>Carpeta vacía</p>
                    </div>
                ) : (
                    <div className={viewMode === 'grid' ? "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4" : "flex flex-col gap-2"}>
                        {renderedItems}
                    </div>
                )}
            </div>

            {/* Modal de Vista Previa (Sin Blur Pesado) */}
            {/* File Preview Modal */}
            {previewFile && (
                <FilePreview
                    file={previewFile}
                    driveId={effectiveDriveId}
                    onClose={closePreview}
                    onDownload={(file) => {
                        const downloadUrl = file['@microsoft.graph.downloadUrl'] || file.webUrl;
                        window.open(downloadUrl, '_blank');
                        logAuditAction({
                            action_type: 'DOWNLOAD',
                            file_name: file.name,
                            file_path: currentPath.name,
                            worker_name: currentUser?.full_name || 'Desconocido',
                            metadata: { driveId: effectiveDriveId }
                        });
                    }}
                />
            )}
        </div>
    );
};
export default OneDriveExplorer;
