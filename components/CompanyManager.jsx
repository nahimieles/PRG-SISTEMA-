'use client';

import React, { useState, useEffect } from 'react';
import Toast from './Toast';
import { Building2, Plus, Edit2, Trash2, Users, Search, FolderPlus, Folder, ChevronLeft, Upload, Image as ImageIcon, CheckCircle, X, Layers } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { lightTheme, darkTheme } from '../lib/colors';
import {
    getCompanies, addCompany, updateCompany, deleteCompany,
    getCompanyGroups, createCompanyGroup, updateCompanyGroup, deleteCompanyGroup,
    uploadFile
} from '../lib/auth';

export default function CompanyManager() {
    // V3.12.0 - Groups Integration

    const { isDark } = useTheme();
    const theme = isDark ? darkTheme : lightTheme;

    const [activeTab, setActiveTab] = useState('companies'); // 'companies' (Dashboard) or 'manage_groups' (CRUD)
    const [loading, setLoading] = useState(true);
    const [companies, setCompanies] = useState([]);
    const [groups, setGroups] = useState([]);

    // Navigation State
    // Expanded Group can be a String ('auditoria') OR a Group Object ({id, name, ...})
    const [expandedGroup, setExpandedGroup] = useState(null);
    const [selectedPRGCompany, setSelectedPRGCompany] = useState(null);

    // Hardcoded Types (Legacy Groups)
    const legacyGroups = [
        { id: 'contabilidad', name: 'Contabilidad (Tipo)', color: 'green', type: 'contabilidad' },
        { id: 'auditoria', name: 'Auditoría (Tipo)', color: 'blue', type: 'auditoria' }
    ];

    // Get PRG company (direct access)
    const prgCompany = companies.find(c => c.name.toUpperCase().includes('PRG'));

    // Navigation helpers
    const handleGroupClick = (group) => {
        setExpandedGroup(group);
        setSelectedPRGCompany(null);
    };

    const handleBackToGroups = () => {
        setExpandedGroup(null);
        setSelectedPRGCompany(null);
    };

    const handleBackToDashboard = () => {
        setActiveTab('companies');
    };

    // Estado Formularios
    const [showModal, setShowModal] = useState(false);
    const [editingItem, setEditingItem] = useState(null);

    // Form Data
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

        if (activeTab === 'companies' || (activeTab === 'manage_groups' && editingItem && editingItem.username !== undefined)) { // Hack to detect company vs group
            // SAVING COMPANY
            const payload = {
                name: formData.name,
                type: formData.type,
                group_id: formData.group_id || null,
                avatar_url: formData.avatar_url || null
            };

            if (editingItem && editingItem.username !== undefined) { // Is Company
                const updates = {};
                if (formData.name !== editingItem.name) updates.name = formData.name;
                if (formData.type !== editingItem.type) updates.type = formData.type;
                if ((formData.group_id || null) !== (editingItem.group_id || null)) updates.group_id = formData.group_id || null;
                if ((formData.avatar_url || null) !== (editingItem.avatar_url || null)) updates.avatar_url = formData.avatar_url || null;

                const currentUsername = (formData.username || '').trim();
                const originalUsername = (editingItem.username || '').trim();

                if (currentUsername !== originalUsername) updates.username = currentUsername || null;
                if (formData.password && formData.password.trim() !== '') updates.password = formData.password;

                if (Object.keys(updates).length === 0) {
                    setShowModal(false); setEditingItem(null); showToast('Sin cambios detectados'); return;
                }
                result = await updateCompany(editingItem.id, updates);
            } else {
                // Create Company
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
            // SAVING GROUP
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
        setConfirmModal({ show: true, title, onConfirm: async () => { await action(); setConfirmModal({ show: false, title: '', onConfirm: null }); } });
    };

    const handleDelete = (id, isGroup = false) => {
        openConfirm('¿Estás seguro de eliminar este elemento?', async () => {
            let success;
            if (!isGroup) success = await deleteCompany(id);
            else success = await deleteCompanyGroup(id);

            if (success) { showToast('Eliminado correctamente'); loadData(); }
            else showToast('Error al eliminar', 'error');
        });
    };

    const handleAvatarUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setUploadingAvatar(true);
        setMessage(null);
        try {
            const tempId = editingItem?.id || `comp-${Math.random().toString(36).substr(2, 9)}`;
            const result = await uploadFile(file, tempId);
            if (result.success) { setFormData(prev => ({ ...prev, avatar_url: result.fileUrl })); showToast('Imagen subida correctamente'); }
            else { showToast(result.error || 'Error al subir imagen', 'error'); }
        } catch (error) { console.error('Upload error:', error); showToast('Error inesperado', 'error'); }
        finally { setUploadingAvatar(false); }
    };

    const showToast = (text, type = 'success') => { setMessage({ text, type }); setTimeout(() => setMessage(null), 3000); };

    const openModal = (item = null, isGroup = false) => {
        setEditingItem(item);
        if (item) {
            if (isGroup || !item.username) { // Logic to detect if it is a group object (simplification)
                // It is a group
                setFormData({ name: item.name });
            } else {
                // It is a company
                setFormData({
                    name: item.name,
                    type: item.type || 'auditoria',
                    username: item.username || '',
                    password: '',
                    group_id: item.group_id || '',
                    avatar_url: item.avatar_url || ''
                });
            }
        } else {
            // New Item
            if (activeTab === 'manage_groups' && !isGroup) { // Creating a group in manage tab
                setFormData({ name: '' });
            } else {
                setFormData({ name: '', type: 'auditoria', username: '', password: '', group_id: '', avatar_url: '' });
            }
        }
        setShowModal(true);
    };

    const filteredCompanies = companies.filter(company =>
        company.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (company.group_name && company.group_name.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    return (
        <div className="animate-fade-in relative transition-all">
            {/* Header Tabs */}
            <div className="flex gap-4 mb-6 border-b border-gray-200 dark:border-gray-700 pb-2">
                <button onClick={() => setActiveTab('companies')} className={`pb-2 px-4 text-sm font-medium transition-colors relative ${activeTab === 'companies' ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500'}`}>
                    Listado de Empresas
                    {activeTab === 'companies' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-600 dark:bg-blue-400 rounded-t-full" />}
                </button>
                <button onClick={() => setActiveTab('manage_groups')} className={`pb-2 px-4 text-sm font-medium transition-colors relative ${activeTab === 'manage_groups' ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500'}`}>
                    Administrar Grupos
                    {activeTab === 'manage_groups' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-600 dark:bg-blue-400 rounded-t-full" />}
                </button>
            </div>

            {/* Content Actions */}
            <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                <h2 className="text-xl font-bold" style={{ color: theme.text }}>
                    {activeTab === 'companies' ? 'Dashboard de Empresas' : 'Gestión de Grupos'}
                </h2>

                <div className="flex items-center gap-4 w-full md:w-auto">
                    {(activeTab === 'companies' && expandedGroup) && (
                        <div className="relative flex-1 md:w-64">
                            <input
                                type="text" placeholder="Buscar empresa..."
                                className="w-full pl-10 pr-4 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                style={{ background: isDark ? '#1a1f2e' : '#fff', borderColor: theme.border, color: theme.text }}
                                value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                            />
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                        </div>
                    )}
                    <button onClick={() => openModal(null, activeTab === 'manage_groups')} className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors shadow-sm whitespace-nowrap">
                        <Plus size={18} /> <span>{activeTab === 'companies' ? 'Nueva Empresa' : 'Nuevo Grupo'}</span>
                    </button>
                </div>
            </div>

            {loading ? (
                <div className="flex justify-center p-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>
            ) : activeTab === 'companies' ? (
                /* === DASHBOARD VIEW === */
                <>
                    {/* LEVEL 1: GROUPS GRID */}
                    {!expandedGroup && (
                        <div className="space-y-8 animate-fade-in">
                            {/* PRG Header */}
                            {prgCompany && (
                                <div className="bg-gradient-to-r from-amber-500/10 to-orange-500/10 p-6 rounded-2xl border border-amber-500/20 flex items-center justify-between shadow-sm hover:shadow-md transition-all">
                                    <div className="flex items-center gap-4">
                                        {prgCompany.avatar_url ? (
                                            <img src={prgCompany.avatar_url} className="w-16 h-16 rounded-xl object-cover border-2 border-amber-500/30" />
                                        ) : (
                                            <div className="w-16 h-16 rounded-xl bg-amber-500/20 flex items-center justify-center text-amber-600"><Building2 size={32} /></div>
                                        )}
                                        <div>
                                            <h3 className="text-xl font-black text-amber-600/80 uppercase">Empresa Principal</h3>
                                            <p className="text-lg font-bold" style={{ color: theme.text }}>{prgCompany.name}</p>
                                        </div>
                                    </div>
                                    <button onClick={() => openModal(prgCompany)} className="p-2 hover:bg-black/5 rounded-full"><Edit2 size={18} className="text-amber-600" /></button>
                                </div>
                            )}

                            {/* Unified Groups Grid */}
                            <div>
                                <h3 className="text-lg font-bold mb-4 opacity-50 uppercase tracking-widest text-xs flex items-center gap-2"><Layers size={14} /> Grupos de Trabajo</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

                                    {/* DYAMIC GROUPS */}
                                    {groups.map(group => {
                                        // Get companies in this group
                                        const groupCompanies = companies.filter(c => c.group_id === group.id);
                                        const previewNames = groupCompanies.slice(0, 3).map(c => c.name).join(', ');
                                        const moreCount = groupCompanies.length > 3 ? `+${groupCompanies.length - 3}` : '';

                                        return (
                                            <button
                                                key={group.id}
                                                onClick={() => handleGroupClick(group)}
                                                className="group relative flex flex-col items-start p-6 rounded-2xl border transition-all hover:scale-[1.02] hover:shadow-xl text-left h-full"
                                                style={{ background: theme.surface, borderColor: theme.border }}
                                            >
                                                <div className="w-12 h-12 rounded-xl bg-purple-500/10 text-purple-600 flex items-center justify-center mb-4 group-hover:bg-purple-600 group-hover:text-white transition-all shadow-sm">
                                                    <Folder size={24} />
                                                </div>
                                                <h3 className="text-xl font-bold mb-1" style={{ color: theme.text }}>{group.name}</h3>
                                                <p className="text-xs font-medium opacity-50 uppercase tracking-widest mb-4">{groupCompanies.length} Empresas</p>

                                                {/* Member Preview */}
                                                {groupCompanies.length > 0 ? (
                                                    <div className="w-full mt-auto pt-4 border-t border-dashed border-gray-200 dark:border-gray-700">
                                                        <p className="text-xs text-gray-500 truncate dark:text-gray-400">
                                                            {previewNames} {moreCount && <span className="font-bold text-gray-400">{moreCount}</span>}
                                                        </p>
                                                    </div>
                                                ) : (
                                                    <div className="w-full mt-auto pt-4 border-t border-dashed border-gray-200 dark:border-gray-700">
                                                        <p className="text-xs text-gray-400 italic">Sin empresas asignadas</p>
                                                    </div>
                                                )}
                                            </button>
                                        );
                                    })}

                                    {/* LEGACY TYPES (If needed, or encourage migration) */}
                                    {legacyGroups.map(lg => {
                                        const count = companies.filter(c => c.type === lg.type && !c.group_id).length; // Only count those NOT in a dynamic group to avoid dupes? Or count all?
                                        // Let's count all logic matching type for backward compat
                                        const typeCompanies = companies.filter(c => c.type === lg.type);
                                        const previewNames = typeCompanies.slice(0, 3).map(c => c.name).join(', ');

                                        return (
                                            <button
                                                key={lg.id}
                                                onClick={() => handleGroupClick(lg)}
                                                className="group relative flex flex-col items-start p-6 rounded-2xl border transition-all hover:scale-[1.02] hover:shadow-xl text-left h-full opacity-80 hover:opacity-100"
                                                style={{ background: theme.surface, borderColor: theme.border }}
                                            >
                                                <div className={`w-12 h-12 rounded-xl bg-gray-500/10 text-gray-600 flex items-center justify-center mb-4 group-hover:bg-gray-600 group-hover:text-white transition-all shadow-sm`}>
                                                    <Users size={24} />
                                                </div>
                                                <h3 className="text-xl font-bold mb-1" style={{ color: theme.text }}>{lg.name}</h3>
                                                <p className="text-xs font-medium opacity-50 uppercase tracking-widest mb-4">{typeCompanies.length} Empresas</p>
                                                <div className="w-full mt-auto pt-4 border-t border-dashed border-gray-200 dark:border-gray-700">
                                                    <p className="text-xs text-gray-500 truncate dark:text-gray-400">
                                                        {previewNames || 'Vacio'}
                                                    </p>
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* LEVEL 2: DETAILED LIST */}
                    {expandedGroup && (
                        <div className="animate-fade-in space-y-6">
                            <div className="flex items-center gap-4 pb-4 border-b border-gray-200 dark:border-gray-800">
                                <button onClick={handleBackToGroups} className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-full transition-colors text-gray-400 hover:text-gray-700 dark:hover:text-white">
                                    <ChevronLeft size={24} />
                                </button>
                                <div>
                                    <h3 className="text-2xl font-bold flex items-center gap-2">
                                        {expandedGroup.name}
                                    </h3>
                                    <p className="text-sm opacity-60">Visualizando empresas del grupo</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {filteredCompanies.filter(c => {
                                    if (expandedGroup.type) return c.type === expandedGroup.type; // Filter by Legacy Type
                                    return c.group_id === expandedGroup.id; // Filter by Dynamic ID
                                }).map(company => (
                                    <div key={company.id} className="p-5 rounded-xl border shadow-sm hover:shadow-md transition-all group relative" style={{ background: theme.surface, borderColor: theme.border }}>
                                        <div className="flex justify-between items-start mb-3">
                                            {company.avatar_url ? (
                                                <img src={company.avatar_url} className="w-14 h-14 rounded-xl object-cover border shadow-sm" />
                                            ) : (
                                                <div className="w-14 h-14 bg-gray-100 dark:bg-gray-800 rounded-xl flex items-center justify-center text-gray-400">
                                                    <Building2 size={24} />
                                                </div>
                                            )}
                                            <div className="flex gap-2">
                                                <button onClick={() => openModal(company)} className="p-2 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg"><Edit2 size={16} /></button>
                                                <button onClick={() => handleDelete(company.id)} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg"><Trash2 size={16} /></button>
                                            </div>
                                        </div>
                                        <h3 className="font-bold text-lg mb-1 truncate" style={{ color: theme.text }}>{company.name}</h3>
                                        <div className="flex flex-wrap gap-2 text-xs">
                                            <span className="px-2 py-1 rounded bg-gray-100 dark:bg-gray-800 opacity-70 uppercase">{company.type}</span>
                                            {company.username && <span className="px-2 py-1 rounded bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400 font-bold">USER: {company.username}</span>}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </>
            ) : (
                /* === GROUP MANAGEMENT VIEW (CRUD) === */
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {groups.map(group => (
                        <div key={group.id} className="p-6 rounded-2xl border flex items-center justify-between group hover:shadow-lg transition-all" style={{ background: theme.surface, borderColor: theme.border }}>
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-purple-500/10 text-purple-600 rounded-xl"><Folder size={24} /></div>
                                <div>
                                    <h3 className="font-bold text-lg" style={{ color: theme.text }}>{group.name}</h3>
                                    <p className="text-xs opacity-50">ID: ...{group.id.slice(-4)}</p>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <button onClick={() => openModal(group, true)} className="p-2 text-gray-400 hover:text-blue-500 bg-gray-50 dark:bg-gray-800 hover:bg-blue-50 rounded-lg"><Edit2 size={18} /></button>
                                <button onClick={() => handleDelete(group.id, true)} className="p-2 text-gray-400 hover:text-red-500 bg-gray-50 dark:bg-gray-800 hover:bg-red-50 rounded-lg"><Trash2 size={18} /></button>
                            </div>
                        </div>
                    ))}
                    {groups.length === 0 && <div className="col-span-full text-center py-20 opacity-50">No hay grupos creados.</div>}
                </div>
            )}

            {/* Modal Formulario */}
            {showModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in" style={{ zIndex: 100 }}>
                    <div className="rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border" style={{ background: theme.surface, borderColor: theme.border }}>
                        <div className="p-6">
                            <h3 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">
                                {editingItem ? 'Editar' : 'Crear Nuevo'}
                            </h3>
                            <form onSubmit={handleSave} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1" style={{ color: theme.textSecondary }}>Nombre</label>
                                    <input
                                        type="text" required
                                        className="w-full px-4 py-2 rounded-lg border focus:ring-2 focus:ring-blue-500 outline-none"
                                        style={{ background: isDark ? 'rgba(0,0,0,0.2)' : '#fff', borderColor: theme.border, color: theme.text }}
                                        value={formData.name}
                                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    />
                                </div>

                                {/* Company Fields */}
                                {(activeTab === 'companies' || (editingItem && editingItem.username !== undefined)) && (
                                    <>
                                        <div>
                                            <label className="block text-sm font-medium mb-1" style={{ color: theme.textSecondary }}>Tipo (Legacy)</label>
                                            <select
                                                className="w-full px-4 py-2 rounded-lg border focus:ring-2 focus:ring-blue-500 outline-none"
                                                style={{ background: isDark ? 'rgba(0,0,0,0.2)' : '#fff', borderColor: theme.border, color: theme.text }}
                                                value={formData.type} onChange={e => setFormData({ ...formData, type: e.target.value })}
                                            >
                                                <option value="auditoria">Auditoría</option>
                                                <option value="contabilidad">Contabilidad</option>
                                                <option value="rrjj">RRJJ</option>
                                                <option value="otro">Otro</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium mb-1" style={{ color: theme.textSecondary }}>Grupo de Trabajo</label>
                                            <div className="flex gap-2">
                                                <select
                                                    className="w-full px-4 py-2 rounded-lg border focus:ring-2 focus:ring-blue-500 outline-none"
                                                    style={{ background: isDark ? 'rgba(0,0,0,0.2)' : '#fff', borderColor: theme.border, color: theme.text }}
                                                    value={formData.group_id} onChange={e => setFormData({ ...formData, group_id: e.target.value })}
                                                >
                                                    <option value="">-- Sin Grupo asignado --</option>
                                                    {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                                                </select>
                                            </div>
                                        </div>
                                        <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
                                            <label className="block text-xs text-gray-500 mb-1 uppercase font-bold">Credenciales</label>
                                            <div className="grid grid-cols-2 gap-2">
                                                <input type="text" placeholder="Usuario" className="w-full px-3 py-2 rounded-lg border bg-transparent" value={formData.username} onChange={e => setFormData({ ...formData, username: e.target.value })} />
                                                <input type="password" placeholder="Clave" className="w-full px-3 py-2 rounded-lg border bg-transparent" value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} />
                                            </div>
                                        </div>
                                    </>
                                )}

                                <div className="flex justify-end gap-3 mt-6">
                                    <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">Cancelar</button>
                                    <button type="submit" className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium shadow-md">Guardar</button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* Confirmation Modal */}
            {confirmModal.show && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" style={{ zIndex: 110 }}>
                    <div className="rounded-xl shadow-2xl w-full max-w-sm border p-6" style={{ background: theme.surface, borderColor: theme.border }}>
                        <h3 className="text-lg font-bold mb-3" style={{ color: theme.text }}>Confirmación</h3>
                        <p className="mb-6" style={{ color: theme.textSecondary }}>{confirmModal.title}</p>
                        <div className="flex justify-end gap-3">
                            <button onClick={() => setConfirmModal({ ...confirmModal, show: false })} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">Cancelar</button>
                            <button onClick={confirmModal.onConfirm} className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium">Confirmar</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
