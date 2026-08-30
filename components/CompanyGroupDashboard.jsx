'use client';
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTheme } from '../contexts/ThemeContext';
import { lightTheme, darkTheme } from '../lib/colors';
import * as LucideIcons from 'lucide-react';
import { Folder, Link as LinkIcon, Search, ChevronRight, Layers, Edit2, Trash2, Settings, Plus } from 'lucide-react';
import { deleteGroup } from '@/lib/groups';
import { getAdminSession } from '@/lib/auth';
const PremiumCard = ({ group, onClick, isEditMode, onEdit, onDelete }) => {
    const { isDark } = useTheme();
    const theme = isDark ? darkTheme : lightTheme;
    const Icon = LucideIcons[group.icon] || (group.type === 'link' ? LinkIcon : Folder);
    const color = group.color || '#3b82f6';
    const handleDelete = (e) => {
        e.stopPropagation();
        onDelete(group);
    };
    const handleEdit = (e) => {
        e.stopPropagation();
        onEdit(group);
    };
    return (
        <button
            onClick={onClick}
            className="group relative flex flex-col w-full text-left rounded-xl overflow-hidden transition-all duration-300 hover:-translate-y-1"
            style={{
                background: theme.surface,
                boxShadow: isDark ? '0 4px 20px rgba(0,0,0,0.4)' : '0 4px 20px rgba(0,0,0,0.05)',
                height: '240px' 
            }}
        >
            {}
            <div
                className="h-32 w-full relative overflow-hidden"
                style={{
                    background: group.image_url ? `url(${group.image_url}) center/cover no-repeat` : `linear-gradient(135deg, ${color}, ${adjustColor(color, -20)})`
                }}
            >
                {}
                {group.image_url && <div className="absolute inset-0 bg-black/20" />}
                {!group.image_url && (
                    <div className="absolute inset-0 opacity-20"
                        style={{ backgroundImage: 'radial-gradient(circle at 10px 10px, rgba(255,255,255,0.2) 2px, transparent 0)', backgroundSize: '20px 20px' }}
                    />
                )}
            </div>
            {}
            {isEditMode && (
                <div className="absolute top-2 right-2 flex gap-2 z-10">
                    <div onClick={handleEdit} className="p-2 bg-white/90 rounded-full text-blue-600 hover:bg-white shadow-sm transition-all hover:scale-110 cursor-pointer">
                        <Edit2 size={16} />
                    </div>
                    <div onClick={handleDelete} className="p-2 bg-white/90 rounded-full text-red-600 hover:bg-white shadow-sm transition-all hover:scale-110 cursor-pointer">
                        <Trash2 size={16} />
                    </div>
                </div>
            )}
            {}
            <div
                className="absolute top-20 left-6 w-16 h-16 rounded-xl flex items-center justify-center shadow-lg transition-transform duration-300 group-hover:scale-110 z-10"
                style={{ background: theme.surface }}
            >
                {group.image_url ? (
                    <Icon size={32} color={color} strokeWidth={1.5} />
                ) : (
                    <Icon size={32} color={color} strokeWidth={1.5} />
                )}
            </div>
            {}
            {!isEditMode && (
                <div className="absolute top-3 right-3 bg-white/20 backdrop-blur-md text-white text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider shadow-sm z-0">
                    {group.type === 'link' ? 'Enlace' : 'Grupo'}
                </div>
            )}
            {}
            <div className="flex-1 pt-6 px-6 pb-4 flex flex-col justify-between mt-4">
                <div>
                    <h3
                        className="font-bold text-lg leading-tight mb-1 truncate pr-2"
                        style={{ color: theme.text }}
                    >
                        {group.name}
                    </h3>
                    <p className="text-xs opacity-60 font-medium truncate" style={{ color: theme.text }}>
                        {group.description || (group.type === 'link' ? 'Recurso Externo' : 'Contenedor de Archivos')}
                    </p>
                </div>
                <div className="flex justify-between items-end mt-2">
                    <span
                        className="text-[10px] font-semibold opacity-40 uppercase tracking-widest"
                        style={{ color: theme.text }}
                    >
                        PRG Auditores
                    </span>
                    <div
                        className="w-8 h-8 rounded-full flex items-center justify-center transition-colors group-hover:bg-gray-100 dark:group-hover:bg-gray-800"
                        style={{ color: color }}
                    >
                        <ChevronRight size={18} />
                    </div>
                </div>
            </div>
        </button>
    );
};
function adjustColor(col, amt) {
    let usePound = false;
    if (col[0] == "#") {
        col = col.slice(1);
        usePound = true;
    }
    let num = parseInt(col, 16);
    let r = (num >> 16) + amt;
    if (r > 255) r = 255;
    else if (r < 0) r = 0;
    let b = ((num >> 8) & 0x00FF) + amt;
    if (b > 255) b = 255;
    else if (b < 0) b = 0;
    let g = (num & 0x0000FF) + amt;
    if (g > 255) g = 255;
    else if (g < 0) g = 0;
    return (usePound ? "#" : "") + (g | (b << 8) | (r << 16)).toString(16);
}
export default function CompanyGroupDashboard({ groups = [], title = "Grupos de Empresas", subtitle = "Panel de Control Financiero y Operativo", isLoading = false, onRefresh }) {
    const { isDark } = useTheme();
    const theme = isDark ? darkTheme : lightTheme;
    const router = useRouter();
    const [searchTerm, setSearchTerm] = useState('');
    // Admin Edit Mode
    const [isEditMode, setIsEditMode] = useState(false);
    const [isAdmin, setIsAdmin] = React.useState(false);
    React.useEffect(() => {
        setIsAdmin(!!getAdminSession());
    }, []);
    const handleCardClick = (group) => {
        if (isEditMode) return; // Disable navigation in edit mode
        if (group.type === 'link') {
            router.push(`/grupos/${group.id}?type=link&resourceId=${group.resource_id}`);
        } else {
            router.push(`/grupos/${group.id}`);
        }
    };
    const handleEditGroup = (group) => {
        router.push(`/admin/groups?edit=${group.id}`);
    };
    const handleDeleteGroup = async (group) => {
        if (confirm(`¿Eliminar ${group.name}?`)) {
            await deleteGroup(group.id);
            if (onRefresh) onRefresh();
            else window.location.reload();
        }
    };
    const handleCreateNew = () => {
        router.push('/admin/groups?create=true');
    };
    const filteredGroups = groups.filter(g =>
        g.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
    if (isLoading) {
        return (
            <div className="w-full max-w-7xl mx-auto p-6 flex items-center justify-center min-h-[400px]">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            </div>
        );
    }
    return (
        <div className="w-full max-w-7xl mx-auto p-4 md:p-8 animate-fade-in pb-20">
            {}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <div>
                    <h1 className="text-3xl md:text-4xl font-bold mb-2 tracking-tight" style={{ color: theme.text }}>
                        {title}
                    </h1>
                    <p className="text-lg opacity-60 font-light" style={{ color: theme.text }}>
                        {subtitle}
                    </p>
                </div>
                {}
                <div className="flex flex-col md:flex-row gap-4 items-center w-full md:w-auto">
                    {isAdmin && (
                        <div className="flex items-center gap-2 bg-white dark:bg-black/20 p-1.5 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm">
                            <button
                                onClick={() => setIsEditMode(!isEditMode)}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${isEditMode ? 'bg-blue-600 text-white shadow-md' : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800'}`}
                            >
                                {isEditMode ? 'Modo Edición' : 'Editar Diseño'}
                            </button>
                            {isEditMode && (
                                <button
                                    onClick={handleCreateNew}
                                    className="px-4 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 text-sm font-medium shadow-md transition-all flex items-center gap-2"
                                >
                                    <Plus size={16} /> Nuevo
                                </button>
                            )}
                        </div>
                    )}
                    {}
                    <div className="relative w-full md:w-72">
                        <input
                            type="text"
                            placeholder="Buscar grupos..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-3 rounded-xl border focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all shadow-sm"
                            style={{
                                background: theme.surface,
                                borderColor: theme.border,
                                color: theme.text
                            }}
                        />
                        <Search className="absolute left-3 top-3.5 opacity-40" size={18} style={{ color: theme.text }} />
                    </div>
                </div>
            </div>
            {}
            {filteredGroups.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 opacity-50 text-center">
                    <Layers size={64} strokeWidth={1} className="mb-4" />
                    <p className="text-xl font-medium">No se encontraron grupos</p>
                    <p className="text-sm">Intenta ajustar tu búsqueda o contacta al administrador.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {filteredGroups.map((group) => (
                        <PremiumCard
                            key={group.id}
                            group={group}
                            onClick={() => handleCardClick(group)}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
