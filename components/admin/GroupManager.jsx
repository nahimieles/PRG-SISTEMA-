'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import {
    Folder,
    Link as LinkIcon,
    MoreVertical,
    Plus,
    Trash2,
    Edit2,
    ChevronRight,
    ChevronDown,
    Move,
    Check,
    X,
    LayoutGrid,
    Search,
    Type,
    Palette,
    Layers,
    RefreshCw
} from 'lucide-react';
import { getGroups, createGroup, updateGroup, deleteGroup, moveGroup } from '@/lib/groups';
import { useTheme } from '@/contexts/ThemeContext';
import { lightTheme, darkTheme } from '@/lib/colors';
import * as LucideIcons from 'lucide-react';

export default function GroupManager() {
    const { isDark } = useTheme();
    const theme = isDark ? darkTheme : lightTheme;

    // State
    const [groups, setGroups] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedGroup, setSelectedGroup] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState('create'); // 'create' | 'edit'
    const [workers, setWorkers] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');

    // Form State
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        type: 'group', // group, folder, link
        icon: 'Folder',
        color: '#3498db',
        image_url: '',
        parent_id: null,
        resource_id: '',
        permissions: ['admin', 'manager']
    });

    const [expandedGroups, setExpandedGroups] = useState(new Set());

    useEffect(() => {
        loadGroups();
        loadWorkers();
    }, []);

    const loadWorkers = async () => {
        const { getAllWorkers } = await import('@/lib/auth');
        const data = await getAllWorkers();
        setWorkers(data || []);
    };

    const loadGroups = async () => {
        setLoading(true);
        try {
            const data = await getGroups();
            setGroups(data);
        } catch (error) {
            console.error('Failed to load groups:', error);
        } finally {
            setLoading(false);
        }
    };

    // Helper to build hierarchy
    const buildHierarchy = (items) => {
        const itemMap = {};
        const roots = [];

        // Initialize map
        items.forEach(item => {
            itemMap[item.id] = { ...item, children: [] };
        });

        // Build tree
        items.forEach(item => {
            if (item.parent_id && itemMap[item.parent_id]) {
                itemMap[item.parent_id].children.push(itemMap[item.id]);
            } else {
                roots.push(itemMap[item.id]);
            }
        });

        return roots;
    };

    const handleCreate = (parentId = null) => {
        setModalMode('create');
        setFormData({
            name: '',
            description: '',
            type: 'group',
            icon: 'Folder',
            color: '#3498db',
            image_url: '',
            parent_id: parentId,
            resource_id: '',
            permissions: ['admin', 'manager']
        });
        setIsModalOpen(true);
    };

    const handleEdit = (group) => {
        setModalMode('edit');
        setSelectedGroup(group);
        setFormData({
            name: group.name,
            description: group.description || '',
            type: group.type,
            icon: group.icon || 'Folder',
            color: group.color || '#3498db',
            image_url: group.image_url || '',
            parent_id: group.parent_id,
            resource_id: group.resource_id || '',
            permissions: group.permissions || ['admin', 'manager']
        });
        setIsModalOpen(true);
    };

    const handleDelete = async (id) => {
        if (!confirm('¿Estás seguro de eliminar este grupo y todos sus descendientes?')) return;
        try {
            await deleteGroup(id);
            loadGroups();
        } catch (error) {
            alert('Error eliminando grupo: ' + error.message);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (modalMode === 'create') {
                await createGroup(formData);
            } else {
                await updateGroup(selectedGroup.id, formData);
            }
            setIsModalOpen(false);
            loadGroups();
        } catch (error) {
            alert('Error guardando: ' + error.message);
        }
    };

    const togglePermission = (value) => {
        const perms = new Set(formData.permissions);
        if (perms.has(value)) {
            perms.delete(value);
        } else {
            perms.add(value);
        }
        setFormData({ ...formData, permissions: Array.from(perms) });
    };

    const setPublicPermission = (isPublic) => {
        let newPerms = ['admin', 'manager']; // Always keep admins
        if (isPublic) newPerms.push('all');
        setFormData({ ...formData, permissions: newPerms });
    }

    const toggleExpand = (id) => {
        const newSet = new Set(expandedGroups);
        if (newSet.has(id)) newSet.delete(id);
        else newSet.add(id);
        setExpandedGroups(newSet);
    };

    // Filter groups for search (flattened view when searching)
    const filteredGroups = searchTerm
        ? groups.filter(g => g.name.toLowerCase().includes(searchTerm.toLowerCase()))
        : groups;

    const hierarchy = !searchTerm ? buildHierarchy(groups) : null;

    // Recursive component for Tree Item
    const TreeItem = ({ item, depth = 0 }) => {
        const hasChildren = item.children && item.children.length > 0;
        const isExpanded = expandedGroups.has(item.id);
        const ItemIcon = LucideIcons[item.icon] || Folder;

        return (
            <div className="select-none">
                <div
                    className={`flex items-center gap-1.5 sm:gap-2 p-1.5 sm:p-2 rounded-lg hover:bg-black/5 transition-colors border-b border-gray-100/50 group`}
                    style={{ marginLeft: `${depth * 16}px` }}
                >
                    <button
                        onClick={() => toggleExpand(item.id)}
                        className={`p-0.5 sm:p-1 rounded hover:bg-black/10 transition-transform flex-shrink-0 ${hasChildren ? '' : 'invisible'}`}
                    >
                        {isExpanded ? <ChevronDown size={12} className="sm:w-3.5 sm:h-3.5" /> : <ChevronRight size={12} className="sm:w-3.5 sm:h-3.5" />}
                    </button>

                    <div
                        className="w-6 h-6 sm:w-8 sm:h-8 flex items-center justify-center rounded-lg shadow-sm flex-shrink-0"
                        style={{ backgroundColor: item.color + '20', color: item.color }}
                    >
                        <ItemIcon size={14} className="sm:w-4 sm:h-4" />
                    </div>

                    <div className="flex-1 min-w-0">
                        <div className="font-medium text-xs sm:text-sm flex items-center gap-1 sm:gap-2">
                            <span className="truncate">{item.name}</span>
                            {item.type === 'link' && <span className="px-1 py-0.5 rounded text-[8px] sm:text-[9px] bg-blue-100 text-blue-700 font-bold uppercase flex-shrink-0">Link</span>}
                        </div>
                        <div className="text-[10px] sm:text-xs opacity-50 hidden sm:flex gap-2">
                            {item.resource_id && <span className="font-mono truncate">{item.resource_id}</span>}
                        </div>
                    </div>

                    <div className="flex items-center gap-0.5 sm:gap-1 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                        <button
                            onClick={() => handleCreate(item.id)}
                            title="Add Child"
                            className="p-1 sm:p-1.5 hover:bg-blue-50 text-blue-600 rounded"
                        >
                            <Plus size={12} className="sm:w-3.5 sm:h-3.5" />
                        </button>
                        <button
                            onClick={() => handleEdit(item)}
                            title="Edit"
                            className="p-1 sm:p-1.5 hover:bg-amber-50 text-amber-600 rounded"
                        >
                            <Edit2 size={12} className="sm:w-3.5 sm:h-3.5" />
                        </button>
                        <button
                            onClick={() => handleDelete(item.id)}
                            title="Delete"
                            className="p-1 sm:p-1.5 hover:bg-red-50 text-red-600 rounded"
                        >
                            <Trash2 size={12} className="sm:w-3.5 sm:h-3.5" />
                        </button>
                    </div>
                </div>

                {isExpanded && hasChildren && (
                    <div className="anim-slide-down">
                        {item.children.map(child => (
                            <TreeItem key={child.id} item={child} depth={depth + 1} />
                        ))}
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="w-full h-full flex flex-col animate-fade-in overflow-x-hidden">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-3">
                <div>
                    <h2 className="text-lg sm:text-xl lg:text-2xl font-bold flex items-center gap-2">
                        <LayoutGrid className="text-blue-600" size={20} />
                        Gestor de Grupos
                    </h2>
                    <p className="text-xs sm:text-sm opacity-60">Configura la estructura virtual.</p>
                </div>

                <div className="flex items-center gap-3 w-full md:w-auto">
                    <div className="relative flex-1 md:w-64">
                        <Search className="absolute left-3 top-2.5 opacity-40" size={16} />
                        <input
                            type="text"
                            placeholder="Filtrar grupos..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                            style={{ background: theme.surface, borderColor: theme.border, color: theme.text }}
                        />
                    </div>
                    <button
                        onClick={() => handleCreate(null)}
                        className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2 shadow-lg hover:shadow-xl transition-all whitespace-nowrap text-sm font-medium"
                    >
                        <Plus size={16} /> Nuevo
                    </button>
                    <button
                        onClick={loadGroups}
                        disabled={loading}
                        className="bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 px-4 py-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 flex items-center gap-2 transition-all whitespace-nowrap text-sm font-medium disabled:opacity-50"
                        title="Refrescar grupos"
                    >
                        <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                        <span className="hidden sm:inline">Refrescar</span>
                    </button>
                </div>
            </div>

            {/* Last Updated Timestamp */}
            {!loading && groups.length > 0 && (
                <div className="text-xs opacity-60 mb-4">
                    Última actualización: {new Date().toLocaleTimeString()}
                </div>
            )}

            <div
                className="flex-1 bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden flex flex-col"
                style={{ background: theme.surface, borderColor: theme.border }}
            >
                {loading ? (
                    <div className="flex-1 flex items-center justify-center opacity-50">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    </div>
                ) : groups.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center opacity-50 gap-4">
                        <LayoutGrid size={48} strokeWidth={1} />
                        <p>No hay grupos creados. Comienza creando uno.</p>
                    </div>
                ) : (
                    <div className="p-4 overflow-y-auto group scrollbar-thin">
                        {searchTerm ? (
                            // Search Results List
                            <div className="space-y-2">
                                {filteredGroups.map(item => (
                                    <div key={item.id} className="flex items-center justify-between p-3 border rounded-lg bg-gray-50/50">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white" style={{ background: item.color }}>
                                                {(() => { const I = LucideIcons[item.icon] || Folder; return <I size={16} /> })()}
                                            </div>
                                            <div>
                                                <div className="font-medium text-sm">{item.name}</div>
                                                <div className="text-[10px] opacity-60 uppercase">{item.type}</div>
                                            </div>
                                        </div>
                                        <button onClick={() => handleEdit(item)} className="p-2 text-blue-600 hover:bg-blue-50 rounded"><Edit2 size={16} /></button>
                                    </div>
                                ))}
                                {filteredGroups.length === 0 && <p className="text-center opacity-50 py-4">No se encontraron resultados.</p>}
                            </div>
                        ) : (
                            // Tree View
                            hierarchy.map(item => (
                                <TreeItem key={item.id} item={item} />
                            ))
                        )}
                    </div>
                )}
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/60 z-50 flex items-start sm:items-center justify-center p-2 sm:p-4 backdrop-blur-sm animate-fade-in overflow-y-auto">
                    <div
                        className="bg-white rounded-xl sm:rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-scale-in my-4 sm:my-8"
                        style={{ background: theme.surface, color: theme.text }}
                    >
                        <div className="flex justify-between items-center p-3 sm:p-4 border-b border-gray-100">
                            <h3 className="font-bold text-base sm:text-lg flex items-center gap-2">
                                {modalMode === 'create' ? <Plus size={16} className="text-blue-500" /> : <Edit2 size={16} className="text-amber-500" />}
                                {modalMode === 'create' ? 'Nuevo Grupo' : 'Editar'}
                            </h3>
                            <button onClick={() => setIsModalOpen(false)} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors">
                                <X size={18} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-3 sm:p-4 space-y-4 max-h-[70vh] overflow-y-auto scrollbar-thin">

                            {/* Name Input */}
                            <div className="space-y-2">
                                <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider opacity-60">
                                    <Type size={14} /> Nombre
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    className="w-full p-3 rounded-xl border focus:ring-2 focus:ring-blue-500 outline-none transition-all font-medium"
                                    style={{ background: isDark ? '#00000020' : '#f8fafc', borderColor: theme.border }}
                                    placeholder="Ej. Finanzas 2026"
                                />
                            </div>

                            {/* Description Input */}
                            <div className="space-y-2">
                                <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider opacity-60">
                                    <LucideIcons.FileText size={14} /> Descripción
                                </label>
                                <input
                                    type="text"
                                    value={formData.description}
                                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                                    className="w-full p-3 rounded-xl border focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm"
                                    style={{ background: isDark ? '#00000020' : '#f8fafc', borderColor: theme.border }}
                                    placeholder="Breve descripción del grupo"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                {/* Type Select */}
                                <div className="space-y-2">
                                    <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider opacity-60">
                                        <Layers size={14} /> Tipo
                                    </label>
                                    <select
                                        value={formData.type}
                                        onChange={e => setFormData({ ...formData, type: e.target.value })}
                                        className="w-full p-3 rounded-xl border outline-none appearance-none"
                                        style={{ background: isDark ? '#1a1a1a' : '#f8fafc', borderColor: theme.border }}
                                    >
                                        <option value="group">Grupo</option>
                                        <option value="folder">Carpeta</option>
                                        <option value="link">Enlace</option>
                                    </select>
                                </div>

                                {/* Color Picker */}
                                <div className="space-y-2">
                                    <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider opacity-60">
                                        <Palette size={14} /> Color
                                    </label>
                                    <div className="flex items-center gap-3 p-3 rounded-xl border" style={{ background: isDark ? '#00000020' : '#f8fafc', borderColor: theme.border }}>
                                        <input
                                            type="color"
                                            value={formData.color}
                                            onChange={e => setFormData({ ...formData, color: e.target.value })}
                                            className="w-8 h-6 rounded cursor-pointer border-0 bg-transparent p-0"
                                        />
                                        <span className="text-xs font-mono opacity-60">{formData.color}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Image URL Input */}
                            <div className="space-y-2">
                                <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider opacity-60">
                                    <LucideIcons.Image size={14} /> URL de Imagen (Banner)
                                </label>
                                <input
                                    type="text"
                                    value={formData.image_url}
                                    onChange={e => setFormData({ ...formData, image_url: e.target.value })}
                                    className="w-full p-3 rounded-xl border focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm"
                                    style={{ background: isDark ? '#00000020' : '#f8fafc', borderColor: theme.border }}
                                    placeholder="https://example.com/image.jpg"
                                />
                            </div>

                            {/* Icon Input */}
                            <div className="space-y-2">
                                <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider opacity-60">
                                    Icono (Lucide)
                                </label>
                                <div className="flex gap-3">
                                    <div
                                        className="w-12 h-12 flex items-center justify-center rounded-xl shadow-inner border"
                                        style={{ background: formData.color + '20', color: formData.color, borderColor: formData.color }}
                                    >
                                        {LucideIcons[formData.icon] ?
                                            (() => { const Icon = LucideIcons[formData.icon]; return <Icon size={24} /> })()
                                            : <Search size={20} />
                                        }
                                    </div>
                                    <input
                                        type="text"
                                        value={formData.icon}
                                        onChange={e => setFormData({ ...formData, icon: e.target.value })}
                                        className="flex-1 p-3 rounded-xl border outline-none font-mono text-sm"
                                        style={{ background: isDark ? '#00000020' : '#f8fafc', borderColor: theme.border }}
                                        placeholder="Name (e.g. Activity)"
                                    />
                                </div>
                                <div className="text-[10px] opacity-50 pl-1">
                                    Usa nombres de la librería <a href="https://lucide.dev/icons" target="_blank" rel="noreferrer" className="underline hover:text-blue-500">Lucide Icons</a>.
                                </div>
                            </div>

                            {/* Permissions Section */}
                            <div className="space-y-3 pt-2 border-t border-gray-100 dark:border-gray-800">
                                <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider opacity-60">
                                    <LucideIcons.Shield size={14} /> Permisos y Visibilidad
                                </label>

                                <div className="p-3 bg-gray-50 dark:bg-white/5 rounded-xl border border-gray-100 dark:border-gray-700 space-y-3">
                                    {/* Public/Private Toggle */}
                                    <div className="flex items-center gap-3">
                                        <input
                                            type="checkbox"
                                            checked={formData.permissions.includes('all')}
                                            onChange={(e) => setPublicPermission(e.target.checked)}
                                            className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                                        />
                                        <span className="text-sm font-medium">Público (Visible para todos)</span>
                                    </div>

                                    {!formData.permissions.includes('all') && (
                                        <div className="space-y-2 pl-1 pt-2">
                                            <p className="text-xs font-bold opacity-50 block mb-1">ACCESO INDIVIDUAL:</p>
                                            <div className="max-h-40 overflow-y-auto space-y-2 pr-2 scrollbar-thin">
                                                {workers.map(worker => (
                                                    <label key={worker.id} className="flex items-center gap-2 text-sm p-1 hover:bg-black/5 rounded cursor-pointer">
                                                        <input
                                                            type="checkbox"
                                                            checked={formData.permissions.includes(worker.id)}
                                                            onChange={() => togglePermission(worker.id)}
                                                            className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                                                        />
                                                        <span>{worker.full_name || worker.username}</span>
                                                    </label>
                                                ))}
                                                {workers.length === 0 && <span className="text-xs opacity-50 italic">Cargando funcionarios...</span>}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Link Resource ID */}
                            {formData.type === 'link' && (
                                <div className="animate-scale-in bg-blue-50/50 p-4 rounded-xl border border-blue-100 space-y-2">
                                    <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-blue-900">
                                        <LinkIcon size={12} /> ID de Recurso SharePoint
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.resource_id}
                                        onChange={e => setFormData({ ...formData, resource_id: e.target.value })}
                                        className="w-full p-2.5 rounded-lg border border-blue-200 focus:ring-2 focus:ring-blue-500 outline-none text-sm font-mono text-blue-800 bg-white"
                                        placeholder="DriveID, SiteID, or Path"
                                    />
                                    <p className="text-[10px] text-blue-600/80 leading-relaxed">
                                        Copia el ID del Drive o Sitio de SharePoint al que deseas enlazar este grupo.
                                    </p>
                                </div>
                            )}

                            {/* Actions */}
                            <div className="pt-6 flex justify-end gap-3 border-t border-gray-50 dark:border-gray-800">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="px-5 py-2.5 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-sm font-medium opacity-70"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    className="px-6 py-2.5 rounded-xl bg-blue-600 text-white hover:bg-blue-700 transition-colors text-sm font-medium shadow-lg shadow-blue-500/30 flex items-center gap-2"
                                >
                                    {modalMode === 'create' ? <Plus size={18} /> : <Check size={18} />}
                                    {modalMode === 'create' ? 'Crear Grupo' : 'Guardar'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

const styles = `
.anim-slide-down {
    animation: slideDown 0.2s ease-out forwards;
    transform-origin: top;
}
@keyframes slideDown {
    from { opacity: 0; transform: scaleY(0.95) translateY(-10px); }
    to { opacity: 1; transform: scaleY(1) translateY(0); }
}
`;
