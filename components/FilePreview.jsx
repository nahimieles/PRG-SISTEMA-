"use client";
import React, { useState, useEffect } from 'react';
import { X, Download, ExternalLink, FileText, Image as ImageIcon, File, Loader2, ZoomIn, ZoomOut, RefreshCw } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { lightTheme, darkTheme } from '@/lib/colors';
import { getPreviewUrl } from '@/lib/onedriveService';
const FilePreview = ({ file, onClose, onDownload, driveId }) => {
    const { isDark } = useTheme();
    const theme = isDark ? darkTheme : lightTheme;
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [zoom, setZoom] = useState(100);
    const [previewUrl, setPreviewUrl] = useState(null);
    useEffect(() => {
        setLoading(true);
        setError(null);
        setPreviewUrl(null);
        const loadPreview = async () => {
            try {
                const fileType = getFileType();
                if (['word', 'excel', 'powerpoint', 'pdf'].includes(fileType)) {
                    const cacheKey = `preview_${file.id}`;
                    const cachedUrl = sessionStorage.getItem(cacheKey);
                    if (cachedUrl) {
                        setPreviewUrl(cachedUrl);
                    } else {
                        const url = await getPreviewUrl(file.id, driveId);
                        if (url) {
                            sessionStorage.setItem(cacheKey, url);
                            setPreviewUrl(url);
                        } else {
                            setPreviewUrl(file.webUrl);
                        }
                    }
                }
                setLoading(false);
            } catch (err) {
                setError("No se pudo cargar la vista previa");
                setLoading(false);
            }
        };
        const timer = setTimeout(loadPreview, 300);
        return () => clearTimeout(timer);
    }, [file, driveId]);
    if (!file) return null;
    const getFileType = () => {
        const ext = file.name.split('.').pop().toLowerCase();
        if (['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp', 'bmp'].includes(ext)) return 'image';
        if (ext === 'pdf') return 'pdf';
        if (['doc', 'docx'].includes(ext)) return 'word';
        if (['xls', 'xlsx'].includes(ext)) return 'excel';
        if (['ppt', 'pptx'].includes(ext)) return 'powerpoint';
        if (['txt', 'md', 'json', 'xml', 'csv', 'log'].includes(ext)) return 'text';
        return 'unknown';
    };
    const fileType = getFileType();
    const renderPreview = () => {
        if (loading) {
            return (
                <div className="flex-1 flex items-center justify-center">
                    <div className="text-center">
                        <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4" style={{ color: theme.primary }} />
                        <p style={{ color: theme.textSecondary }}>Cargando vista previa...</p>
                    </div>
                </div>
            );
        }
        if (error) {
            return (
                <div className="flex-1 flex items-center justify-center">
                    <div className="text-center p-8">
                        <FileText className="w-16 h-16 mx-auto mb-4 opacity-30" />
                        <p className="text-red-500 mb-4">{error}</p>
                        <button
                            onClick={() => window.open(file.webUrl, '_blank')}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors cursor-pointer"
                        >
                            Abrir en SharePoint
                        </button>
                    </div>
                </div>
            );
        }
        switch (fileType) {
            case 'image':
                return (
                    <div className="flex-1 flex items-center justify-center p-4 overflow-auto">
                        <img
                            src={`${file['@microsoft.graph.downloadUrl'] || file.webUrl}${file['@microsoft.graph.downloadUrl']?.includes('?') ? '&' : '?'}t=${Date.now()}`}
                            alt={file.name}
                            style={{
                                maxWidth: '100%',
                                maxHeight: '100%',
                                transform: `scale(${zoom / 100})`,
                                transition: 'transform 0.2s ease'
                            }}
                            onError={() => setError('No se pudo cargar la imagen')}
                        />
                    </div>
                );
            case 'pdf':
            case 'word':
            case 'excel':
            case 'powerpoint':
                const embedUrl = previewUrl || file.webUrl;
                return (
                    <iframe
                        src={embedUrl}
                        className="w-full h-full border-0"
                        title={file.name}
                        allow="fullscreen"
                        sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
                    />
                );
            case 'text':
                return (
                    <div className="flex-1 overflow-auto p-6">
                        <div
                            className="max-w-4xl mx-auto p-6 rounded-lg font-mono text-sm"
                            style={{
                                background: isDark ? 'rgba(0,0,0,0.3)' : 'rgba(0,0,0,0.05)',
                                color: theme.text
                            }}
                        >
                            <p className="whitespace-pre-wrap">
                                Vista previa de texto no disponible. Por favor, descarga el archivo para verlo.
                            </p>
                        </div>
                    </div>
                );
            default:
                return (
                    <div className="flex-1 flex items-center justify-center">
                        <div className="text-center p-8">
                            <File className="w-16 h-16 mx-auto mb-4 opacity-30" />
                            <p style={{ color: theme.textSecondary }} className="mb-4">
                                Vista previa no disponible para este tipo de archivo
                            </p>
                            <button
                                onClick={() => window.open(file.webUrl, '_blank')}
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors cursor-pointer"
                            >
                                Abrir en SharePoint
                            </button>
                        </div>
                    </div>
                );
        }
    };
    const handleDownload = () => {
        if (onDownload) {
            onDownload(file);
        } else {
            const downloadUrl = file['@microsoft.graph.downloadUrl'] || file.webUrl;
            window.open(downloadUrl, '_blank');
        }
    };
    const handleOpenInNewTab = () => {
        window.open(file.webUrl, '_blank');
    };
    return (
        <div
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in"
            onClick={onClose}
        >
            <div
                className="w-full h-full max-w-7xl max-h-[90vh] rounded-xl shadow-lg overflow-hidden flex flex-col animate-scale-in"
                style={{ background: theme.surface }}
                onClick={(e) => e.stopPropagation()}
            >
                {}
                <div
                    className="flex items-center justify-between p-4 border-b"
                    style={{ borderColor: theme.border }}
                >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                        {fileType === 'image' ? (
                            <ImageIcon size={20} style={{ color: theme.primary }} />
                        ) : (
                            <FileText size={20} style={{ color: theme.primary }} />
                        )}
                        <div className="min-w-0 flex-1">
                            <h3
                                className="font-semibold truncate"
                                style={{ color: theme.text }}
                                title={file.name}
                            >
                                {file.name}
                            </h3>
                            <p className="text-xs opacity-60">
                                {file.size ? `${(file.size / 1024).toFixed(2)} KB` : 'Tamaño desconocido'}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {}
                        {fileType === 'image' && (
                            <>
                                <button
                                    onClick={() => setZoom(Math.max(25, zoom - 25))}
                                    className="p-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                                    title="Alejar"
                                >
                                    <ZoomOut size={18} style={{ color: theme.text }} />
                                </button>
                                <span className="text-sm font-medium px-2" style={{ color: theme.text }}>
                                    {zoom}%
                                </span>
                                <button
                                    onClick={() => setZoom(Math.min(200, zoom + 25))}
                                    className="p-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                                    title="Acercar"
                                >
                                    <ZoomIn size={18} style={{ color: theme.text }} />
                                </button>
                                <div className="w-px h-6 bg-gray-300 dark:bg-gray-700 mx-2" />
                            </>
                        )}
                        <button
                            onClick={handleDownload}
                            className="p-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                            title="Descargar"
                        >
                            <Download size={18} style={{ color: theme.text }} />
                        </button>
                        <button
                            onClick={handleOpenInNewTab}
                            className="p-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                            title="Abrir en nueva pestaña"
                        >
                            <ExternalLink size={18} style={{ color: theme.text }} />
                        </button>
                        <button
                            onClick={() => {
                                setLoading(true);
                                setError(null);
                                setPreviewUrl(null);
                                setTimeout(() => {
                                    const loadPreview = async () => {
                                        try {
                                            const fileType = getFileType();
                                            if (['word', 'excel', 'powerpoint', 'pdf'].includes(fileType)) {
                                                const url = await getPreviewUrl(file.id, driveId);
                                                if (url) sessionStorage.setItem(`preview_${file.id}`, url);
                                                setPreviewUrl(url || file.webUrl);
                                            }
                                            setLoading(false);
                                        } catch (e) {
                                            setLoading(false);
                                        }
                                    };
                                    loadPreview();
                                }, 100);
                            }}
                            className="p-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                            title="Recargar vista previa"
                        >
                            <RefreshCw size={18} style={{ color: theme.text }} />
                        </button>
                        <button
                            onClick={onClose}
                            className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 transition-colors"
                            title="Cerrar"
                        >
                            <X size={18} />
                        </button>
                    </div>
                </div>
                {}
                {renderPreview()}
            </div>
        </div>
    );
};
const styles = `
@keyframes scale-in {
    from {
        opacity: 0;
        transform: scale(0.95);
    }
    to {
        opacity: 1;
        transform: scale(1);
    }
}
.animate-scale-in {
    animation: scale-in 0.2s ease-out forwards;
}
`;
if (typeof document !== 'undefined') {
    const styleSheet = document.createElement('style');
    styleSheet.textContent = styles;
    document.head.appendChild(styleSheet);
}
export default FilePreview;
