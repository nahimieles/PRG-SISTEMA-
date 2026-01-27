'use client';

import { useState, useEffect } from 'react';
import { Download, RefreshCw, Upload, Trash2, Edit2, FolderPlus, Move, FileText, Clock, User } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { lightTheme, darkTheme } from '../lib/colors';
import { getAuditLogs } from '../lib/audit';
import { exportToExcel } from '../lib/auth';

export default function AuditLogsTable() {
    const { isDark } = useTheme();
    const theme = isDark ? darkTheme : lightTheme;

    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(false);

    // Simplified Filter: Only Day Selection (defaults to today/recent)
    // Removed complex multi-range filters for simplicity as requested.

    const loadLogs = async () => {
        setLoading(true);
        try {
            // Fetch last 50 logs automatically
            const data = await getAuditLogs({ limit: 50 });
            setLogs(data || []);
        } catch (error) {
            console.error('Error loading logs:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadLogs();
        // Auto-refresh every 30 seconds
        const interval = setInterval(loadLogs, 30000);
        return () => clearInterval(interval);
    }, []);

    const getActionIcon = (type) => {
        switch (type) {
            case 'UPLOAD': return <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-full"><Upload className="w-5 h-5 text-blue-600" /></div>;
            case 'DELETE': return <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-full"><Trash2 className="w-5 h-5 text-red-600" /></div>;
            case 'RENAME': return <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-full"><Edit2 className="w-5 h-5 text-amber-600" /></div>;
            case 'CREATE_FOLDER': return <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-full"><FolderPlus className="w-5 h-5 text-green-600" /></div>;
            case 'MOVE': return <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-full"><Move className="w-5 h-5 text-purple-600" /></div>;
            case 'OPEN_EDIT': return <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-full"><Edit2 className="w-5 h-5 text-orange-600" /></div>;
            default: return <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded-full"><FileText className="w-5 h-5 text-gray-600" /></div>;
        }
    };

    const getActionText = (log) => {
        const strongStyle = { fontWeight: '600', color: theme.text };
        const name = <span style={strongStyle}>{log.worker_name || 'Desconocido'}</span>;
        const file = <span style={strongStyle}>{log.file_name}</span>;

        switch (log.action_type) {
            case 'UPLOAD': return <>{name} subió el archivo {file}</>;
            case 'DELETE': return <>{name} eliminó {file}</>;
            case 'RENAME': return <>{name} renombró un archivo a {file}</>;
            case 'CREATE_FOLDER': return <>{name} creó la carpeta {file}</>;
            case 'MOVE': return <>{name} movió {file}</>;
            case 'OPEN_EDIT': return <>{name} abrió {file} para editar</>;
            default: return <>{name} realizó una acción con {file}</>;
        }
    };

    return (
        <div className="animate-fade-in max-w-4xl mx-auto mb-8">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h3 className="text-xl font-bold" style={{ color: theme.text }}>Actividad Reciente</h3>
                    <p className="text-sm" style={{ color: theme.textSecondary }}>Últimos movimientos en archivos</p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={loadLogs}
                        className="p-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 transition"
                        title="Actualizar"
                    >
                        <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} style={{ color: theme.text }} />
                    </button>
                    <button
                        onClick={() => exportToExcel(logs, 'Actividad_Reciente')}
                        disabled={logs.length === 0}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 transition"
                    >
                        <Download size={18} /> <span className="hidden sm:inline">Excel</span>
                    </button>
                </div>
            </div>

            <div className="space-y-4">
                {logs.length === 0 ? (
                    <div className="text-center py-12 rounded-xl border border-dashed" style={{ borderColor: theme.border }}>
                        <p style={{ color: theme.textSecondary }}>No hay actividad registrada recientemente.</p>
                    </div>
                ) : (
                    logs.map((log) => (
                        <div
                            key={log.id}
                            className="flex items-start gap-4 p-4 rounded-xl shadow-sm border transition-transform hover:scale-[1.01]"
                            style={{ background: theme.surface, borderColor: theme.border }}
                        >
                            {getActionIcon(log.action_type)}

                            <div className="flex-1 min-w-0">
                                <p className="text-sm" style={{ color: theme.textSecondary }}>
                                    {getActionText(log)}
                                </p>
                                <div className="flex items-center gap-4 mt-1">
                                    <span className="text-xs flex items-center gap-1 opacity-70" style={{ color: theme.textSecondary }}>
                                        <Clock size={12} /> {new Date(log.timestamp).toLocaleString()}
                                    </span>
                                    {log.metadata?.driveId && (
                                        <span className="text-xs bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded text-gray-500">
                                            Drive ID: ...{log.metadata.driveId.slice(-6)}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
