'use client';

import { useState, useEffect } from 'react';
import { Download, RefreshCw, Upload, Trash2, Edit2, FolderPlus, Move, FileText, Clock, Search as SearchIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { lightTheme, darkTheme } from '../lib/colors';
import { getAuditLogs } from '../lib/audit';
import { exportToExcel } from '../lib/auth';

export default function AuditLogsTable() {
    const { isDark } = useTheme();
    const theme = isDark ? darkTheme : lightTheme;

    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(false);

    // Filter and Pagination State
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(5);

    const loadLogs = async () => {
        setLoading(true);
        try {
            // Fetch a bigger batch of logs so frontend search is useful
            const data = await getAuditLogs({ limit: 500 });
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

    // Derived State for Filtering and Pagination
    const filteredLogs = logs.filter(log => {
        if (!searchTerm) return true;
        const searchLower = searchTerm.toLowerCase();
        return (
            (log.file_name && log.file_name.toLowerCase().includes(searchLower)) ||
            (log.worker_name && log.worker_name.toLowerCase().includes(searchLower)) ||
            (log.company_name && log.company_name.toLowerCase().includes(searchLower)) ||
            (log.action_type && log.action_type.toLowerCase().includes(searchLower)) ||
            (log.metadata?.description && log.metadata.description.toLowerCase().includes(searchLower))
        );
    });

    const totalPages = Math.ceil(filteredLogs.length / itemsPerPage) || 1;
    const startIndex = (currentPage - 1) * itemsPerPage;
    const paginatedLogs = filteredLogs.slice(startIndex, startIndex + itemsPerPage);

    // Reset to page 1 when search or items per page changes
    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, itemsPerPage]);

    const getActionIcon = (type) => {
        const iconClass = "w-4 h-4 sm:w-5 sm:h-5";
        switch (type) {
            case 'UPLOAD': return <div className="p-1.5 sm:p-2 bg-blue-100 dark:bg-blue-900/30 rounded-full"><Upload className={`${iconClass} text-blue-600`} /></div>;
            case 'DELETE': return <div className="p-1.5 sm:p-2 bg-red-100 dark:bg-red-900/30 rounded-full"><Trash2 className={`${iconClass} text-red-600`} /></div>;
            case 'RENAME': return <div className="p-1.5 sm:p-2 bg-amber-100 dark:bg-amber-900/30 rounded-full"><Edit2 className={`${iconClass} text-amber-600`} /></div>;
            case 'CREATE_FOLDER': return <div className="p-1.5 sm:p-2 bg-green-100 dark:bg-green-900/30 rounded-full"><FolderPlus className={`${iconClass} text-green-600`} /></div>;
            case 'MOVE': return <div className="p-1.5 sm:p-2 bg-purple-100 dark:bg-purple-900/30 rounded-full"><Move className={`${iconClass} text-purple-600`} /></div>;
            case 'OPEN_EDIT': return <div className="p-1.5 sm:p-2 bg-orange-100 dark:bg-orange-900/30 rounded-full"><Edit2 className={`${iconClass} text-orange-600`} /></div>;
            default: return <div className="p-1.5 sm:p-2 bg-gray-100 dark:bg-gray-800 rounded-full"><FileText className={`${iconClass} text-gray-600`} /></div>;
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

    const PaginationControls = () => (
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 py-2 border-t mt-4" style={{ borderColor: theme.border }}>
            <span className="text-xs sm:text-sm" style={{ color: theme.textSecondary }}>
                Mostrando {filteredLogs.length === 0 ? 0 : startIndex + 1} - {Math.min(startIndex + itemsPerPage, filteredLogs.length)} de {filteredLogs.length} reportes
            </span>
            <div className="flex items-center gap-2">
                <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="p-1.5 sm:p-2 rounded-lg border hover:bg-black/5 dark:hover:bg-white/10 transition disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{ borderColor: theme.border, color: theme.text }}
                >
                    <ChevronLeft size={18} />
                </button>
                <span className="text-xs sm:text-sm font-medium mx-2" style={{ color: theme.text }}>
                    Página {currentPage} de {totalPages}
                </span>
                <button
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="p-1.5 sm:p-2 rounded-lg border hover:bg-black/5 dark:hover:bg-white/10 transition disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{ borderColor: theme.border, color: theme.text }}
                >
                    <ChevronRight size={18} />
                </button>
            </div>
        </div>
    );

    return (
        <div className="animate-fade-in max-w-4xl mx-auto mb-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
                <div className="min-w-0 flex-1">
                    <h3 className="text-base sm:text-lg lg:text-xl font-bold" style={{ color: theme.text }}>Actividad Reciente</h3>
                    <p className="text-xs sm:text-sm" style={{ color: theme.textSecondary }}>Últimos movimientos en archivos</p>
                </div>

                {/* Search and Items Per Page Setup */}
                <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
                    <div className="relative w-full sm:w-64">
                        <input
                            type="text"
                            placeholder="Buscar reporte..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 text-sm rounded-lg border focus:outline-none focus:ring-1 focus:ring-blue-500"
                            style={{
                                background: theme.surface,
                                color: theme.text,
                                borderColor: theme.border
                            }}
                        />
                        <SearchIcon className="absolute left-3 top-2.5 text-gray-400" size={16} />
                    </div>

                    <div className="flex items-center gap-2 w-full sm:w-auto">
                        <select
                            value={itemsPerPage}
                            onChange={(e) => setItemsPerPage(Number(e.target.value))}
                            className="bg-transparent border rounded-lg text-sm px-3 py-2 cursor-pointer focus:outline-none"
                            style={{ borderColor: theme.border, color: theme.text }}
                        >
                            <option value={5}>5 por pág</option>
                            <option value={10}>10 por pág</option>
                            <option value={20}>20 por pág</option>
                            <option value={50}>50 por pág</option>
                        </select>

                        <div className="flex flex-row gap-1.5 sm:gap-2 flex-shrink-0 ml-auto sm:ml-0">
                            <button
                                onClick={loadLogs}
                                className="p-1.5 sm:p-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 transition"
                                title="Actualizar"
                            >
                                <RefreshCw className={`w-4 h-4 sm:w-5 sm:h-5 ${loading ? 'animate-spin' : ''}`} style={{ color: theme.text }} />
                            </button>
                            <button
                                onClick={() => exportToExcel(filteredLogs, 'Actividad_Reciente')}
                                disabled={filteredLogs.length === 0}
                                className="flex items-center gap-1.5 px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 transition text-xs sm:text-sm"
                            >
                                <Download size={14} className="sm:w-4 sm:h-4" /> <span className="hidden xl:inline">Excel</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {filteredLogs.length > 0 && <PaginationControls />}

            <div className="space-y-3 mt-4">
                {paginatedLogs.length === 0 ? (
                    <div className="text-center py-8 sm:py-12 rounded-xl border border-dashed" style={{ borderColor: theme.border }}>
                        <p className="text-sm" style={{ color: theme.textSecondary }}>
                            {searchTerm ? 'No se encontraron reportes que coincidan con tu búsqueda.' : 'No hay actividad registrada recientemente.'}
                        </p>
                    </div>
                ) : (
                    paginatedLogs.map((log, index) => (
                        <div
                            key={log.id}
                            className="flex items-start gap-2 sm:gap-3 p-3 sm:p-4 rounded-xl shadow-sm border transition-all hover:scale-[1.01] animate-in fade-in slide-in-from-bottom-4 duration-500"
                            style={{ 
                                background: theme.surface, 
                                borderColor: theme.border,
                                animationDelay: `${index * 50}ms`
                            }}
                        >
                            {getActionIcon(log.action_type)}

                            <div className="flex-1 min-w-0">
                                <p className="text-xs sm:text-sm" style={{ color: theme.textSecondary }}>
                                    {getActionText(log)}
                                </p>
                                <div className="flex items-center gap-2 sm:gap-4 mt-1 flex-wrap">
                                    <span className="text-[10px] sm:text-xs flex items-center gap-1 opacity-70" style={{ color: theme.textSecondary }}>
                                        <Clock size={10} className="sm:w-3 sm:h-3" /> {new Date(log.timestamp).toLocaleString()}
                                    </span>
                                    {log.metadata?.driveId && (
                                        <span className="text-[10px] sm:text-xs bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded text-gray-500 hidden sm:inline">
                                            Drive ID: ...{log.metadata.driveId.slice(-6)}
                                        </span>
                                    )}
                                    {log.metadata?.webUrl && (
                                        <a
                                            href={log.metadata.webUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-[10px] sm:text-xs text-blue-500 hover:text-blue-600 hover:underline flex items-center gap-1"
                                        >
                                            Abrir archivo
                                        </a>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {filteredLogs.length > 0 && <PaginationControls />}
        </div>
    );
}

