"use client";
import React, { useState, useEffect, useRef } from 'react';
import { X, Server, Play, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { useTheme } from "@/contexts/ThemeContext";

export default function RcloneBackupModal({ isOpen, onClose, groups }) {
    const { isDark } = useTheme();
    const [logs, setLogs] = useState([]);
    const [isBackingUp, setIsBackingUp] = useState(false);
    const [isDone, setIsDone] = useState(false);
    const logsEndRef = useRef(null);
    const abortControllerRef = useRef(null);

    // Only show groups that have a resource_id (Drive ID)
    const validTargets = groups.filter(g => g.resource_id);

    // Auto-scroll to bottom of logs
    useEffect(() => {
        if (logsEndRef.current) {
            logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [logs]);

    const handleStartBackup = async () => {
        if (validTargets.length === 0) {
            setLogs(prev => [...prev, "❌ No hay grupos de Teams con almacenamiento vinculado (Drive ID)"]);
            return;
        }

        setIsBackingUp(true);
        setIsDone(false);
        setLogs(["Iniciando proceso de respaldo masivo..."]);

        const controller = new AbortController();
        abortControllerRef.current = controller;

        try {
            const response = await fetch('/api/backup', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    targets: validTargets.map(g => ({ name: g.name, driveId: g.resource_id })) 
                }),
                signal: controller.signal
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || "Error al iniciar el respaldo");
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder("utf-8");

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value, { stream: true });
                const lines = chunk.split('\n\n');
                
                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        try {
                            const data = JSON.parse(line.replace('data: ', ''));
                            if (data.log) {
                                setLogs(prev => [...prev, data.log]);
                            }
                            if (data.done) {
                                setIsDone(true);
                                setIsBackingUp(false);
                            }
                            if (data.error) {
                                setLogs(prev => [...prev, `❌ ERROR: ${data.error}`]);
                            }
                        } catch (e) {}
                    }
                }
            }

        } catch (error) {
            if (error.name === 'AbortError') {
                setLogs(prev => [...prev, "⚠️ Respaldo cancelado por el usuario."]);
            } else {
                setLogs(prev => [...prev, `❌ Error de conexión: ${error.message}`]);
            }
        } finally {
            setIsBackingUp(false);
        }
    };

    const handleClose = () => {
        if (isBackingUp) {
            if (confirm("¿Estás seguro que deseas cancelar el respaldo en progreso?")) {
                if (abortControllerRef.current) {
                    abortControllerRef.current.abort();
                }
                onClose();
            }
        } else {
            onClose();
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={handleClose}>
            <div 
                className="w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden flex flex-col pointer-events-auto"
                style={{ backgroundColor: isDark ? '#0f172a' : '#ffffff', maxHeight: '90vh' }}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="p-6 flex justify-between items-center border-b border-gray-200 dark:border-gray-800">
                    <div className="flex items-center gap-3">
                        <div className="p-3 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
                            <Server size={24} />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold dark:text-gray-100 text-gray-900">
                                Respaldo Masivo Rclone
                            </h2>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                Se detectaron {validTargets.length} Grupos para Respaldar
                            </p>
                        </div>
                    </div>
                    <button 
                        onClick={handleClose} 
                        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                        disabled={isBackingUp && !isDone}
                    >
                        <X size={20} className="text-gray-500" />
                    </button>
                </div>

                {/* Body (Terminal View) */}
                <div className="flex-1 overflow-hidden flex flex-col p-6 gap-6 bg-gray-50 dark:bg-[#090b11]">
                    
                    {/* Disclaimer / Info */}
                    <div className="p-4 rounded-xl border border-amber-200 dark:border-amber-900/50 bg-amber-50 dark:bg-amber-900/10 flex gap-3 text-amber-800 dark:text-amber-200">
                        <AlertCircle className="shrink-0 mt-0.5" size={20} />
                        <div className="text-sm">
                            <p className="font-semibold mb-1">Requisitos Previos:</p>
                            <ul className="list-disc pl-5 opacity-90 space-y-1">
                                <li><b>Rclone</b> debe estar instalado y configurado en el PATH del servidor/máquina donde corre esta app.</li>
                                <li>Debe existir un remote llamado <code>m365</code> configurado de tipo <code>onedrive</code> (Microsoft 365).</li>
                                <li>El destino será la carpeta <code>C:\Respaldo_Teams_SharePoint</code> de la máquina servidora.</li>
                            </ul>
                        </div>
                    </div>

                    {/* Console Output */}
                    <div className="flex-1 bg-gray-900 rounded-xl p-4 overflow-auto font-mono text-sm leading-relaxed text-gray-300 shadow-inner min-h-[300px] border border-gray-800">
                        {logs.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full text-gray-600 gap-3">
                                <Server size={40} className="opacity-20" />
                                <p>Listo para iniciar la extracción espejo unidireccional.</p>
                                <p className="text-xs">Se usarán banderas de tolerancia a fallos (--tpslimit, --ignore-errors, --checkers=16).</p>
                            </div>
                        ) : (
                            <div className="space-y-1">
                                {logs.map((log, i) => (
                                    <div key={i} className={`${
                                        log.includes('ERROR') || log.includes('❌') ? 'text-red-400' :
                                        log.includes('✅') ? 'text-green-400' :
                                        log.includes('Sincronizando') ? 'text-blue-300 font-bold mt-4' :
                                        ''
                                    }`}>
                                        {log}
                                    </div>
                                ))}
                                <div ref={logsEndRef} />
                            </div>
                        )}
                    </div>

                </div>

                {/* Footer Controls */}
                <div className="p-4 border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-[#0f172a] flex justify-end gap-3">
                    <button
                        onClick={handleClose}
                        className="px-5 py-2.5 rounded-xl font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                    >
                        {isDone ? 'Cerrar' : 'Cancelar'}
                    </button>
                    {!isBackingUp && !isDone && (
                        <button
                            onClick={handleStartBackup}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-xl font-medium shadow-md hover:shadow-lg transition-all flex items-center gap-2"
                        >
                            <Play size={18} fill="currentColor" />
                            Iniciar Sincronización
                        </button>
                    )}
                    {isBackingUp && !isDone && (
                        <button
                            disabled
                            className="bg-blue-600/50 text-white px-6 py-2.5 rounded-xl font-medium flex items-center gap-2 cursor-wait"
                        >
                            <Loader2 size={18} className="animate-spin" />
                            Sincronizando...
                        </button>
                    )}
                    {isDone && (
                        <button
                            disabled
                            className="bg-green-600 text-white px-6 py-2.5 rounded-xl font-medium flex items-center gap-2"
                        >
                            <CheckCircle2 size={18} />
                            Completado
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
