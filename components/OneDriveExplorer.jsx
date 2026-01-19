"use client";
import React, { useState, useEffect } from 'react';
import { useMsal } from "@azure/msal-react";
import { loginRequest } from "@/lib/authConfig";
import { initializeGraphClient, getFiles } from "@/lib/onedriveService";
import { Folder, FileText, FileSpreadsheet, FileIcon, Download, Loader2, ArrowLeft, Search } from 'lucide-react';

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
    }, [accounts, instance, driveId]);

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
            let filtered = result;
            const workerName = currentUser && currentUser.full_name ? normalize(currentUser.full_name) : null;

            if (
                role !== 'admin' &&
                normalize(siteName).includes('prg') &&
                folderId === 'root' &&
                workerName
            ) {
                filtered = result.filter(file => {
                    if (!file.folder) return false;
                    return normalize(file.name).includes(workerName) || workerName.includes(normalize(file.name));
                });
                setFiles(filtered);

                // If only one folder remains and it matches the worker, enter it.
                if (filtered.length === 1 && filtered[0].folder) {
                    navigateToFolder(filtered[0].id, filtered[0].name);
                }

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
        setFolderHistory(prev => {
            // Avoid duplicate entries if auto-open triggers
            if (prev.length > 0 && prev[prev.length - 1].id === folderId) return prev;
            return [...prev, { id: currentFolder, name: folderName || "Atrás" }];
        });
        setCurrentFolder(folderId);
        updateFilesForFolder(folderId);
    };

    // Separate fetcher to avoid confusion with the initial load logic
    const updateFilesForFolder = async (folderId) => {
        // Instant load from cache if available
        if (folderCache[folderId]) {
            setFiles(folderCache[folderId]);
            return;
        }

        setLoading(true);
        setError(null);
        try {
            const result = await getFiles(folderId, driveId);
            setOriginalFiles(result);
            setFiles(result); // No filtering inside subfolders usually

            // Update Cache
            setFolderCache(prev => ({ ...prev, [folderId]: result }));
        } catch (err) {
            setError("Error al cargar carpeta.");
        } finally {
            setLoading(false);
        }
    };

    const navigateUp = () => {
        if (folderHistory.length === 0) return;
        const previous = folderHistory[folderHistory.length - 1];
        const newHistory = folderHistory.slice(0, -1);
        setFolderHistory(newHistory);
        setCurrentFolder(previous.id);
        loadFiles(previous.id);
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
                    onClick={() => instance.loginRedirect(loginRequest)}
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
                <div className="flex gap-2">
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
                        <span className="absolute left-2 top-1.5 text-gray-400">🔍</span>
                    </div>
                    <button
                        onClick={() => setViewMode(prev => prev === 'grid' ? 'list' : 'grid')}
                        className="p-1.5 rounded-lg border hover:bg-opacity-50 transition"
                        style={{ borderColor: theme.border }}
                        title={viewMode === 'grid' ? "Ver como lista" : "Ver como cuadrícula"}
                    >
                        {viewMode === 'grid' ? (
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={theme.text} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line></svg>
                        ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={theme.text} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>
                        )}
                    </button>
                    {role === 'admin' ? (
                        <span className="text-xs px-2 py-1 rounded-full font-bold flex items-center" style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6' }}>Modo Admin</span>
                    ) : (
                        <span className="text-xs px-2 py-1 rounded-full flex items-center" style={{ background: isDark ? '#333' : '#eee', color: theme.textSecondary }}>Lectura Segura</span>
                    )}
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
                                    className={`group relative p-3 rounded-xl border transition-all duration-300 hover:scale-105 hover:shadow-lg cursor-pointer ${item.folder ? 'folder-card' : 'file-card'} ${viewMode === 'list' ? 'flex items-center gap-4' : ''}`}
                                    style={{
                                        background: isDark ? (item.folder ? '#1e3a8a' : '#1f2937') : (item.folder ? '#eff6ff' : '#ffffff'),
                                        borderColor: theme.border
                                    }}
                                    onClick={() => item.folder ? navigateToFolder(item.id, item.name) : openPreview(item)}
                                >
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
                            <button onClick={closePreview} className="p-2 hover:opacity-70 rounded-full transition">
                                <ArrowLeft size={24} style={{ color: theme.text }} />
                            </button>
                        </div>

                        <div className="flex-1 p-8 flex flex-col items-center justify-center gap-8 overflow-y-auto" style={{ background: isDark ? '#111' : '#f3f4f6' }}>
                            {previewFile.thumbnails && previewFile.thumbnails.length > 0 ? (
                                <img
                                    src={previewFile.thumbnails[0].large?.url || previewFile.thumbnails[0].medium.url}
                                    alt={previewFile.name}
                                    className="max-h-[60vh] w-auto shadow-2xl rounded-lg object-contain"
                                />
                            ) : (
                                <div className="w-48 h-48 flex items-center justify-center rounded-full shadow-lg" style={{ background: theme.surface }}>
                                    {getFileIcon(previewFile.name)}
                                </div>
                            )}

                            <div className="flex gap-4">
                                <a
                                    href={previewFile.webUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="flex items-center gap-2 bg-[#2A5C82] text-white px-8 py-4 rounded-xl font-bold text-lg hover:opacity-90 transition shadow-xl"
                                >
                                    <FileIcon size={24} />
                                    Abrir Documento
                                </a>
                                {role === 'admin' && (
                                    <button className="flex items-center gap-2 bg-red-100 text-red-700 px-6 py-4 rounded-xl font-semibold hover:bg-red-200 transition">
                                        Eliminar (Admin)
                                    </button>
                                )}
                            </div>
                            <p className="text-sm text-gray-500 text-center max-w-lg">
                                Tip: Para abrir directamente en la App de Escritorio, asegúrate de tener la sesión iniciada en Office.
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
export default OneDriveExplorer;
