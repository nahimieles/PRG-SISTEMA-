"use client";
import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
    Clock, FileText, User as UserIcon, Building2, FolderOpen,
    Wifi, WifiOff, RefreshCw, Trash2, Trash, CheckSquare, Square, X, Search, ChevronLeft, ChevronRight, Download, Calendar
} from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { lightTheme, darkTheme } from '@/lib/colors';
import { getAuditLogs, deleteAuditLog, deleteMultipleAuditLogs, clearAllAuditLogs } from '@/lib/audit';
import { getRecords, getWorkerRecords, getWorkerSession } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import CustomSelect from './CustomSelect';

// ─── Config ───────────────────────────────────────────────────────────────────
const MAX_EVENTS = 100; // Maximum events kept in memory/UI

// ─── Action badge styles ──────────────────────────────────────────────────────
const ACTION_STYLES = {
    CREATED: { bg: 'bg-green-100  dark:bg-green-900/30', text: 'text-green-700  dark:text-green-400', label: 'CREADO' },
    MODIFIED: { bg: 'bg-blue-100   dark:bg-blue-900/30', text: 'text-blue-700   dark:text-blue-400', label: 'MODIFICADO' },
    DELETED: { bg: 'bg-red-100    dark:bg-red-900/30', text: 'text-red-700    dark:text-red-400', label: 'ELIMINADO' },
    RENAMED: { bg: 'bg-amber-100  dark:bg-amber-900/30', text: 'text-amber-700  dark:text-amber-400', label: 'RENOMBRADO' },
    MOVED: { bg: 'bg-purple-100 dark:bg-purple-900/30', text: 'text-purple-700 dark:text-purple-400', label: 'MOVIDO' },
    MANUAL: { bg: 'bg-indigo-100 dark:bg-indigo-900/30', text: 'text-indigo-700 dark:text-indigo-400', label: 'MANUAL' },
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
    try {
        return decodeURIComponent(path)
            .replace(/^\/drives\/[^/]+\/root:\//i, '')
            .replace(/^\/sites\/[^/]+\/[^/]+\//i, '') || null;
    } catch {
        return path
            .replace(/^\/drives\/[^/]+\/root:\//i, '')
            .replace(/^\/sites\/[^/]+\/[^/]+\//i, '') || null;
    }
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function RealTimeMonitor({ onLogsChanged, isWorker = false }) {
    const [events, setEvents] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedWorker, setSelectedWorker] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(5);
    const [dateRange, setDateRange] = useState({ from: '', to: '' });
    const [showFilters, setShowFilters] = useState(false);


    const [status, setStatus] = useState('connecting'); // 'connecting' | 'connected' | 'error'
    const [selected, setSelected] = useState(new Set()); // Set of event UIDs
    const [selectMode, setSelectMode] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);
    const [isBackgroundSyncing, setIsBackgroundSyncing] = useState(false);
    const { isDark } = useTheme();
    const theme = isDark ? darkTheme : lightTheme;
    const retryRef = useRef(null);
    const esRef = useRef(null);
    const uidCounter = useRef(0);

    // Reset pagination when filter or page size changes
    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, selectedWorker, itemsPerPage, dateRange]);


    const connect = useCallback(() => {
        if (esRef.current) {
            supabase.removeChannel(esRef.current);
        }
        
        setStatus('connecting');

        const channel = supabase
            .channel('audit-logs-realtime')
            .on('postgres_changes', { 
                event: 'INSERT', 
                schema: 'public', 
                table: 'audit_logs' 
            }, payload => {
                console.log('[RealTime] New log received:', payload.new);
                const log = payload.new;
                
                let actionMsg = log.metadata?.changeType;
                if (!actionMsg) {
                    actionMsg = log.action_type?.replace('AUTO_', '') || 'MODIFIED';
                }
                
                const data = {
                    dbId: log.id,
                    _uid: `rt-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
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

                setEvents(prev => [data, ...prev].slice(0, MAX_EVENTS));
            })
            .subscribe((status) => {
                console.log('[RealTime] Channel status:', status);
                if (status === 'SUBSCRIBED') {
                    setStatus('connected');
                    if (retryRef.current) { clearTimeout(retryRef.current); retryRef.current = null; }
                } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
                    setStatus('error');
                    esRef.current = null;
                    const delay = Math.min(30_000, 2_000 * (1 + Math.random()));
                    retryRef.current = setTimeout(connect, delay);
                }
            });

        esRef.current = channel;
    }, []);

    // ── Reusable function to reload events from database ─────────────────────
    const reloadFromDB = useCallback(async () => {
        try {
            const logs = await getAuditLogs({ 
                limit: 500,
                startDate: dateRange.from ? new Date(dateRange.from).toISOString() : null,
                endDate: dateRange.to ? new Date(dateRange.to).toISOString() : null
            });

            // Fetch manual records
            let manualRecords = [];
            if (isWorker) {
                const session = getWorkerSession();
                if (session) {
                    manualRecords = await getWorkerRecords(session.id);
                }
            } else {
                manualRecords = await getRecords();
            }

            if (dateRange.from || dateRange.to) {
                manualRecords = manualRecords.filter(r => {
                    const d = new Date(r.created_at || r.start_datetime);
                    if (dateRange.from && d < new Date(dateRange.from)) return false;
                    if (dateRange.to) {
                        const toDate = new Date(dateRange.to);
                        toDate.setHours(23, 59, 59, 999);
                        if (d > toDate) return false;
                    }
                    return true;
                });
            }

            uidCounter.current = 0;
            let combined = [];

            if (logs && logs.length > 0) {
                combined = combined.concat(logs.map(log => {
                    let actionMsg = log.metadata?.changeType;
                    if (!actionMsg) {
                        actionMsg = log.action_type?.replace('AUTO_', '') || 'MODIFIED';
                    }
                    return {
                        _uid: String(++uidCounter.current),
                        dbId: log.id,
                        fileName: log.file_name,
                        user: log.worker_name,
                        company: log.company_name,
                        action: actionMsg,
                        date: log.timestamp,
                        filePath: log.file_path,
                        driveId: log.metadata?.driveId,
                        fileId: log.metadata?.fileId,
                        webUrl: log.metadata?.webUrl,
                        isManual: false
                    };
                }));
            }

            if (manualRecords && manualRecords.length > 0) {
                combined = combined.concat(manualRecords.map(rec => ({
                    _uid: String(++uidCounter.current),
                    dbId: rec.id,
                    fileName: `${rec.service_type || 'Actividad'}${rec.description ? ` - ${rec.description}` : ''}`,
                    user: rec.worker_name,
                    company: rec.company_name,
                    action: 'MANUAL',
                    date: rec.created_at || rec.start_datetime,
                    filePath: null,
                    webUrl: rec.file_url,
                    isManual: true,
                    hours: rec.hours_worked
                })));
            }

            combined.sort((a, b) => new Date(b.date) - new Date(a.date));
            setEvents(combined.slice(0, 500));
        } catch (err) {
            console.error('Failed to reload from DB:', err);
        }
    }, []);

    useEffect(() => {
        // Load initial data then connect to realtime
        reloadFromDB().then(() => {
            connect();
        });

        const performAutoSync = async () => {
            // Only sync if the tab is visible to avoid unnecessary background load
            if (document.visibilityState !== 'visible') return;
            
            setIsBackgroundSyncing(true);
            try {
                await fetch('/api/graph/delta', { method: 'POST', cache: 'no-store' });
                await reloadFromDB();
            } catch (err) {
                console.warn('[AutoSync] Background scan failed:', err.message);
            } finally {
                setIsBackgroundSyncing(false);
            }
        };

        // Execute immediately when the user enters the panel to guarantee 100% fresh data
        performAutoSync();

        // Auto-poll every 2 minutes to keep data fresh while active
        const autoSyncInterval = setInterval(performAutoSync, 2 * 60 * 1000);

        return () => {
            if (esRef.current) supabase.removeChannel(esRef.current);
            if (retryRef.current) clearTimeout(retryRef.current);
            clearInterval(autoSyncInterval);
        };
    }, [connect, reloadFromDB, dateRange]);


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
            const res = await fetch('/api/graph/delta', { method: 'POST', cache: 'no-store' });
            const data = await res.json().catch(() => null);
            console.log('[ManualSync] Scan result:', data);

            // ALWAYS reload from database - don't rely on WebSocket
            await reloadFromDB();
            if (onLogsChanged) onLogsChanged();
        } catch (err) {
            console.error('Error manual sync:', err);
        } finally {
            setIsSyncing(false);
        }
    };

    const handleExportExcel = async () => {
        if (!events || events.length === 0) return;
        try {
            const ExcelJS = (await import('exceljs')).default;
            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet('Reportes Automáticos');

            worksheet.columns = [
                { header: 'Archivo', key: 'fileName', width: 40 },
                { header: 'Acción', key: 'action', width: 15 },
                { header: 'Responsable', key: 'user', width: 25 },
                { header: 'Empresa', key: 'company', width: 30 },
                { header: 'Fecha', key: 'date', width: 22 },
                { header: 'Ruta', key: 'filePath', width: 50 },
                { header: 'Enlace', key: 'webUrl', width: 50 }
            ];

            const headerRow = worksheet.getRow(1);
            headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
            headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF3498DB' } };

            const recordsToExport = filteredEvents || events;

            recordsToExport.forEach(ev => {
                worksheet.addRow({
                    fileName: ev.fileName,
                    action: ACTION_STYLES[ev.action]?.label || ev.action,
                    user: ev.user,
                    company: ev.company,
                    date: new Date(ev.date).toLocaleString('es-EC'),
                    filePath: ev.filePath,
                    webUrl: ev.webUrl || ''
                });
            });

            const buffer = await workbook.xlsx.writeBuffer();
            const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `Reporte_Actividad_${new Date().toISOString().slice(0, 10)}.xlsx`;
            a.click();
            URL.revokeObjectURL(url);
        } catch (err) {
            console.error('Error exporting to Excel:', err);
            alert('Hubo un error al generar el Excel.');
        }
    };

    // ── Filter and Pagination variables ───────────────────────────────────────

    // System names to filter from dropdown (old DB entries)
    const SYSTEM_NAME_FILTER = [
        'sharepoint', 'microsoft office', 'pushchannel', 'system',
        'desconocido', 'usuario desconocido', 'onedrive', 'app@sharepoint'
    ];

    // Calculate unique workers for the dropdown (filtering system names)
    const uniqueWorkers = React.useMemo(() => {
        const workers = events.map(ev => ev.user).filter(Boolean);
        return [...new Set(workers)]
            .filter(name => !SYSTEM_NAME_FILTER.some(sys => name.toLowerCase().includes(sys)))
            .sort();
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

    // ── Smart Merging: consecutive edits of same file by same user ──────────
    // Groups events where the same person modifies the same file within a 60-min
    // window (no other file in between by that user). Shows time range.
    const MERGE_WINDOW_MS = 60 * 60 * 1000; // 60 minutes

    // ── Smart Merging (computed directly, no useMemo) ─────────────────────────
    // Helper: strip diacritics so "Rodríguez" matches "Rodriguez"
    const norm = (s) => (s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

    const mergedEvents = (() => {
        if (filteredEvents.length === 0) return [];

        const result = [];

        for (let i = 0; i < filteredEvents.length; i++) {
            const ev = filteredEvents[i];
            const evAction = (ev.action || '').toUpperCase();

            // Check if we can merge into the last result item
            const last = result.length > 0 ? result[result.length - 1] : null;

            if (last) {
                const lastAction = (last.action || '').toUpperCase();
                const sameAction = lastAction === evAction;
                const sameFile = last.fileName === ev.fileName;
                const sameUser = norm(last.user) === norm(ev.user);
                const sameCompany = norm(last.company) === norm(ev.company);

                if (sameAction && sameFile && sameUser && sameCompany) {
                    const lastTime = new Date(last._mergeEndDate || last.date).getTime();
                    const evTime = new Date(ev.date).getTime();
                    const diff = Math.abs(lastTime - evTime);

                    if (diff <= MERGE_WINDOW_MS) {
                        // Merge: expand the time range
                        const allDates = [
                            new Date(last._mergeStartDate || last.date).getTime(),
                            new Date(last._mergeEndDate || last.date).getTime(),
                            evTime,
                        ];
                        last._mergeStartDate = new Date(Math.min(...allDates)).toISOString();
                        last._mergeEndDate = new Date(Math.max(...allDates)).toISOString();
                        last._mergeCount = (last._mergeCount || 1) + 1;
                        last._merged = true;
                        if (!last._mergedDbIds) last._mergedDbIds = [last.dbId].filter(Boolean);
                        if (ev.dbId) last._mergedDbIds.push(ev.dbId);
                        if (!last._mergedUids) last._mergedUids = [last._uid];
                        last._mergedUids.push(ev._uid);
                        continue;
                    }
                }
            }

            result.push({ ...ev, _merged: false });
        }

        return result;
    })();

    const totalPages = Math.max(1, Math.ceil(mergedEvents.length / itemsPerPage));
    const validCurrentPage = Math.min(currentPage, totalPages);

    // Render safety
    if (currentPage !== validCurrentPage && mergedEvents.length > 0) {
        setCurrentPage(validCurrentPage);
    }

    const startIndex = (validCurrentPage - 1) * itemsPerPage;
    const paginatedEvents = mergedEvents.slice(startIndex, startIndex + itemsPerPage);



    const PaginationBlock = () => (
        <div className="flex flex-col sm:flex-row justify-between items-center gap-3 py-3 px-5" style={{ color: theme.textSecondary }}>
            <span className="text-xs font-medium tracking-wide" style={{ letterSpacing: '0.02em' }}>
                {mergedEvents.length === 0 ? 'Sin resultados' : `${startIndex + 1}–${Math.min(startIndex + itemsPerPage, mergedEvents.length)} de ${mergedEvents.length}`}
            </span>
            <div className="flex items-center gap-1">
                <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage <= 1}
                    className="w-8 h-8 flex items-center justify-center rounded-full transition-all disabled:opacity-30"
                    style={{ color: theme.text, background: currentPage > 1 ? (isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)') : 'transparent' }}
                >
                    <ChevronLeft size={15} />
                </button>
                <span className="text-xs font-semibold min-w-[4rem] text-center" style={{ color: theme.text }}>
                    {currentPage} / {totalPages}
                </span>
                <button
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage >= totalPages}
                    className="w-8 h-8 flex items-center justify-center rounded-full transition-all disabled:opacity-30"
                    style={{ color: theme.text, background: currentPage < totalPages ? (isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)') : 'transparent' }}
                >
                    <ChevronRight size={15} />
                </button>
            </div>
        </div>
    );

    // Action accent colors for left border
    const ACTION_ACCENTS = {
        CREATED: '#22c55e',
        MODIFIED: '#3b82f6',
        DELETED: '#ef4444',
        RENAMED: '#f59e0b',
        MOVED: '#a855f7',
    };

    const ACTION_STYLES = {
        CREATED: { label: 'Creado', color: '#22c55e' },
        MODIFIED: { label: 'Modificado', color: '#3b82f6' },
        DELETED: { label: 'Eliminado', color: '#ef4444' },
        RENAMED: { label: 'Renombrado', color: '#f59e0b' },
        MOVED: { label: 'Movido', color: '#a855f7' },
    };


    // ── Render ────────────────────────────────────────────────────────────────
    return (
        <div className="rounded-2xl overflow-hidden" style={{
            background: theme.surface,
            border: `1px solid ${theme.border}`,
            boxShadow: isDark ? '0 1px 4px rgba(0,0,0,0.3)' : '0 1px 8px rgba(0,0,0,0.05)',
        }}>
            {/* ── Header ── */}
            <div className="px-5 py-4 flex flex-wrap justify-between items-center gap-3" style={{ borderBottom: `1px solid ${theme.border}` }}>
                <div className="flex items-center gap-2.5">
                    <h3 className="text-base font-bold tracking-tight" style={{ color: theme.text, letterSpacing: '-0.02em' }}>
                        Informes
                    </h3>

                    <div className="flex items-center" title={status === 'connected' ? 'En línea' : 'Conectando...'}>
                        <div className={`w-2 h-2 rounded-full ${status === 'connected' ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.4)] animate-pulse' : 'bg-amber-400'}`} />
                    </div>
                </div>


                    <button
                        onClick={() => setShowFilters(!showFilters)}
                        className="flex items-center gap-1.5 text-xs font-semibold px-3.5 py-1.5 rounded-full transition-all"
                        style={{
                            background: showFilters ? (isDark ? 'rgba(59,130,246,0.15)' : '#eff6ff') : 'transparent',
                            color: showFilters ? '#3b82f6' : theme.textSecondary,
                            border: `1px solid ${showFilters ? (isDark ? 'rgba(59,130,246,0.3)' : '#bfdbfe') : theme.border}`,
                        }}
                    >
                        <Calendar className="w-3.5 h-3.5" />
                        <span>Filtros</span>
                    </button>

                    {events.length > 0 && (

                        <>
                            <button
                                onClick={handleExportExcel}
                                className="flex items-center gap-1.5 text-xs font-semibold px-3.5 py-1.5 rounded-full transition-all"
                                style={{
                                    background: isDark ? 'rgba(34,197,94,0.12)' : '#f0fdf4',
                                    color: '#16a34a',
                                    border: `1px solid ${isDark ? 'rgba(34,197,94,0.25)' : '#bbf7d0'}`,
                                }}
                            >
                                <Download className="w-3.5 h-3.5" />
                                <span className="hidden sm:inline">Exportar Excel</span>
                            </button>

                            {!isWorker && (
                                <>
                                    <button
                                        onClick={() => { setSelectMode(s => !s); clearSelection(); }}
                                        className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full transition-all"
                                        style={{
                                            background: selectMode ? (isDark ? 'rgba(59,130,246,0.15)' : '#eff6ff') : 'transparent',
                                            color: selectMode ? '#3b82f6' : theme.textSecondary,
                                            border: `1px solid ${selectMode ? (isDark ? 'rgba(59,130,246,0.3)' : '#bfdbfe') : theme.border}`,
                                        }}
                                    >
                                        <CheckSquare className="w-3.5 h-3.5" />
                                        {selectMode ? 'Cancelar' : 'Seleccionar'}
                                    </button>

                                    {selectMode && selected.size > 0 && (
                                        <button
                                            onClick={deleteSelected}
                                            className="flex items-center gap-1.5 text-xs font-semibold px-3.5 py-1.5 rounded-full transition-all"
                                            style={{
                                                background: isDark ? 'rgba(239,68,68,0.15)' : '#fef2f2',
                                                color: '#dc2626',
                                                border: `1px solid ${isDark ? 'rgba(239,68,68,0.3)' : '#fecaca'}`,
                                            }}
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                            Eliminar ({selected.size})
                                        </button>
                                    )}

                                    <button
                                        onClick={clearAll}
                                        className="flex items-center gap-1 text-xs font-medium px-3 py-1.5 rounded-full transition-all"
                                        style={{
                                            color: theme.textSecondary,
                                            border: `1px solid ${theme.border}`,
                                        }}
                                        title="Limpiar todo"
                                    >
                                        <Trash className="w-3.5 h-3.5" />
                                        <span className="hidden sm:inline">Limpiar todo</span>
                                    </button>
                                </>
                            )}
                        </>
                    )}
                </div>


            {/* ── Apple-style Filter Drawer ── */}
            {showFilters && (
                <div className="px-5 py-4 space-y-4 animate-fade-in" style={{
                    background: isDark ? 'rgba(255,255,255,0.01)' : 'rgba(0,0,0,0.01)',
                    borderBottom: `1px solid ${theme.border}`,
                }}>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-[10px] uppercase font-bold tracking-wider opacity-40 ml-1">Búsqueda</label>
                            <div className="relative">
                                <input
                                    type="text"
                                    placeholder="Archivo, usuario..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full pl-9 pr-4 py-2.5 text-sm rounded-xl border-none outline-none transition-all focus:ring-2 focus:ring-blue-500/20"
                                    style={{
                                        background: isDark ? 'rgba(255,255,255,0.05)' : '#fff',
                                        border: `1px solid ${theme.border}`,
                                        color: theme.text,
                                    }}
                                />
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 opacity-30" />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-[10px] uppercase font-bold tracking-wider opacity-40 ml-1">Rango de Fechas</label>
                            <div className="flex items-center gap-2">
                                <input
                                    type="date"
                                    value={dateRange.from}
                                    onChange={(e) => setDateRange(prev => ({ ...prev, from: e.target.value }))}
                                    className="flex-1 px-3 py-2 text-xs rounded-xl border-none outline-none"
                                    style={{
                                        background: isDark ? 'rgba(255,255,255,0.05)' : '#fff',
                                        border: `1px solid ${theme.border}`,
                                        color: theme.text,
                                    }}
                                />
                                <span className="opacity-30">—</span>
                                <input
                                    type="date"
                                    value={dateRange.to}
                                    onChange={(e) => setDateRange(prev => ({ ...prev, to: e.target.value }))}
                                    className="flex-1 px-3 py-2 text-xs rounded-xl border-none outline-none"
                                    style={{
                                        background: isDark ? 'rgba(255,255,255,0.05)' : '#fff',
                                        border: `1px solid ${theme.border}`,
                                        color: theme.text,
                                    }}
                                />
                                {(dateRange.from || dateRange.to) && (
                                    <button 
                                        onClick={() => setDateRange({ from: '', to: '' })}
                                        className="p-1.5 rounded-full hover:bg-red-500/10 text-red-500 transition-colors"
                                    >
                                        <X size={14} />
                                    </button>
                                )}
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-[10px] uppercase font-bold tracking-wider opacity-40 ml-1">Trabajador</label>
                            <CustomSelect
                                value={selectedWorker}
                                onChange={setSelectedWorker}
                                options={[
                                    { value: '', label: 'Todos los trabajadores' },
                                    ...uniqueWorkers.map(w => ({ value: w, label: w }))
                                ]}
                                className="w-full"
                                size="md"
                            />
                        </div>
                    </div>
                </div>
            )}


            {/* Top pagination */}
            {events.length > 0 && <PaginationBlock />}

            {/* ── Select-all row ── */}
            {selectMode && events.length > 0 && (
                <div className="px-5 py-2 flex items-center gap-2 text-xs font-medium" style={{
                    background: isDark ? 'rgba(59,130,246,0.06)' : '#f0f7ff',
                    borderBottom: `1px solid ${theme.border}`,
                    color: theme.textSecondary,
                }}>
                    <button
                        onClick={allSelected ? clearSelection : selectAll}
                        className="flex items-center gap-1.5"
                        style={{ color: '#3b82f6' }}
                    >
                        {allSelected
                            ? <CheckSquare className="w-4 h-4" />
                            : <Square className="w-4 h-4" />
                        }
                        {allSelected ? 'Deseleccionar todos' : `Seleccionar todos (${filteredEvents.length})`}
                    </button>
                </div>
            )}

            {/* ── Event List ── */}
            <div className="overflow-y-auto" style={{ maxHeight: '36rem' }}>
                {paginatedEvents.length === 0 ? (
                    <div className="text-center py-16 px-6">
                        <div className="w-14 h-14 rounded-2xl mx-auto mb-4 flex items-center justify-center" style={{
                            background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
                        }}>
                            <Wifi className="w-7 h-7" style={{ color: theme.textSecondary, opacity: 0.3 }} />
                        </div>
                        <p className="font-semibold text-sm mb-1" style={{ color: theme.textSecondary, letterSpacing: '-0.01em' }}>
                            Sin eventos detectados
                        </p>
                        <p className="text-xs" style={{ color: theme.textSecondary, opacity: 0.5 }}>
                            Los cambios de SharePoint aparecerán aquí automáticamente
                        </p>
                    </div>
                ) : (
                    <div className="divide-y" style={{ borderColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)' }}>
                        {paginatedEvents.map((ev, index) => {
                            const isSelected = selected.has(ev._uid);
                            const actionKey = ev.action_type || ev.action || 'MODIFIED';
                            const accentColor = ACTION_ACCENTS[actionKey] || '#3b82f6';
                            const actionStyle = ACTION_STYLES[actionKey] || ACTION_STYLES.MODIFIED;
                            const path = ev.folderPath || ev.parentPath || '';

                            return (
                                <div
                                    key={ev._uid}
                                    className="group relative transition-colors"
                                    style={{
                                        background: isSelected
                                            ? (isDark ? 'rgba(59,130,246,0.08)' : '#f0f7ff')
                                            : 'transparent',
                                        animation: index === 0 ? 'rtmFadeIn 0.4s cubic-bezier(0.25,0.1,0.25,1)' : undefined,
                                    }}
                                >
                                    {/* Left accent bar */}
                                    <div className="absolute left-0 top-3 bottom-3 w-[3px] rounded-full hidden sm:block" style={{ background: accentColor, opacity: 0.7 }} />

                                    <div className="flex flex-col sm:flex-row items-start gap-2 sm:gap-3 pl-4 sm:pl-5 pr-4 py-3 sm:py-3.5">
                                        {/* Header area for mobile (name + badge) */}
                                        <div className="flex sm:hidden w-full justify-between items-center mb-1">
                                            <span
                                                className="text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider"
                                                style={{
                                                    background: isDark
                                                        ? `${accentColor}18`
                                                        : `${accentColor}12`,
                                                    color: accentColor,
                                                }}
                                            >
                                                {actionStyle.label}
                                            </span>
                                            <span className="text-[10px] opacity-40 font-medium">{formatDate(ev.date).split(',')[0]}</span>
                                        </div>

                                        {/* Checkbox */}
                                        {selectMode && (
                                            <button
                                                onClick={() => toggleSelect(ev._uid)}
                                                className="mt-0.5 flex-shrink-0"
                                                style={{ color: isSelected ? '#3b82f6' : theme.textSecondary }}
                                            >
                                                {isSelected
                                                    ? <CheckSquare className="w-4 h-4" />
                                                    : <Square className="w-4 h-4 opacity-30" />
                                                }
                                            </button>
                                        )}

                                        <div className="flex-1 min-w-0">
                                            {/* Row 1: File name + date */}
                                            <div className="flex justify-between items-start gap-3 mb-1">
                                                <div className="flex items-center gap-2 min-w-0">
                                                    <FileText className="w-4 h-4 flex-shrink-0" style={{ color: accentColor, opacity: 0.8 }} />
                                                    <h4 className="font-bold text-[13px] sm:text-[14px] truncate" style={{ color: theme.text, letterSpacing: '-0.01em' }}>
                                                        {ev.fileName}
                                                    </h4>
                                                    {ev._mergeCount > 1 && (
                                                        <span className="flex-shrink-0 text-[9px] font-bold px-1.5 py-0.5 rounded-full" style={{
                                                            background: isDark ? 'rgba(59,130,246,0.12)' : '#eff6ff',
                                                            color: '#3b82f6',
                                                        }}>
                                                            ×{ev._mergeCount}
                                                        </span>
                                                    )}
                                                </div>
                                                <span className="hidden sm:inline text-[11px] whitespace-nowrap flex-shrink-0 font-medium" style={{ color: theme.textSecondary, opacity: 0.5 }}>
                                                    {formatDate(ev.date)}
                                                </span>
                                            </div>

                                            {/* Row 2: Path */}
                                            {path && (
                                                <div className="flex items-center gap-1.5 mb-2 sm:ml-6 text-[11px]" style={{ color: theme.textSecondary, opacity: 0.45 }}>
                                                    <FolderOpen className="w-3 h-3 flex-shrink-0" />
                                                    <span className="truncate">{path}</span>
                                                </div>
                                            )}

                                            {/* Row 3: User + Company + Badge */}
                                            <div className="flex items-center gap-y-2 gap-x-3 sm:ml-6 flex-wrap">
                                                <div className="flex items-center gap-1.5 text-xs" style={{ color: theme.text }}>
                                                    <div className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white flex-shrink-0" style={{ background: accentColor, opacity: 0.85 }}>
                                                        {ev.user?.charAt(0)?.toUpperCase() || '?'}
                                                    </div>
                                                    <span className="font-medium">{ev.user}</span>
                                                </div>

                                                <div className="flex items-center gap-1 text-[11px]" style={{ color: theme.textSecondary }}>
                                                    <Building2 className="w-3 h-3 opacity-40 flex-shrink-0" />
                                                    <span className="truncate max-w-[120px] sm:max-w-[160px]">{ev.company}</span>
                                                </div>

                                                <span
                                                    className="hidden sm:inline text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider"
                                                    style={{
                                                        background: isDark
                                                            ? `${accentColor}18`
                                                            : `${accentColor}12`,
                                                        color: accentColor,
                                                        letterSpacing: '0.05em',
                                                    }}
                                                >
                                                    {actionStyle.label}
                                                </span>

                                                <div className="flex items-center gap-2 ml-auto sm:ml-0">
                                                    {ev.webUrl && (
                                                        <a
                                                            href={ev.webUrl}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="text-[10px] font-bold px-2 py-1 rounded-lg transition-all"
                                                            style={{
                                                                background: isDark ? 'rgba(59,130,246,0.15)' : '#eff6ff',
                                                                color: '#3b82f6',
                                                                border: `1px solid ${isDark ? 'rgba(59,130,246,0.2)' : '#dbeafe'}`
                                                            }}
                                                        >
                                                            Abrir ↗
                                                        </a>
                                                    )}
                                                    
                                                    {!isWorker && !selectMode && (
                                                        <button
                                                            onClick={() => deleteEvent(ev._uid)}
                                                            className="flex sm:hidden p-1.5 rounded-lg text-red-500 bg-red-500/10"
                                                        >
                                                            <X className="w-3.5 h-3.5" />
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Desktop Delete button */}
                                        {!isWorker && !selectMode && (
                                            <button
                                                onClick={() => deleteEvent(ev._uid)}
                                                className="hidden sm:flex flex-shrink-0 w-7 h-7 items-center justify-center rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                                                style={{
                                                    color: '#ef4444',
                                                    background: isDark ? 'rgba(239,68,68,0.1)' : 'rgba(239,68,68,0.06)',
                                                }}
                                                title="Eliminar"
                                            >
                                                <X className="w-3.5 h-3.5" />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Bottom pagination */}
            {events.length > 0 && (
                <div style={{ borderTop: `1px solid ${theme.border}` }}>
                    <PaginationBlock />
                </div>
            )}

            <style>{`
                @keyframes rtmFadeIn {
                    from { opacity: 0; transform: translateY(-4px); }
                    to   { opacity: 1; transform: translateY(0);    }
                }
            `}</style>
        </div>
    );
}
