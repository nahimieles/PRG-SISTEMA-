"use client";
import React, { useState } from 'react';
import { useMsal } from "@azure/msal-react";
import { loginRequest } from "@/lib/authConfig";
import { initializeGraphClient, getRecentFiles } from "@/lib/onedriveService";
import { Sparkles, PlusCircle, Loader2, CheckCircle2 } from 'lucide-react';

const SmartReportGenerator = () => {
    const { instance, accounts } = useMsal();
    const [recentFiles, setRecentFiles] = useState([]);
    const [selectedFiles, setSelectedFiles] = useState([]);
    const [loading, setLoading] = useState(false);
    const [generatedReport, setGeneratedReport] = useState(null);

    // Auto-sync on mount if authenticated
    const checkForRecentActivity = React.useCallback(async () => {
        setLoading(true);
        try {
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
        } finally {
            setLoading(false);
        }
    }, []);

    React.useEffect(() => {
        if (accounts.length > 0) {
            const request = {
                ...loginRequest,
                account: accounts[0],
            };

            instance.acquireTokenSilent(request).then((response) => {
                initializeGraphClient(response.accessToken);
                checkForRecentActivity();
            }).catch((e) => {
                // Silent fail or redirect if needed, but for a widget maybe silent is better
                console.warn("SmartReport: Auth required", e);
            });
        }
    }, [accounts, instance, checkForRecentActivity]);

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

    if (accounts.length === 0) return null;

    return (
        <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <Sparkles className="text-yellow-500" />
                    <h3 className="font-bold text-gray-800">Generador de Reportes Inteligente</h3>
                </div>
                <button
                    onClick={checkForRecentActivity}
                    className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
                >
                    <Loader2 className={loading ? "animate-spin" : ""} size={14} /> Sincronizar
                </button>
            </div>

            {loading && recentFiles.length === 0 ? (
                <div className="text-center py-4 text-gray-500">Analizando actividad reciente...</div>
            ) : recentFiles.length === 0 ? (
                <p className="text-gray-500 text-sm">No se detectó actividad reciente en OneDrive.</p>
            ) : (
                <div className="space-y-4">
                    <div className="grid gap-2 max-h-48 overflow-y-auto">
                        {recentFiles.map(file => (
                            <label key={file.id} className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded cursor-pointer border border-transparent hover:border-gray-200">
                                <input
                                    type="checkbox"
                                    checked={selectedFiles.includes(file.id)}
                                    onChange={() => toggleFileSelection(file.id)}
                                    className="rounded text-blue-600 focus:ring-blue-500"
                                />
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium truncate">{file.name}</p>
                                    <p className="text-xs text-gray-400">
                                        {new Date(file.lastModifiedDateTime || file.remoteItem?.lastModifiedDateTime).toLocaleString()}
                                    </p>
                                </div>
                            </label>
                        ))}
                    </div>

                    <button
                        onClick={generateReport}
                        disabled={selectedFiles.length === 0}
                        className="w-full bg-[#2A5C82] text-white py-2 rounded-lg hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition"
                    >
                        Generar Reporte ({selectedFiles.length})
                    </button>
                </div>
            )}

            {generatedReport && (
                <div className="mt-4 p-3 bg-gray-50 rounded border border-gray-200 text-sm whitespace-pre-wrap">
                    {generatedReport}
                    <div className="mt-2 text-xs text-gray-500 text-center">
                        * Copia este texto y pégalo en tu registro de actividad diario.
                    </div>
                </div>
            )}
        </div>
    );
};

export default SmartReportGenerator;
