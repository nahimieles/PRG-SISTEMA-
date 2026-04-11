'use client';

import React, { useState, useEffect } from 'react';
import * as LucideIcons from 'lucide-react';
import { Plus, Edit2, Trash2, X, Upload, Save, Eye, Users, FileText, ChevronUp, ChevronDown, ChevronLeft, Folder, CheckCircle, Search, Layers, Globe, FolderPlus, PenTool, Settings, Play } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { lightTheme, darkTheme } from '../lib/colors';
import {
    getCourses,
    createCourse,
    updateCourse,
    deleteCourse,
    getCompanies,
    getCompanyGroups,
    uploadFile,
    updateCoursePosition
} from '../lib/auth';

import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
    useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

import IconSelector from './IconSelector';
import Toast from './Toast';

// --- HELPER FUNCTIONS ---
const DEFAULT_FOLDER_NAME = 'Material PRG Auditores';

const getFolderFromDescription = (desc) => {
    if (!desc) return DEFAULT_FOLDER_NAME;
    const match = desc.match(/^\[FOLDER:\s*(.*?)\]/);
    return match ? match[1].trim() : DEFAULT_FOLDER_NAME;
};

const getCleanDescription = (desc) => {
    if (!desc) return '';
    return desc.replace(/^\[FOLDER:\s*.*?\]\s*/, '');
};

const formatDescription = (folder, cleanDesc) => {
    const safeFolder = (folder || DEFAULT_FOLDER_NAME).replace(/[\[\]]/g, '').trim();
    return `[FOLDER: ${safeFolder}] ${cleanDesc || ''}`;
};

// --- SORTABLE ITEM COMPONENT ---
function SortableItem(props) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id: props.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 50 : 'auto',
        position: 'relative'
    };

    return (
        <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
            {props.children}
        </div>
    );
}


export default function CourseEditor({ onPreview }) {
    const { isDark } = useTheme();
    const theme = isDark ? darkTheme : lightTheme;

    const [courses, setCourses] = useState([]);
    const [companies, setCompanies] = useState([]);
    const [groups, setGroups] = useState([]); // NEW STATE
    const [loading, setLoading] = useState(false);

    // UI States
    const [currentFolder, setCurrentFolder] = useState(null); // null = Root
    const [folders, setFolders] = useState([]);

    // Modal States
    const [showCourseModal, setShowCourseModal] = useState(false);
    const [showFolderModal, setShowFolderModal] = useState(false);
    const [showPreviewModal, setShowPreviewModal] = useState(false);

    const [editingCourse, setEditingCourse] = useState(null);
    const [editingFolder, setEditingFolder] = useState(null); // { name: string, companies: [] }

    // --- INITIAL DATA LOAD ---
    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        const [coursesData, companiesData, groupsData] = await Promise.all([
            getCourses(),
            getCompanies(),
            getCompanyGroups() // NEW FETCH
        ]);

        // Sort courses by position if available, otherwise by title or created_at
        const sortedCourses = coursesData.sort((a, b) => (a.position || 0) - (b.position || 0));

        setCourses(sortedCourses);
        setCompanies(companiesData);
        setGroups(groupsData); // SET GROUPS

        // Extract folders dynamically
        const uniqueFolders = new Set();
        coursesData.forEach(c => {
            uniqueFolders.add(getFolderFromDescription(c.description));
        });

        // Ensure default folder exists if we have no courses yet, or just to be safe
        if (uniqueFolders.size === 0) uniqueFolders.add(DEFAULT_FOLDER_NAME);

        setFolders([...uniqueFolders].sort());
        setLoading(false);
    };

    // --- FOLDER ACTIONS ---

    // Open Folder Edit/Create Modal
    const handleOpenFolderModal = (folderName = null) => {
        if (folderName) {
            // Editing existing folder
            const exampleCourse = courses.find(c => getFolderFromDescription(c.description) === folderName);
            const initialids = exampleCourse ? (exampleCourse.assigned_company_ids || []) : [];

            setEditingFolder({
                originalName: folderName,
                name: folderName,
                assigned_company_ids: initialids
            });
        } else {
            // Creating new folder
            setEditingFolder({
                originalName: null,
                name: '',
                assigned_company_ids: []
            });
        }
        setShowFolderModal(true);
    };

    const handleSaveFolder = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const oldName = editingFolder.originalName;
            const newName = editingFolder.name.trim();
            const newIds = editingFolder.assigned_company_ids;

            if (!newName) throw new Error("El nombre de la carpeta es requerido");
            if (folders.includes(newName) && newName !== oldName) throw new Error("Ya existe una carpeta con ese nombre");

            if (oldName) {
                // UPDATE EXISTING FOLDER
                const folderCourses = courses.filter(c => getFolderFromDescription(c.description) === oldName);

                for (const course of folderCourses) {
                    const newDesc = formatDescription(newName, getCleanDescription(course.description));
                    await updateCourse(course.id, {
                        ...course,
                        description: newDesc,
                        assigned_company_ids: newIds
                    });
                }
                showToast(`Carpeta updated (${folderCourses.length} clases sincronizadas)`);
            } else {
                // CREATE NEW FOLDER (Virtual)
                setFolders(prev => [...prev, newName].sort());
                showToast("Carpeta creada");
            }

            setShowFolderModal(false);
            setEditingFolder(null);
            loadData();

        } catch (error) {
            showToast(error.message, 'error');
        } finally {
            setLoading(false);
        }
    };

    // --- COURSE ACTIONS ---

    const handleOpenCourseModal = (course = null) => {
        if (course) {
            setEditingCourse(course);
            setCourseFormData({
                title: course.title,
                description: getCleanDescription(course.description),
                folder: getFolderFromDescription(course.description),
                file: null,
                assigned_company_ids: course.assigned_company_ids || [],
                icon_name: course.icon_name || 'FileText'
            });
        } else {
            setEditingCourse(null);
            // INHERITANCE
            const folderCourses = courses.filter(c => getFolderFromDescription(c.description) === currentFolder);
            const inheritedIds = folderCourses.length > 0 ? (folderCourses[0].assigned_company_ids || []) : [];

            setCourseFormData({
                title: '',
                description: '',
                folder: currentFolder || DEFAULT_FOLDER_NAME,
                file: null,
                assigned_company_ids: inheritedIds,
                icon_name: 'FileText'
            });
        }
        setShowCourseModal(true);
    };

    const [courseFormData, setCourseFormData] = useState({
        title: '', description: '', folder: '', file: null, assigned_company_ids: [], icon_name: 'FileText'
    });

    const handleSaveCourse = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            let fileUrl = editingCourse?.file_url;
            if (courseFormData.file) {
                const uploadRes = await uploadFile(courseFormData.file, 'course-doc');
                if (!uploadRes.success) throw new Error(uploadRes.error);
                fileUrl = uploadRes.fileUrl;
            } else if (!editingCourse) {
                throw new Error('Debes subir un archivo.');
            }

            const finalDesc = formatDescription(currentFolder, courseFormData.description);
            const courseData = {
                title: courseFormData.title,
                description: finalDesc,
                file_url: fileUrl,
                cover_image: null,
                assigned_company_ids: courseFormData.assigned_company_ids,
                icon_name: courseFormData.icon_name || 'FileText'
            };

            let result;
            if (editingCourse) result = await updateCourse(editingCourse.id, courseData);
            else result = await createCourse(courseData);

            if (!result.success) throw new Error(result.error);

            setShowCourseModal(false);
            loadData();
            showToast('Clase guardada correctamente');
        } catch (error) {
            showToast(error.message, 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteCourse = async (id) => {
        if (!confirm("¿Eliminar clase?")) return;
        setLoading(true);
        await deleteCourse(id);
        loadData();
        setLoading(false);
    };

    // --- SHARED UI HELPERS ---
    const [toast, setToast] = useState(null);
    const showToast = (msg, type = 'success') => { setToast({ message: msg, type }); setTimeout(() => setToast(null), 3000); };
    const [menuSearch, setMenuSearch] = useState('');

    // Toggle ID in a list
    const toggleId = (list, id) => list.includes(id) ? list.filter(x => x !== id) : [...list, id];

    // Toggle GROUP (Batch Select)
    const toggleGroup = (list, groupId) => {
        const groupCompanies = companies.filter(c => c.group_id === groupId || (c.type === groupId && !c.group_id)); // Support Legacy Types as "Groups" by ID if needed, but primarily use real groups
        // Actually, let's treat groups strictly by ID for dynamic ones.
        const targetCompanies = companies.filter(c => c.group_id === groupId);

        if (targetCompanies.length === 0) return list;

        const targetIds = targetCompanies.map(c => c.id);
        const allSelected = targetIds.every(id => list.includes(id));

        if (allSelected) {
            // Deselect all
            return list.filter(id => !targetIds.includes(id));
        } else {
            // Select all
            const newIds = new Set([...list, ...targetIds]);
            return [...newIds];
        }
    };

    // --- DRAG AND DROP SENSORS ---
    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const handleDragEnd = async (event) => {
        const { active, over } = event;

        if (active.id !== over.id) {
            setCourses((items) => {
                const oldIndex = items.findIndex((item) => item.id === active.id);
                const newIndex = items.findIndex((item) => item.id === over.id);
                const newItems = arrayMove(items, oldIndex, newIndex);

                // Persist new positions
                // We typically only need to update the moved item and those shifted, 
                // but for simplicity/robustness we can update the range or just the moved one's neighbors.
                // Or update all indices in the local list for consistency.

                // Let's update backend asynchronously
                const updates = newItems.map((item, index) => ({ id: item.id, position: index }));

                // Trigger backend updates (optimistic UI)
                updates.forEach(u => updateCoursePosition(u.id, u.position));

                return newItems;
            });
        }
    };

    return (
        <div className="animate-fade-in space-y-6">

            {/* HEADER */}
            <div
                key={`header-${isDark ? 'dark' : 'light'}`}
                className="flex flex-col sm:flex-row justify-between items-center p-4 sm:p-6 rounded-xl border gap-4"
                style={{
                    background: isDark ? '#111827' : '#ffffff',
                    borderColor: isDark ? '#374151' : '#e5e7eb'
                }}
            >
                <div className="flex items-center gap-4 w-full sm:w-auto">
                    <div
                        className="p-3 rounded-xl text-blue-500 border shadow-inner"
                        style={{
                            backgroundColor: isDark ? '#1e3a5f' : '#f9fafb',
                            borderColor: isDark ? '#2563eb' : '#bfdbfe'
                        }}
                    >
                        <Layers size={24} />
                    </div>
                    <div>
                        <h2 className="text-xl sm:text-2xl font-bold" style={{ color: isDark ? '#ffffff' : '#111827' }}>Gestión de Material</h2>
                    </div>
                </div>

                {/* Preview Trigger */}
                <button
                    onClick={() => {
                        let relevantCourses = courses;
                        if (currentFolder) {
                            relevantCourses = courses.filter(c => getFolderFromDescription(c.description) === currentFolder);
                        }
                        const validIds = new Set();
                        relevantCourses.forEach(c => {
                            if (c.assigned_company_ids && Array.isArray(c.assigned_company_ids)) {
                                c.assigned_company_ids.forEach(id => validIds.add(id));
                            }
                        });

                        if (validIds.size > 0) {
                            const firstId = [...validIds][0];
                            const companyName = companies.find(c => c.id === firstId)?.name;
                            showToast(`Simulando vista como: ${companyName || 'Empresa'}`);
                            onPreview(firstId);
                        } else {
                            showToast('Modo Vista Global (Sin filtro de empresa)', 'info');
                            onPreview(null);
                        }
                    }}
                    className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-bold text-sm transition-all hover:scale-105 active:scale-95 shadow-sm"
                    style={{
                        backgroundColor: isDark ? '#374151' : '#f3f4f6',
                        color: isDark ? '#d1d5db' : '#4b5563'
                    }}
                >
                    <Eye size={18} />
                    <span>Vista Previa</span>
                </button>
            </div>

            {loading && !showCourseModal && !showFolderModal && <div className="text-center py-10 opacity-50 animate-pulse">Cargando...</div>}

            {/* === LIBRARY VIEW (FOLDERS) === */}
            {!loading && (
                <div className="space-y-6">
                    {/* BREADCRUMBS & ACTIONS */}
                    <div className="flex flex-col gap-4">
                        {/* Breadcrumb Row */}
                        <div className="flex items-center flex-wrap gap-1.5 sm:gap-2 text-sm sm:text-lg md:text-xl font-bold overflow-hidden" style={{ color: theme.text }}>
                            <button
                                onClick={() => setCurrentFolder(null)}
                                className={`hover:text-blue-500 transition-colors flex items-center gap-1.5 flex-shrink-0 ${!currentFolder ? 'text-blue-600 cursor-default' : 'text-gray-400'}`}
                            >
                                <Layers size={18} className="sm:w-5 sm:h-5" /> <span className="hidden sm:inline">Módulos</span><span className="sm:hidden">Módulos</span>
                            </button>
                            {currentFolder && (
                                <div className="flex items-center gap-1.5 min-w-0">
                                    <ChevronLeft size={14} className="text-gray-300 rotate-180 flex-shrink-0" />
                                    <span className="text-blue-600 flex items-center gap-1.5 min-w-0">
                                        <Folder size={18} className="flex-shrink-0 sm:w-5 sm:h-5" /> <span className="truncate max-w-[150px] sm:max-w-none">{currentFolder}</span>
                                    </span>
                                </div>
                            )}
                        </div>


                        {/* Action Buttons Row */}
                        <div className="w-full">
                            {!currentFolder ? (
                                <button
                                    onClick={() => handleOpenFolderModal()}
                                    className="w-full sm:w-auto px-4 sm:px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2 transition-all text-sm"
                                >
                                    <FolderPlus size={18} /> <span>NUEVA CARPETA</span>
                                </button>
                            ) : (
                                <div className="flex flex-row gap-2 w-full">
                                    <button
                                        onClick={() => handleOpenFolderModal(currentFolder)}
                                        className="flex-1 sm:flex-initial px-3 sm:px-4 py-2 sm:py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 dark:bg-gray-800 dark:text-gray-300 rounded-lg sm:rounded-xl font-bold flex items-center justify-center gap-1.5 sm:gap-2 transition-all border dark:border-gray-700 text-xs sm:text-sm"
                                    >
                                        <Settings size={14} className="sm:w-[18px] sm:h-[18px]" /> <span>CONFIGURAR</span>
                                    </button>
                                    <button
                                        onClick={() => handleOpenCourseModal()}
                                        className="flex-1 sm:flex-initial px-3 sm:px-6 py-2 sm:py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg sm:rounded-xl font-bold shadow-lg shadow-blue-500/20 flex items-center justify-center gap-1.5 sm:gap-2 transition-all text-xs sm:text-sm"
                                    >
                                        <Plus size={14} className="sm:w-[18px] sm:h-[18px]" /> <span>NUEVA CLASE</span>
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* ROOT: FOLDER GRID */}
                    {!currentFolder && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                            {folders.map(folder => {
                                const count = courses.filter(c => getFolderFromDescription(c.description) === folder).length;
                                // Find permissions summary from first course
                                const firstCourse = courses.find(c => getFolderFromDescription(c.description) === folder);
                                const permCount = firstCourse?.assigned_company_ids?.length || 0;

                                return (
                                    <div
                                        key={folder}
                                        onClick={() => setCurrentFolder(folder)}
                                        className="group relative p-6 sm:p-8 rounded-xl border transition-all hover:scale-[1.02] active:scale-100 cursor-pointer flex flex-col items-start gap-4 shadow-sm hover:shadow-xl hover:border-blue-500/30 bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900"
                                        style={{ borderColor: theme.border, background: theme.surface }}
                                    >
                                        <div className="w-14 h-14 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center group-hover:bg-blue-500 group-hover:text-white transition-all shadow-inner">
                                            <Folder size={28} strokeWidth={2.5} />
                                        </div>

                                        <div className="w-full">
                                            <h3 className="text-xl font-bold truncate mb-1" style={{ color: theme.text }}>{folder}</h3>
                                            <div className="flex items-center gap-3 text-xs font-bold opacity-60">
                                                <span className="flex items-center gap-1"><FileText size={12} /> {count} Clases</span>
                                                <span className="flex items-center gap-1"><Users size={12} /> {permCount} Accesos</span>
                                            </div>
                                        </div>

                                        <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-all">
                                            <button
                                                onClick={(e) => { e.stopPropagation(); handleOpenFolderModal(folder); }}
                                                className="p-2 hover:bg-black/10 rounded-full text-gray-400 hover:text-blue-500"
                                            >
                                                <Edit2 size={16} />
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                            {folders.length === 0 && (
                                <div className="col-span-full py-20 text-center opacity-50 flex flex-col items-center">
                                    <FolderPlus size={48} className="mb-4 text-gray-300" />
                                    <p className="font-bold">No hay carpetas creadas.</p>
                                    <p className="text-sm">Inicia creando una carpeta maestra.</p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* FOLDER CONTENT: FILE LIST / CARD VIEW ON MOBILE */}
                    {currentFolder && (
                        <div className="rounded-xl border overflow-hidden shadow-sm animate-fade-in" style={{ borderColor: theme.border, background: theme.surface }}>
                            {/* TABLE HEADER (Desktop Only) */}
                            <div className="hidden md:grid grid-cols-12 gap-4 p-4 border-b text-xs font-black uppercase tracking-widest opacity-50" style={{ borderColor: theme.border, color: theme.text }}>
                                <div className="col-span-1 text-center">Icono</div>
                                <div className="col-span-6">Nombre de la Clase</div>
                                <div className="col-span-3 text-center">Permisos Actuales</div>
                                <div className="col-span-2 text-right">Acciones</div>
                            </div>

                            <DndContext
                                sensors={sensors}
                                collisionDetection={closestCenter}
                                onDragEnd={handleDragEnd}
                            >
                                <SortableContext
                                    items={courses.filter(c => getFolderFromDescription(c.description) === currentFolder).map(c => c.id)}
                                    strategy={verticalListSortingStrategy}
                                >
                                    <div className="divide-y" style={{ borderColor: theme.border }}>
                                        {courses.filter(c => getFolderFromDescription(c.description) === currentFolder).map((course) => {
                                            const Icon = course.icon_name && LucideIcons[course.icon_name] ? LucideIcons[course.icon_name] : FileText;
                                            const accessCount = course.assigned_company_ids?.length || 0;

                                            return (
                                                <SortableItem key={course.id} id={course.id}>
                                                    {/* CARD VIEW (Mobile) + ROW VIEW (Desktop) */}
                                                    <div className="flex flex-col md:grid md:grid-cols-12 gap-2 sm:gap-4 p-3 sm:p-4 items-center hover:bg-black/[0.02] transition-colors bg-white dark:bg-transparent" style={{ borderColor: theme.border }}>
                                                        <div className="w-full flex items-center justify-between md:contents">
                                                            {/* Icon + Title on same row in mobile */}
                                                            <div className="flex items-center gap-2 sm:gap-3 md:col-span-1 md:justify-center flex-1 min-w-0">
                                                                <div className="p-1.5 sm:p-2.5 rounded-lg sm:rounded-xl bg-blue-500/10 text-blue-500 cursor-grab active:cursor-grabbing flex-shrink-0">
                                                                    <Icon size={16} className="sm:w-5 sm:h-5" />
                                                                </div>
                                                                <div className="md:hidden min-w-0 flex-1">
                                                                    <h4 className="font-bold text-xs sm:text-sm truncate" style={{ color: theme.text }}>{course.title}</h4>
                                                                    <p className="text-[9px] sm:text-[10px] font-bold opacity-50 uppercase">{course.file_url ? course.file_url.split('.').pop().toUpperCase() : '—'}</p>
                                                                </div>
                                                            </div>

                                                            <div className="hidden md:block md:col-span-6 min-w-0">
                                                                <h4 className="font-bold text-sm truncate" style={{ color: theme.text }}>{course.title}</h4>
                                                                <p className="text-[10px] font-bold opacity-50 uppercase">{course.file_url ? course.file_url.split('.').pop().toUpperCase() : '—'}</p>
                                                            </div>

                                                            {/* Status Badge - Hidden on very small mobile */}
                                                            <div className="md:col-span-3 flex justify-center flex-shrink-0">
                                                                {accessCount === 0 ? (
                                                                    <span className="px-1.5 sm:px-2.5 py-0.5 sm:py-1 rounded-full text-[9px] sm:text-xs font-bold bg-red-100 text-red-600 dark:bg-red-500/10">Sin Acceso</span>
                                                                ) : (
                                                                    <span className="px-1.5 sm:px-2.5 py-0.5 sm:py-1 rounded-full text-[9px] sm:text-xs font-bold bg-green-100 text-green-600 dark:bg-green-500/10 flex items-center gap-0.5 sm:gap-1">
                                                                        <CheckCircle size={10} className="hidden sm:block" /> <span>{accessCount}</span><span className="hidden sm:inline"> Empresas</span>
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>

                                                        {/* Actions Button Bar - Compact on mobile */}
                                                        <div className="w-full md:col-span-2 flex justify-center sm:justify-end gap-1.5 sm:gap-2 mt-2 md:mt-0 pt-2 sm:pt-3 md:pt-0 border-t md:border-0 border-dashed" style={{ borderColor: theme.border }}>
                                                            <button
                                                                onPointerDown={(e) => e.stopPropagation()}
                                                                onClick={() => handleOpenCourseModal(course)}
                                                                className="flex items-center justify-center gap-1 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2.5 md:p-2 bg-blue-50 md:bg-transparent text-blue-500 hover:bg-blue-100 rounded-lg sm:rounded-xl transition-all font-bold text-[10px] sm:text-xs"
                                                            >
                                                                <Edit2 size={12} className="sm:w-4 sm:h-4" /> <span className="md:hidden">Editar</span>
                                                            </button>
                                                            <button
                                                                onPointerDown={(e) => e.stopPropagation()}
                                                                onClick={() => handleDeleteCourse(course.id)}
                                                                className="flex items-center justify-center gap-1 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2.5 md:p-2 bg-red-50 md:bg-transparent text-red-500 hover:bg-red-100 rounded-lg sm:rounded-xl transition-all font-bold text-[10px] sm:text-xs"
                                                            >
                                                                <Trash2 size={12} className="sm:w-4 sm:h-4" /> <span className="md:hidden">Eliminar</span>
                                                            </button>
                                                        </div>
                                                    </div>
                                                </SortableItem>
                                            );
                                        })}
                                    </div>
                                </SortableContext>
                            </DndContext>
                        </div>
                    )}
                </div>
            )}

            {/* === MODAL: EDIT FOLDER & PERMISSIONS === */}
            {showFolderModal && (
                <div key={`folder-modal-${isDark ? 'dark' : 'light'}`} className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
                    <div
                        className="w-full max-w-lg rounded-2xl shadow-lg border flex flex-col max-h-[90vh] overflow-hidden scale-in-center"
                        style={{
                            backgroundColor: isDark ? '#111827' : '#ffffff',
                            borderColor: isDark ? '#374151' : '#e5e7eb'
                        }}
                    >
                        <div
                            className="p-6 border-b flex justify-between items-start shrink-0"
                            style={{
                                backgroundColor: isDark ? '#1f2937' : '#f9fafb',
                                borderColor: isDark ? '#374151' : '#e5e7eb'
                            }}
                        >
                            <div>
                                <h3 className="font-black text-xl uppercase tracking-tighter italic flex items-center gap-2" style={{ color: isDark ? '#ffffff' : '#111827' }}>
                                    <Folder className="text-blue-600" size={24} />
                                    {editingFolder?.originalName ? 'Configurar Módulo' : 'Nuevo Módulo'}
                                </h3>
                                <p className="text-[10px] font-bold uppercase tracking-widest mt-1" style={{ color: isDark ? '#9ca3af' : '#6b7280' }}>Gestión de contenido y accesos</p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setShowFolderModal(false)}
                                className="p-2 rounded-xl transition-all group"
                                style={{ backgroundColor: isDark ? '#374151' : '#f3f4f6', color: '#9ca3af' }}
                            >
                                <X size={20} className="group-hover:rotate-90 transition-transform" />
                            </button>
                        </div>

                        <div className="overflow-y-auto custom-scrollbar" style={{ backgroundColor: isDark ? '#111827' : '#ffffff' }}>
                            <form onSubmit={handleSaveFolder} className="p-8 space-y-8">
                                {/* Name */}
                                <div className="space-y-3">
                                    <div className="flex justify-between items-end">
                                        <label className="text-[10px] font-black uppercase tracking-widest" style={{ color: isDark ? '#9ca3af' : '#6b7280' }}>Nombre del Módulo</label>
                                        <span className="text-[10px] font-bold text-blue-500">Requerido</span>
                                    </div>
                                    <input
                                        autoFocus type="text" required
                                        className="w-full text-xl font-black p-4 border-2 rounded-xl outline-none transition-all"
                                        style={{
                                            backgroundColor: isDark ? '#374151' : '#ffffff',
                                            borderColor: isDark ? '#4b5563' : '#e5e7eb',
                                            color: isDark ? '#ffffff' : '#111827'
                                        }}
                                        placeholder="Ej: Auditoría Externa 2024"
                                        value={editingFolder.name}
                                        onChange={e => setEditingFolder(prev => ({ ...prev, name: e.target.value }))}
                                    />
                                </div>

                                {/* Batch Permissions */}
                                <div className="border-t pt-4" style={{ borderColor: isDark ? '#374151' : '#e5e7eb' }}>
                                    <div className="flex justify-between items-center mb-3">
                                        <label className="text-[10px] font-black uppercase tracking-widest" style={{ color: isDark ? '#9ca3af' : '#6b7280' }}>Acceso Global (Todas las clases)</label>
                                        <div
                                            className="px-3 py-1.5 rounded-xl flex items-center gap-2 border shadow-inner"
                                            style={{
                                                backgroundColor: isDark ? '#374151' : '#f9fafb',
                                                borderColor: isDark ? '#4b5563' : '#e5e7eb'
                                            }}
                                        >
                                            <Search size={14} style={{ color: '#9ca3af' }} />
                                            <input
                                                className="bg-transparent text-xs font-bold outline-none w-32"
                                                style={{ color: isDark ? '#ffffff' : '#111827' }}
                                                placeholder="Buscar..."
                                                value={menuSearch}
                                                onChange={e => setMenuSearch(e.target.value)}
                                            />
                                        </div>
                                    </div>

                                    {/* GROUPS SECTION */}
                                    <div className="mb-2 flex flex-wrap gap-2">
                                        {groups.length > 0 && (
                                            <>
                                                {groups.map(group => {
                                                    const groupCompanies = companies.filter(c => c.group_id === group.id);
                                                    const allChecked = groupCompanies.length > 0 && groupCompanies.every(c => editingFolder.assigned_company_ids.includes(c.id));
                                                    return (
                                                        <button
                                                            key={group.id} type="button"
                                                            onClick={() => setEditingFolder(prev => ({ ...prev, assigned_company_ids: toggleGroup(prev.assigned_company_ids, group.id) }))}
                                                            className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-all flex items-center gap-2 ${allChecked ? 'bg-purple-100 text-purple-600 border-purple-200' : 'bg-gray-50 border-gray-100 text-gray-500 hover:bg-gray-100'}`}
                                                        >
                                                            {group.image_url ? (
                                                                <img src={group.image_url} alt="" className="w-4 h-4 rounded-full object-cover shadow-sm bg-white" />
                                                            ) : (
                                                                <Folder size={12} className={allChecked ? 'text-purple-500' : 'text-gray-400'} />
                                                            )}
                                                            <span>{group.name}</span>
                                                            {allChecked && <CheckCircle size={12} />}
                                                        </button>
                                                    )
                                                })}
                                            </>
                                        )}
                                    </div>


                                    <div
                                        className="h-48 overflow-y-auto border rounded-xl divide-y"
                                        style={{
                                            borderColor: isDark ? '#374151' : '#e5e7eb',
                                            backgroundColor: isDark ? '#1f2937' : '#ffffff'
                                        }}
                                    >
                                        {companies.filter(c => c.name.toLowerCase().includes(menuSearch.toLowerCase())).map(company => {
                                            const isSelected = editingFolder.assigned_company_ids.includes(company.id);
                                            return (
                                                <div
                                                    key={company.id}
                                                    onClick={() => setEditingFolder(prev => ({ ...prev, assigned_company_ids: toggleId(prev.assigned_company_ids, company.id) }))}
                                                    className="flex items-center gap-3 p-3 cursor-pointer transition-colors"
                                                    style={{
                                                        backgroundColor: isSelected ? (isDark ? 'rgba(59, 130, 246, 0.1)' : '#eff6ff') : 'transparent',
                                                        borderColor: isDark ? '#374151' : '#f3f4f6'
                                                    }}
                                                    onMouseEnter={e => e.currentTarget.style.backgroundColor = isDark ? 'rgba(59, 130, 246, 0.15)' : '#f0f9ff'}
                                                    onMouseLeave={e => e.currentTarget.style.backgroundColor = isSelected ? (isDark ? 'rgba(59, 130, 246, 0.1)' : '#eff6ff') : 'transparent'}
                                                >
                                                    <div
                                                        className="w-5 h-5 rounded border flex items-center justify-center transition-all"
                                                        style={{
                                                            backgroundColor: isSelected ? '#3b82f6' : 'transparent',
                                                            borderColor: isSelected ? '#3b82f6' : (isDark ? '#4b5563' : '#d1d5db')
                                                        }}
                                                    >
                                                        {isSelected && <CheckCircle size={14} className="text-white" />}
                                                    </div>

                                                    {/* Company Logo in List */}
                                                    <div
                                                        className="w-8 h-8 rounded-lg flex items-center justify-center overflow-hidden border"
                                                        style={{
                                                            backgroundColor: isDark ? '#374151' : '#ffffff',
                                                            borderColor: isDark ? '#4b5563' : '#e5e7eb'
                                                        }}
                                                    >
                                                        {(company.logo_url || company.avatar_url) ? (
                                                            <img src={company.logo_url || company.avatar_url} alt="" className="w-full h-full object-contain p-0.5" />
                                                        ) : (
                                                            <LucideIcons.Building2 size={16} style={{ color: isDark ? '#9ca3af' : '#9ca3af' }} />
                                                        )}
                                                    </div>

                                                    <div className="flex flex-col flex-1 min-w-0">
                                                        <span className="font-bold text-sm select-none truncate" style={{ color: isDark ? '#f3f4f6' : '#111827' }}>{company.name}</span>
                                                        {company.group_name && <span className="text-[10px] text-blue-500 font-bold uppercase tracking-tighter">{company.group_name}</span>}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>

                                <div className="flex justify-end gap-2 pt-2">
                                    <button type="button" onClick={() => setShowFolderModal(false)} className="px-4 py-2 text-gray-500 font-bold hover:bg-gray-100 rounded-lg">Cancelar</button>
                                    <button type="submit" className="px-6 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-500 shadow-lg shadow-blue-500/20">
                                        {editingFolder.originalName ? 'Guardar y Sincronizar' : 'Crear Carpeta'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* === MODAL: EDIT CLASS (COURSE) === */}
            {showCourseModal && (
                <div key={`course-modal-${isDark ? 'dark' : 'light'}`} className="fixed inset-0 z-[60] flex items-start sm:items-center justify-center p-2 sm:p-4 bg-black/40 backdrop-blur-sm animate-fade-in overflow-y-auto">
                    <div
                        className="w-full max-w-lg rounded-xl sm:rounded-xl lg:rounded-2xl shadow-lg border scale-in-center flex flex-col max-h-[90vh] sm:max-h-[85vh] my-4 overflow-hidden"
                        style={{
                            backgroundColor: isDark ? '#111827' : '#ffffff',
                            borderColor: isDark ? '#374151' : '#e5e7eb'
                        }}
                    >
                        <div
                            className="p-3 sm:p-4 lg:p-6 border-b flex justify-between items-start shrink-0"
                            style={{
                                backgroundColor: isDark ? '#1f2937' : '#f9fafb',
                                borderColor: isDark ? '#374151' : '#e5e7eb'
                            }}
                        >
                            <div>
                                <h3 className="font-black text-base sm:text-lg lg:text-xl uppercase tracking-tighter italic flex items-center gap-2" style={{ color: isDark ? '#ffffff' : '#111827' }}>
                                    <FileText className="text-blue-600 w-5 h-5 sm:w-6 sm:h-6" />
                                    {editingCourse ? 'Editar Clase' : 'Nueva Clase'}
                                </h3>
                                <p className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider sm:tracking-widest mt-0.5 sm:mt-1" style={{ color: isDark ? '#9ca3af' : '#6b7280' }}>Material educativo</p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setShowCourseModal(false)}
                                className="p-1.5 sm:p-2 rounded-lg sm:rounded-xl transition-all group"
                                style={{
                                    backgroundColor: isDark ? '#374151' : '#f3f4f6',
                                    color: '#9ca3af'
                                }}
                            >
                                <X size={16} className="sm:w-5 sm:h-5 group-hover:rotate-90 transition-transform" />
                            </button>
                        </div>

                        <div className="overflow-y-auto custom-scrollbar flex-1" style={{ backgroundColor: isDark ? '#111827' : '#ffffff' }}>
                            <form onSubmit={handleSaveCourse} className="p-4 sm:p-6 lg:p-8 space-y-4 sm:space-y-6">
                                {/* Title First */}
                                <div className="space-y-2 sm:space-y-3">
                                    <div className="flex justify-between items-end">
                                        <label className="text-[9px] sm:text-[10px] font-black uppercase tracking-wide sm:tracking-widest" style={{ color: isDark ? '#9ca3af' : '#6b7280' }}>Nombre</label>
                                        <span className="text-[9px] sm:text-[10px] font-bold text-blue-500">Requerido</span>
                                    </div>
                                    <input
                                        autoFocus type="text" required
                                        className="w-full text-base sm:text-lg lg:text-xl font-black p-3 sm:p-4 border-2 rounded-xl sm:rounded-xl outline-none transition-all"
                                        style={{
                                            backgroundColor: isDark ? '#374151' : '#ffffff',
                                            borderColor: isDark ? '#4b5563' : '#e5e7eb',
                                            color: isDark ? '#ffffff' : '#111827'
                                        }}
                                        value={courseFormData.title}
                                        onChange={e => setCourseFormData({ ...courseFormData, title: e.target.value })}
                                        placeholder="Ej: Introducción a la Auditoría"
                                    />
                                </div>

                                {/* Icon Selector Second */}
                                <div>
                                    <IconSelector
                                        selectedIcon={courseFormData.icon_name}
                                        onSelect={(icon) => setCourseFormData({ ...courseFormData, icon_name: icon })}
                                    />
                                </div>

                                {/* Parent Folder (Read Only) */}
                                <div
                                    className="p-4 rounded-xl border-2 border-dashed flex items-center gap-4"
                                    style={{
                                        backgroundColor: isDark ? '#374151' : '#f9fafb',
                                        borderColor: isDark ? '#4b5563' : '#e5e7eb'
                                    }}
                                >
                                    <div
                                        className="w-10 h-10 rounded-xl flex items-center justify-center text-blue-500 shadow-sm border"
                                        style={{
                                            backgroundColor: isDark ? '#1f2937' : '#ffffff',
                                            borderColor: isDark ? '#4b5563' : '#e5e7eb'
                                        }}
                                    >
                                        <Folder size={20} />
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: isDark ? '#9ca3af' : '#6b7280' }}>Carpeta Contenedora</p>
                                        <p className="font-black" style={{ color: isDark ? '#ffffff' : '#111827' }}>{courseFormData.folder}</p>
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <label className="text-[10px] font-black uppercase tracking-widest" style={{ color: isDark ? '#9ca3af' : '#6b7280' }}>Archivo de Contenido</label>
                                    <label
                                        className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed rounded-xl cursor-pointer transition-all group"
                                        style={{
                                            backgroundColor: isDark ? '#1f2937' : '#ffffff',
                                            borderColor: isDark ? '#4b5563' : '#e5e7eb'
                                        }}
                                    >
                                        <div
                                            className="p-4 rounded-full mb-3 group-hover:scale-110 transition-transform"
                                            style={{ backgroundColor: isDark ? 'rgba(59, 130, 246, 0.2)' : '#eff6ff' }}
                                        >
                                            <Upload className="text-blue-500" size={24} />
                                        </div>
                                        <p className="text-xs font-black uppercase tracking-tighter" style={{ color: isDark ? '#ffffff' : '#111827' }}>
                                            {courseFormData.file ? courseFormData.file.name : (editingCourse?.file_url ? 'Cambiar archivo actual' : 'Seleccionar PDF o Imagen')}
                                        </p>
                                        <p className="text-[10px] font-bold mt-1" style={{ color: '#9ca3af' }}>Arrastra aquí o haz clic para buscar</p>
                                        <input type="file" className="hidden" onChange={e => setCourseFormData({ ...courseFormData, file: e.target.files[0] })} />
                                    </label>
                                </div>

                                {/* Permissions */}
                                <div>
                                    <div className="flex justify-between items-center mb-2">
                                        <label className="block text-xs font-black uppercase tracking-widest" style={{ color: isDark ? '#9ca3af' : '#6b7280' }}>Empresas con Acceso</label>
                                        <button type="button" onClick={() => setCourseFormData(prev => ({ ...prev, showPerms: !prev.showPerms }))} className="text-xs text-blue-500 font-bold hover:underline">
                                            {courseFormData.showPerms ? 'Ocultar' : 'Personalizar'}
                                        </button>
                                    </div>

                                    {(courseFormData.showPerms || courseFormData.assigned_company_ids.length > 0) && (
                                        <div
                                            className="h-32 overflow-y-auto border rounded-xl divide-y p-1"
                                            style={{
                                                backgroundColor: isDark ? '#1f2937' : '#ffffff',
                                                borderColor: isDark ? '#374151' : '#e5e7eb'
                                            }}
                                        >
                                            {companies.map(c => (
                                                <label
                                                    key={c.id}
                                                    className="flex items-center gap-2 p-2 rounded cursor-pointer transition-colors"
                                                    style={{ backgroundColor: 'transparent' }}
                                                    onMouseEnter={e => e.currentTarget.style.backgroundColor = isDark ? '#374151' : '#f9fafb'}
                                                    onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                                                >
                                                    <input
                                                        type="checkbox"
                                                        className="w-4 h-4 rounded text-blue-500"
                                                        style={{ borderColor: isDark ? '#4b5563' : '#d1d5db' }}
                                                        checked={courseFormData.assigned_company_ids.includes(c.id)}
                                                        onChange={() => setCourseFormData(prev => ({ ...prev, assigned_company_ids: toggleId(prev.assigned_company_ids, c.id) }))}
                                                    />
                                                    <div
                                                        className="w-6 h-6 rounded flex items-center justify-center overflow-hidden"
                                                        style={{
                                                            backgroundColor: isDark ? '#374151' : '#ffffff',
                                                            border: `1px solid ${isDark ? '#4b5563' : '#e5e7eb'}`
                                                        }}
                                                    >
                                                        {(c.logo_url || c.avatar_url) ? (
                                                            <img src={c.logo_url || c.avatar_url} alt="" className="w-full h-full object-contain" />
                                                        ) : (
                                                            <LucideIcons.Building2 size={12} style={{ color: '#9ca3af' }} />
                                                        )}
                                                    </div>
                                                    <span className="text-sm font-bold truncate" style={{ color: isDark ? '#f3f4f6' : '#111827' }}>{c.name}</span>
                                                </label>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                <div className="flex justify-end gap-2 pt-4 border-t">
                                    <button type="button" onClick={() => setShowCourseModal(false)} className="px-4 py-2 text-gray-500 font-bold hover:bg-gray-100 rounded-lg">Cancelar</button>
                                    <button type="submit" className="px-6 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-500 shadow-lg shadow-blue-500/20">
                                        Guardar Clase
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* === MODAL: PREVIEW SELECTOR === */}
            {showPreviewModal && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fade-in">
                    <div className="w-full max-w-lg bg-white dark:bg-gray-900 rounded-xl shadow-lg border border-gray-200 dark:border-gray-800 flex flex-col max-h-[90vh]">
                        <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-gray-50 dark:bg-gray-800 shrink-0">
                            <div>
                                <h3 className="font-black text-lg uppercase flex items-center gap-2">
                                    <Eye className="text-blue-500" />
                                    Simulación de Estudiante
                                </h3>
                            </div>
                            <button
                                type="button"
                                onClick={() => setShowPreviewModal(false)}
                                className="p-2 rounded-full bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 transition-colors text-gray-500 hover:text-red-500 dark:text-gray-300"
                            >
                                <X size={20} />
                            </button>
                        </div>
                        <div className="overflow-y-auto p-6">
                            <div className="bg-gray-100 dark:bg-gray-800 px-3 py-2 rounded-xl flex items-center gap-2 mb-4">
                                <Search size={16} className="opacity-50 dark:text-gray-400" />
                                <input className="bg-transparent text-sm outline-none w-full font-bold text-gray-900 dark:text-gray-100 placeholder-gray-500" placeholder="Buscar empresa..." value={menuSearch} onChange={e => setMenuSearch(e.target.value)} autoFocus />
                            </div>
                            <div className="h-64 overflow-y-auto border rounded-xl divide-y dark:border-gray-700">
                                {companies.filter(c => c.name.toLowerCase().includes(menuSearch.toLowerCase())).map(company => (
                                    <button key={company.id} onClick={() => { onPreview(company.id); setShowPreviewModal(false); }} className="w-full flex items-center justify-between p-4 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors group text-left">
                                        <span className="font-bold text-sm">{company.name}</span>
                                        <div className="p-2 rounded-full bg-white dark:bg-gray-800 text-gray-300 group-hover:text-blue-500 shadow-sm transition-colors"><Play size={16} fill="currentColor" /></div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
        </div>
    );
}
