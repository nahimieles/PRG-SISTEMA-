"use client";
import React, { useState, useEffect } from 'react';
import { useMsal } from "@azure/msal-react";
import { loginRequest } from "@/lib/authConfig";
import { initializeGraphClient, getFiles } from "@/lib/onedriveService";
import { Folder, FileText, FileSpreadsheet, FileIcon, Download, Loader2, ArrowLeft } from 'lucide-react';

const OneDriveExplorer = () => {
    const { instance, accounts } = useMsal();
    const [files, setFiles] = useState([]);
    const [currentFolder, setCurrentFolder] = useState("root");
    const [folderHistory, setFolderHistory] = useState([]); // Stack tracking for navigation
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (accounts.length > 0) {
            const request = {
                ...loginRequest,
                account: accounts[0],
            };

            instance.acquireTokenSilent(request).then((response) => {
                initializeGraphClient(response.accessToken);
                loadFiles("root");
            }).catch((e) => {
                instance.acquireTokenPopup(request).then((response) => {
                    initializeGraphClient(response.accessToken);
                    loadFiles("root");
                });
            });
        }
    }, [accounts, instance]);

    const loadFiles = async (folderId) => {
        setLoading(true);
        setError(null);
        try {
            const result = await getFiles(folderId);
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
                    onClick={() => instance.loginPopup(loginRequest)}
                    className="bg-[#2A5C82] text-white px-6 py-2 rounded-lg hover:bg-[#1e4a6d] transition-colors"
                >
                    Conectar OneDrive
                </button>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-100">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-[#F8FAFC]">
                <div className="flex items-center gap-2">
                    {folderHistory.length > 0 && (
                        <button onClick={navigateUp} className="p-1 hover:bg-gray-200 rounded-full transition">
                            <ArrowLeft size={20} className="text-gray-600" />
                        </button>
                    )}
                    <h2 className="font-semibold text-gray-700">Mis Archivos</h2>
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
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {files.map((item) => (
                            <div
                                key={item.id}
                                className={`p-3 rounded-lg border flex items-center justify-between group transition-all hover:shadow-md ${item.folder ? 'bg-blue-50 border-blue-100 cursor-pointer' : 'bg-white border-gray-100'}`}
                                onClick={() => item.folder && navigateToFolder(item.id, item.name)}
                            >
                                <div className="flex items-center gap-3 overflow-hidden">
                                    {item.folder ? <Folder className="text-blue-500 fill-blue-500/20" /> : getFileIcon(item.name)}
                                    <div className="truncate">
                                        <p className="font-medium text-sm text-gray-700 truncate">{item.name}</p>
                                        <p className="text-[10px] text-gray-400">
                                            {new Date(item.lastModifiedDateTime).toLocaleDateString()}
                                        </p>
                                    </div>
                                </div>
                                {!item.folder && (
                                    <a
                                        href={item.webUrl}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-gray-100 rounded text-gray-500"
                                        title="Abrir en OneDrive"
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        <Download size={16} />
                                    </a>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default OneDriveExplorer;
