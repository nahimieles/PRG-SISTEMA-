'use client';

import React, { useState, useEffect } from 'react';
import Toast from './Toast';
import { Building2, Plus, Edit2, Trash2, Users, Search, FolderPlus, Folder, ChevronLeft, Upload, Image as ImageIcon, CheckCircle, X } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { lightTheme, darkTheme } from '../lib/colors';
import {
    getCompanies, addCompany, updateCompany, deleteCompany,
    getCompanyGroups, createCompanyGroup, updateCompanyGroup, deleteCompanyGroup,
    uploadFile
} from '../lib/auth';

export default function CompanyManager() {
    const { isDark } = useTheme();
    const theme = isDark ? darkTheme : lightTheme;

    const [activeTab, setActiveTab] = useState('companies'); // 'companies' or 'groups'
    const [loading, setLoading] = useState(true);
    const [companies, setCompanies] = useState([]);
    const [groups, setGroups] = useState([]);

    // Estado para navegación de 3 niveles
    const [expandedGroup, setExpandedGroup] = useState(null); // 'contabilidad', 'auditoria', or null
    const [selectedPRGCompany, setSelectedPRGCompany] = useState(null); // For PRG direct access

    // Group definitions (only 2 groups - PRG is a direct access)
    const companyGroups = [
        { id: 'contabilidad', name: 'Contabilidad', color: 'green', filter: (c) => c.type === 'contabilidad' && !c.name.toUpperCase().includes('PRG') },
        { id: 'auditoria', name: 'Auditoría', color: 'blue', filter: (c) => c.type === 'auditoria' && !c.name.toUpperCase().includes('PRG') }
    ];

    // Get PRG company (direct access)
    const prgCompany = companies.find(c => c.name.toUpperCase().includes('PRG'));

    // Navigation helpers
    const handleGroupClick = (groupId) => {
        setExpandedGroup(groupId);
        setSelectedPRGCompany(null);
    };

    const handleBackToGroups = () => {
        setExpandedGroup(null);
        setSelectedPRGCompany(null);
    };

    // Estado Formularios
    const [showModal, setShowModal] = useState(false);
    const [editingItem, setEditingItem] = useState(null); // Si null, es creación

    // Form Data Genérico (usado para ambos)
    const [formData, setFormData] = useState({
        name: '',
        type: 'auditoria',
        username: '',
        password: '',
        group_id: '',
        avatar_url: ''
    });

    const [message, setMessage] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');

    // Custom Confirmation Modal State
    const [confirmModal, setConfirmModal] = useState({ show: false, title: '', onConfirm: null });
    const [uploadingAvatar, setUploadingAvatar] = useState(false);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const [companiesData, groupsData] = await Promise.all([
                getCompanies(),
                getCompanyGroups()
            ]);
            setCompanies(companiesData);
            setGroups(groupsData);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setMessage(null);
        let result;

        if (activeTab === 'companies') {
            const payload = {
                name: formData.name,
                type: formData.type,
                group_id: formData.group_id || null,
                avatar_url: formData.avatar_url || null
            };
            // Solo enviar username/pass si se están editando/creando explícitamente y no están vacíos
            // Para creación simple, quizás solo nombre y tipo

            if (editingItem) {
                // Update - SOLO enviar lo que cambió para evitar conflictos de constraints (como username)
                const updates = {};

                if (formData.name !== editingItem.name) updates.name = formData.name;
                if (formData.type !== editingItem.type) updates.type = formData.type;
                if ((formData.group_id || null) !== (editingItem.group_id || null)) updates.group_id = formData.group_id || null;
                if ((formData.avatar_url || null) !== (editingItem.avatar_url || null)) updates.avatar_url = formData.avatar_url || null;

                // Normalización de username para comparación exacta
                const currentUsername = (formData.username || '').trim();
                const originalUsername = (editingItem.username || '').trim();

                if (currentUsername !== originalUsername) {
                    updates.username = currentUsername || null;
                }

                if (formData.password && formData.password.trim() !== '') {
                    updates.password = formData.password;
                }

                // Si no hay cambios, no llamar a la API
                if (Object.keys(updates).length === 0) {
                    setShowModal(false);
                    setEditingItem(null);
                    showToast('Sin cambios detectados');
                    return;
                }

                result = await updateCompany(editingItem.id, updates);
            } else {
                // Create
                result = await addCompany(
                    formData.name,
                    formData.type,
                    formData.username,
                    formData.password,
                    formData.group_id || null,
                    formData.avatar_url || null
                );
            }
        } else {
            // Groups
            if (editingItem) {
                result = await updateCompanyGroup(editingItem.id, formData.name);
            } else {
                result = await createCompanyGroup(formData.name);
            }
        }

        if (result.success) {
            setShowModal(false);
            setEditingItem(null);
            setFormData({ name: '', type: 'auditoria', username: '', password: '', group_id: '' });
            loadData();
            showToast(editingItem ? 'Actualizado correctamente' : 'Agregado correctamente');
        } else {
            showToast(result.error || 'Error al guardar', 'error');
        }
    };

    const openConfirm = (title, action) => {
        setConfirmModal({
            show: true,
            title,
            onConfirm: async () => {
                await action();
                setConfirmModal({ show: false, title: '', onConfirm: null });
            }
        });
    };

    const handleDelete = (id) => {
        openConfirm('¿Estás seguro de eliminar este elemento?', async () => {
            let success;
            if (activeTab === 'companies') {
                success = await deleteCompany(id);
            } else {
                success = await deleteCompanyGroup(id);
            }

            if (success) {
                showToast('Eliminado correctamente');
                loadData();
            }
            else showToast('Error al eliminar', 'error');
        });
    };

    const handleAvatarUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setUploadingAvatar(true);
        setMessage(null);

        try {
            // Utilizar un ID para el nombre del archivo
            const tempId = editingItem?.id || `comp-${Math.random().toString(36).substr(2, 9)}`;
            const result = await uploadFile(file, tempId);

            if (result.success) {
                setFormData(prev => ({ ...prev, avatar_url: result.fileUrl }));
                showToast('Imagen subida correctamente');
            } else {
                showToast(result.error || 'Error al subir imagen', 'error');
            }
        } catch (error) {
            console.error('Upload error:', error);
            showToast('Error inesperado al subir archivo', 'error');
        } finally {
            setUploadingAvatar(false);
        }
    };

    const showToast = (text, type = 'success') => {
        setMessage({ text, type });
        setTimeout(() => setMessage(null), 3000);
    };

    const openModal = (item = null) => {
        setEditingItem(item);
        if (item) {
            setFormData({
                name: item.name,
                type: item.type || 'auditoria',
                username: item.username || '',
                password: '', // No mostrar password
                group_id: item.group_id || '',
                avatar_url: item.avatar_url || ''
            });
        } else {
            setFormData({ name: '', type: 'auditoria', username: '', password: '', group_id: '', avatar_url: '' });
        }
        setShowModal(true);
    };

    // Filter logic
    const filteredCompanies = companies.filter(company =>
        company.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (company.group_name && company.group_name.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    const filteredGroups = groups.filter(group =>
        group.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="animate-fade-in relative transition-all">
            {/* Header Tabs */}
            <div className="flex gap-4 mb-6 border-b border-gray-200 dark:border-gray-700 pb-2">
                <button
                    onClick={() => setActiveTab('companies')}
                    className={`pb-2 px-4 text-sm font-medium transition-colors relative ${activeTab === 'companies'
                        ? 'text-blue-600 dark:text-blue-400'
                        : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                        }`}
                >
                    Listado de Empresas
                    {activeTab === 'companies' && (
                        <div className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-600 dark:bg-blue-400 rounded-t-full" />
                    )}
                </button>
                <button
                    onClick={() => setActiveTab('groups')}
                    className={`pb-2 px-4 text-sm font-medium transition-colors relative ${activeTab === 'groups'
                        ? 'text-blue-600 dark:text-blue-400'
                        : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                        }`}
                >
                    Grupos de Empresas
                    {activeTab === 'groups' && (
                        <div className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-600 dark:bg-blue-400 rounded-t-full" />
                    )}
                </button>
            </div>

            {/* Content Actions */}
            <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                <h2 className="text-xl font-bold" style={{ color: theme.text }}>
                    {activeTab === 'companies' ? 'Gestión de Empresas' : 'Gestión de Grupos'}
                </h2>

                <div className="flex items-center gap-4 w-full md:w-auto">
                    {/* Search Input - only show when viewing companies in a group */}
                    {(activeTab !== 'companies' || expandedGroup) && (
                        <div className="relative flex-1 md:w-64">
                            <input
                                type="text"
                                placeholder="Buscar..."
                                className="w-full pl-10 pr-4 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                style={{
                                    background: isDark ? '#1a1f2e' : '#fff',
                                    borderColor: theme.border,
                                    color: theme.text
                                }}
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                        </div>
                    )}

                    <button
                        onClick={() => openModal()}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors shadow-sm whitespace-nowrap"
                    >
                        <Plus size={18} />
                        <span>{activeTab === 'companies' ? 'Nueva Empresa' : 'Nuevo Grupo'}</span>
                    </button>
                </div>
            </div>

            {/* Lists */}
            {loading ? (
                <div className="flex justify-center p-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
            ) : activeTab === 'companies' ? (
                /* NAVEGACIÓN DE 3 NIVELES PARA EMPRESAS */
                <>
                    {/* LEVEL 1: PRG Direct + Group Cards (Main View) */}
                    {!expandedGroup && (
                        <div className="space-y-8">
                            {/* PRG AUDITORES - Direct Access Company Card */}
                            {prgCompany && (
                                <div>
                                    <h3 className="text-lg font-black uppercase tracking-widest mb-4 flex items-center gap-2" style={{ color: isDark ? '#fbbf24' : '#d97706' }}>
                                        <Building2 size={20} />
                                        EMPRESA PRINCIPAL
                                    </h3>
                                    <div className="bg-gradient-to-br from-amber-500/10 to-orange-500/10 p-8 rounded-2xl border border-amber-500/30 shadow-lg group transition-all">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-4">
                                                {/* Avatar or gradient icon */}
                                                {prgCompany.avatar_url ? (
                                                    <div className="w-16 h-16 rounded-2xl overflow-hidden border-2 border-amber-500/50 shadow-lg">
                                                        <img src={prgCompany.avatar_url} alt={prgCompany.name} className="w-full h-full object-cover" />
                                                    </div>
                                                ) : (
                                                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center text-white shadow-lg">
                                                        <Building2 size={32} />
                                                    </div>
                                                )}
                                                <div>
                                                    <h3 className="text-xl font-bold" style={{ color: theme.text }}>{prgCompany.name}</h3>
                                                    <p className="text-sm capitalize" style={{ color: theme.textSecondary }}>{prgCompany.type}</p>
                                                    {prgCompany.username && (
                                                        <p className="text-xs mt-2 font-black tracking-tighter px-3 py-1 rounded-full border border-black/5 bg-black/5" style={{ color: theme.textSecondary }}>
                                                            USER: {prgCompany.username}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => openModal(prgCompany)}
                                                    className="p-2 text-amber-600 hover:bg-amber-500/20 rounded-lg transition-colors"
                                                >
                                                    <Edit2 size={18} />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Group Cards */}
                            <div>
                                <h3 className="text-lg font-bold mb-4 flex items-center gap-2" style={{ color: theme.textSecondary }}>
                                    <Folder size={20} />
                                    Grupos de Empresas
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {companyGroups.map(group => {
                                        const groupCompanies = companies.filter(group.filter);

                                        const colorClasses = {
                                            green: { bg: 'bg-green-500/10', text: 'text-green-600 dark:text-green-400', hoverBorder: 'hover:border-green-500/50', hoverShadow: 'hover:shadow-green-500/10' },
                                            blue: { bg: 'bg-blue-500/10', text: 'text-blue-600 dark:text-blue-400', hoverBorder: 'hover:border-blue-500/50', hoverShadow: 'hover:shadow-blue-500/10' }
                                        }[group.color];

                                        return (
                                            <button
                                                key={group.id}
                                                onClick={() => handleGroupClick(group.id)}
                                                className={`group flex flex-col items-center p-10 border rounded-2xl ${colorClasses.hoverBorder} transition-all duration-300 shadow-lg ${colorClasses.hoverShadow} text-center`}
                                                style={{ background: theme.surface, borderColor: theme.border }}
                                            >
                                                <div className={`w-24 h-24 rounded-full ${colorClasses.bg} ${colorClasses.text} flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300 shadow-inner`}>
                                                    <Users size={40} />
                                                </div>
                                                <h3 className={`text-xl font-bold mb-3 group-hover:${colorClasses.text} transition-colors uppercase`} style={{ color: theme.text }}>{group.name}</h3>
                                                <span className="px-3 py-1 rounded-full border border-black/5 bg-black/5 font-bold text-xs opacity-70" style={{ color: theme.textSecondary }}>
                                                    {groupCompanies.length} empresas
                                                </span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* LEVEL 2: COMPANIES IN SELECTED GROUP */}
                    {expandedGroup && (() => {
                        const currentGroup = companyGroups.find(g => g.id === expandedGroup);
                        const groupCompanies = filteredCompanies.filter(currentGroup.filter);
                        const colorClasses = {
                            amber: { bg: 'bg-amber-50 dark:bg-amber-900/20', text: 'text-amber-600 dark:text-amber-400', border: 'border-amber-400' },
                            green: { bg: 'bg-green-50 dark:bg-green-900/20', text: 'text-green-600 dark:text-green-400', border: 'border-green-400' },
                            blue: { bg: 'bg-blue-50 dark:bg-blue-900/20', text: 'text-blue-600 dark:text-blue-400', border: 'border-blue-400' }
                        }[currentGroup.color];

                        return (
                            <div className="animate-fade-in space-y-6">
                                {/* Back button and header */}
                                <div className="flex items-center gap-4 pb-4 border-b border-gray-200 dark:border-gray-800">
                                    <button
                                        onClick={handleBackToGroups}
                                        className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-full transition-colors text-gray-400 hover:text-gray-700 dark:hover:text-white"
                                    >
                                        <ChevronLeft size={24} />
                                    </button>
                                    <div>
                                        <h3 className={`text-xl font-bold ${colorClasses.text} flex items-center gap-2 uppercase tracking-tight`}>
                                            <Folder size={20} />
                                            {currentGroup.name}
                                        </h3>
                                        <p className="text-xs font-bold opacity-60" style={{ color: theme.text }}>{groupCompanies.length} empresas en este grupo</p>
                                    </div>
                                </div>

                                {/* Companies grid */}
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {groupCompanies.map(company => (
                                        <div key={company.id} className="p-5 rounded-xl border shadow-sm hover:shadow-md transition-all group" style={{ background: theme.surface, borderColor: theme.border }}>
                                            <div className="flex justify-between items-start mb-3">
                                                {/* Avatar or Icon */}
                                                {company.avatar_url ? (
                                                    <div className={`w-14 h-14 rounded-2xl overflow-hidden border-2 shadow-sm ${colorClasses.border}`}>
                                                        <img src={company.avatar_url} alt={company.name} className="w-full h-full object-cover" />
                                                    </div>
                                                ) : (
                                                    <div className={`w-14 h-14 flex items-center justify-center rounded-2xl shadow-inner ${colorClasses.bg} ${colorClasses.text}`}>
                                                        <Users size={28} />
                                                    </div>
                                                )}
                                                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button onClick={() => openModal(company)} className={`p-1.5 text-gray-500 hover:${colorClasses.text} hover:${colorClasses.bg} rounded-lg transition-colors`}>
                                                        <Edit2 size={16} />
                                                    </button>
                                                    <button onClick={() => handleDelete(company.id)} className="p-1.5 text-gray-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors">
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            </div>
                                            <h3 className="font-bold text-lg mb-1" style={{ color: theme.text }}>{company.name}</h3>
                                            <div className="space-y-1">
                                                {company.group_name && (
                                                    <div className={`flex items-center gap-2 text-sm ${colorClasses.text} font-medium`}>
                                                        <Folder size={14} />
                                                        <span>{company.group_name}</span>
                                                    </div>
                                                )}
                                                <div className="text-sm text-gray-500 dark:text-gray-400 capitalize">{company.type}</div>
                                                {company.username && (
                                                    <div className="text-[10px] font-black mt-2 px-2 py-0.5 rounded border border-black/5 bg-black/5" style={{ color: theme.textSecondary }}>
                                                        USER: {company.username}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {groupCompanies.length === 0 && (
                                    <div className="text-center py-12 text-gray-400">
                                        {searchTerm ? 'No se encontraron resultados en este grupo.' : 'No hay empresas en este grupo.'}
                                    </div>
                                )}
                            </div>
                        );
                    })()}
                </>
            ) : (
                /* LISTA DE GRUPOS */
                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {filteredGroups.map(group => (
                        <div key={group.id} className="p-5 rounded-xl border shadow-sm flex items-center justify-between group" style={{ background: theme.surface, borderColor: theme.border }}>
                            <div className="flex items-center gap-3">
                                <Folder className="text-yellow-500" size={24} />
                                <span className="font-bold" style={{ color: theme.text }}>{group.name}</span>
                            </div>
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                    onClick={() => openModal(group)}
                                    className="p-1.5 text-gray-500 hover:text-blue-500 rounded-lg"
                                >
                                    <Edit2 size={16} />
                                </button>
                                <button
                                    onClick={() => handleDelete(group.id)}
                                    className="p-1.5 text-gray-500 hover:text-red-500 rounded-lg"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        </div>
                    ))}
                    {filteredGroups.length === 0 && (
                        <div className="col-span-full text-center py-12 text-gray-400">
                            {searchTerm ? 'No se encontraron resultados.' : 'No hay grupos registrados.'}
                        </div>
                    )}
                </div>
            )}

            {/* Modal Formulario */}
            {showModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in" style={{ zIndex: 100 }}>
                    <div className="rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border" style={{ background: theme.surface, borderColor: theme.border }}>
                        <div className="p-6">
                            <h3 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">
                                {editingItem
                                    ? (activeTab === 'companies' ? 'Editar Empresa' : 'Editar Grupo')
                                    : (activeTab === 'companies' ? 'Nueva Empresa' : 'Nuevo Grupo')}
                            </h3>

                            <form onSubmit={handleSave} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1" style={{ color: theme.textSecondary }}>Nombre</label>
                                    <input
                                        type="text"
                                        required
                                        className="w-full px-4 py-2 rounded-lg border focus:ring-2 focus:ring-blue-500 outline-none"
                                        style={{ background: isDark ? 'rgba(0,0,0,0.2)' : '#fff', borderColor: theme.border, color: theme.text }}
                                        value={formData.name}
                                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    />
                                </div>

                                {/* Avatar/Logo Field - Only for companies */}
                                {activeTab === 'companies' && (
                                    <div>
                                        <label className="block text-sm font-medium mb-1" style={{ color: theme.textSecondary }}>
                                            <ImageIcon size={14} className="inline mr-1" />
                                            Logo/Foto de Perfil
                                        </label>
                                        <div className="flex items-center gap-3">
                                            {/* Preview */}
                                            <div className="w-16 h-16 rounded-xl border-2 border-dashed flex items-center justify-center overflow-hidden flex-shrink-0" style={{ background: isDark ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.02)', borderColor: theme.border }}>
                                                {formData.avatar_url ? (
                                                    <img
                                                        src={formData.avatar_url}
                                                        alt="Logo"
                                                        className="w-full h-full object-cover rounded-lg"
                                                        onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}
                                                    />
                                                ) : null}
                                                <Building2
                                                    size={28}
                                                    className="text-gray-400"
                                                    style={{ display: formData.avatar_url ? 'none' : 'block' }}
                                                />
                                            </div>

                                            <div className="flex-1 space-y-2">
                                                {/* URL Input */}
                                                <div className="relative">
                                                    <input
                                                        type="url"
                                                        className="w-full pl-3 pr-10 py-2 text-sm rounded-lg border focus:ring-2 focus:ring-blue-500 outline-none"
                                                        style={{ background: isDark ? 'rgba(0,0,0,0.2)' : '#fff', borderColor: theme.border, color: theme.text }}
                                                        value={formData.avatar_url}
                                                        onChange={e => setFormData({ ...formData, avatar_url: e.target.value })}
                                                        placeholder="URL de imagen (ej: https://...)"
                                                    />
                                                    <ImageIcon size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                                </div>

                                                {/* File Upload Button */}
                                                <div className="flex items-center gap-2">
                                                    <label className={`flex-1 flex items-center justify-center gap-2 px-3 py-1.5 rounded-lg cursor-pointer transition-colors text-xs font-medium border ${uploadingAvatar
                                                        ? 'bg-gray-50 dark:bg-gray-900 text-gray-400 border-gray-200 dark:border-gray-800 cursor-not-allowed'
                                                        : 'bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/40 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800'
                                                        }`}>
                                                        {uploadingAvatar ? (
                                                            <div className="w-3 h-3 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                                                        ) : (
                                                            <Upload size={14} />
                                                        )}
                                                        <span>{uploadingAvatar ? 'Subiendo...' : 'Subir desde archivos'}</span>
                                                        <input
                                                            type="file"
                                                            className="hidden"
                                                            accept="image/*"
                                                            onChange={handleAvatarUpload}
                                                            disabled={uploadingAvatar}
                                                        />
                                                    </label>

                                                    {formData.avatar_url && (
                                                        <button
                                                            type="button"
                                                            onClick={() => setFormData(prev => ({ ...prev, avatar_url: '' }))}
                                                            className="p-1.5 text-gray-400 hover:text-red-500 transition-colors"
                                                            title="Eliminar imagen"
                                                        >
                                                            <Trash2 size={14} />
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        <p className="text-[10px] text-gray-400 mt-1">Sube una imagen o pega un enlace directo.</p>
                                    </div>
                                )}

                                {activeTab === 'companies' && (
                                    <>
                                        <div>
                                            <label className="block text-sm font-medium mb-1" style={{ color: theme.textSecondary }}>Tipo</label>
                                            <select
                                                className="w-full px-4 py-2 rounded-lg border focus:ring-2 focus:ring-blue-500 outline-none"
                                                style={{ background: isDark ? 'rgba(0,0,0,0.2)' : '#fff', borderColor: theme.border, color: theme.text }}
                                                value={formData.type}
                                                onChange={e => setFormData({ ...formData, type: e.target.value })}
                                            >
                                                <option value="auditoria">Auditoría</option>
                                                <option value="contabilidad">Contabilidad</option>
                                                <option value="rrjj">RRJJ</option>
                                                <option value="otro">Otro</option>
                                            </select>
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium mb-1" style={{ color: theme.textSecondary }}>Grupo (Opcional)</label>
                                            <select
                                                className="w-full px-4 py-2 rounded-lg border focus:ring-2 focus:ring-blue-500 outline-none"
                                                style={{ background: isDark ? 'rgba(0,0,0,0.2)' : '#fff', borderColor: theme.border, color: theme.text }}
                                                value={formData.group_id}
                                                onChange={e => setFormData({ ...formData, group_id: e.target.value })}
                                            >
                                                <option value="">Sin Grupo</option>
                                                {groups.map(g => (
                                                    <option key={g.id} value={g.id}>{g.name}</option>
                                                ))}
                                            </select>
                                        </div>

                                        <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
                                            <p className="text-xs text-gray-500 mb-2 font-medium uppercase tracking-wider">Credenciales de Acceso</p>
                                            <div className="grid grid-cols-2 gap-3">
                                                <div>
                                                    <label className="block text-xs text-gray-500 mb-1">Usuario</label>
                                                    <input
                                                        type="text"
                                                        className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 focus:ring-2 focus:ring-blue-500 outline-none"
                                                        value={formData.username}
                                                        onChange={e => setFormData({ ...formData, username: e.target.value })}
                                                        placeholder="Opcional"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-xs text-gray-500 mb-1">Contraseña</label>
                                                    <input
                                                        type="password"
                                                        className="w-full px-3 py-2 text-sm rounded-lg border focus:ring-2 focus:ring-blue-500 outline-none"
                                                        style={{ background: isDark ? 'rgba(0,0,0,0.2)' : '#fff', borderColor: theme.border, color: theme.text }}
                                                        value={formData.password}
                                                        onChange={e => setFormData({ ...formData, password: e.target.value })}
                                                        placeholder={editingItem ? "Sin cambios" : "Opcional"}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </>
                                )}

                                {message && (
                                    <div className="p-3 rounded bg-red-100 text-red-700 text-sm">
                                        {message.text}
                                    </div>
                                )}

                                <div className="flex justify-end gap-3 mt-6">
                                    <button
                                        type="button"
                                        onClick={() => setShowModal(false)}
                                        className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        type="submit"
                                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium shadow-md transition-transform active:scale-95"
                                    >
                                        Guardar
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* Confirmation Modal */}
            {confirmModal.show && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in" style={{ zIndex: 110 }}>
                    <div className="rounded-xl shadow-2xl w-full max-w-sm border p-6" style={{ background: theme.surface, borderColor: theme.border }}>
                        <h3 className="text-lg font-bold mb-3" style={{ color: theme.text }}>Confirmación</h3>
                        <p className="mb-6" style={{ color: theme.textSecondary }}>{confirmModal.title}</p>
                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => setConfirmModal({ ...confirmModal, show: false })}
                                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={confirmModal.onConfirm}
                                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium shadow-md"
                            >
                                Confirmar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
