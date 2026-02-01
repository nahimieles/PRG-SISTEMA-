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
            <div className="flex flex-col md:flex-row justify-between items-center p-6 rounded-xl border gap-4" style={{ background: theme.surface, borderColor: theme.border }}>
                <div className="flex items-center gap-4">
                    <div className="p-3 rounded-lg bg-blue-500/10 text-blue-500">
                        <Layers size={24} />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold" style={{ color: theme.text }}>Gestión de Material</h2>
                        <p style={{ color: theme.textSecondary }}>Biblioteca Global de Conocimiento</p>
                    </div>
                </div>

                {/* Preview Trigger */}
                <button
                    onClick={() => {
                        // 1. Find Context
                        let relevantCourses = courses;
                        if (currentFolder) {
                            relevantCourses = courses.filter(c => getFolderFromDescription(c.description) === currentFolder);
                        }

                        // 2. Extract Valid IDs
                        const validIds = new Set();
                        relevantCourses.forEach(c => {
                            if (c.assigned_company_ids && Array.isArray(c.assigned_company_ids)) {
                                c.assigned_company_ids.forEach(id => validIds.add(id));
                            }
                        });


                        // 3. Decide
                        if (validIds.size > 0) {
                            const firstId = [...validIds][0];
                            const companyName = companies.find(c => c.id === firstId)?.name;
                            showToast(`Simulando vista como: ${companyName || 'Empresa'}`);
                            onPreview(firstId);
                        } else {
                            // If no context, Open Global Preview (Admin View)
                            showToast('Modo Vista Global (Sin filtro de empresa)', 'info');
                            onPreview(null);
                        }
                    }}
                    className="flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm transition-all bg-gray-100 hover:bg-gray-200 text-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700 hover:scale-105 active:scale-95"
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
                    <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2 text-xl font-bold" style={{ color: theme.text }}>
                            <button
                                onClick={() => setCurrentFolder(null)}
                                className={`hover:text-blue-500 transition-colors flex items-center gap-2 ${!currentFolder ? 'text-blue-600 cursor-default' : 'text-gray-400'}`}
                            >
                                <Layers size={24} /> Módulos
                            </button>
                            {currentFolder && (
                                <>
                                    <ChevronLeft size={20} className="text-gray-300 rotate-180" />
                                    <span className="text-blue-600 flex items-center gap-2">
                                        <Folder size={24} /> {currentFolder}
                                    </span>
                                </>
                            )}
                        </div>

                        <div>
                            {!currentFolder ? (
                                <button
                                    onClick={() => handleOpenFolderModal()}
                                    className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold shadow-lg shadow-blue-500/20 flex items-center gap-2 transition-all"
                                >
                                    <FolderPlus size={18} /> NUEVA CARPETA
                                </button>
                            ) : (
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => handleOpenFolderModal(currentFolder)}
                                        className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-bold flex items-center gap-2 transition-all"
                                    >
                                        <Settings size={18} /> CONFIGURAR CARPETA
                                    </button>
                                    <button
                                        onClick={() => handleOpenCourseModal()}
                                        className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold shadow-lg shadow-blue-500/20 flex items-center gap-2 transition-all"
                                    >
                                        <Plus size={18} /> NUEVA CLASE
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* ROOT: FOLDER GRID */}
                    {!currentFolder && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                            {folders.map(folder => {
                                const count = courses.filter(c => getFolderFromDescription(c.description) === folder).length;
                                // Find permissions summary from first course
                                const firstCourse = courses.find(c => getFolderFromDescription(c.description) === folder);
                                const permCount = firstCourse?.assigned_company_ids?.length || 0;

                                return (
                                    <div
                                        key={folder}
                                        onClick={() => setCurrentFolder(folder)}
                                        className="group relative p-8 rounded-2xl border transition-all hover:scale-[1.02] active:scale-100 cursor-pointer flex flex-col items-start gap-4 shadow-sm hover:shadow-xl hover:border-blue-500/30 bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900"
                                        style={{ borderColor: theme.border, background: theme.surface }}
                                    >
                                        <div className="w-14 h-14 rounded-2xl bg-blue-500/10 text-blue-500 flex items-center justify-center group-hover:bg-blue-500 group-hover:text-white transition-all shadow-inner">
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

                    {/* FOLDER CONTENT: FILE LIST */}
                    {currentFolder && (
                        <div className="rounded-2xl border overflow-hidden shadow-sm animate-fade-in" style={{ borderColor: theme.border, background: theme.surface }}>
                            <div className="grid grid-cols-12 gap-4 p-4 border-b text-xs font-black uppercase tracking-widest opacity-50" style={{ borderColor: theme.border, color: theme.text }}>
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
                                    {courses.filter(c => getFolderFromDescription(c.description) === currentFolder).map((course) => {
                                        const Icon = course.icon_name && LucideIcons[course.icon_name] ? LucideIcons[course.icon_name] : FileText;
                                        const accessCount = course.assigned_company_ids?.length || 0;

                                        return (
                                            <SortableItem key={course.id} id={course.id}>
                                                <div className="grid grid-cols-12 gap-4 p-4 items-center hover:bg-black/[0.02] transition-colors border-b last:border-0 bg-white dark:bg-transparent" style={{ borderColor: theme.border }}>
                                                    <div className="col-span-1 flex justify-center text-blue-500 opacity-80 cursor-grab active:cursor-grabbing">
                                                        <Icon size={20} />
                                                    </div>
                                                    <div className="col-span-6 min-w-0">
                                                        <h4 className="font-bold text-sm truncate" style={{ color: theme.text }}>{course.title}</h4>
                                                        <p className="text-[10px] font-mono opacity-40 truncate">{course.file_url ? course.file_url.split('/').pop() : '...'}</p>
                                                    </div>
                                                    <div className="col-span-3 flex justify-center">
                                                        {accessCount === 0 ? (
                                                            <span className="px-2 py-1 rounded text-[10px] font-bold bg-red-100 text-red-600">Sin Acceso</span>
                                                        ) : (
                                                            <span className="px-2 py-1 rounded text-[10px] font-bold bg-green-100 text-green-600 flex items-center gap-1">
                                                                <CheckCircle size={10} /> {accessCount} Empresas
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="col-span-2 flex justify-end gap-1">
                                                        <button
                                                            onPointerDown={(e) => e.stopPropagation()} // Prevent drag start
                                                            onClick={() => handleOpenCourseModal(course)}
                                                            className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg"
                                                        >
                                                            <Edit2 size={16} />
                                                        </button>
                                                        <button
                                                            onPointerDown={(e) => e.stopPropagation()}
                                                            onClick={() => handleDeleteCourse(course.id)}
                                                            className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </div>
                                                </div>
                                            </SortableItem>
                                        );
                                    })}
                                </SortableContext>
                            </DndContext>
                        </div>
                    )}
                </div>
            )}

            {/* === MODAL: EDIT FOLDER & PERMISSIONS === */}
            {showFolderModal && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fade-in">
                    <div className="w-full max-w-lg bg-white dark:bg-gray-900 rounded-2xl shadow-2xl overflow-hidden border border-gray-200 dark:border-gray-800">
                        <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-gray-50 dark:bg-gray-800">
                            <h3 className="font-black text-lg uppercase flex items-center gap-2">
                                <Folder className="text-blue-500" />
                                {editingFolder?.originalName ? 'Configurar Carpeta' : 'Nueva Carpeta'}
                            </h3>
                            <button onClick={() => setShowFolderModal(false)}><X className="opacity-50 hover:opacity-100" /></button>
                        </div>

                        <form onSubmit={handleSaveFolder} className="p-6 space-y-6">
                            {/* Name */}
                            <div>
                                <label className="block text-xs font-black uppercase tracking-widest opacity-50 mb-2">Nombre del Módulo</label>
                                <input
                                    autoFocus type="text" required
                                    className="w-full text-lg font-bold p-3 border-2 rounded-xl focus:border-blue-500 outline-none bg-transparent"
                                    placeholder="Ej: Contabilidad 2024"
                                    value={editingFolder.name}
                                    onChange={e => setEditingFolder(prev => ({ ...prev, name: e.target.value }))}
                                />
                            </div>

                            {/* Batch Permissions */}
                            <div className="border-t pt-4">
                                <div className="flex justify-between items-center mb-3">
                                    <label className="block text-xs font-black uppercase tracking-widest opacity-50">Acceso Global (Todas las clases)</label>
                                    <div className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded flex items-center gap-2">
                                        <Search size={12} className="opacity-50" />
                                        <input className="bg-transparent text-xs outline-none w-24" placeholder="Buscar..." value={menuSearch} onChange={e => setMenuSearch(e.target.value)} />
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
                                                        className={`px-3 py-1 rounded-full text-xs font-bold border transition-colors ${allChecked ? 'bg-purple-100 text-purple-600 border-purple-200' : 'bg-gray-50 border-gray-100 text-gray-500'}`}
                                                    >
                                                        {allChecked ? '✓' : ''} Grupo {group.name}
                                                    </button>
                                                )
                                            })}
                                        </>
                                    )}
                                </div>


                                <div className="h-48 overflow-y-auto border rounded-xl divide-y dark:border-gray-700">
                                    {companies.filter(c => c.name.toLowerCase().includes(menuSearch.toLowerCase())).map(company => {
                                        const isSelected = editingFolder.assigned_company_ids.includes(company.id);
                                        return (
                                            <div
                                                key={company.id}
                                                onClick={() => setEditingFolder(prev => ({ ...prev, assigned_company_ids: toggleId(prev.assigned_company_ids, company.id) }))}
                                                className={`flex items-center gap-3 p-3 cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors ${isSelected ? 'bg-blue-50 dark:bg-blue-900/10' : ''}`}
                                            >
                                                <div className={`w-5 h-5 rounded border flex items-center justify-center ${isSelected ? 'bg-blue-500 border-blue-500' : 'border-gray-300'}`}>
                                                    {isSelected && <CheckCircle size={14} className="text-white" />}
                                                </div>
                                                <span className="font-bold text-sm select-none">{company.name}</span>
                                                {company.group_name && <span className="text-[10px] bg-gray-100 px-2 rounded-full text-gray-500">{company.group_name}</span>}
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
            )}

            {/* === MODAL: EDIT CLASS (COURSE) === */}
            {showCourseModal && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fade-in">
                    <div className="w-full max-w-lg bg-white dark:bg-gray-900 rounded-2xl shadow-2xl overflow-hidden border border-gray-200 dark:border-gray-800 scale-in-center">
                        <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-gray-50 dark:bg-gray-800">
                            <h3 className="font-black text-lg uppercase flex items-center gap-2">
                                <FileText className="text-blue-500" />
                                {editingCourse ? 'Editar Clase' : 'Nueva Clase'}
                            </h3>
                            <button onClick={() => setShowCourseModal(false)}><X className="opacity-50 hover:opacity-100" /></button>
                        </div>

                        <form onSubmit={handleSaveCourse} className="p-6 space-y-5">
                            <div>
                                <label className="block text-xs font-black uppercase tracking-widest opacity-50 mb-2">Nombre de la Clase</label>
                                <input
                                    type="text" required
                                    className="w-full text-lg font-bold p-3 border-2 rounded-xl focus:border-blue-500 outline-none bg-transparent"
                                    value={courseFormData.title}
                                    onChange={e => setCourseFormData({ ...courseFormData, title: e.target.value })}
                                    placeholder="Ej: Introducción a..."
                                />
                            </div>

                            {/* Parent Folder (Read Only or Selectable) */}
                            <div className="flex items-center gap-2 p-3 bg-gray-100 dark:bg-gray-800 rounded-xl border border-dashed">
                                <Folder className="text-gray-400" size={20} />
                                <div className="flex-1">
                                    <p className="text-xs font-bold opacity-50 uppercase">Carpeta contenedora</p>
                                    <p className="font-bold">{courseFormData.folder}</p>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-black uppercase tracking-widest opacity-50 mb-2">Archivo</label>
                                <label className="flex items-center justify-center w-full h-32 border-2 border-dashed rounded-xl cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-900/10 transition-colors">
                                    <div className="text-center">
                                        <Upload className="mx-auto text-gray-300 mb-2" />
                                        <p className="text-xs font-bold text-gray-400">
                                            {courseFormData.file ? courseFormData.file.name : (editingCourse?.file_url ? 'Cambiar archivo actual' : 'Subir archivo')}
                                        </p>
                                    </div>
                                    <input type="file" className="hidden" onChange={e => setCourseFormData({ ...courseFormData, file: e.target.files[0] })} />
                                </label>
                            </div>

                            {/* Permissions */}
                            <div>
                                <div className="flex justify-between items-center mb-2">
                                    <label className="block text-xs font-black uppercase tracking-widest opacity-50">Empresas con Acceso</label>
                                    <button type="button" onClick={() => setCourseFormData(prev => ({ ...prev, showPerms: !prev.showPerms }))} className="text-xs text-blue-500 font-bold hover:underline">
                                        {courseFormData.showPerms ? 'Ocultar' : 'Personalizar'}
                                    </button>
                                </div>

                                {(courseFormData.showPerms || courseFormData.assigned_company_ids.length > 0) && (
                                    <div className="h-32 overflow-y-auto border rounded-xl divide-y p-1">
                                        {companies.map(c => (
                                            <label key={c.id} className="flex items-center gap-2 p-2 hover:bg-gray-50 dark:hover:bg-gray-800 rounded cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={courseFormData.assigned_company_ids.includes(c.id)}
                                                    onChange={() => setCourseFormData(prev => ({ ...prev, assigned_company_ids: toggleId(prev.assigned_company_ids, c.id) }))}
                                                />
                                                <span className="text-sm font-bold">{c.name}</span>
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
            )}

            {/* === MODAL: PREVIEW SELECTOR === */}
            {showPreviewModal && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fade-in">
                    <div className="w-full max-w-lg bg-white dark:bg-gray-900 rounded-2xl shadow-2xl overflow-hidden border border-gray-200 dark:border-gray-800">
                        <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-gray-50 dark:bg-gray-800">
                            <div>
                                <h3 className="font-black text-lg uppercase flex items-center gap-2">
                                    <Eye className="text-blue-500" />
                                    Simulación de Estudiante
                                </h3>
                            </div>
                            <button onClick={() => setShowPreviewModal(false)}><X className="opacity-50 hover:opacity-100" /></button>
                        </div>
                        <div className="p-6">
                            <div className="bg-gray-100 dark:bg-gray-800 px-3 py-2 rounded-xl flex items-center gap-2 mb-4">
                                <Search size={16} className="opacity-50" />
                                <input className="bg-transparent text-sm outline-none w-full font-bold" placeholder="Buscar empresa..." value={menuSearch} onChange={e => setMenuSearch(e.target.value)} autoFocus />
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
