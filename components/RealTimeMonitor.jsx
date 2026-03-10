"use client";
import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
    Activity, Clock, FileText, User as UserIcon, Building2, FolderOpen,
    Wifi, WifiOff, RefreshCw, Trash2, Trash, CheckSquare, Square, X, Search, ChevronLeft, ChevronRight
} from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { lightTheme, darkTheme } from '@/lib/colors';
import { getAuditLogs, deleteAuditLog, deleteMultipleAuditLogs, clearAllAuditLogs } from '@/lib/audit';

// ─── Config ───────────────────────────────────────────────────────────────────
const MAX_EVENTS = 100; // Maximum events kept in memory/UI

// ─── Action badge styles ──────────────────────────────────────────────────────
const ACTION_STYLES = {
    CREATED: { bg: 'bg-green-100  dark:bg-green-900/30', text: 'text-green-700  dark:text-green-400', label: 'CREADO' },
    MODIFIED: { bg: 'bg-blue-100   dark:bg-blue-900/30', text: 'text-blue-700   dark:text-blue-400', label: 'MODIFICADO' },
    DELETED: { bg: 'bg-red-100    dark:bg-red-900/30', text: 'text-red-700    dark:text-red-400', label: 'ELIMINADO' },
    RENAMED: { bg: 'bg-amber-100  dark:bg-amber-900/30', text: 'text-amber-700  dark:text-amber-400', label: 'RENOMBRADO' },
    MOVED: { bg: 'bg-purple-100 dark:bg-purple-900/30', text: 'text-purple-700 dark:text-purple-400', label: 'MOVIDO' },
};

function ActionBadge({ action }) {
    const style = ACTION_STYLES[action] || ACTION_STYLES.MODIFIED;
    return (
        <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${style.bg} ${style.text}`}>
            {style.label}
        </span>
    );
}

function formatDate(dateStr) {
    if (!dateStr) return '—';
    try {
        return new Date(dateStr).toLocaleString('es-EC', {
            day: '2-digit', month: '2-digit', year: 'numeric',
            hour: '2-digit', minute: '2-digit',
        });
    } catch {
        return dateStr;
    }
}

function shortenPath(path) {
    if (!path || path === '/') return null;
    return decodeURIComponent(path)
        .replace(/^\/drives\/[^/]+\/root:\//i, '')
        .replace(/^\/sites\/[^/]+\/[^/]+\//i, '') || null;
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function RealTimeMonitor({ onLogsChanged }) {
    const [events, setEvents] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedWorker, setSelectedWorker] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(5);

    const [status, setStatus] = useState('connecting'); // 'connecting' | 'connected' | 'error'
    const [selected, setSelected] = useState(new Set()); // Set of event UIDs
    const [selectMode, setSelectMode] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);
    const { isDark } = useTheme();
    const theme = isDark ? darkTheme : lightTheme;
    const retryRef = useRef(null);
    const esRef = useRef(null);
    const uidCounter = useRef(0);

    // Reset pagination when filter or page size changes
    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, selectedWorker, itemsPerPage]);

    // ── SSE Connection ────────────────────────────────────────────────────────
    const connect = useCallback(() => {
        if (esRef.current) esRef.current.close();
        setStatus('connecting');

        const es = new EventSource('/api/realtime/stream');
        esRef.current = es;

        es.onopen = () => {
            setStatus('connected');
            if (retryRef.current) { clearTimeout(retryRef.current); retryRef.current = null; }
        };

        es.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                if (data.type === 'connected') return;
                if (!data.fileName && !data.action) return;

                // Attach a stable unique ID for selection tracking
                const uid = String(++uidCounter.current);
                setEvents(prev => [{ ...data, _uid: uid }, ...prev].slice(0, MAX_EVENTS));
            } catch { /* malformed */ }
        };

        es.onerror = () => {
            setStatus('error');
            es.close();
            esRef.current = null;
            const delay = Math.min(30_000, 2_000 * (1 + Math.random()));
            retryRef.current = setTimeout(connect, delay);
        };
    }, []);

    useEffect(() => {
        // Load initial history from database so it's not empty
        const loadHistory = async () => {
            try {
                // Fetch up to 500 events so the local frontend search works deeply
                const logs = await getAuditLogs({ limit: 500 });
                if (logs && logs.length > 0) {
                    const mappedHistory = logs.map(log => {
                        let actionMsg = log.metadata?.changeType;
                        if (!actionMsg) {
                            actionMsg = log.action_type?.replace('AUTO_', '') || 'MODIFIED';
                        }
                        return {
                            _uid: String(++uidCounter.current),
                            dbId: log.id, // Keep reference to DB row for deletion
                            fileName: log.file_name,
                            user: log.worker_name,
                            company: log.company_name,
                            action: actionMsg,
                            date: log.timestamp,
                            filePath: log.file_path,
                            driveId: log.metadata?.driveId,
                            fileId: log.metadata?.fileId,
                            webUrl: log.metadata?.webUrl
                        };
                    });
                    setEvents(mappedHistory);
                }
            } catch (err) {
                console.error("Failed to load initial history:", err);
            }
        };

        loadHistory().then(() => {
            // Then connect to live SSE stream
            connect();
        });

        return () => {
            if (esRef.current) esRef.current.close();
            if (retryRef.current) clearTimeout(retryRef.current);
        };
    }, [connect]);

    // ── Selection helpers ─────────────────────────────────────────────────────
    const toggleSelect = (uid) => {
        setSelected(prev => {
            const next = new Set(prev);
            next.has(uid) ? next.delete(uid) : next.add(uid);
            return next;
        });
    };

    const selectAll = () => setSelected(new Set(events.map(e => e._uid)));
    const clearSelection = () => setSelected(new Set());

    const allSelected = events.length > 0 && selected.size === events.length;

    // ── Delete actions ────────────────────────────────────────────────────────
    const deleteEvent = async (uid) => {
        const eventToDelete = events.find(e => e._uid === uid);

        // Optimistically remove from UI
        setEvents(prev => prev.filter(e => e._uid !== uid));
        setSelected(prev => { const n = new Set(prev); n.delete(uid); return n; });

        // Delete from DB if it's a historical record
        if (eventToDelete && eventToDelete.dbId) {
            await deleteAuditLog(eventToDelete.dbId);
            if (onLogsChanged) onLogsChanged();
        }
    };

    const deleteSelected = async () => {
        const eventsToDelete = events.filter(e => selected.has(e._uid));
        const dbIdsToDelete = eventsToDelete.map(e => e.dbId).filter(Boolean);

        // Optimistically remove from UI
        setEvents(prev => prev.filter(e => !selected.has(e._uid)));
        setSelected(new Set());

        // Delete from DB
        if (dbIdsToDelete.length > 0) {
            await deleteMultipleAuditLogs(dbIdsToDelete);
            if (onLogsChanged) onLogsChanged();
        }
    };

    const clearAll = async () => {
        // Optimistically remove from UI
        setEvents([]);
        setSelected(new Set());
        setSelectMode(false);
        setCurrentPage(1);

        // Delete all from DB
        await clearAllAuditLogs();
        if (onLogsChanged) onLogsChanged();
    };

    // ── Manual Sync ───────────────────────────────────────────────────────────
    const handleManualSync = async () => {
        setIsSyncing(true);
        try {
            // Note: Since SSE is active, any events discovered by this endpoint 
            // will be pushed back to this client via the SSE stream automatically.
            await fetch('/api/graph/delta', { method: 'POST' });
        } catch (err) {
            console.error("Error manual sync:", err);
        } finally {
            setIsSyncing(false);
        }
    };

    // ── Filter and Pagination variables ───────────────────────────────────────

    // Calculate unique workers for the dropdown
    const uniqueWorkers = React.useMemo(() => {
        const workers = events.map(ev => ev.user).filter(Boolean);
        return [...new Set(workers)].sort();
    }, [events]);

    // 1. Filter the events
    const filteredEvents = events.filter(ev => {
        // Filter by worker
        if (selectedWorker && ev.user !== selectedWorker) return false;

        // Filter by search term
        if (!searchTerm) return true;

        const searchLower = searchTerm.toLowerCase();
        const translatedAction = ACTION_STYLES[ev.action]?.label?.toLowerCase() || '';

        return (
            (ev.fileName && ev.fileName.toLowerCase().includes(searchLower)) ||
            (ev.user && ev.user.toLowerCase().includes(searchLower)) ||
            (ev.company && ev.company.toLowerCase().includes(searchLower)) ||
            (ev.action && ev.action.toLowerCase().includes(searchLower)) ||
            (translatedAction && translatedAction.includes(searchLower))
        );
    });

    const totalPages = Math.max(1, Math.ceil(filteredEvents.length / itemsPerPage));
    const validCurrentPage = Math.min(currentPage, totalPages);

    // Render safety
    if (currentPage !== validCurrentPage && filteredEvents.length > 0) {
        setCurrentPage(validCurrentPage);
    }

    const startIndex = (validCurrentPage - 1) * itemsPerPage;
    const paginatedEvents = filteredEvents.slice(startIndex, startIndex + itemsPerPage);



    const PaginationBlock = () => (
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 py-2 mt-2 border-t px-3" style={{ borderColor: theme.border }}>
            <span className="text-xs sm:text-sm" style={{ color: theme.textSecondary }}>
                Mostrando {filteredEvents.length === 0 ? 0 : startIndex + 1} - {Math.min(startIndex + itemsPerPage, filteredEvents.length)} de {filteredEvents.length} reportes
            </span>
            <div className="flex items-center gap-2">
                <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage <= 1}
                    className="p-1.5 sm:p-2 rounded-lg border hover:bg-black/5 dark:hover:bg-white/10 transition disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{ borderColor: theme.border, color: theme.text }}
                >
                    <ChevronLeft size={16} />
                </button>
                <span className="text-xs sm:text-sm font-medium mx-2" style={{ color: theme.text }}>
                    Página {currentPage} de {totalPages}
                </span>
                <button
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage >= totalPages}
                    className="p-1.5 sm:p-2 rounded-lg border hover:bg-black/5 dark:hover:bg-white/10 transition disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{ borderColor: theme.border, color: theme.text }}
                >
                    <ChevronRight size={16} />
                </button>
            </div>
        </div>
    );

    // ── Render ────────────────────────────────────────────────────────────────
    return (
        <div className="rounded-xl border shadow-sm overflow-hidden" style={{ background: theme.surface, borderColor: theme.border }}>
            {/* ── Header ── */}
            <div className="p-3 border-b flex flex-wrap justify-between items-center gap-2" style={{ borderColor: theme.border }}>
                <div className="flex items-center gap-2">
                    <Activity className="w-5 h-5 text-blue-500" />
                    <h3 className="font-bold tracking-tight text-sm" style={{ color: theme.text }}>
                        Reportes Automáticos
                    </h3>
                    {events.length > 0 && (
                        <span className="text-xs px-1.5 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 font-mono">
                            {events.length} totales
                        </span>
                    )}
                </div>

                <div className="flex items-center gap-1.5 flex-wrap">
                    <button
                        onClick={handleManualSync}
                        disabled={isSyncing}
                        className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border transition-colors ${isSyncing
                            ? 'opacity-50 cursor-not-allowed border-gray-200 text-gray-500 bg-gray-50 dark:border-gray-800 dark:text-gray-400 dark:bg-gray-900/50'
                            : 'bg-white hover:bg-blue-50 text-blue-600 border-blue-200 dark:bg-blue-900/20 dark:hover:bg-blue-900/40 dark:text-blue-400 dark:border-blue-800/50'
                            }`}
                        title="Actualizar cambios"
                    >
                        <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                        {isSyncing ? 'Actualizando...' : 'Actualizar'}
                    </button>

                    {events.length > 0 && (
                        <>
                            {/* Toggle select mode */}
                            <button
                                onClick={() => { setSelectMode(s => !s); clearSelection(); }}
                                className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-full border transition-colors hover:bg-gray-100 dark:hover:bg-white/10"
                                style={{ borderColor: theme.border, color: theme.textSecondary }}
                                title={selectMode ? 'Cancelar selección' : 'Seleccionar eventos'}
                            >
                                <CheckSquare className="w-3.5 h-3.5" />
                                {selectMode ? 'Cancelar' : 'Seleccionar'}
                            </button>

                            {/* Delete selected (only in select mode) */}
                            {selectMode && selected.size > 0 && (
                                <button
                                    onClick={deleteSelected}
                                    className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border border-red-200 dark:border-red-800 transition-colors hover:bg-red-200 dark:hover:bg-red-900/50"
                                    title={`Eliminar ${selected.size} seleccionado(s)`}
                                >
                                    <Trash2 className="w-3.5 h-3.5" />
                                    Eliminar ({selected.size})
                                </button>
                            )}

                            {/* Clear all */}
                            <button
                                onClick={clearAll}
                                className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-full border transition-colors hover:bg-red-50 hover:border-red-300 hover:text-red-600 dark:hover:bg-red-900/20 dark:hover:text-red-400"
                                style={{ borderColor: theme.border, color: theme.textSecondary }}
                                title="Limpiar todos los reportes"
                            >
                                <Trash className="w-3.5 h-3.5" />
                                Limpiar todo
                            </button>
                        </>
                    )}
                </div>
            </div>

            {/* ── Search & Filter Toolbar ── */}
            <div className="p-3 border-b flex flex-col sm:flex-row items-center justify-between gap-3" style={{ borderColor: theme.border, background: isDark ? '#151a26' : '#f1f5f9' }}>
                <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto flex-1">
                    <div className="relative w-full sm:w-80">
                        <input
                            type="text"
                            placeholder="Buscar por archivo, usuario, empresa..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-9 pr-4 py-1.5 text-sm rounded-lg border focus:outline-none focus:ring-1 focus:ring-blue-500"
                            style={{
                                background: theme.surface,
                                color: theme.text,
                                borderColor: theme.border
                            }}
                        />
                        <Search className="absolute left-3 top-2 text-gray-400 w-4 h-4" />
                    </div>

                    <select
                        value={selectedWorker}
                        onChange={(e) => setSelectedWorker(e.target.value)}
                        className="w-full sm:w-56 bg-transparent border rounded-lg text-sm px-3 py-1.5 cursor-pointer focus:outline-none"
                        style={{ borderColor: theme.border, color: theme.text }}
                    >
                        <option value="">Todos los trabajadores</option>
                        {uniqueWorkers.map(w => (
                            <option key={w} value={w}>{w}</option>
                        ))}
                    </select>
                </div>

                <div className="w-full sm:w-auto flex items-center justify-end gap-2 text-sm" style={{ color: theme.text }}>
                    <span className="opacity-70 text-xs">Mostrar:</span>
                    <select
                        value={itemsPerPage}
                        onChange={(e) => setItemsPerPage(Number(e.target.value))}
                        className="bg-transparent border rounded-lg text-xs px-2 py-1.5 cursor-pointer focus:outline-none"
                        style={{ borderColor: theme.border, color: theme.text }}
                    >
                        <option value={5}>5 resultados</option>
                        <option value={10}>10 resultados</option>
                        <option value={20}>20 resultados</option>
                        <option value={50}>50 resultados</option>
                    </select>
                </div>
            </div>

            {events.length > 0 && <PaginationBlock />}

            {/* ── Select-all row (visible only in select mode) ── */}
            {selectMode && events.length > 0 && (
                <div
                    className="px-3 py-2 flex items-center gap-2 border-b text-xs"
                    style={{ background: isDark ? '#151a26' : '#f1f5f9', borderColor: theme.border }}
                >
                    <button
                        onClick={allSelected ? clearSelection : selectAll}
                        className="flex items-center gap-1.5 font-medium"
                        style={{ color: theme.textSecondary }}
                    >
                        {allSelected
                            ? <CheckSquare className="w-4 h-4 text-blue-500" />
                            : <Square className="w-4 h-4" />
                        }
                        {allSelected ? 'Deseleccionar todos' : `Seleccionar todos (${events.length})`}
                    </button>
                </div>
            )}

            {/* ── Event List (Paginated) ── */}
            <div className="max-h-[34rem] overflow-y-auto p-2 space-y-2">
                {paginatedEvents.length === 0 ? (
                    <div className="text-center p-10 space-y-2">
                        <Wifi className="w-10 h-10 mx-auto opacity-20" />
                        <p className="font-medium" style={{ color: theme.textSecondary }}>
                            Esperando eventos de SharePoint...
                        </p>
                        <p className="text-xs opacity-40">
                            Los cambios detectados por Microsoft Graph aparecerán aquí
                        </p>
                    </div>
                ) : (
                    paginatedEvents.map((ev, index) => {
                        const path = shortenPath(ev.filePath);
                        const isSelected = selected.has(ev._uid);

                        return (
                            <div
                                key={ev._uid}
                                className={`p-3 rounded-xl border transition-all group ${isSelected ? 'ring-2 ring-blue-400 border-blue-400/50' : 'hover:shadow-md'
                                    }`}
                                style={{
                                    background: isDark
                                        ? (isSelected ? '#1e2a42' : '#1a1f2e')
                                        : (isSelected ? '#eff6ff' : '#f8fbfc'),
                                    borderColor: isSelected ? undefined : theme.border,
                                    animation: index === 0 ? 'fadeSlideIn 0.3s ease' : undefined,
                                }}
                            >
                                <div className="flex items-start gap-2">
                                    {/* Checkbox (select mode) */}
                                    {selectMode && (
                                        <button
                                            onClick={() => toggleSelect(ev._uid)}
                                            className="mt-0.5 flex-shrink-0 text-blue-500"
                                        >
                                            {isSelected
                                                ? <CheckSquare className="w-4 h-4" />
                                                : <Square className="w-4 h-4 opacity-40" />
                                            }
                                        </button>
                                    )}

                                    <div className="flex-1 min-w-0">
                                        {/* File name + timestamp */}
                                        <div className="flex justify-between items-start mb-1 gap-2">
                                            <h4 className="font-semibold text-sm truncate flex items-center gap-1.5 min-w-0"
                                                style={{ color: theme.primary }}>
                                                <FileText className="w-4 h-4 flex-shrink-0" />
                                                <span className="truncate">{ev.fileName}</span>
                                                {ev.webUrl && (
                                                    <a
                                                        href={ev.webUrl}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="ml-2 text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 hover:bg-blue-200 transition-colors dark:bg-blue-900/40 dark:text-blue-300 dark:hover:bg-blue-800/60 inline-flex items-center gap-1 self-center shrink-0 border border-blue-200 dark:border-blue-800"
                                                        title="Abrir en SharePoint/OneDrive"
                                                    >
                                                        Ver Archivo
                                                    </a>
                                                )}
                                            </h4>
                                            <span className="text-xs whitespace-nowrap opacity-50 flex items-center gap-1 flex-shrink-0">
                                                <Clock className="w-3 h-3" />
                                                {formatDate(ev.date)}
                                            </span>
                                        </div>

                                        {/* Path */}
                                        {path && (
                                            <div className="flex items-center gap-1 mb-1.5 text-xs opacity-45" style={{ color: theme.text }}>
                                                <FolderOpen className="w-3 h-3 flex-shrink-0" />
                                                <span className="truncate">{path}</span>
                                            </div>
                                        )}

                                        {/* User + Company */}
                                        <div className="grid grid-cols-2 gap-2 text-xs mb-2">
                                            <div className="flex items-center gap-1.5" style={{ color: theme.text }}>
                                                <UserIcon className="w-3.5 h-3.5 opacity-50 flex-shrink-0" />
                                                <span className="font-medium truncate">{ev.user}</span>
                                            </div>
                                            <div className="flex items-center gap-1.5" style={{ color: theme.textSecondary }}>
                                                <Building2 className="w-3.5 h-3.5 opacity-50 flex-shrink-0" />
                                                <span className="truncate">{ev.company}</span>
                                            </div>
                                        </div>

                                        {/* Action badge + old name */}
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <ActionBadge action={ev.action} />
                                            {ev.oldName && (
                                                <span className="text-xs opacity-40 italic truncate">
                                                    antes: {ev.oldName}
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Individual delete button (visible on hover or always in select mode) */}
                                    {!selectMode && (
                                        <button
                                            onClick={() => deleteEvent(ev._uid)}
                                            className="flex-shrink-0 p-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-100 dark:hover:bg-red-900/30 text-red-500"
                                            title="Eliminar este evento"
                                        >
                                            <X className="w-3.5 h-3.5" />
                                        </button>
                                    )}
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            {events.length > 0 && <PaginationBlock />}

            <style>{`
                @keyframes fadeSlideIn {
                    from { opacity: 0; transform: translateY(-6px); }
                    to   { opacity: 1; transform: translateY(0);    }
                }
            `}</style>
        </div>
    );
}
