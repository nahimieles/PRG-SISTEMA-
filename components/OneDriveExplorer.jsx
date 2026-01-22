"use client";
import React, { useState, useEffect } from 'react';
import { useMsal } from "@azure/msal-react";
import { loginRequest } from "@/lib/authConfig";
import { initializeGraphClient, getFiles, searchFiles, deleteItem, createFolder, getPreviewUrl, renameItem, uploadFile, moveItem } from "@/lib/onedriveService";
import { Folder, FileText, FileSpreadsheet, FileIcon, Download, Loader2, ArrowLeft, Search, RefreshCw, Trash2, FolderPlus, X, Edit2, Upload, MoreVertical, Scissors, ClipboardPaste } from 'lucide-react';
import { logAuditAction } from '@/lib/audit';

import { useTheme } from "@/contexts/ThemeContext";
import { lightTheme, darkTheme } from "@/lib/colors";

// Helper to normalize strings for comparison (remove accents, case insensitive)
const normalize = (str) => {
    return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
};

const OneDriveExplorer = ({ driveId, siteName = "", currentUser, role }) => {
    const { instance, accounts } = useMsal();
    const { isDark } = useTheme();
    const theme = isDark ? darkTheme : lightTheme;

    const [files, setFiles] = useState([]);
    const [originalFiles, setOriginalFiles] = useState([]); // Store all files for filtering
    const [currentFolder, setCurrentFolder] = useState("root");
    const [folderHistory, setFolderHistory] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'list'
    const [searchTerm, setSearchTerm] = useState('');
    const [activeMenu, setActiveMenu] = useState(null);
    const [clipboard, setClipboard] = useState(null); // { item, action: 'cut' }
    const fileInputRef = React.useRef(null);

    // Deep Search Implementation
    useEffect(() => {
        const timer = setTimeout(async () => {
            if (searchTerm.trim().length > 0) {
                setLoading(true);
                try {
                    // Search in current drive, from current folder (or root if deep search desired from root)
                    // User wants "deep search". Usually searching from ROOT of the drive is best.
                    // But maybe from current folder? 
                    // Let's search from ROOT of the drive to be finding things "inside groups".
                    const results = await searchFiles(searchTerm, driveId, "root");
                    setFiles(results);
                } catch (e) {
                    setError("Error en la búsqueda");
                } finally {
                    setLoading(false);
                }
            } else if (searchTerm === '' && files !== originalFiles) {
                // Restore current folder view
                if (folderCache[currentFolder]) {
                    setFiles(folderCache[currentFolder]);
                } else {
                    loadFiles(currentFolder);
                }
            }
        }, 500); // 500ms debounce

        return () => clearTimeout(timer);
    }, [searchTerm, driveId]);

    const [folderCache, setFolderCache] = useState({}); // Cache: { folderId: [files] }

    // Load viewMode
    useEffect(() => {
        const savedView = localStorage.getItem('onedrive_view_mode');
        if (savedView) setViewMode(savedView);
    }, []);

    // Save viewMode
    useEffect(() => {
        localStorage.setItem('onedrive_view_mode', viewMode);
    }, [viewMode]);

    useEffect(() => {
        if (accounts.length > 0 && driveId) {
            const request = {
                ...loginRequest,
                account: accounts[0],
            };

            instance.acquireTokenSilent(request).then((response) => {
                initializeGraphClient(response.accessToken);
                loadFiles("root");
            }).catch((e) => {
                instance.acquireTokenRedirect(request);
            });
        }
    }, [accounts, instance, driveId, currentUser]);

    const loadFiles = async (folderId) => {
        if (!driveId) return;

        // Check Cache
        if (folderCache[folderId]) {
            setFiles(folderCache[folderId]);
            setLoading(false);
            return;
        }

        setLoading(true);
        setError(null);
        try {
            const result = await getFiles(folderId, driveId);
            setOriginalFiles(result);

            // Filter by Worker Name if needed
            const isRestricted = role !== 'admin' && normalize(siteName).includes('prg') && folderId === 'root';

            if (isRestricted) {
                // FAIL-SAFE: If user data is missing, show nothing (wait for update)
                const workerName = currentUser && currentUser.full_name ? normalize(currentUser.full_name) : null;

                if (!workerName) {
                    setFiles([]);
                    setLoading(false);
                    return;
                }

                const filtered = result.filter(file => {
                    if (!file.folder) return false;
                    return normalize(file.name).includes(workerName) || workerName.includes(normalize(file.name));
                });
                setFiles(filtered);
                // REMOVED: Auto-navigation that caused the bug for workers
                // The folder was appearing and disappearing because it auto-navigated

            } else {
                setFiles(result);
                // Update Cache
                setFolderCache(prev => ({ ...prev, [folderId]: result }));
            }

        } catch (err) {
            setError("No se pudieron cargar los archivos. Verifica tu conexión.");
        } finally {
            setLoading(false);
        }
    };

    const navigateToFolder = (folderId, folderName) => {
        setSearchTerm(''); // Reset search
        setFiles([]); // CRITICAL: Clear files to avoid "searching" ghost effect
        setFolderHistory(prev => {
            if (prev.length > 0 && prev[prev.length - 1].id === folderId) return prev;
            return [...prev, { id: currentFolder, name: folderName || "Atrás" }];
        });
        setCurrentFolder(folderId);
        loadFiles(folderId);
    };

    const refreshFolder = (folderId) => {
        setFolderCache(prev => {
            const newC = { ...prev };
            delete newC[folderId];
            return newC;
        });
        loadFiles(folderId);
    };

    const handleFileUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setLoading(true);
        try {
            await uploadFile(currentFolder, file, driveId);

            // Log Action
            await logAuditAction({
                action_type: 'UPLOAD',
                file_name: file.name,
                file_path: currentFolder === 'root' ? '/' : folderHistory.map(f => f.name).join('/') + '/',
                worker_name: currentUser?.full_name || 'Desconocido',
                metadata: { size: file.size, driveId }
            });

            refreshFolder(currentFolder);
        } catch (error) {
            alert("Error al subir archivo");
        } finally {
            e.target.value = null;
        }
    };

    const handleRename = async (item) => {
        const newName = prompt("Nuevo nombre:", item.name);
        if (!newName || !newName.trim() || newName === item.name) return;
        try {
            await renameItem(item.id, newName.trim(), driveId);

            // Log Action
            await logAuditAction({
                action_type: 'RENAME',
                file_name: item.name,
                file_path: currentFolder === 'root' ? '/' : folderHistory.map(f => f.name).join('/') + '/',
                worker_name: currentUser?.full_name || 'Desconocido',
                metadata: { from: item.name, to: newName, driveId }
            });

            refreshFolder(currentFolder);
        } catch (error) {
            alert("Error al renombrar");
        }
    };

    const handleDelete = async (item) => {
        if (!confirm(`¿Eliminar "${item.name}"?`)) return;
        try {
            await deleteItem(item.id, driveId);

            // Log Action
            await logAuditAction({
                action_type: 'DELETE',
                file_name: item.name,
                file_path: currentFolder === 'root' ? '/' : folderHistory.map(f => f.name).join('/') + '/',
                worker_name: currentUser?.full_name || 'Desconocido',
                metadata: { driveId }
            });

            refreshFolder(currentFolder);
        } catch (error) {
            alert("Error al eliminar");
        }
    };

    const handleCut = (item) => {
        setClipboard({ item, action: 'cut', sourceFolder: currentFolder });
        setActiveMenu(null);
    };

    const handlePaste = async () => {
        if (!clipboard || !clipboard.item) return;

        if (clipboard.sourceFolder === currentFolder) {
            alert("El archivo ya está en esta carpeta.");
            return;
        }

        setLoading(true);
        try {
            await moveItem(clipboard.item.id, currentFolder, driveId);

            // Log Action
            await logAuditAction({
                action_type: 'MOVE',
                file_name: clipboard.item.name,
                file_path: currentFolder === 'root' ? '/' : folderHistory.map(f => f.name).join('/') + '/',
                worker_name: currentUser?.full_name || 'Desconocido',
                metadata: { driveId, from: clipboard.sourceFolder, to: currentFolder }
            });

            setClipboard(null);
            refreshFolder(currentFolder);
        } catch (error) {
            console.error(error);
            alert("Error al mover el elemento. Verifica permisos.");
        } finally {
            setLoading(false);
        }
    };

    const navigateUp = () => {
        if (folderHistory.length === 0) return;
        const previous = folderHistory[folderHistory.length - 1];
        setFolderHistory(prev => prev.slice(0, -1));
        setCurrentFolder(previous.id);

        if (previous.id === 'root') {
            refreshFolder('root'); // Force refresh root to ensure filtering
        } else {
            loadFiles(previous.id);
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

            <div className="p-4 border-b flex items-center justify-between" style={{ borderColor: theme.border }}>
                <div className="flex items-center gap-2">
                    {folderHistory.length > 0 && (
                        <button onClick={navigateUp} className="p-1 hover:opacity-70 rounded-full transition cursor-pointer">
                            <ArrowLeft size={20} style={{ color: theme.text }} />
                        </button>
                    )}
                    <h2 className="font-semibold" style={{ color: theme.text }}>
                        {folderHistory.length === 0 ? `Archivos: ${siteName}` : folderHistory[folderHistory.length - 1].name}
                    </h2>
                </div>
                <div className="flex gap-2 items-center">
                    <div className="relative">
                        <input
                            type="text"
                            placeholder="Buscar archivo..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-8 pr-4 py-1 text-sm rounded-lg border focus:outline-none focus:ring-1 focus:ring-blue-500"
                            style={{
                                background: isDark ? 'rgba(255,255,255,0.1)' : 'white',
                                color: theme.text,
                                borderColor: theme.border
                            }}
                        />
                        <Search className="absolute left-2 top-2 text-gray-400" size={16} />
                    </div>

                    {/* Hidden File Input */}
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileUpload}
                        className="hidden"
                    />

                    <button
                        onClick={() => refreshFolder(currentFolder)}
                        disabled={loading}
                        className="p-1.5 rounded-lg border hover:bg-opacity-50 transition cursor-pointer disabled:opacity-50"
                        style={{ borderColor: theme.border }}
                        title="Sincronizar"
                    >
                        <RefreshCw size={16} className={loading ? 'animate-spin' : ''} style={{ color: theme.text }} />
                    </button>

                    <button
                        onClick={() => fileInputRef.current?.click()}
                        className="p-1.5 rounded-lg border hover:bg-opacity-50 transition cursor-pointer"
                        style={{ borderColor: theme.border }}
                        title="Subir Archivo"
                    >
                        <Upload size={16} style={{ color: theme.text }} />
                    </button>

                    {clipboard && (
                        <button
                            onClick={handlePaste}
                            className="p-1.5 rounded-lg border hover:bg-opacity-50 transition cursor-pointer flex items-center gap-2 px-3 animate-pulse"
                            style={{ borderColor: theme.border, background: theme.primary, color: 'white' }}
                            title={`Pegar ${clipboard.item.name}`}
                        >
                            <ClipboardPaste size={16} />
                            <span className="text-xs font-bold">Pegar</span>
                        </button>
                    )}

                    <button
                        onClick={async () => {
                            const name = prompt('Nombre de la nueva carpeta:');
                            if (!name || !name.trim()) return;
                            try {
                                await createFolder(currentFolder, name.trim(), driveId);

                                // Log Action
                                await logAuditAction({
                                    action_type: 'CREATE_FOLDER',
                                    file_name: name.trim(),
                                    file_path: currentFolder === 'root' ? '/' : folderHistory.map(f => f.name).join('/') + '/',
                                    worker_name: currentUser?.full_name || 'Desconocido',
                                    metadata: { driveId }
                                });

                                refreshFolder(currentFolder);
                            } catch (e) {
                                alert('Error al crear la carpeta');
                            }
                        }}
                        className="p-1.5 rounded-lg border hover:bg-opacity-50 transition cursor-pointer"
                        style={{ borderColor: theme.border }}
                        title="Nueva carpeta"
                    >
                        <FolderPlus size={16} style={{ color: theme.text }} />
                    </button>
                    <button
                        onClick={() => setViewMode(prev => prev === 'grid' ? 'list' : 'grid')}
                        className="p-1.5 rounded-lg border hover:bg-opacity-50 transition cursor-pointer"
                        style={{ borderColor: theme.border }}
                        title={viewMode === 'grid' ? "Ver como lista" : "Ver como cuadrícula"}
                    >
                        {viewMode === 'grid' ? (
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={theme.text} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line></svg>
                        ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={theme.text} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>
                        )}
                    </button>
                </div>
            </div>

            <div className="p-4 min-h-[300px]">
                {loading ? (
                    <div className={viewMode === 'grid' ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4" : "flex flex-col gap-2"}>
                        {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                            <div
                                key={i}
                                className={`rounded-xl border animate-pulse p-3 ${viewMode === 'list' ? 'flex items-center gap-4 h-16' : 'h-48 flex flex-col items-center justify-center gap-4'}`}
                                style={{ background: isDark ? 'rgba(255,255,255,0.05)' : '#f3f4f6', borderColor: 'transparent' }}
                            >
                                <div className={`bg-gray-300 dark:bg-gray-700 rounded-lg ${viewMode === 'list' ? 'w-10 h-10' : 'w-24 h-24'}`}></div>
                                <div className="space-y-2 w-full px-2">
                                    <div className="h-3 bg-gray-300 dark:bg-gray-700 rounded w-3/4 mx-auto"></div>
                                    {viewMode === 'grid' && <div className="h-2 bg-gray-300 dark:bg-gray-700 rounded w-1/2 mx-auto"></div>}
                                </div>
                            </div>
                        ))}
                    </div>
                ) : error ? (
                    <div className="text-red-500 text-center p-4">{error}</div>
                ) : files.length === 0 ? (
                    <div className="text-center p-8" style={{ color: theme.textSecondary }}>
                        {role !== 'admin' && siteName === 'PRG AUDITORES'
                            ? "No encontramos tu carpeta personal en este grupo."
                            : "Carpeta vacía"}
                    </div>
                ) : (
                    <div className={viewMode === 'grid' ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4" : "flex flex-col gap-2"}>
                        {files
                            .filter(f => normalize(f.name).includes(normalize(searchTerm)))
                            .map((item) => (
                                <div
                                    key={item.id}
                                    className={`group relative p-3 rounded-xl border transition-all duration-300 hover:scale-[1.02] hover:shadow-lg cursor-pointer ${item.folder ? 'folder-card' : 'file-card'} ${viewMode === 'list' ? 'flex items-center gap-4' : ''}`}
                                    style={{
                                        background: isDark ? (item.folder ? '#1e3a8a' : '#1f2937') : (item.folder ? '#eff6ff' : '#ffffff'),
                                        borderColor: theme.border
                                    }}
                                    onClick={() => item.folder ? navigateToFolder(item.id, item.name) : openPreview(item)}
                                >
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setActiveMenu(activeMenu === item.id ? null : item.id);
                                        }}
                                        className="absolute top-2 right-2 p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 z-10 transition-colors"
                                    >
                                        <MoreVertical size={18} color={theme.text} />
                                    </button>

                                    {activeMenu === item.id && (
                                        <div className="absolute right-2 top-8 w-40 bg-white dark:bg-[#1f2937] shadow-xl rounded-lg z-20 border border-gray-200 dark:border-gray-700 overflow-hidden" onClick={e => e.stopPropagation()}>
                                            <button onClick={() => { setActiveMenu(null); handleRename(item); }} className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center gap-2 text-sm text-gray-700 dark:text-gray-200">
                                                <Edit2 size={14} /> Renombrar
                                            </button>
                                            <button onClick={() => { setActiveMenu(null); handleDelete(item); }} className="w-full text-left px-4 py-2 hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 flex items-center gap-2 text-sm">
                                                <Trash2 size={14} /> Eliminar
                                            </button>
                                            <button onClick={() => handleCut(item)} className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center gap-2 text-sm text-gray-700 dark:text-gray-200 border-t border-gray-100 dark:border-gray-700">
                                                <Scissors size={14} /> Cortar (Mover)
                                            </button>
                                        </div>
                                    )}
                                    {viewMode === 'grid' ? (
                                        // GRID VIEW
                                        <div className="flex flex-col items-center gap-3 p-2">
                                            {item.folder ? (
                                                <Folder className="w-12 h-12 text-blue-500 fill-blue-500/20" />
                                            ) : item.thumbnails && item.thumbnails.length > 0 ? (
                                                <div className="w-full h-32 bg-gray-100 rounded-lg overflow-hidden">
                                                    <img
                                                        src={item.thumbnails[0].medium.url}
                                                        alt={item.name}
                                                        className="w-full h-full object-cover"
                                                        loading="lazy"
                                                    />
                                                </div>
                                            ) : (
                                                <div className="w-full h-32 flex items-center justify-center rounded-lg" style={{ background: isDark ? '#111' : '#f9fafb' }}>
                                                    {getFileIcon(item.name)}
                                                </div>
                                            )}

                                            <div className="w-full text-center">
                                                <p className="font-medium text-sm truncate w-full" style={{ color: theme.text }} title={item.name}>{item.name}</p>
                                                <p className="text-[10px]" style={{ color: theme.textSecondary }}>
                                                    {new Date(item.lastModifiedDateTime).toLocaleDateString()}
                                                </p>
                                            </div>
                                        </div>
                                    ) : (
                                        // LIST VIEW
                                        <>
                                            <div className="w-10 h-10 flex-shrink-0 flex items-center justify-center">
                                                {item.folder ? (
                                                    <Folder className="w-8 h-8 text-blue-500 fill-blue-500/20" />
                                                ) : (
                                                    getFileIcon(item.name)
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="font-medium text-sm truncate" style={{ color: theme.text }}>{item.name}</p>
                                                <p className="text-xs" style={{ color: theme.textSecondary }}>
                                                    Editado: {new Date(item.lastModifiedDateTime).toLocaleDateString()} por {item.lastModifiedBy?.user?.displayName || 'Desconocido'}
                                                </p>
                                            </div>
                                        </>
                                    )}
                                </div>
                            ))}
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
