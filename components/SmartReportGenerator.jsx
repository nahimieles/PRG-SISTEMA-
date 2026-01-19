"use client";
import React, { useState } from 'react';
import { useMsal } from "@azure/msal-react";
import { loginRequest } from "@/lib/authConfig";
import { initializeGraphClient, getRecentFiles } from "@/lib/onedriveService";
import { Sparkles, PlusCircle, Loader2, CheckCircle2 } from 'lucide-react';

const SmartReportGenerator = () => {
    const { instance, accounts } = useMsal();
    const [recentFiles, setRecentFiles] = useState([]);
    const [loading, setLoading] = useState(false);
    const [scanned, setScanned] = useState(false);

    const scanActivity = async () => {
        if (accounts.length === 0) {
            instance.loginPopup(loginRequest);
            return;
        }

        setLoading(true);
        try {
            const request = { ...loginRequest, account: accounts[0] };
            const response = await instance.acquireTokenSilent(request).catch(e => instance.acquireTokenPopup(request));

            initializeGraphClient(response.accessToken);

            const files = await getRecentFiles();
            setRecentFiles(files);
            setScanned(true);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const addToReport = (fileName) => {
        // Logic to communicate with parent form would go here
        // For now just alert visually
        alert(`Se agregaría: "Trabajo realizado en archivo: ${fileName}" al reporte.`);
    }

    return (
        <div className="bg-gradient-to-r from-indigo-50 to-blue-50 rounded-xl p-6 border border-indigo-100 mb-6">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                    <div className="bg-white p-2 rounded-lg shadow-sm">
                        <Sparkles className="text-indigo-600" size={24} />
                    </div>
                    <div>
                        <h3 className="font-semibold text-gray-800">Reporte Inteligente</h3>
                        <p className="text-sm text-gray-500">Detecta tu actividad reciente automáticamente</p>
                    </div>
                </div>
                <button
                    onClick={scanActivity}
                    disabled={loading}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                >
                    {loading ? <Loader2 className="animate-spin" size={16} /> : <Sparkles size={16} />}
                    {scanned ? "Escanear de nuevo" : "Detectar Actividad"}
                </button>
            </div>

            {scanned && (
                <div className="space-y-2 mt-4 animate-in fade-in slide-in-from-top-4 duration-500">
                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">
                        Archivos modificados (Últimas 24h)
                    </h4>

                    {recentFiles.length === 0 ? (
                        <p className="text-sm text-gray-500 italic">No se detectaron cambios recientes en OneDrive.</p>
                    ) : (
                        recentFiles.map((file) => (
                            <div key={file.id} className="bg-white p-3 rounded-lg border border-gray-200 flex items-center justify-between group hover:border-indigo-300 transition-colors">
                                <div className="flex flex-col">
                                    <span className="font-medium text-gray-700">{file.name}</span>
                                    <span className="text-[10px] text-gray-400">
                                        Modificado: {new Date(file.lastModifiedDateTime).toLocaleTimeString()}
                                    </span>
                                </div>
                                <button
                                    onClick={() => addToReport(file.name)}
                                    className="text-indigo-600 hover:bg-indigo-50 p-2 rounded-full transition-colors flex items-center gap-1 text-xs font-bold"
                                >
                                    <PlusCircle size={16} />
                                    Agregar
                                </button>
                            </div>
                        ))
                    )}
                </div>
            )}
        </div>
    );
};

export default SmartReportGenerator;
