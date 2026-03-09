"use client";
import React, { useEffect, useState, useCallback } from 'react';
import { Eye, Users, FileText, Building2, User as UserIcon, Clock, RefreshCw, MonitorPlay, X } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { lightTheme, darkTheme } from '@/lib/colors';

function getFileIcon(fileName) {
    const ext = (fileName || '').split('.').pop().toLowerCase();
    const icons = {
        xlsx: '📊', xls: '📊',
        docx: '📝', doc: '📝',
        pptx: '📽️', ppt: '📽️',
        pdf: '📄',
        txt: '📃',
    };
    return icons[ext] || '📁';
}

function formatDuration(minutes) {
    if (minutes < 1) return 'Hace un momento';
    if (minutes === 1) return 'Hace 1 minuto';
    return `Hace ${minutes} minutos`;
}

export default function ActiveDocumentViewer() {
    const [editors, setEditors] = useState([]);
    const [selectedEditor, setSelectedEditor] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [lastRefresh, setLastRefresh] = useState(null);
    const { isDark } = useTheme();
    const theme = isDark ? darkTheme : lightTheme;

    const fetchActiveEditors = useCallback(async () => {
        try {
            const res = await fetch('/api/graph/active-editors');
            const data = await res.json();

            if (!data.success) throw new Error(data.error || 'Error desconocido');

            setEditors(data.editors || []);
            setError(null);
            setLastRefresh(new Date());

            // If the selected file is no longer active, deselect it
            if (selectedEditor) {
                const stillActive = data.editors.some(e => e.fileId === selectedEditor.fileId);
                if (!stillActive) setSelectedEditor(null);
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [selectedEditor]);

    useEffect(() => {
        fetchActiveEditors();
        const interval = setInterval(fetchActiveEditors, 30_000);
        return () => clearInterval(interval);
    }, [fetchActiveEditors]);

    if (loading) {
        return (
            <div className="rounded-xl border p-8 text-center" style={{ background: theme.surface, borderColor: theme.border }}>
                <RefreshCw className="w-8 h-8 mx-auto opacity-30 animate-spin mb-3" />
                <p className="text-sm" style={{ color: theme.textSecondary }}>Verificando documentos activos...</p>
            </div>
        );
    }

    return (
        <div className="rounded-xl border shadow-sm overflow-hidden" style={{ background: theme.surface, borderColor: theme.border }}>
            {/* Header */}
            <div className="p-4 border-b flex justify-between items-center" style={{ borderColor: theme.border }}>
                <div className="flex items-center gap-2">
                    <MonitorPlay className="w-5 h-5 text-indigo-500" />
                    <h3 className="font-bold tracking-tight" style={{ color: theme.text }}>
                        Documentos en Edición
                    </h3>
                    {editors.length > 0 && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 font-semibold">
                            {editors.length} activo{editors.length !== 1 ? 's' : ''}
                        </span>
                    )}
                </div>
                <button
                    onClick={fetchActiveEditors}
                    className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
                    title="Actualizar"
                >
                    <RefreshCw className="w-4 h-4 opacity-60" />
                </button>
            </div>

            {/* Body */}
            {editors.length === 0 ? (
                <div className="p-10 text-center space-y-3">
                    <div className="text-5xl opacity-20">🗂️</div>
                    <p className="font-medium" style={{ color: theme.textSecondary }}>
                        No hay documentos siendo modificados en este momento
                    </p>
                    {lastRefresh && (
                        <p className="text-xs opacity-40">
                            Última verificación: {lastRefresh.toLocaleTimeString('es-EC')}
                        </p>
                    )}
                </div>
            ) : (
                <div className="divide-y" style={{ borderColor: theme.border }}>
                    {/* Active editors list */}
                    <div className="p-3 space-y-2">
                        <p className="text-xs font-semibold px-1 mb-3 uppercase tracking-wider opacity-50" style={{ color: theme.text }}>
                            Usuarios editando ahora:
                        </p>
                        {editors.map((editor, idx) => (
                            <button
                                key={editor.fileId || idx}
                                onClick={() => setSelectedEditor(
                                    selectedEditor?.fileId === editor.fileId ? null : editor
                                )}
                                className={`w-full text-left p-3 rounded-xl border transition-all hover:shadow-md ${selectedEditor?.fileId === editor.fileId
                                        ? 'ring-2 ring-indigo-500 border-indigo-500/50'
                                        : ''
                                    }`}
                                style={{
                                    background: isDark ? '#1a1f2e' : '#f8fbfc',
                                    borderColor: theme.border,
                                }}
                            >
                                <div className="flex items-start gap-3">
                                    <span className="text-2xl flex-shrink-0 mt-0.5">
                                        {getFileIcon(editor.fileName)}
                                    </span>
                                    <div className="min-w-0 flex-1">
                                        <p className="font-semibold text-sm truncate" style={{ color: theme.text }}>
                                            {editor.fileName}
                                        </p>
                                        <div className="flex items-center gap-3 mt-1 text-xs flex-wrap">
                                            <span className="flex items-center gap-1" style={{ color: theme.textSecondary }}>
                                                <UserIcon className="w-3 h-3" />
                                                {editor.user}
                                            </span>
                                            <span className="flex items-center gap-1" style={{ color: theme.textSecondary }}>
                                                <Building2 className="w-3 h-3" />
                                                {editor.company}
                                            </span>
                                            <span className="flex items-center gap-1 text-orange-500">
                                                <Clock className="w-3 h-3" />
                                                {formatDuration(editor.editDurationMin)}
                                            </span>
                                        </div>
                                    </div>
                                    <Eye className={`w-4 h-4 flex-shrink-0 mt-1 ${selectedEditor?.fileId === editor.fileId ? 'text-indigo-500' : 'opacity-30'}`} />
                                </div>
                            </button>
                        ))}
                    </div>

                    {/* Office Online Preview Panel */}
                    {selectedEditor && (
                        <div className="border-t" style={{ borderColor: theme.border }}>
                            <div className="p-3 flex justify-between items-center bg-indigo-50/50 dark:bg-indigo-900/10">
                                <div className="flex items-center gap-2">
                                    <Eye className="w-4 h-4 text-indigo-500" />
                                    <span className="font-semibold text-sm" style={{ color: theme.text }}>
                                        Vista previa: {selectedEditor.fileName}
                                    </span>
                                </div>
                                <button
                                    onClick={() => setSelectedEditor(null)}
                                    className="p-1 rounded hover:bg-gray-200 dark:hover:bg-white/10 transition-colors"
                                >
                                    <X className="w-4 h-4 opacity-60" />
                                </button>
                            </div>

                            {selectedEditor.previewUrl ? (
                                <iframe
                                    src={selectedEditor.previewUrl}
                                    title={`Vista previa: ${selectedEditor.fileName}`}
                                    className="w-full border-0"
                                    style={{ height: '480px' }}
                                    allow="fullscreen"
                                    sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
                                />
                            ) : (
                                <div className="p-10 text-center" style={{ color: theme.textSecondary }}>
                                    <FileText className="w-12 h-12 mx-auto opacity-20 mb-3" />
                                    <p className="font-medium">Vista previa no disponible</p>
                                    <p className="text-xs opacity-60 mt-1">
                                        El archivo puede no ser compatible con Office Online
                                        o requiere permisos adicionales.
                                    </p>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}

            {error && (
                <div className="p-3 text-center text-xs text-red-500 border-t" style={{ borderColor: theme.border }}>
                    Error al verificar editores: {error}
                </div>
            )}
        </div>
    );
}
