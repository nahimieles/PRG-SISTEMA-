"use client";
import React, { useState, useEffect } from 'react';
import { useMsal } from "@azure/msal-react";
import { loginRequest } from "@/lib/authConfig";
import { initializeGraphClient, getFiles } from "@/lib/onedriveService";
import { Folder, FileText, FileSpreadsheet, FileIcon, Download, Loader2, ArrowLeft } from 'lucide-react';

const OneDriveExplorer = ({ driveId }) => {
    const { instance, accounts } = useMsal();
    const [files, setFiles] = useState([]);
    const [currentFolder, setCurrentFolder] = useState("root");
    const [folderHistory, setFolderHistory] = useState([]); // Stack tracking for navigation
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

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
                // If silent fails, redirect to login
                instance.acquireTokenRedirect(request);
            });
        }
    }, [accounts, instance, driveId]);

    const loadFiles = async (folderId) => {
        if (!driveId) return;
        setLoading(true);
        setError(null);
        try {
            const result = await getFiles(folderId, driveId);
            setFiles(result);
        } catch (err) {
            setError("No se pudieron cargar los archivos. Verifica tu conexión.");
        } finally {
            setLoading(false);
        }
    };

    const navigateToFolder = (folderId, folderName) => {
        setFolderHistory([...folderHistory, { id: currentFolder, name: folderName || "Atrás" }]);
        setCurrentFolder(folderId);
        loadFiles(folderId);
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

    if (accounts.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center p-10 bg-gray-50 rounded-lg border border-dashed border-gray-300">
                <p className="text-lg text-gray-600 mb-4">Conecta tu cuenta para ver tus archivos</p>
                <button
                    onClick={() => instance.loginRedirect(loginRequest)}
                    className="bg-[#2A5C82] text-white px-6 py-2 rounded-lg hover:bg-[#1e4a6d] transition-colors"
                >
                    Conectar OneDrive
                </button>
            </div>
        );
    }

    const [previewFile, setPreviewFile] = useState(null);

    const openPreview = (file) => {
        setPreviewFile(file);
    };

    const closePreview = () => {
        setPreviewFile(null);
    };

    return (
        <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-100">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-[#F8FAFC]">
                <div className="flex items-center gap-2">
                    {folderHistory.length > 0 && (
                        <button onClick={navigateUp} className="p-1 hover:bg-gray-200 rounded-full transition cursor-pointer">
                            <ArrowLeft size={20} className="text-gray-600" />
                        </button>
                    )}
                    <h2 className="font-semibold text-gray-700">Archivos del Grupo</h2>
                </div>
                <span className="text-xs text-gray-500 bg-gray-200 px-2 py-1 rounded-full">Lectura Segura</span>
            </div>

            <div className="p-4 min-h-[300px]">
                {loading ? (
                    <div className="flex justify-center items-center h-48">
                        <Loader2 className="animate-spin text-[#5FA5F9]" size={32} />
                    </div>
                ) : error ? (
                    <div className="text-red-500 text-center p-4">{error}</div>
                ) : files.length === 0 ? (
                    <div className="text-center text-gray-400 p-8">Carpeta vacía</div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {files.map((item) => (
                            <div
                                key={item.id}
                                className={`group relative p-3 rounded-xl border transition-all hover:shadow-md cursor-pointer ${item.folder ? 'bg-blue-50 border-blue-100' : 'bg-white border-gray-200'}`}
                                onClick={() => item.folder ? navigateToFolder(item.id, item.name) : openPreview(item)}
                            >
                                <div className="flex flex-col items-center gap-3 p-2">
                                    {item.folder ? (
                                        <Folder className="w-12 h-12 text-blue-500 fill-blue-500/20" />
                                    ) : item.thumbnails && item.thumbnails.length > 0 ? (
                                        <img
                                            src={item.thumbnails[0].medium.url}
                                            alt={item.name}
                                            className="w-full h-32 object-cover rounded-lg"
                                        />
                                    ) : (
                                        <div className="w-full h-32 flex items-center justify-center bg-gray-50 rounded-lg">
                                            {getFileIcon(item.name)}
                                        </div>
                                    )}

                                    <div className="w-full text-center">
                                        <p className="font-medium text-sm text-gray-700 truncate w-full" title={item.name}>{item.name}</p>
                                        <p className="text-[10px] text-gray-400">
                                            {new Date(item.lastModifiedDateTime).toLocaleDateString()}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Modal de Vista Previa */}
            {previewFile && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={closePreview}>
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden animate-fade-in" onClick={e => e.stopPropagation()}>
                        <div className="p-4 border-b flex justify-between items-center bg-gray-50">
                            <h3 className="font-bold text-gray-800 truncate pr-4">{previewFile.name}</h3>
                            <button onClick={closePreview} className="p-1 hover:bg-gray-200 rounded-full transition">
                                <ArrowLeft size={20} className="text-gray-500" />
                            </button>
                        </div>

                        <div className="p-8 flex flex-col items-center gap-6 bg-gray-100">
                            {previewFile.thumbnails && previewFile.thumbnails.length > 0 ? (
                                <img
                                    src={previewFile.thumbnails[0].large?.url || previewFile.thumbnails[0].medium.url}
                                    alt={previewFile.name}
                                    className="max-h-[400px] w-auto shadow-lg rounded-lg object-contain"
                                />
                            ) : (
                                <div className="w-32 h-32 flex items-center justify-center bg-white rounded-full shadow-md">
                                    {getFileIcon(previewFile.name)}
                                </div>
                            )}

                            <div className="flex gap-4 w-full justify-center">
                                <a
                                    href={previewFile.webUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="flex items-center gap-2 bg-[#2A5C82] text-white px-6 py-3 rounded-xl font-semibold hover:opacity-90 transition shadow-lg hover:shadow-xl transform hover:-translate-y-1"
                                >
                                    <FileIcon size={20} />
                                    Abrir en Aplicación
                                </a>
                            </div>
                            <p className="text-xs text-gray-500 text-center max-w-md">
                                Al hacer clic, se abrirá el archivo en Word/Excel Online. Desde ahí podrás editarlo o abrirlo en tu escritorio.
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default OneDriveExplorer;
