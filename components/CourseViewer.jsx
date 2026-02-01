'use client';

import React, { useState, useEffect, useRef } from 'react';
import * as LucideIcons from 'lucide-react';
import { X, Maximize2, Minimize2, ChevronLeft, ChevronRight, MonitorPlay, CheckCircle2, User, Globe, Loader2 } from 'lucide-react';
import { getCompanyCourses, getCourses } from '../lib/auth';
import { useTheme } from '../contexts/ThemeContext';
import { lightTheme, darkTheme } from '../lib/colors';

export default function CourseViewer({ companyId, company, onBack, adminPreview = false }) {
    const { isDark } = useTheme();
    const theme = isDark ? darkTheme : lightTheme;

    const [courses, setCourses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeCourse, setActiveCourse] = useState(null);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [showFinalScreen, setShowFinalScreen] = useState(false);
    const [fileLoading, setFileLoading] = useState(false);
    const contentRef = useRef(null);
    const iframeRef = useRef(null);

    useEffect(() => {
        loadCourses();
    }, [adminPreview, companyId]);

    const loadCourses = async () => {
        setLoading(true);
        let data = [];

        try {
            if (adminPreview) {
                if (companyId) {
                    const { getCompanyCourses } = await import('../lib/auth');
                    data = await getCompanyCourses(companyId);
                } else {
                    data = await getCourses();
                }
            } else if (company && company.id) {
                const { getCompanyCourses } = await import('../lib/auth');
                data = await getCompanyCourses(company.id);
            }
        } catch (error) {
            console.error("Error loading courses:", error);
        }

        setCourses(data || []);
        setLoading(false);
    };

    const openCourse = (course) => {
        setActiveCourse(course);
        setIsFullscreen(true);
        setShowFinalScreen(false);
        setFileLoading(true);

        // Multi-stage focus logic for keyboard navigation
        // Stage 1: Immediate parent focus
        setTimeout(() => {
            if (contentRef.current) contentRef.current.focus();
        }, 50);

        // Stage 2: Faster aggressive interval for the first 2 seconds
        const focusInterval = setInterval(() => {
            if (iframeRef.current && !showFinalScreen) {
                iframeRef.current.focus();
                try {
                    iframeRef.current.contentWindow?.focus();
                } catch (e) { }
            }
        }, 100);

        setTimeout(() => clearInterval(focusInterval), 2000);

        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(e => {
                console.log('Fullscreen request denied or failed:', e);
            });
        }
    };

    const closeCourse = () => {
        if (document.fullscreenElement) {
            document.exitFullscreen().catch(e => console.log(e));
        }
        setIsFullscreen(false);
        setTimeout(() => {
            setActiveCourse(null);
            setShowFinalScreen(false);
            setFileLoading(false);
        }, 300);
    };

    useEffect(() => {
        const handleKeys = (e) => {
            if (!activeCourse) return;

            // Proxy keys to iframe if it's not focused and using arrows
            if (!showFinalScreen && iframeRef.current &&
                (e.key === 'ArrowRight' || e.key === 'ArrowLeft' || e.key === 'PageDown' || e.key === 'PageUp')) {
                if (document.activeElement !== iframeRef.current) {
                    iframeRef.current.focus();
                }
            }

            if (showFinalScreen && (e.key === 'Enter' || e.key === ' ')) {
                closeCourse();
            }
        };

        window.addEventListener('keydown', handleKeys);
        return () => window.removeEventListener('keydown', handleKeys);
    }, [activeCourse, showFinalScreen]);

    if (activeCourse) {
        const fileUrl = activeCourse.file_url?.toLowerCase() || '';
        const isPdf = fileUrl.endsWith('.pdf');
        const isOfficeRequest = fileUrl.endsWith('.ppt') || fileUrl.endsWith('.pptx') || fileUrl.endsWith('.doc') || fileUrl.endsWith('.docx') || fileUrl.endsWith('.xls') || fileUrl.endsWith('.xlsx');
        const isImage = fileUrl.endsWith('.jpg') || fileUrl.endsWith('.jpeg') || fileUrl.endsWith('.png') || fileUrl.endsWith('.gif') || fileUrl.endsWith('.webp');

        const getEmbedUrl = () => {
            if (isPdf) {
                return `${activeCourse.file_url}#toolbar=0&view=FitH`;
            }
            // Add other embed URL logic here if needed for other types
            return activeCourse.file_url;
        };

        return (
            <div
                ref={contentRef}
                tabIndex={0}
                onFocus={() => {
                    if (!showFinalScreen && iframeRef.current) {
                        iframeRef.current.focus();
                    }
                }}
                onClick={() => {
                    if (!showFinalScreen && iframeRef.current) {
                        iframeRef.current.focus();
                    }
                }}
                className={`fixed inset-0 z-50 bg-[#06080a] flex flex-col transition-opacity duration-200 outline-none ${isFullscreen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
            >
                {/* Close Button ("X") - Always slightly visible for better UX */}
                <button
                    onClick={closeCourse}
                    className="fixed top-6 right-10 z-[60] p-3 text-white/40 hover:text-white hover:bg-white/10 rounded-full transition-all duration-200"
                    title="Cerrar curso (Esc)"
                >
                    <X size={28} />
                </button>

                <div className="flex-1 relative overflow-hidden flex items-center justify-center">
                    {/* Loading State Overlay - Matches viewer background */}
                    {fileLoading && !showFinalScreen && (
                        <div className="absolute inset-0 z-[55] bg-[#06080a] flex items-center justify-center">
                            <div className="flex flex-col items-center gap-4">
                                <div className="w-12 h-12 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin"></div>
                                <p className="text-white/40 text-sm animate-pulse">Cargando material...</p>
                            </div>
                        </div>
                    )}

                    {showFinalScreen ? (
                        <div className="flex flex-col items-center justify-center text-center animate-scale-up p-8 z-50">
                            <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mb-6 border border-green-500/30">
                                <CheckCircle2 className="w-10 h-10 text-green-500" />
                            </div>
                            <h2 className="text-3xl font-black text-white mb-2 uppercase tracking-tighter italic">¡Módulo Completado!</h2>
                            <p className="text-gray-400 mb-8 max-w-sm text-sm">Has revisado todo el material correctamente.</p>
                            <button
                                onClick={closeCourse}
                                className="px-12 py-4 bg-blue-600 hover:bg-blue-500 text-white text-lg font-black rounded-xl shadow-[0_0_30px_rgba(37,99,235,0.2)] transition-all hover:scale-105 active:scale-95 flex items-center gap-2 uppercase italic"
                            >
                                <CheckCircle2 className="w-5 h-5" />
                                FINALIZAR
                            </button>
                        </div>
                    ) : (
                        <>
                            {!activeCourse.file_url ? (
                                <div className="text-center text-red-500">
                                    <LucideIcons.AlertCircle className="w-10 h-10 mx-auto mb-2 opacity-50" />
                                    <p className="text-sm font-bold">Enlace no disponible</p>
                                </div>
                            ) : isPdf ? (
                                <iframe
                                    ref={iframeRef}
                                    src={getEmbedUrl()}
                                    className="w-full h-full border-none bg-white"
                                    title={activeCourse.title}
                                    allowFullScreen
                                    onLoad={() => {
                                        setFileLoading(false);
                                        // Immediate focus capture on load completion
                                        setTimeout(() => {
                                            if (iframeRef.current) {
                                                iframeRef.current.focus();
                                                try { iframeRef.current.contentWindow?.focus(); } catch (e) { }
                                            }
                                        }, 100);
                                    }}
                                ></iframe>
                            ) : isOfficeRequest ? (
                                <div className="w-full h-full overflow-hidden relative bg-white">
                                    <iframe
                                        ref={iframeRef}
                                        src={`https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(activeCourse.file_url)}&wdAr=0&wdStartOn=1&wdPrint=0&wdEmbedCode=0`}
                                        className="w-full h-[calc(100%+32px)] border-none -mb-[32px]"
                                        title={activeCourse.title}
                                        loading="eager"
                                        allow="fullscreen"
                                        onLoad={() => {
                                            setFileLoading(false);
                                            // Aggressive focus immediately on load
                                            setTimeout(() => {
                                                if (iframeRef.current) {
                                                    iframeRef.current.focus();
                                                    try { iframeRef.current.contentWindow?.focus(); } catch (e) { }
                                                }
                                            }, 50);
                                        }}
                                    />
                                    {/* Focus Bridge Overlay: Disappears on first interaction but ensures focus transfer */}
                                    <div
                                        className="absolute inset-0 z-[56] cursor-default bg-transparent"
                                        onMouseMove={(e) => {
                                            if (iframeRef.current && document.activeElement !== iframeRef.current) {
                                                iframeRef.current.focus();
                                                e.currentTarget.style.display = 'none'; // Only need it once
                                            }
                                        }}
                                        onClick={(e) => {
                                            if (iframeRef.current) iframeRef.current.focus();
                                            e.currentTarget.style.display = 'none';
                                        }}
                                    ></div>
                                </div>
                            ) : isImage ? (
                                <img
                                    src={activeCourse.file_url}
                                    alt={activeCourse.title}
                                    className="max-w-full max-h-full object-contain"
                                    onLoad={() => setFileLoading(false)}
                                />
                            ) : (
                                <div className="text-center text-gray-500 p-10">
                                    <LucideIcons.FileText className="w-12 h-12 mx-auto mb-4 opacity-20" />
                                    <p className="text-sm">Formato no soportado.</p>
                                    <a href={activeCourse.file_url} target="_blank" rel="noopener noreferrer" className="mt-6 inline-block px-6 py-2 bg-blue-600 text-white rounded-lg font-bold text-sm">Descargar</a>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        );
    }

    const half = Math.ceil(courses.length / 2);
    const leftCourses = courses.slice(0, half);
    const rightCourses = courses.slice(half);

    return (
        <div className="p-4 md:p-6 animate-fade-in min-h-screen transition-colors" style={{ background: theme.background, color: theme.text }}>

            <div className="flex flex-col items-center md:items-start mb-8 gap-3 max-w-6xl mx-auto">
                {adminPreview && (
                    <button
                        onClick={onBack}
                        className="mb-1 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 hover:bg-blue-500/20 text-[10px] font-black text-blue-600 dark:text-blue-400 transition-all flex items-center gap-1 uppercase tracking-widest"
                    >
                        <ChevronLeft size={12} />
                        Volver al panel
                    </button>
                )}
                <h1 className="text-5xl md:text-7xl font-black tracking-tighter uppercase italic leading-none" style={{ color: theme.text }}>
                    PANEL DE <span className="text-blue-500">CONTROL</span>
                </h1>
            </div>

            {loading ? (
                <div className="flex justify-center items-center h-48">
                    <Loader2 className="animate-spin h-8 w-8 text-blue-500" />
                </div>
            ) : courses.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-48 border border-dashed rounded-2xl" style={{ borderColor: theme.border, background: theme.surface }}>
                    <LucideIcons.FileText className="w-8 h-8 mb-3 opacity-20" style={{ color: theme.text }} />
                    <p className="text-sm font-medium" style={{ color: theme.textSecondary }}>No hay cursos asignados actualmente.</p>
                </div>
            ) : (
                <div className="max-w-6xl mx-auto">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3">
                        <div className="space-y-3">
                            {leftCourses.map(course => (
                                <CourseRow key={course.id} course={course} onClick={() => openCourse(course)} theme={theme} />
                            ))}
                        </div>
                        <div className="space-y-3">
                            {rightCourses.map(course => (
                                <CourseRow key={course.id} course={course} onClick={() => openCourse(course)} theme={theme} />
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function CourseRow({ course, onClick, theme }) {
    const IconComponent = course.icon_name && LucideIcons[course.icon_name] ? LucideIcons[course.icon_name] : LucideIcons.FileText;

    return (
        <button
            onClick={onClick}
            className="group w-full flex items-center p-4 rounded-xl transition-all duration-300 hover:shadow-xl text-left border relative overflow-hidden active:scale-[0.99] hover:-translate-y-0.5"
            style={{ background: theme.surface, borderColor: theme.border, boxShadow: `0 4px 6px -1px rgba(0, 0, 0, 0.05)` }}
        >
            <div className="absolute inset-x-0 bottom-0 h-0.5 bg-blue-500 scale-x-0 group-hover:scale-x-100 transition-transform origin-left duration-500" />
            <div className="w-10 h-10 rounded-lg flex items-center justify-center mr-4 group-hover:scale-110 transition-transform bg-blue-500/10 text-blue-600 dark:text-blue-400 flex-shrink-0">
                <IconComponent size={20} />
            </div>
            <h3 className="flex-1 font-black text-sm tracking-tight transition-colors uppercase truncate" style={{ color: theme.text }}>
                {course.title}
            </h3>
            <div className="ml-2 opacity-10 group-hover:opacity-100 group-hover:translate-x-1 transition-all">
                <ChevronRight size={16} className="text-blue-500" />
            </div>
        </button>
    );
}
