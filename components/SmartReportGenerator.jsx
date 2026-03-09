"use client";
import React, { useState, useEffect, useCallback } from 'react';
import { useMsal } from "@azure/msal-react";
import { loginRequest } from "@/lib/authConfig";
import { initializeGraphClient, getRecentFiles } from "@/lib/onedriveService";
import { Sparkles, Loader2, RefreshCw, AlertCircle, PlayCircle } from 'lucide-react';

const SmartReportGenerator = () => {
    const { instance, accounts, inProgress } = useMsal();
    const [recentFiles, setRecentFiles] = useState([]);
    const [selectedFiles, setSelectedFiles] = useState([]);
    const [loading, setLoading] = useState(false);
    const [generatedReport, setGeneratedReport] = useState(null);
    const [errorMsg, setErrorMsg] = useState(null);

    const isConnected = accounts.length > 0;

    const handleLogin = async () => {
        try {
            await instance.loginPopup(loginRequest);
        } catch (error) {
            console.error("Login failed:", error);
            setErrorMsg("No se pudo iniciar sesión en Microsoft. " + error.message);
        }
    };

    const checkForRecentActivity = useCallback(async () => {
        if (!isConnected) return;
        setLoading(true);
        setErrorMsg(null);
        try {
            const request = { ...loginRequest, account: accounts[0] };
            const response = await instance.acquireTokenSilent(request).catch(async (e) => {
                // If silent fails, we need to prompt the user
                console.warn("Silent token failed, prompting user:", e);
                return await instance.acquireTokenPopup(request);
            });

            initializeGraphClient(response.accessToken);
            const files = await getRecentFiles();

            if (files.length > 0) {
                setRecentFiles(files);
                // Auto-select files modified today
                const today = new Date().toDateString();
                const todayFiles = files.filter(f =>
                    new Date(f.lastModifiedDateTime || f.remoteItem?.lastModifiedDateTime).toDateString() === today
                ).map(f => f.id);
                setSelectedFiles(todayFiles);
            }
        } catch (error) {
            console.error("Error auto-syncing:", error);
            setErrorMsg("Error al obtener la actividad de SharePoint.");
        } finally {
            setLoading(false);
        }
    }, [accounts, instance, isConnected]);

    // Initial load when connected
    useEffect(() => {
        if (isConnected && inProgress === "none") {
            checkForRecentActivity();
        }
    }, [isConnected, inProgress, checkForRecentActivity]);

    const toggleFileSelection = (fileId) => {
        setSelectedFiles(prev =>
            prev.includes(fileId) ? prev.filter(id => id !== fileId) : [...prev, fileId]
        );
    };

    const generateReport = () => {
        if (selectedFiles.length === 0) return;

        const filesToReport = recentFiles.filter(f => selectedFiles.includes(f.id));
        const reportText = filesToReport.map(f =>
            `- ${f.name} (Modificado: ${new Date(f.lastModifiedDateTime || f.remoteItem?.lastModifiedDateTime).toLocaleTimeString()})`
        ).join('\n');

        setGeneratedReport(`Reporte de Actividad Automático:\n${reportText}`);
    };

    if (inProgress !== "none") {
        return (
            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 flex items-center justify-center gap-2">
                <Loader2 className="animate-spin text-blue-500" />
                <span className="text-gray-500">Iniciando Microsoft...</span>
            </div>
        );
    }

    if (!isConnected) {
        return (
            <div className="bg-white rounded-xl shadow-sm p-6 border border-red-100 flex flex-col items-center justify-center text-center">
                <AlertCircle className="text-red-400 w-8 h-8 mb-2" />
                <h3 className="font-bold text-gray-800">Conexión Requerida</h3>
                <p className="text-sm text-gray-500 mb-4">Inicia sesión en Microsoft para generar reportes automáticos.</p>
                <button
                    onClick={handleLogin}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition font-medium"
                >
                    Conectar Cuenta Microsoft
                </button>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <Sparkles className="text-yellow-500" />
                    <h3 className="font-bold text-gray-800">Candidatos para Reporte Diario</h3>
                </div>
                <button
                    onClick={checkForRecentActivity}
                    className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1 font-medium"
                >
                    <RefreshCw className={loading ? "animate-spin" : ""} size={14} /> Sincronizar
                </button>
            </div>

            {errorMsg && (
                <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm border border-red-100">
                    {errorMsg}
                </div>
            )}

            {loading && recentFiles.length === 0 ? (
                <div className="text-center py-6 text-gray-500 flex flex-col items-center gap-2">
                    <Loader2 className="animate-spin text-blue-400" />
                    <span className="text-sm">Analizando actividad reciente en SharePoint...</span>
                </div>
            ) : recentFiles.length === 0 ? (
                <div className="text-center py-6 border-2 border-dashed border-gray-100 rounded-xl">
                    <p className="text-gray-500 text-sm">No se detectó actividad reciente en OneDrive.</p>
                </div>
            ) : (
                <div className="space-y-4">
                    <div className="grid gap-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                        {recentFiles.map(file => (
                            <label key={file.id} className="flex items-start gap-3 p-3 hover:bg-gray-50 rounded-xl cursor-pointer border border-transparent hover:border-blue-100 transition-colors">
                                <input
                                    type="checkbox"
                                    checked={selectedFiles.includes(file.id)}
                                    onChange={() => toggleFileSelection(file.id)}
                                    className="mt-1 rounded text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer border-gray-300"
                                />
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-gray-800 truncate" title={file.name}>{file.name}</p>
                                    <p className="text-xs text-gray-400 mt-0.5">
                                        Modificado: {new Date(file.lastModifiedDateTime || file.remoteItem?.lastModifiedDateTime).toLocaleString()}
                                    </p>
                                </div>
                            </label>
                        ))}
                    </div>

                    <button
                        onClick={generateReport}
                        disabled={selectedFiles.length === 0}
                        className="w-full bg-blue-600 text-white py-3 rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition font-medium flex items-center justify-center gap-2 shadow-sm"
                    >
                        <PlayCircle size={18} />
                        Procesar en Reporte ({selectedFiles.length})
                    </button>
                </div>
            )}

            {generatedReport && (
                <div className="mt-4 animate-fade-in-up">
                    <p className="text-xs font-semibold text-gray-400 mb-2 px-1 uppercase tracking-wider">Resultado Generado</p>
                    <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 text-sm whitespace-pre-wrap font-mono relative group">
                        {generatedReport}
                        <button
                            className="absolute top-2 right-2 p-1.5 bg-white border shadow-sm rounded-lg text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity hover:text-blue-600"
                            onClick={() => navigator.clipboard.writeText(generatedReport)}
                            title="Copiar texto"
                        >
                            📋
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SmartReportGenerator;
