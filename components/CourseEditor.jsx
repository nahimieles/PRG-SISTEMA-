'use client';

import React, { useState, useEffect } from 'react';
import * as LucideIcons from 'lucide-react';
import { Plus, Edit2, Trash2, X, Upload, Save, Eye, Users, FileText, Image as ImageIcon, ChevronUp, ChevronDown, ChevronLeft, Folder, CheckCircle } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { lightTheme, darkTheme } from '../lib/colors';
import {
    getCourses,
    createCourse,
    updateCourse,
    deleteCourse,
    getCompanies,
    uploadFile
} from '../lib/auth';

import IconSelector from './IconSelector';
import Toast from './Toast';

export default function CourseEditor({ onPreview }) {
    const { isDark } = useTheme();
    const theme = isDark ? darkTheme : lightTheme;

    const [courses, setCourses] = useState([]);
    const [companies, setCompanies] = useState([]);
    const [loading, setLoading] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [editingCourse, setEditingCourse] = useState(null);

    // State for 3-level Drill-down: Groups → Companies → Courses
    const [expandedGroup, setExpandedGroup] = useState(null);
    const [expandedCompany, setExpandedCompany] = useState(null);
    const [companyCourses, setCompanyCourses] = useState([]);

    // Group definitions
    const groups = [
        { id: 'contabilidad', name: 'Contabilidad', color: 'green', filter: (c) => c.type === 'contabilidad' && !c.name.toUpperCase().includes('PRG') },
        { id: 'auditoria', name: 'Auditoría', color: 'blue', filter: (c) => c.type === 'auditoria' && !c.name.toUpperCase().includes('PRG') }
    ];

    const prgCompany = companies.find(c => c.name.toUpperCase().includes('PRG'));

    const handleGroupClick = (groupId) => {
        setExpandedGroup(groupId);
        setExpandedCompany(null);
        setCompanyCourses([]);
    };

    const handleBackToGroups = () => {
        setExpandedGroup(null);
        setExpandedCompany(null);
        setCompanyCourses([]);
    };

    const handleCompanyClick = (companyId) => {
        if (expandedCompany === companyId) {
            setExpandedCompany(null);
            setCompanyCourses([]);
        } else {
            setExpandedCompany(companyId);
            loadCompanySpecificCourses(companyId);
        }
    };

    const handleBackToCompanies = () => {
        setExpandedCompany(null);
        setCompanyCourses([]);
    };

    const loadCompanySpecificCourses = async (companyId) => {
        setLoading(true);
        const { getCompanyCourses } = await import('../lib/auth');
        const ordered = await getCompanyCourses(companyId);
        setCompanyCourses(ordered);
        setLoading(false);
    };

    const moveCourse = async (index, direction) => {
        if (!expandedCompany) return;
        const newCourses = [...companyCourses];
        if (direction === 'up' && index > 0) {
            [newCourses[index], newCourses[index - 1]] = [newCourses[index - 1], newCourses[index]];
        } else if (direction === 'down' && index < newCourses.length - 1) {
            [newCourses[index], newCourses[index + 1]] = [newCourses[index + 1], newCourses[index]];
        } else return;

        setCompanyCourses(newCourses);
        const { updateCourseOrder } = await import('../lib/auth');
        await updateCourseOrder(expandedCompany, newCourses);
    };

    const [formData, setFormData] = useState({
        title: '',
        description: '',
        file: null,
        cover: null,
        assigned_company_ids: [],
        icon_name: 'FileText'
    });

    const [toast, setToast] = useState(null);
    const showToast = (message, type = 'success') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 3000);
    };

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        const [coursesData, companiesData] = await Promise.all([
            getCourses(),
            getCompanies()
        ]);
        setCourses(coursesData);
        setCompanies(companiesData);
        setLoading(false);
    };

    const resetForm = () => {
        setFormData({
            title: '',
            description: '',
            file: null,
            cover: null,
            assigned_company_ids: [],
            icon_name: 'FileText'
        });
        setEditingCourse(null);
    };

    const handleOpenModal = (course = null) => {
        if (course) {
            setEditingCourse(course);
            setFormData({
                title: course.title,
                description: course.description || '',
                file: null,
                cover: null,
                assigned_company_ids: course.assigned_company_ids || [],
                icon_name: course.icon_name || 'FileText'
            });
        } else {
            resetForm();
        }
        setShowModal(true);
    };

    const [searchTerm, setSearchTerm] = useState('');
    const filteredCompanies = companies.filter(c => c.name.toLowerCase().includes(searchTerm.toLowerCase()));
    const filteredCourses = companyCourses.filter(c => c.title.toLowerCase().includes(searchTerm.toLowerCase()));

    const handleDelete = async (id) => {
        if (!confirm('¿Estás seguro de eliminar este curso?')) return;
        setLoading(true);
        try {
            const result = await deleteCourse(id);
            if (!result.success) throw new Error(result.error);
            showToast('Curso eliminado correctamente.');
            loadData();
            if (expandedCompany) loadCompanySpecificCourses(expandedCompany);
        } catch (error) {
            showToast(error.message, 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            let fileUrl = editingCourse?.file_url;
            if (formData.file) {
                const uploadRes = await uploadFile(formData.file, 'course-doc');
                if (!uploadRes.success) throw new Error(uploadRes.error);
                fileUrl = uploadRes.fileUrl;
            } else if (!editingCourse) {
                throw new Error('Debes subir un archivo para el curso (PDF o Imagen).');
            }

            const courseData = {
                title: formData.title,
                description: '',
                file_url: fileUrl,
                cover_image: null,
                assigned_company_ids: editingCourse ? (editingCourse.assigned_company_ids || [expandedCompany]) : [expandedCompany],
                icon_name: formData.icon_name || 'FileText'
            };

            let result;
            if (editingCourse) {
                result = await updateCourse(editingCourse.id, courseData);
            } else {
                result = await createCourse(courseData);
            }

            if (!result.success) throw new Error(result.error);

            setShowModal(false);
            resetForm();
            loadData();
            if (expandedCompany) loadCompanySpecificCourses(expandedCompany);
            showToast('Curso guardado correctamente.');
        } catch (error) {
            showToast(error.message, 'error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="animate-fade-in space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-center p-6 rounded-xl border gap-4" style={{ background: theme.surface, borderColor: theme.border }}>
                <div>
                    <h2 className="text-2xl font-bold" style={{ color: theme.text }}>Gestión de Cursos</h2>
                    <p style={{ color: theme.textSecondary }}>Administra el material educativo</p>
                </div>

                {(expandedGroup || expandedCompany) && (
                    <div className="relative w-full md:w-64">
                        <input
                            type="text"
                            placeholder={expandedCompany ? "Buscar curso..." : "Buscar empresa..."}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full border rounded-lg pl-10 pr-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all shadow-sm"
                            style={{
                                background: isDark ? 'rgba(0,0,0,0.2)' : '#fff',
                                borderColor: theme.border,
                                color: theme.text
                            }}
                        />
                        <LucideIcons.Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
                    </div>
                )}
            </div>

            {loading && !showModal && <div className="text-center py-10 text-gray-400 animate-pulse">Cargando datos...</div>}

            {!expandedGroup && !expandedCompany && (
                <div className="space-y-8">
                    {prgCompany && (
                        <div>
                            <h3 className="text-lg font-bold mb-4 flex items-center gap-2" style={{ color: isDark ? '#fbbf24' : '#d97706' }}>
                                <Users size={20} />
                                Empresa Principal
                            </h3>
                            <button
                                onClick={() => {
                                    setExpandedCompany(prgCompany.id);
                                    loadCompanySpecificCourses(prgCompany.id);
                                }}
                                className="w-full bg-gradient-to-br from-amber-500/10 to-orange-500/10 p-6 rounded-2xl border border-amber-500/30 hover:border-amber-500/50 shadow-lg hover:shadow-amber-500/20 transition-all duration-300 text-left group"
                            >
                                <div className="flex items-center gap-6">
                                    {prgCompany.avatar_url ? (
                                        <div className="w-16 h-16 rounded-2xl overflow-hidden border-2 border-amber-500/50 shadow-lg group-hover:scale-110 transition-transform">
                                            <img src={prgCompany.avatar_url} alt={prgCompany.name} className="w-full h-full object-cover" />
                                        </div>
                                    ) : (
                                        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-transform">
                                            <Users size={32} />
                                        </div>
                                    )}
                                    <div className="flex-1">
                                        <h3 className="text-2xl font-bold" style={{ color: theme.text }}>{prgCompany.name}</h3>
                                        <p className="text-sm uppercase tracking-wide opacity-60" style={{ color: theme.text }}>{prgCompany.type}</p>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <span className="px-4 py-1.5 rounded-full border bg-black/5 border-black/10 text-sm font-bold" style={{ color: theme.text }}>
                                            {courses.filter(c => c.assigned_company_ids?.includes(prgCompany.id)).length} cursos
                                        </span>
                                        <ChevronLeft size={24} className="text-gray-400 rotate-180" />
                                    </div>
                                </div>
                            </button>
                        </div>
                    )}

                    <div>
                        <h3 className="text-lg font-bold mb-4 flex items-center gap-2" style={{ color: theme.textSecondary }}>
                            <Folder size={20} />
                            Grupos de Empresas
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {groups.map(group => {
                                const groupCompanies = companies.filter(group.filter);
                                const totalCourses = courses.filter(c =>
                                    groupCompanies.some(company => c.assigned_company_ids?.includes(company.id))
                                ).length;

                                const colorClasses = {
                                    green: { bg: 'bg-green-500/10', text: 'text-green-600 dark:text-green-400', hover: 'hover:border-green-500/50 hover:shadow-green-500/10' },
                                    blue: { bg: 'bg-blue-500/10', text: 'text-blue-600 dark:text-blue-400', hover: 'hover:border-blue-500/50 hover:shadow-blue-500/10' }
                                }[group.color];

                                return (
                                    <button
                                        key={group.id}
                                        onClick={() => handleGroupClick(group.id)}
                                        className={`group flex flex-col items-center p-10 border rounded-2xl ${colorClasses.hover} transition-all duration-300 shadow-lg text-center`}
                                        style={{ background: theme.surface, borderColor: theme.border }}
                                    >
                                        <div className={`w-24 h-24 rounded-full ${colorClasses.bg} ${colorClasses.text} flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300 shadow-inner`}>
                                            <Users size={40} />
                                        </div>
                                        <h3 className={`text-xl font-bold mb-3 group-hover:${colorClasses.text} transition-colors uppercase`} style={{ color: theme.text }}>{group.name}</h3>
                                        <div className="flex gap-3 text-xs font-bold opacity-70">
                                            <span className="px-3 py-1 rounded-full border border-black/5 bg-black/5" style={{ color: theme.textSecondary }}>
                                                {groupCompanies.length} empresas
                                            </span>
                                            <span className="px-3 py-1 rounded-full border border-black/5 bg-black/5" style={{ color: theme.textSecondary }}>
                                                {totalCourses} cursos
                                            </span>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}

            {expandedGroup && !expandedCompany && (() => {
                const currentGroup = groups.find(g => g.id === expandedGroup);
                const groupCompanies = filteredCompanies.filter(currentGroup.filter);
                const colorClasses = {
                    green: { bg: 'bg-green-500/10', text: 'text-green-600 dark:text-green-400', hover: 'hover:border-green-500/50 hover:shadow-green-500/10' },
                    blue: { bg: 'bg-blue-500/10', text: 'text-blue-600 dark:text-blue-400', hover: 'hover:border-blue-500/50 hover:shadow-blue-500/10' }
                }[currentGroup.color];

                return (
                    <div className="animate-fade-in space-y-6">
                        <div className="flex items-center gap-4 pb-4 border-b" style={{ borderColor: theme.border }}>
                            <button
                                onClick={handleBackToGroups}
                                className="p-2 hover:bg-black/5 rounded-full transition-colors text-gray-400 hover:text-black"
                            >
                                <ChevronLeft size={24} />
                            </button>
                            <div>
                                <h3 className={`text-xl font-bold uppercase ${colorClasses.text} flex items-center gap-2 tracking-tight`}>
                                    <Folder size={20} />
                                    {currentGroup.name}
                                </h3>
                                <p className="text-xs font-bold opacity-60" style={{ color: theme.text }}>{groupCompanies.length} empresas en este grupo</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                            {groupCompanies.map(company => {
                                const assignedCount = courses.filter(c => c.assigned_company_ids?.includes(company.id)).length;
                                return (
                                    <button
                                        key={company.id}
                                        onClick={() => handleCompanyClick(company.id)}
                                        className={`group flex flex-col items-center p-8 border rounded-2xl ${colorClasses.hover} transition-all duration-300 shadow-lg text-center relative overflow-hidden`}
                                        style={{ background: theme.surface, borderColor: theme.border }}
                                    >
                                        <div className={`w-20 h-20 rounded-2xl ${colorClasses.bg} ${colorClasses.text} flex items-center justify-center mb-4 group-hover:scale-105 transition-transform shadow-inner overflow-hidden border-2 ${colorClasses.hover.split(' ')[0].replace('hover:', '')}`}>
                                            {company.avatar_url ? (
                                                <img src={company.avatar_url} alt={company.name} className="w-full h-full object-cover" />
                                            ) : (
                                                <Users size={32} />
                                            )}
                                        </div>
                                        <h3 className="text-xl font-bold mb-2 group-hover:text-blue-500 transition-colors" style={{ color: theme.text }}>{company.name}</h3>
                                        <p className="text-xs font-bold px-4 py-1.5 rounded-full border bg-black/5 border-black/10" style={{ color: theme.textSecondary }}>
                                            {assignedCount} {assignedCount === 1 ? 'CURSO' : 'CURSOS'}
                                        </p>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                );
            })()}

            {expandedCompany && (
                <div className="animate-fade-in space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-4 mb-6 pb-4 border-b" style={{ borderColor: theme.border }}>
                        <div className="flex items-center gap-4">
                            <button
                                onClick={handleBackToCompanies}
                                className="p-2 hover:bg-black/5 rounded-full transition-colors text-gray-400 hover:text-black"
                            >
                                <ChevronLeft size={24} />
                            </button>
                            <div>
                                <h3 className="text-xl font-bold uppercase flex items-center gap-2 tracking-tight" style={{ color: theme.text }}>
                                    <Users size={24} className="text-blue-500" />
                                    {companies.find(c => c.id === expandedCompany)?.name}
                                </h3>
                                <p className="text-xs font-bold opacity-60" style={{ color: theme.text }}>Gestionar material para esta empresa</p>
                            </div>
                        </div>

                        <div className="flex gap-3">
                            {onPreview && (
                                <button
                                    onClick={() => onPreview(expandedCompany)}
                                    className="px-6 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-xl flex items-center gap-2 transition-all font-bold text-sm shadow-sm"
                                >
                                    <Eye size={18} />
                                    VISTA PREVIA
                                </button>
                            )}
                            <button
                                onClick={() => handleOpenModal()}
                                className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl transition-all shadow-lg shadow-blue-500/20 font-bold text-sm uppercase italic"
                            >
                                <Plus size={20} />
                                NUEVO CURSO
                            </button>
                        </div>
                    </div>

                    <div className="rounded-2xl border overflow-hidden shadow-xl" style={{ background: theme.surface, borderColor: theme.border }}>
                        {loading && <div className="p-12 text-center text-gray-400 animate-pulse font-bold tracking-widest">ACTUALIZANDO ORDEN...</div>}

                        {!loading && companyCourses.length === 0 && (
                            <div className="p-20 text-center">
                                <FileText className="w-16 h-16 text-gray-200 mx-auto mb-4" />
                                <p className="text-gray-400 text-lg font-bold mb-4 uppercase italic">No hay cursos registrados</p>
                                <button
                                    onClick={() => handleOpenModal()}
                                    className="px-6 py-2 bg-blue-50 text-blue-600 rounded-full font-bold text-sm hover:bg-blue-100 transition-colors"
                                >
                                    + Crear primer curso
                                </button>
                            </div>
                        )}

                        {!loading && filteredCourses.map((course, index) => {
                            const IconComponent = course.icon_name && LucideIcons[course.icon_name] ? LucideIcons[course.icon_name] : FileText;
                            return (
                                <div key={course.id} className="flex items-center justify-between p-5 border-b transition-all group last:border-0 hover:bg-black/[0.02]" style={{ borderColor: theme.border }}>
                                    <div className="flex items-center gap-6">
                                        <div className="flex flex-col items-center gap-1 p-1 bg-black/5 rounded-lg border border-black/5 shadow-inner">
                                            <button
                                                onClick={() => moveCourse(index, 'up')}
                                                disabled={index === 0 || searchTerm !== ''}
                                                className="p-1 text-gray-400 hover:text-blue-500 disabled:opacity-0 transition-colors"
                                            >
                                                <ChevronUp size={18} />
                                            </button>
                                            <span className="text-[10px] font-black text-gray-400 leading-none">{index + 1}</span>
                                            <button
                                                onClick={() => moveCourse(index, 'down')}
                                                disabled={index === companyCourses.length - 1 || searchTerm !== ''}
                                                className="p-1 text-gray-400 hover:text-blue-500 disabled:opacity-0 transition-colors"
                                            >
                                                <ChevronDown size={18} />
                                            </button>
                                        </div>

                                        <div className="w-12 h-12 flex items-center justify-center bg-blue-500/10 rounded-xl text-blue-500 border border-blue-500/20 shadow-sm">
                                            <IconComponent size={24} />
                                        </div>

                                        <div>
                                            <h4 className="font-bold text-lg" style={{ color: theme.text }}>{course.title}</h4>
                                            <p className="text-xs font-mono font-medium opacity-40 uppercase tracking-tighter" style={{ color: theme.text }}>{course.file_url?.split('.').pop() || 'DOCUMENTO'}</p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3 opacity-0 group-hover:opacity-100 transition-all transform translate-x-4 group-hover:translate-x-0">
                                        <button
                                            onClick={() => handleOpenModal(course)}
                                            className="p-2.5 text-blue-500 hover:bg-blue-50 rounded-xl transition-all"
                                            title="Editar"
                                        >
                                            <Edit2 size={18} />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(course.id)}
                                            className="p-2.5 text-red-500 hover:bg-red-50 rounded-xl transition-all"
                                            title="Eliminar"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fade-in">
                    <div className="border rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl scale-in-center" style={{ background: theme.surface, borderColor: theme.border }}>
                        <div className="flex justify-between items-center p-6 border-b" style={{ borderColor: theme.border }}>
                            <h3 className="text-xl font-black uppercase italic" style={{ color: theme.text }}>
                                {editingCourse ? 'Editar Curso' : 'Nuevo Curso'}
                            </h3>
                            <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-black transition-colors"><X size={24} /></button>
                        </div>

                        <form onSubmit={handleSave} className="p-8 space-y-6">
                            <div className="space-y-5">
                                <div>
                                    <label className="block text-xs font-black uppercase tracking-widest mb-2 opacity-50" style={{ color: theme.text }}>Título del Curso</label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.title}
                                        onChange={e => setFormData({ ...formData, title: e.target.value })}
                                        className="w-full border-2 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500 transition-all font-bold text-lg"
                                        style={{ background: isDark ? 'rgba(0,0,0,0.2)' : '#fff', borderColor: theme.border, color: theme.text }}
                                        placeholder="Nombre del curso..."
                                    />
                                </div>

                                <div>
                                    <IconSelector
                                        selectedIcon={formData.icon_name}
                                        onSelect={(iconName) => setFormData({ ...formData, icon_name: iconName })}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-black uppercase tracking-widest mb-3 opacity-50" style={{ color: theme.text }}>Documento (PDF/PPT/Imagen)</label>
                                <label className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed rounded-2xl cursor-pointer hover:bg-blue-500/5 transition-all group" style={{ borderColor: theme.border }}>
                                    <div className="flex flex-col items-center justify-center py-6">
                                        <Upload className="w-10 h-10 text-gray-300 mb-3 group-hover:text-blue-500 transition-colors" />
                                        <p className="text-sm font-bold text-gray-400 px-4 text-center">
                                            {formData.file ? formData.file.name : (editingCourse ? '¿Cambiar archivo?' : 'Click para subir archivo')}
                                        </p>
                                    </div>
                                    <input
                                        type="file"
                                        className="hidden"
                                        accept=".pdf,.ppt,.pptx,.png,.jpg,.jpeg"
                                        onChange={e => setFormData({ ...formData, file: e.target.files[0] })}
                                    />
                                </label>
                            </div>

                            <div className="p-4 bg-blue-50/50 rounded-xl border border-blue-100 flex items-center gap-3">
                                <Users size={20} className="text-blue-500" />
                                <p className="text-xs font-bold text-blue-700">Asignado a: <span className="uppercase">{companies.find(c => c.id === expandedCompany)?.name}</span></p>
                            </div>

                            <div className="flex justify-end gap-3 pt-6 border-t" style={{ borderColor: theme.border }}>
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className="px-6 py-2.5 rounded-xl font-bold text-gray-500 hover:bg-gray-100 transition-all text-sm"
                                >
                                    CANCELAR
                                </button>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="px-8 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-500 font-black shadow-lg shadow-blue-500/20 flex items-center gap-2 disabled:opacity-50 uppercase italic text-sm transition-all active:scale-95"
                                >
                                    {loading ? 'GUARDANDO...' : <><Save size={20} /> GUARDAR</>}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
        </div >
    );
}
