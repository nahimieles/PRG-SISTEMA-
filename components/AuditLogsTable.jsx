'use client';

import { useState, useEffect } from 'react';
import { Download, Search, RefreshCw, FileText, Folder, Trash2, Edit2, Upload, Move, Plus } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { lightTheme, darkTheme } from '../lib/colors';
import { getAuditLogs } from '../lib/audit'; // Make sure to implement this in lib/audit.js
import { exportToExcel } from '../lib/auth';

export default function AuditLogsTable() {
    const { isDark } = useTheme();
    const theme = isDark ? darkTheme : lightTheme;

    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(false);
    const [filters, setFilters] = useState({
        worker: '',
        startDate: '',
        endDate: ''
    });

    const loadLogs = async () => {
        setLoading(true);
        try {
            const data = await getAuditLogs(filters);
            setLogs(data || []);
        } catch (error) {
            console.error('Error loading logs:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadLogs();
    }, []);

    const getActionIcon = (type) => {
        switch (type) {
            case 'UPLOAD': return <Upload className="w-4 h-4 text-blue-500" />;
            case 'DELETE': return <Trash2 className="w-4 h-4 text-red-500" />;
            case 'RENAME': return <Edit2 className="w-4 h-4 text-amber-500" />;
            case 'CREATE_FOLDER': return <Folder className="w-4 h-4 text-green-500" />;
            case 'MOVE': return <Move className="w-4 h-4 text-purple-500" />;
            default: return <FileText className="w-4 h-4 text-gray-500" />;
        }
    };

    const getActionLabel = (type) => {
        const labels = {
            'UPLOAD': 'Subida',
            'DELETE': 'Eliminación',
            'RENAME': 'Renombrado',
            'CREATE_FOLDER': 'Nueva Carpeta',
            'MOVE': 'Movimiento'
        };
        return labels[type] || type;
    };

    return (
        <div className="animate-fade-in">
            <div className="rounded-xl shadow-lg p-6 mb-6" style={{ background: theme.surface }}>
                <h3 className="font-semibold mb-4" style={{ color: theme.primary }}>Reporte de Actividad (Automático)</h3>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div>
                        <label className="block text-sm font-medium mb-1" style={{ color: theme.textSecondary }}>Funcionario</label>
                        <input
                            type="text"
                            placeholder="Nombre..."
                            value={filters.worker}
                            onChange={e => setFilters({ ...filters, worker: e.target.value })}
                            className="w-full px-4 py-2 border-2 rounded-lg focus:outline-none"
                            style={{ borderColor: theme.border, background: isDark ? '#0f1419' : '#fff', color: theme.text }}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1" style={{ color: theme.textSecondary }}>Desde</label>
                        <input
                            type="date"
                            value={filters.startDate}
                            onChange={e => setFilters({ ...filters, startDate: e.target.value })}
                            className="w-full px-4 py-2 border-2 rounded-lg focus:outline-none"
                            style={{ borderColor: theme.border, background: isDark ? '#0f1419' : '#fff', color: theme.text }}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1" style={{ color: theme.textSecondary }}>Hasta</label>
                        <input
                            type="date"
                            value={filters.endDate}
                            onChange={e => setFilters({ ...filters, endDate: e.target.value })}
                            className="w-full px-4 py-2 border-2 rounded-lg focus:outline-none"
                            style={{ borderColor: theme.border, background: isDark ? '#0f1419' : '#fff', color: theme.text }}
                        />
                    </div>
                </div>

                <div className="flex justify-between items-center">
                    <button
                        onClick={loadLogs}
                        disabled={loading}
                        className="px-4 py-2 rounded-lg flex items-center gap-2 text-white"
                        style={{ background: theme.primary }}
                    >
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Actualizar
                    </button>

                    <button
                        onClick={() => exportToExcel(logs, 'Reporte_Actividad')}
                        disabled={logs.length === 0}
                        className="px-4 py-2 rounded-lg flex items-center gap-2 text-white bg-green-600 disabled:opacity-50"
                    >
                        <Download className="w-4 h-4" /> Exportar Excel
                    </button>
                </div>
            </div>

            <div className="rounded-xl shadow-lg overflow-hidden" style={{ background: theme.surface }}>
                {logs.length === 0 ? (
                    <div className="p-12 text-center" style={{ color: theme.textSecondary }}>
                        No hay registros de actividad en este periodo.
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="text-white" style={{ background: theme.primary }}>
                                <tr>
                                    <th className="px-4 py-3 text-left">Acción</th>
                                    <th className="px-4 py-3 text-left">Archivo / Carpeta</th>
                                    <th className="px-4 py-3 text-left">Funcionario</th>
                                    <th className="px-4 py-3 text-left">Fecha y Hora</th>
                                    <th className="px-4 py-3 text-left">Detalles</th>
                                </tr>
                            </thead>
                            <tbody>
                                {logs.map((log) => (
                                    <tr key={log.id} className="border-b" style={{ borderColor: theme.border }}>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-2">
                                                {getActionIcon(log.action_type)}
                                                <span className="font-medium">{getActionLabel(log.action_type)}</span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 font-mono text-xs">{log.file_name}</td>
                                        <td className="px-4 py-3">{log.worker_name || 'Sistema'}</td>
                                        <td className="px-4 py-3 text-xs">{new Date(log.timestamp).toLocaleString()}</td>
                                        <td className="px-4 py-3 text-xs opacity-75">{JSON.stringify(log.metadata) || '-'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
