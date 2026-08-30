'use client';
import React, { useState, useEffect, useRef } from 'react';
import Toast from './Toast';
import DropdownMenu from './DropdownMenu';
import CredentialManager from './CredentialManager';
import { Building2, Plus, Edit2, Trash2, Users, Search, FolderPlus, Folder, ChevronLeft, Upload, Image as ImageIcon, CheckCircle, X, Layers, ExternalLink, ChevronDown, BarChart3, TrendingUp, FileBarChart, FileText, Shield, Landmark, Briefcase, Calculator, Navigation, Lock } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { lightTheme, darkTheme } from '../lib/colors';
import {
    getCompanies, 
    getCompanyGroups,
    uploadFile, getAdminSession
} from '../lib/auth';
import {
    createCompanyAction, updateCompanyAction,
    createCompanyGroupAction, updateCompanyGroupAction,
    deleteCompanyAction, deleteCompanyGroupAction,
    accessPlatformAction, getUserPlatformPermissionsAction, getPlatformCredentialsAction
} from '../lib/actions';
import { supabase } from '../lib/supabase';
import { normalizeRuc } from '../lib/security';
import { resolvePlatformsForCompany, getAccountingPlatforms } from '../lib/platforms/registry';
import CompanyOperationsCenter from './CompanyOperationsCenter';
import CustomSelect from './CustomSelect';
export default function CompanyManager({ isWorker = false }) {
    const { isDark } = useTheme();
    const theme = isDark ? darkTheme : lightTheme;
    const [loading, setLoading] = useState(true);
    const [companies, setCompanies] = useState([]);
    const [groups, setGroups] = useState([]);
    const [expandedGroup, setExpandedGroup] = useState(null);
    const [activeCompanyOperations, setActiveCompanyOperations] = useState(null);
    const legacyGroups = [
        { id: 'contabilidad', name: 'Contabilidad', color: 'green', type: 'contabilidad' },
        { id: 'auditoria', name: 'Auditoría', color: 'blue', type: 'auditoria' },
        { id: 'especiales', name: 'Trabajos Especiales', color: 'purple', type: 'especiales' }
    ];
    const handleGroupClick = (group) => {
        setExpandedGroup(group);
    };
    const handleBackToGroups = () => {
        if (expandedGroup && expandedGroup.category) {
            const parentCat = legacyGroups.find(lg => lg.type === expandedGroup.category);
            if (parentCat) {
                setExpandedGroup(parentCat);
                return;
            }
        }
        setExpandedGroup(null);
    };
    const [showModal, setShowModal] = useState(false);
    const [editingItem, setEditingItem] = useState(null);
    const [formData, setFormData] = useState({
        name: '',
        type: 'auditoria',
        username: '',
        password: '',
        group_id: '',
        avatar_url: '',
        category: null,
        ruc: '',
        sistema_contable_slug: ''
    });
    const [message, setMessage] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [confirmModal, setConfirmModal] = useState({ show: false, title: '', onConfirm: null });
    const [showAddMenu, setShowAddMenu] = useState(false);
    const addMenuRef = useRef(null);
    const [uploadingAvatar, setUploadingAvatar] = useState(false);
    // Document upload modal state
    const [docModal, setDocModal] = useState(null); // { company, type: 'financieros'|'impuestos'|'informes' }
    const [docFile, setDocFile] = useState(null);
    const [docName, setDocName] = useState('');
    const [docUploading, setDocUploading] = useState(false);
    const [docDragging, setDocDragging] = useState(false);
    const fileInputRef = useRef(null);
    // Platform access state
    const [userPermissions, setUserPermissions] = useState({}); // { [empresaId]: ['sri', 'iess', ...] }
    const [platformAccessLoading, setPlatformAccessLoading] = useState(null); 
    const [credentialModalCompany, setCredentialModalCompany] = useState(null);
    const PLATFORM_ICON_MAP = {
        FileText, Shield, Landmark, Briefcase, Calculator,
    };
    useEffect(() => {
        loadData();
    }, []);
    const loadData = async () => {
        setLoading(true);
        try {
            const admin = getAdminSession();
            const [companiesData, groupsData, permisosResult] = await Promise.all([
                getCompanies(),
                getCompanyGroups(),
                admin?.id ? getUserPlatformPermissionsAction(admin.id) : { success: false }
            ]);
            setCompanies(companiesData);
            setGroups(groupsData);
            if (permisosResult.success) {
                setUserPermissions(permisosResult.permisos || {});
            }
        } catch (error) {
        } finally {
            setLoading(false);
        }
    };
    const handlePlatformAccess = async (company, plataformaSlug) => {
        const admin = getAdminSession();
        if (!admin?.id) return;
        if (typeof window !== 'undefined' && window.__EXTENSION_INSTALLED__) {
            const companyPermissions = userPermissions[company.id] || [];
            const allowedPlatforms = resolvePlatformsForCompany(companyPermissions, company.sistema_contable_slug);
            const platformObj = allowedPlatforms.find(p => p.slug === plataformaSlug);
            const targetUrl = platformObj ? platformObj.url : '';
            const credentials = await getPlatformCredentialsAction(admin.id, company.id, plataformaSlug);
            if (!credentials.success) {
                showToast(credentials.error || 'No se encontraron credenciales', 'error');
                return;
            }
            showToast('Iniciando sesión vía Extensión...', 'info');
            window.postMessage({
                type: 'TO_EXTENSION_LOGIN',
                companyId: company.id,
                platform: plataformaSlug,
                targetUrl: targetUrl,
                credentials: {
                    ...credentials.data,
                    username: credentials.data.username || company.ruc
                }
            }, '*');
            return;
        }
        const loadingKey = `${company.id}-${plataformaSlug}`;
        setPlatformAccessLoading(loadingKey);
        try {
            const result = await accessPlatformAction(admin.id, company.id, plataformaSlug);
            if (result.success) {
                if (result.method === 'playwright') {
                    showToast('Automatización iniciada localmente (App).', 'success');
                } else if (result.method === 'manual') {
                    showToast('Modo Web: Instala la Extensión o usa la App de Escritorio para Auto-Login', 'info');
                    window.open(result.url, '_blank', 'noopener,noreferrer');
                } else if (result.url) {
                    window.open(result.url, '_blank', 'noopener,noreferrer');
                }
            } else {
                showToast(result.error || 'Error al acceder a la plataforma', 'error');
            }
        } catch (err) {
            showToast('Error inesperado al acceder a la plataforma', 'error');
        } finally {
            setPlatformAccessLoading(null);
        }
    };
    const handleSave = async (e) => {
        e.preventDefault();
        setMessage(null);
        try {
            const admin = getAdminSession();
            const requesterId = admin?.id;
            let result;
            const isSavingCompany = formData.type !== undefined;
            if (isSavingCompany) {
                if (editingItem) {
                    const updates = {};
                    if (formData.name !== editingItem.name) updates.name = formData.name;
                    if ((formData.type !== editingItem.type)) updates.type = formData.type;
                    if ((formData.ruc || null) !== (editingItem.ruc || null)) updates.ruc = formData.ruc || null;
                    if ((formData.group_id || null) !== (editingItem.group_id || null)) updates.group_id = formData.group_id || null;
                    if ((formData.sistema_contable_slug || null) !== (editingItem.sistema_contable_slug || null)) updates.sistema_contable_slug = formData.sistema_contable_slug || null;
                    if ((formData.avatar_url || null) !== (editingItem.avatar_url || null)) {
                        updates.avatar_url = formData.avatar_url || null;
                        updates.logo_url = formData.avatar_url || null;
                    }
                    const currentUsername = (formData.username || '').trim();
                    const originalUsername = (editingItem.username || '').trim();
                    if (currentUsername !== originalUsername) updates.username = currentUsername || null;
                    if (formData.password && formData.password.trim() !== '') updates.password = formData.password;
                    if (Object.keys(updates).length === 0) {
                        setShowModal(false); setEditingItem(null); showToast('Sin cambios detectados'); return;
                    }
                    result = await updateCompanyAction(editingItem.id, updates, requesterId);
                } else {
                    result = await createCompanyAction({
                        name: formData.name,
                        type: formData.type,
                        username: formData.username,
                        password: formData.password,
                        groupId: formData.group_id,
                        ruc: formData.ruc,
                        logo_url: formData.avatar_url || null,
                        sistema_contable_slug: formData.sistema_contable_slug || null
                    }, requesterId);
                }
            } else {
                const groupData = {
                    name: formData.name,
                    image_url: formData.avatar_url || null,
                    category: formData.category || null,
                    username: formData.username || null,
                    password: formData.password || null
                };
                if (editingItem) {
                    result = await updateCompanyGroupAction(editingItem.id, groupData, requesterId);
                } else {
                    result = await createCompanyGroupAction(groupData, requesterId);
                }
            }
            if (result && result.success) {
                showToast(editingItem ? 'Actualizado correctamente' : 'Creado correctamente');
                setShowModal(false);
                setEditingItem(null);
                setFormData({ name: '', type: 'auditoria', username: '', password: '', group_id: '', avatar_url: null, category: null, ruc: '', sistema_contable_slug: '' });
                loadData();
            } else {
                const errorMsg = result?.error || 'Error al guardar';
                showToast(errorMsg, 'error');
            }
        } catch (error) {
            showToast('Error inesperado al procesar la solicitud', 'error');
        }
    };
    const openConfirm = (title, action) => {
        setConfirmModal({ show: true, title, onConfirm: async () => { await action(); setConfirmModal({ show: false, title: '', onConfirm: null }); } });
    };
    const handleDelete = (id, isGroup = false) => {
        openConfirm('¿Estás seguro de eliminar este elemento?', async () => {
            const admin = getAdminSession();
            const requesterId = admin?.id;
            let result;
            if (!isGroup) {
                result = await deleteCompanyAction(id, requesterId);
            } else {
                result = await deleteCompanyGroupAction(id, requesterId);
            }
            if (result.success) { 
                showToast('Eliminado correctamente'); 
                loadData(); 
            } else { 
                showToast('Error al eliminar: ' + result.error, 'error'); 
            }
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
        } catch (error) {  showToast('Error inesperado', 'error'); }
        finally { setUploadingAvatar(false); }
    };
    const showToast = (text, type = 'success') => { setMessage({ text, type }); setTimeout(() => setMessage(null), 3000); };
    const openModal = (item = null, isGroup = false) => {
        setEditingItem(item);
        if (item) {
            const isCompany = item.type !== undefined && !isGroup;
            if (isCompany) {
                setFormData({
                    name: item.name,
                    type: item.type || 'auditoria',
                    username: item.username || '',
                    password: '',
                    group_id: item.group_id || '',
                    avatar_url: item.avatar_url || '',
                    ruc: item.ruc || '',
                    sistema_contable_slug: item.sistema_contable_slug || ''
                });
            } else {
                // It is a group
                setFormData({
                    name: item.name,
                    avatar_url: item.image_url || '',
                    category: item.category || (expandedGroup && !item.id ? expandedGroup.type : null),
                    username: item.username || '',
                    password: item.password || ''
                });
            }
        } else {
            // New Item
            if (isGroup) { // NEW: Handle "Add Group" from category view
                setFormData({
                    name: '',
                    avatar_url: '',
                    category: expandedGroup ? expandedGroup.type : null,
                    username: '',
                    password: ''
                });
            } else {
                setFormData({
                    name: '',
                    type: expandedGroup?.type || 'auditoria',
                    username: '',
                    password: '',
                    group_id: expandedGroup && !['contabilidad', 'auditoria'].includes(expandedGroup.type) ? expandedGroup.id : '',
                    avatar_url: '',
                    category: null,
                    ruc: '',
                    sistema_contable_slug: ''
                });
            }
        }
        setShowModal(true);
    };
    const normalizedSearch = searchTerm.trim().toLowerCase();
    const filteredCompanies = companies.filter(company => {
        if (!normalizedSearch) return true;
        const searchClean = normalizedSearch.trim();
        const rucClean = searchClean.replace(/\D/g, '');
        const nameMatch = company.name.toLowerCase().includes(searchClean);
        const rucMatch = rucClean && company.ruc && company.ruc.includes(rucClean);
        return nameMatch || rucMatch;
    });
    // SharePoint — auto-discover folder via Graph API
    const [archivosLoading, setArchivosLoading] = useState(null); // companyId while loading
    const handleOpenArchivos = async (company) => {
        if (company.sharepoint_folder_url) {
            window.open(company.sharepoint_folder_url, '_blank');
            return;
        }
        const companyId = company.id;
        setArchivosLoading(companyId);
        try {
            const type = (company.type || '').toLowerCase();
            const res = await fetch(`/api/graph/find-folder?company=${encodeURIComponent(company.name)}&type=${type}&_t=${Date.now()}`);
            const data = await res.json();
            if (data.url) {
                window.open(data.url, '_blank');
                if (data.found) {
                    const admin = getAdminSession();
                    const requesterId = admin?.id;
                    if (requesterId) {
                        await updateCompanyAction(companyId, { sharepoint_folder_url: data.url }, requesterId);
                        loadData(); 
                    }
                }
            }
            if (!data.found && data.message) {
                setMessage({ text: data.message, type: 'warning' });
            }
        } catch (err) {
            setMessage({ text: 'Error al buscar carpeta en SharePoint', type: 'error' });
        } finally {
            setArchivosLoading(null);
        }
    };
    const DOC_TYPE_LABELS = {
        financieros: 'Estados Financieros',
        impuestos: 'Declaración de Impuestos',
        informes: 'Informes Analíticos'
    };
    const handleDocUpload = async () => {
        if (!docFile || !docModal) return;
        setDocUploading(true);
        try {
            const ext = docFile.name.split('.').pop()?.toLowerCase();
            const allowedExtensions = new Set(['pdf', 'xlsx', 'xls', 'doc', 'docx', 'png', 'jpg', 'jpeg']);
            if (!allowedExtensions.has(ext)) throw new Error('Tipo de archivo no permitido');
            let baseName = docName.trim() ? docName.trim() : docFile.name.replace(/\.[^/.]+$/, "");
            baseName = baseName.replace(/[^a-zA-Z0-9_.-]/g, '_');
            const path = `company-docs/${docModal.company.id}/${baseName}-${Date.now()}.${ext}`;
            const { data, error } = await supabase.storage
                .from('audit-files')
                .upload(path, docFile, { cacheControl: '3600', upsert: true });
            if (error) throw error;
            const { data: urlData } = supabase.storage
                .from('audit-files')
                .getPublicUrl(path);
            const metaKey = `${docModal.type}_url`;
            const admin = getAdminSession();
            const requesterId = admin?.id;
            const updateRes = await updateCompanyAction(docModal.company.id, { [metaKey]: urlData.publicUrl }, requesterId);
            if (!updateRes.success) throw new Error(updateRes.error || 'Error al guardar URL en la base de datos');
            setMessage({ text: `${DOC_TYPE_LABELS[docModal.type]} subido correctamente`, type: 'success' });
            setDocModal(prev => ({
                ...prev,
                company: {
                    ...prev.company,
                    [metaKey]: urlData.publicUrl
                }
            }));
            setDocFile(null);
            setDocName('');
            loadData();
        } catch (err) {
            setMessage({ text: 'Error al subir archivo: ' + (err.message || ''), type: 'error' });
        } finally {
            setDocUploading(false);
        }
    };
    const handleDocDelete = async () => {
        if (!docModal) return;
        setDocUploading(true);
        try {
            const metaKey = `${docModal.type}_url`;
            const admin = getAdminSession();
            const requesterId = admin?.id;
            const updateRes = await updateCompanyAction(docModal.company.id, { [metaKey]: null }, requesterId);
            if (!updateRes.success) throw new Error(updateRes.error || 'Error al eliminar URL en la base de datos');
            setMessage({ text: `Documento eliminado`, type: 'success' });
            setDocModal(prev => ({
                ...prev,
                company: {
                    ...prev.company,
                    [metaKey]: null
                }
            }));
            setDocFile(null);
            loadData();
        } catch (err) {
            setMessage({ text: 'Error al eliminar: ' + (err.message || ''), type: 'error' });
        } finally {
            setDocUploading(false);
        }
    };
    // Close add menu on outside click
    useEffect(() => {
        const handler = (e) => { if (addMenuRef.current && !addMenuRef.current.contains(e.target)) setShowAddMenu(false); };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);
    const CompanyCard = ({ company, featured = false }) => {
        return (
            <div
                className="p-4 rounded-xl border shadow-sm hover:shadow-lg hover:border-blue-200 dark:hover:border-blue-800/50 transition-all duration-200 group relative cursor-pointer h-full flex flex-col"
                style={{ background: theme.surface, borderColor: theme.border }}
                onClick={() => setActiveCompanyOperations(company)}
                role="link"
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === 'Enter' && e.target === e.currentTarget) setActiveCompanyOperations(company); }}
            >
                <div className="flex justify-between items-start mb-2">
                    {(company.logo_url || company.avatar_url) ? (
                        <div className="w-11 h-11 rounded-lg border overflow-hidden shadow-sm" style={{ backgroundColor: isDark ? theme.surfaceElevated : '#ffffff', borderColor: theme.border }}>
                            <img src={company.logo_url || company.avatar_url} className="w-full h-full object-contain p-1" alt={company.name} />
                        </div>
                    ) : (
                        <div className="w-11 h-11 rounded-lg flex items-center justify-center text-gray-400 border shadow-sm" style={{ backgroundColor: isDark ? theme.surfaceElevated : '#ffffff', borderColor: theme.border }}>
                            <Building2 size={22} />
                        </div>
                    )}
                    {!isWorker && (
                        <div className="flex gap-1">
                            <button onClick={(e) => { e.stopPropagation(); setCredentialModalCompany(company); }} className="p-1.5 text-gray-400 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg transition-colors" title="Gestionar credenciales de automatización"><Lock size={14} /></button>
                            <button onClick={(e) => { e.stopPropagation(); openModal(company); }} className="p-1.5 text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors" title="Editar empresa"><Edit2 size={14} /></button>
                            {!featured && (
                                <button onClick={(e) => { e.stopPropagation(); handleDelete(company.id); }} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors" title="Eliminar empresa"><Trash2 size={14} /></button>
                            )}
                        </div>
                    )}
                </div>
                <h3 className="font-bold text-sm mb-1.5 truncate" style={{ color: theme.text }}>{company.name}</h3>
                <div className="flex flex-wrap gap-1.5 text-[10px] font-bold tracking-tight uppercase">
                    {(() => {
                        const type = (company.type || 'otro').toLowerCase();
                        const style = 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 border-gray-200 dark:border-gray-700';
                        return <span className={`px-2 py-0.5 rounded-full border ${style}`}>{type}</span>;
                    })()}
                    {company.ruc && (
                        <span className="px-2 py-0.5 rounded-full border border-gray-200 bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700">
                            RUC {company.ruc}
                        </span>
                    )}
                </div>
            </div>
        );
    };
    if (activeCompanyOperations) {
        return (
            <div className="animate-fade-in relative transition-all">
                {message && <Toast message={message.text} type={message.type} onClose={() => setMessage(null)} />}
                <CompanyOperationsCenter 
                    company={activeCompanyOperations}
                    onBack={() => setActiveCompanyOperations(null)}
                    theme={theme}
                    isDark={isDark}
                    userPermissions={userPermissions}
                    onPlatformAccess={handlePlatformAccess}
                    onOpenArchivos={handleOpenArchivos}
                    platformAccessLoading={platformAccessLoading}
                />
            </div>
        );
    }
    return (
        <div className="animate-fade-in relative transition-all">
            {message && <Toast message={message.text} type={message.type} onClose={() => setMessage(null)} />}
            {}
            <div className="flex items-center justify-between gap-2 mb-3">
                {}
                {expandedGroup ? (
                    <div className="flex items-center gap-2">
                        <button onClick={handleBackToGroups} className="p-1.5 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg transition-colors text-gray-400 hover:text-gray-700 dark:hover:text-white">
                            <ChevronLeft size={20} />
                        </button>
                        <h3 className="text-lg font-bold" style={{ color: theme.text }}>{expandedGroup.name}</h3>
                    </div>
                ) : (
                    <div className="flex items-center gap-2">
                        <Layers className="text-blue-500" size={24} />
                        <h2 className="text-xl sm:text-2xl font-bold" style={{ color: theme.text }}>Grupos de Trabajo</h2>
                    </div>
                )}
                {}
                <div className="flex items-center gap-2">
                    <div className="relative group/search">
                        <input
                            type="text"
                            placeholder={expandedGroup ? 'Buscar...' : 'Buscar empresa o RUC...'}
                            className="w-44 sm:w-64 pl-9 pr-9 py-2.5 rounded-2xl border text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all shadow-sm group-hover/search:shadow-md"
                            style={{ 
                                background: isDark ? '#1e293b' : '#fff', 
                                borderColor: isDark ? 'rgba(255,255,255,0.1)' : '#e2e8f0', 
                                color: theme.text 
                            }}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-500/50 group-hover/search:text-blue-500 transition-colors" size={16} />
                        {searchTerm && (
                            <button 
                                onClick={() => setSearchTerm('')}
                                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-100 dark:hover:bg-white/10 rounded-full transition-colors text-gray-400 hover:text-gray-600 dark:hover:text-white"
                            >
                                <X size={14} />
                            </button>
                        )}
                    </div>
                    {!isWorker && (
                        <div className="relative" ref={addMenuRef}>
                        <button
                            onClick={() => setShowAddMenu(!showAddMenu)}
                            className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-colors shadow-sm font-bold text-sm"
                        >
                            <Plus size={16} />
                            <span className="hidden sm:inline">Nuevo</span>
                            <ChevronDown size={14} className={`transition-transform ${showAddMenu ? 'rotate-180' : ''}`} />
                        </button>
                        {showAddMenu && (
                            <div className="absolute right-0 top-full mt-1 w-48 rounded-xl border shadow-xl z-50 overflow-hidden" style={{ background: theme.surface, borderColor: theme.border }}>
                                <button
                                    onClick={() => { openModal(null); setShowAddMenu(false); }}
                                    className="w-full px-4 py-2.5 text-left text-sm font-medium flex items-center gap-2 hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-colors"
                                    style={{ color: theme.text }}
                                >
                                    <Building2 size={15} className="text-blue-500" /> Nueva Empresa
                                </button>
                                {(expandedGroup?.type === 'contabilidad' || expandedGroup?.type === 'auditoria') && (
                                    <button
                                        onClick={() => { openModal(null, true); setShowAddMenu(false); }}
                                        className="w-full px-4 py-2.5 text-left text-sm font-medium flex items-center gap-2 hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-colors border-t"
                                        style={{ color: theme.text, borderColor: theme.border }}
                                    >
                                        <FolderPlus size={15} className="text-emerald-500" /> Nuevo Grupo
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                    )}
                </div>
            </div>
            {loading ? (
                <div className="flex justify-center p-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>
            ) : (
                <>
                    {}
                    {!expandedGroup && normalizedSearch && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 px-1">
                                <div className="animate-in fade-in slide-in-from-left-4 duration-500">
                                    <h4 className="text-[10px] font-black opacity-30 uppercase tracking-[0.2em]">Búsqueda Global</h4>
                                    <p className="text-lg sm:text-xl font-black mt-1" style={{ color: theme.text }}>
                                        {filteredCompanies.length} {filteredCompanies.length === 1 ? 'resultado' : 'resultados'} para "{searchTerm}"
                                    </p>
                                </div>
                                <button 
                                    onClick={() => setSearchTerm('')}
                                    className="text-[11px] font-bold text-blue-500 hover:underline px-4 py-2 rounded-xl bg-blue-500/10 transition-all hover:bg-blue-500/20 w-fit"
                                >
                                    Limpiar búsqueda
                                </button>
                            </div>
                            {filteredCompanies.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-20 text-center rounded-[2rem] border-2 border-dashed animate-in zoom-in-95 duration-500" style={{ borderColor: theme.border, background: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.01)' }}>
                                    <div className="w-20 h-20 rounded-3xl bg-gray-100 dark:bg-white/5 flex items-center justify-center mb-6">
                                        <Search size={40} className="text-gray-300 dark:text-gray-700" />
                                    </div>
                                    <p className="text-xl font-black" style={{ color: theme.text }}>No encontramos coincidencias</p>
                                    <p className="text-sm opacity-50 mt-2 max-w-xs">Intenta buscar por el nombre exacto de la empresa o los números del RUC.</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {filteredCompanies
                                        .sort((a, b) => {
                                            // Prioritize exact name matches
                                            const aExact = a.name.toLowerCase() === normalizedSearch;
                                            const bExact = b.name.toLowerCase() === normalizedSearch;
                                            if (aExact && !bExact) return -1;
                                            if (!aExact && bExact) return 1;
                                            return 0;
                                        })
                                        .map((company, index) => (
                                            <div key={company.id} className="animate-in fade-in slide-in-from-bottom-4 duration-500" style={{ animationDelay: `${index * 50}ms` }}>
                                                <CompanyCard company={company} featured={false} />
                                            </div>
                                        ))}
                                </div>
                            )}
                        </div>
                    )}
                    {!expandedGroup && !normalizedSearch && (
                        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-6 duration-700 delay-75">
                            <div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {groups.filter(g => !g.category).map((group, index) => {
                                        // Get companies in this group
                                        const groupCompanies = companies.filter(c => c.group_id === group.id);
                                        const previewNames = groupCompanies.slice(0, 3).map(c => c.name).join(', ');
                                        const moreCount = groupCompanies.length > 3 ? `+${groupCompanies.length - 3}` : '';
                                        return (
                                            <div
                                                key={group.id}
                                                onClick={() => handleGroupClick(group)}
                                                className="group relative flex flex-col items-start p-4 rounded-xl border transition-all hover:scale-[1.02] hover:shadow-lg text-left h-full cursor-pointer animate-in fade-in slide-in-from-bottom-4 duration-500"
                                                style={{ background: theme.surface, borderColor: theme.border, animationDelay: `${(index + 1) * 60}ms` }}
                                            >
                                                <div className="w-full flex items-start justify-between mb-3">
                                                    <div className="w-10 h-10 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform shadow-sm border" style={{ backgroundColor: isDark ? theme.surfaceElevated : '#ffffff', borderColor: theme.border }}>
                                                        {group.image_url ? (
                                                            <img src={group.image_url} className="w-full h-full object-cover rounded-lg" alt="" />
                                                        ) : (
                                                            <Folder size={20} className="text-blue-500" />
                                                        )}
                                                    </div>
                                                    {!isWorker && (
                                                        <div className="flex gap-1 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <button
                                                                onClick={(e) => { e.stopPropagation(); openModal(group, true); }}
                                                                className="p-1.5 hover:bg-blue-500/10 rounded-lg text-blue-500 transition-colors"
                                                            >
                                                                <Edit2 size={14} />
                                                            </button>
                                                            <button
                                                                onClick={(e) => { e.stopPropagation(); handleDelete(group.id, true); }}
                                                                className="p-1.5 hover:bg-red-500/10 rounded-lg text-red-500 transition-colors"
                                                            >
                                                                <Trash2 size={14} />
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                                <h3 className="text-base font-bold mb-1" style={{ color: theme.text }}>{group.name}</h3>
                                                <div className="flex items-center gap-2 mb-3">
                                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400 border border-blue-100 dark:border-blue-900/30 uppercase tracking-tight">
                                                        {groupCompanies.length} Empresas
                                                    </span>
                                                </div>
                                                {}
                                                {groupCompanies.length > 0 ? (
                                                    <div className="w-full mt-auto pt-3 border-t border-dashed border-gray-200 dark:border-gray-700">
                                                        <p className="text-xs text-gray-500 truncate dark:text-gray-400 font-medium">
                                                            {previewNames} {moreCount && <span className="text-blue-500 font-bold">{moreCount}</span>}
                                                        </p>
                                                    </div>
                                                ) : (
                                                    <div className="w-full mt-auto pt-3 border-t border-dashed border-gray-200 dark:border-gray-700">
                                                        <p className="text-xs text-gray-400 italic">Sin empresas asignadas</p>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                    {}
                                    {legacyGroups.map((lg, index) => {
                                        const count = companies.filter(c => c.type === lg.type && !c.group_id).length; 
                                        const typeCompanies = companies.filter(c => c.type === lg.type);
                                        const previewNames = typeCompanies.slice(0, 3).map(c => c.name).join(', ');
                                        return (
                                            <div
                                                key={lg.id}
                                                onClick={() => handleGroupClick(lg)}
                                                className="group relative flex flex-col items-start p-4 rounded-xl border transition-all hover:scale-[1.02] hover:shadow-lg text-left h-full opacity-80 hover:opacity-100 cursor-pointer animate-in fade-in slide-in-from-bottom-4 duration-500"
                                                style={{ 
                                                    background: theme.surface, 
                                                    borderColor: theme.border,
                                                    animationDelay: `${(groups.length + index + 1) * 60}ms`
                                                }}
                                            >
                                                <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 group-hover:scale-110 transition-transform shadow-sm border ${
                                                    lg.type === 'contabilidad' 
                                                        ? 'text-emerald-500 bg-emerald-50 dark:bg-emerald-500/10 border-emerald-100 dark:border-emerald-500/20' 
                                                        : lg.type === 'auditoria' 
                                                            ? 'text-blue-500 bg-blue-50 dark:bg-blue-500/10 border-blue-100 dark:border-blue-500/20' 
                                                            : 'text-purple-500 bg-purple-50 dark:bg-purple-500/10 border-purple-100 dark:border-purple-500/20'
                                                }`}>
                                                    {lg.type === 'contabilidad' ? <Calculator size={20} /> : lg.type === 'auditoria' ? <FileText size={20} /> : <Users size={20} />}
                                                </div>
                                                <h3 className="text-base font-bold mb-1" style={{ color: theme.text }}>{lg.name}</h3>
                                                <div className="flex items-center gap-2 mb-3">
                                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-50 text-gray-600 dark:bg-gray-800 dark:text-gray-400 border border-gray-100 dark:border-gray-700 uppercase tracking-tight">
                                                        {typeCompanies.length} Empresas
                                                    </span>
                                                </div>
                                                <div className="w-full mt-auto pt-4 border-t border-dashed border-gray-200 dark:border-gray-700">
                                                    <p className="text-xs text-gray-500 truncate dark:text-gray-400 font-medium">
                                                        {previewNames || <span className="italic opacity-50 font-normal">Sin empresas</span>}
                                                    </p>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    )}
                    {}
                    {expandedGroup && (
                         <div className="animate-fade-in space-y-6">
                            {}
                            {(expandedGroup.type === 'contabilidad' || expandedGroup.type === 'auditoria') && (
                                <div className="space-y-4">
                                    <h4 className="text-sm font-bold opacity-40 uppercase tracking-widest px-1">Grupos en {expandedGroup.name}</h4>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pb-4 border-b border-gray-100 dark:border-gray-800/50">
                                        {groups.filter(g => g.category === expandedGroup.type).map(group => {
                                            const groupCompanies = companies.filter(c => c.group_id === group.id);
                                            const previewNames = groupCompanies.slice(0, 3).map(c => c.name).join(', ');
                                            const moreCount = groupCompanies.length > 3 ? `+${groupCompanies.length - 3}` : '';
                                            return (
                                                <div
                                                    key={group.id}
                                                    onClick={() => handleGroupClick(group)}
                                                    role="button"
                                                    tabIndex={0}
                                                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleGroupClick(group); } }}
                                                    className="group relative flex flex-col items-start p-4 rounded-xl border transition-all hover:scale-[1.02] hover:shadow-lg text-left h-full cursor-pointer"
                                                    style={{ background: theme.surface, borderColor: theme.border }}
                                                >
                                                    <div className="w-full flex items-start justify-between mb-3">
                                                        <div className="w-10 h-10 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform shadow-sm border" style={{ backgroundColor: isDark ? theme.surfaceElevated : '#ffffff', borderColor: theme.border }}>
                                                            {group.image_url ? (
                                                                <img src={group.image_url} className="w-full h-full object-cover rounded-lg" alt="" />
                                                            ) : (
                                                                <Folder size={20} className="text-blue-500" />
                                                            )}
                                                        </div>
                                                        {!isWorker && (
                                                            <div className="flex gap-1 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                                                                <button
                                                                    onClick={(e) => { e.stopPropagation(); openModal(group, true); }}
                                                                    className="p-1.5 hover:bg-blue-500/10 rounded-lg text-blue-500 transition-colors"
                                                                >
                                                                    <Edit2 size={14} />
                                                                </button>
                                                                <button
                                                                    onClick={(e) => { e.stopPropagation(); handleDelete(group.id, true); }}
                                                                    className="p-1.5 hover:bg-red-500/10 rounded-lg text-red-500 transition-colors"
                                                                >
                                                                    <Trash2 size={14} />
                                                                </button>
                                                            </div>
                                                        )}
                                                    </div>
                                                    <h3 className="text-base font-bold mb-1" style={{ color: theme.text }}>{group.name}</h3>
                                                    <div className="flex items-center gap-2 mb-3">
                                                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400 border border-blue-100 dark:border-blue-900/30 uppercase tracking-tight">
                                                            {groupCompanies.length} Empresas
                                                        </span>
                                                    </div>
                                                    <div className="w-full mt-auto pt-3 border-t border-dashed border-gray-200 dark:border-gray-700">
                                                        <p className="text-xs text-gray-500 truncate dark:text-gray-400 font-medium">
                                                            {previewNames} {moreCount && <span className="text-blue-500 font-bold">{moreCount}</span>}
                                                        </p>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                        {groups.filter(g => g.category === expandedGroup.type).length === 0 && (
                                            <div className="col-span-full py-8 text-center border-2 border-dashed border-gray-100 dark:border-gray-800/50 rounded-xl">
                                                <p className="text-sm italic opacity-40">No hay grupos creados en esta categoría</p>
                                            </div>
                                        )}
                                    </div>
                                    <h4 className="text-sm font-bold opacity-40 uppercase tracking-widest px-1">Empresas Directas</h4>
                                </div>
                            )}
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                {(() => {
                                    const legacyTypes = ['contabilidad', 'auditoria']; 
                                    const groupCompanies = filteredCompanies.filter(c => {
                                        if (expandedGroup.type && legacyTypes.includes(expandedGroup.type)) {
                                            return c.type === expandedGroup.type && !c.group_id;
                                        }
                                        return c.group_id === expandedGroup.id;
                                    });
                                    if (groupCompanies.length === 0) {
                                        return (
                                            <div className="col-span-full flex flex-col items-center justify-center py-12 text-center">
                                                <Building2 size={48} className="text-gray-300 mb-4" />
                                                <p className="text-lg font-bold" style={{ color: theme.text }}>No hay empresas en este grupo</p>
                                                <p className="text-sm opacity-60 mt-1">Asigna empresas a este grupo editándolas individualmente</p>
                                            </div>
                                        );
                                    }
                                    return groupCompanies.map(company => (
                                        <div key={company.id}>
                                            <CompanyCard company={company} />
                                        </div>
                                    ));
                                })()}
                            </div>
                        </div>
                    )}
                </>
            )}
            {}
            {showModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in" style={{ background: theme.surface, borderColor: theme.border }}>
                    <div className="rounded-xl shadow-lg w-full max-w-md overflow-hidden border" style={{ background: theme.surface, borderColor: theme.border }}>
                        <div className="p-6">
                            <h3 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">
                                {editingItem ? 'Editar' : 'Crear Nuevo'}
                            </h3>
                            <form onSubmit={handleSave} className="space-y-4">
                                {}
                                {!isWorker && (
                                    <div className="flex justify-center mb-4">
                                        <div className="relative group cursor-pointer">
                                            <div className="w-24 h-24 rounded-xl overflow-hidden border-2 border-dashed border-gray-300 dark:border-gray-600 flex items-center justify-center bg-gray-50 dark:bg-black/20 hover:bg-gray-100 transition-colors">
                                                {formData.avatar_url ? (
                                                    <img src={formData.avatar_url} className="w-full h-full object-cover" />
                                                ) : (
                                                    <div className="text-center p-2">
                                                        <ImageIcon className="mx-auto text-gray-400 mb-1" size={24} />
                                                        <span className="text-[10px] text-gray-400 font-bold uppercase">Subir Imagen</span>
                                                    </div>
                                                )}
                                            </div>
                                            <input
                                                type="file"
                                                accept="image/*"
                                                onChange={handleAvatarUpload}
                                                className="absolute inset-0 opacity-0 cursor-pointer"
                                                disabled={uploadingAvatar}
                                            />
                                            {uploadingAvatar && (
                                                <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-xl">
                                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                                {!isWorker && (
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
                                )}
                                {}
                                <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
                                    <label className="block text-xs text-gray-500 mb-1 uppercase font-bold">Credenciales Globales</label>
                                    <div className="grid grid-cols-2 gap-2">
                                        <input
                                            type="text"
                                            placeholder="Usuario"
                                            autoComplete="off"
                                            className="w-full px-3 py-2 rounded-lg border bg-transparent outline-none"
                                            style={{ borderColor: theme.border, color: theme.text }}
                                            value={formData.username}
                                            onChange={e => setFormData({ ...formData, username: e.target.value })}
                                        />
                                        <input
                                            type="password"
                                            placeholder="Clave"
                                            autoComplete="new-password"
                                            className="w-full px-3 py-2 rounded-lg border bg-transparent outline-none"
                                            style={{ borderColor: theme.border, color: theme.text }}
                                            value={formData.password}
                                            onChange={e => setFormData({ ...formData, password: e.target.value })}
                                        />
                                    </div>
                                </div>
                                {}
                                {!isWorker && ((!formData.category && !editingItem) || (editingItem && editingItem.type !== undefined)) && (
                                    <>
                                        <div>
                                            <label className="block text-sm font-medium mb-1" style={{ color: theme.textSecondary }}>Categoría (Legacy)</label>
                                            <CustomSelect
                                                value={formData.type}
                                                onChange={val => setFormData({ ...formData, type: val })}
                                                options={[
                                                    {value: 'auditoria', label: 'Auditoría'},
                                                    {value: 'contabilidad', label: 'Contabilidad'},
                                                    {value: 'otro', label: 'Otro'}
                                                ]}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium mb-1" style={{ color: theme.textSecondary }}>Sistema Contable</label>
                                            <CustomSelect
                                                value={formData.sistema_contable_slug || ''}
                                                onChange={val => setFormData({ ...formData, sistema_contable_slug: val })}
                                                options={[
                                                    {value: '', label: 'Ninguno'},
                                                    ...getAccountingPlatforms().map(p => ({value: p.slug, label: p.nombre}))
                                                ]}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium mb-1" style={{ color: theme.textSecondary }}>RUC</label>
                                            <input
                                                type="text"
                                                inputMode="numeric"
                                                maxLength={13}
                                                className="w-full px-4 py-2 rounded-lg border focus:ring-2 focus:ring-blue-500 outline-none"
                                                style={{ background: isDark ? 'rgba(0,0,0,0.2)' : '#fff', borderColor: theme.border, color: theme.text }}
                                                value={formData.ruc || ''}
                                                onChange={e => setFormData({ ...formData, ruc: e.target.value.replace(/\D/g, '').slice(0, 13) })}
                                                onBlur={e => setFormData({ ...formData, ruc: normalizeRuc(e.target.value) || '' })}
                                                placeholder="13 dígitos"
                                            />
                                            <p className="text-[10px] opacity-50 mt-1" style={{ color: theme.textSecondary }}>
                                                Se usa para calcular vencimientos por noveno dígito.
                                            </p>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="block text-sm font-medium" style={{ color: theme.textSecondary }}>Grupo de Empresas</label>
                                            <div
                                                className="w-full rounded-xl border overflow-hidden"
                                                style={{ borderColor: theme.border, background: isDark ? 'rgba(0,0,0,0.2)' : '#fff' }}
                                            >
                                                <div className="max-h-48 overflow-y-auto custom-scrollbar">
                                                    <button
                                                        type="button"
                                                        onClick={() => setFormData({ ...formData, group_id: '' })}
                                                        className={`w-full px-4 py-3 flex items-center gap-3 transition-colors text-left border-b font-medium text-xs uppercase tracking-wider ${!formData.group_id ? 'bg-blue-50/50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400' : 'hover:bg-gray-50 dark:hover:bg-white/5 opacity-50'}`}
                                                        style={{ borderColor: theme.border }}
                                                    >
                                                        <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                                                            <X size={14} />
                                                        </div>
                                                        -- Sin Grupo asignado --
                                                    </button>
                                                    {groups.map(g => (
                                                        <button
                                                            key={g.id}
                                                            type="button"
                                                            onClick={() => setFormData({ ...formData, group_id: g.id })}
                                                            className={`w-full px-4 py-3 flex items-center gap-3 transition-colors text-left border-b last:border-0 ${formData.group_id === g.id ? 'bg-blue-50 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400' : 'hover:bg-gray-50 dark:hover:bg-white/5'}`}
                                                            style={{ borderColor: theme.border }}
                                                        >
                                                            <div className="w-8 h-8 rounded-lg overflow-hidden flex-shrink-0 border bg-white dark:bg-gray-800" style={{ borderColor: theme.border }}>
                                                                {g.image_url ? (
                                                                    <img src={g.image_url} className="w-full h-full object-cover" />
                                                                ) : (
                                                                    <div className="w-full h-full flex items-center justify-center text-blue-500">
                                                                        <Folder size={16} />
                                                                    </div>
                                                                )}
                                                            </div>
                                                            <div className="flex flex-col">
                                                                <span className="font-bold text-sm" style={{ color: formData.group_id === g.id ? 'inherit' : theme.text }}>{g.name}</span>
                                                                {g.category && <span className="text-[10px] opacity-50 uppercase font-black">{g.category}</span>}
                                                            </div>
                                                            {formData.group_id === g.id && <CheckCircle size={16} className="ml-auto" />}
                                                        </button>
                                                    ))}
                                                </div>
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
            {credentialModalCompany && (
                <CredentialManager 
                    company={credentialModalCompany} 
                    onClose={() => setCredentialModalCompany(null)} 
                />
            )}
            {
                confirmModal.show && (
                    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" style={{ zIndex: 110 }}>
                        <div className="rounded-xl shadow-lg w-full max-w-sm border p-6" style={{ background: theme.surface, borderColor: theme.border }}>
                            <h3 className="text-lg font-bold mb-3" style={{ color: theme.text }}>Confirmación</h3>
                            <p className="mb-6" style={{ color: theme.textSecondary }}>{confirmModal.title}</p>
                            <div className="flex justify-end gap-3">
                                <button onClick={() => setConfirmModal({ ...confirmModal, show: false })} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">Cancelar</button>
                                <button onClick={confirmModal.onConfirm} className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium">Confirmar</button>
                            </div>
                        </div>
                    </div>
                )
            }
            {docModal && (() => {
                const colors = {
                    financieros: { accent: '#10b981', bg: isDark ? 'rgba(16,185,129,0.08)' : '#ecfdf5', icon: <BarChart3 size={24} /> },
                    impuestos: { accent: '#f59e0b', bg: isDark ? 'rgba(245,158,11,0.08)' : '#fffbeb', icon: <TrendingUp size={24} /> },
                    informes: { accent: '#8b5cf6', bg: isDark ? 'rgba(139,92,246,0.08)' : '#f5f3ff', icon: <FileBarChart size={24} /> }
                };
                const c = colors[docModal.type];
                const existingUrl = docModal.company[`${docModal.type}_url`];
                return (
                    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
                        <div className="rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border" style={{ background: theme.surface, borderColor: theme.border }}>
                            {}
                            <div className="flex items-center gap-3 p-5 border-b" style={{ borderColor: theme.border, background: c.bg }}>
                                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ color: c.accent, background: isDark ? 'rgba(255,255,255,0.05)' : '#fff' }}>
                                    {c.icon}
                                </div>
                                <div className="flex-1">
                                    <h3 className="font-bold text-base" style={{ color: theme.text }}>{DOC_TYPE_LABELS[docModal.type]}</h3>
                                    <p className="text-xs opacity-60">{docModal.company.name}</p>
                                </div>
                                <button onClick={() => { setDocModal(null); setDocFile(null); }} className="p-1.5 rounded-lg hover:bg-black/10 dark:hover:bg-white/10 transition-colors">
                                    <X size={18} style={{ color: theme.textSecondary }} />
                                </button>
                            </div>
                            <div className="p-5 space-y-4">
                                {}
                                {existingUrl && (
                                    <div className="p-3 rounded-xl border space-y-2" style={{ borderColor: `${c.accent}33`, background: c.bg }}>
                                        <div className="flex items-center gap-2">
                                            <CheckCircle size={16} style={{ color: c.accent }} />
                                            <span className="text-xs font-semibold flex-1" style={{ color: c.accent }}>Documento cargado</span>
                                        </div>
                                        <div className="flex gap-2">
                                            <a
                                                href={existingUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="flex-1 py-1.5 rounded-lg text-xs font-bold text-center border transition-colors hover:opacity-80"
                                                style={{ color: c.accent, borderColor: `${c.accent}44`, background: isDark ? 'rgba(255,255,255,0.05)' : '#fff' }}
                                            >
                                                Ver archivo
                                            </a>
                                            {!isWorker && (
                                                <button
                                                    onClick={handleDocDelete}
                                                    disabled={docUploading}
                                                    className="px-3 py-1.5 rounded-lg text-xs font-bold border text-red-500 border-red-200 dark:border-red-900/30 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors disabled:opacity-40"
                                                >
                                                    <Trash2 size={12} className="inline mr-1" />Eliminar
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                )}
                                {isWorker && !existingUrl && (
                                    <div className="p-4 rounded-xl border text-center text-sm font-medium" style={{ borderColor: theme.border, color: theme.textSecondary }}>
                                        No hay documento cargado
                                    </div>
                                )}
                                {!isWorker && (
                                    <>
                                        {}
                                        <div
                                            onDragOver={(e) => { e.preventDefault(); setDocDragging(true); }}
                                            onDragLeave={() => setDocDragging(false)}
                                            onDrop={(e) => {
                                                e.preventDefault();
                                                setDocDragging(false);
                                                const f = e.dataTransfer.files[0];
                                                if (f) setDocFile(f);
                                            }}
                                            onClick={() => fileInputRef.current?.click()}
                                            className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${docDragging ? 'scale-[1.02]' : 'hover:border-opacity-60'}`}
                                            style={{
                                                borderColor: docDragging ? c.accent : (isDark ? 'rgba(255,255,255,0.15)' : '#e2e8f0'),
                                                background: docDragging ? c.bg : 'transparent'
                                            }}
                                        >
                                            <input
                                                ref={fileInputRef}
                                                type="file"
                                                className="hidden"
                                                accept=".pdf,.xlsx,.xls,.doc,.docx,.png,.jpg,.jpeg"
                                                onChange={(e) => { if (e.target.files[0]) setDocFile(e.target.files[0]); }}
                                            />
                                            {docFile ? (
                                                <div className="space-y-2">
                                                    <div className="w-12 h-12 mx-auto rounded-xl flex items-center justify-center" style={{ background: c.bg }}>
                                                        <CheckCircle size={24} style={{ color: c.accent }} />
                                                    </div>
                                                    <p className="text-sm font-bold truncate" style={{ color: theme.text }}>{docFile.name}</p>
                                                    <p className="text-[11px] opacity-50">{(docFile.size / 1024).toFixed(0)} KB — Clic para cambiar</p>
                                                </div>
                                            ) : (
                                                <div className="space-y-2">
                                                    <div className="w-12 h-12 mx-auto rounded-xl flex items-center justify-center" style={{ background: c.bg }}>
                                                        <Upload size={24} style={{ color: c.accent }} />
                                                    </div>
                                                    <p className="text-sm font-semibold" style={{ color: theme.text }}>
                                                        {existingUrl ? 'Subir nuevo archivo (reemplazar)' : 'Arrastra o selecciona archivo'}
                                                    </p>
                                                    <p className="text-[11px] opacity-50">PDF, Excel, Word, Imágenes (máx. 50MB)</p>
                                                </div>
                                            )}
                                        </div>
                                        {}
                                        <div className="mt-3">
                                            <label className="text-sm font-semibold opacity-80 mb-1 block" style={{ color: theme.text }}>Nombre a mostrar</label>
                                            <input 
                                                type="text" 
                                                value={docName} 
                                                onChange={(e) => setDocName(e.target.value)} 
                                                placeholder="Ej: Reporte Anual 2024"
                                                className="w-full px-4 py-2 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                style={{ background: isDark ? '#1a1f2e' : '#fff', borderColor: theme.border, color: theme.text }}
                                            />
                                            <p className="text-[10px] opacity-50 mt-1" style={{ color: theme.text }}>
                                                Si se deja en blanco se utilizará el nombre original del archivo.
                                            </p>
                                        </div>
                                        {}
                                        <div className="flex gap-2 pt-1">
                                            <button
                                                onClick={() => { setDocModal(null); setDocFile(null); }}
                                                className="flex-1 py-2.5 rounded-xl text-sm font-medium border transition-colors hover:bg-gray-50 dark:hover:bg-white/5"
                                                style={{ borderColor: theme.border, color: theme.textSecondary }}
                                            >
                                                Cancelar
                                            </button>
                                            <button
                                                onClick={handleDocUpload}
                                                disabled={!docFile || docUploading}
                                                className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-40 flex items-center justify-center gap-1.5"
                                                style={{ background: c.accent }}
                                            >
                                                {docUploading ? (
                                                    <><div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Subiendo...</>
                                                ) : (
                                                    <><Upload size={14} /> {existingUrl ? 'Reemplazar' : 'Subir'}</>
                                                )}
                                            </button>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                );
            })()}
        </div >
    );
}
