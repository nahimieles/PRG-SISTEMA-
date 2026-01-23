'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTheme } from '../contexts/ThemeContext';
import { lightTheme, darkTheme } from '../lib/colors';
import * as LucideIcons from 'lucide-react';
import { Folder, Link as LinkIcon, Search, ChevronRight, Layers } from 'lucide-react';

const PremiumCard = ({ group, onClick }) => {
    const { isDark } = useTheme();
    const theme = isDark ? darkTheme : lightTheme;
    const Icon = LucideIcons[group.icon] || (group.type === 'link' ? LinkIcon : Folder);
    const color = group.color || '#3b82f6';

    return (
        <button
            onClick={onClick}
            className="group relative flex flex-col w-full text-left rounded-2xl overflow-hidden transition-all duration-300 hover:-translate-y-1"
            style={{
                background: theme.surface,
                boxShadow: isDark ? '0 4px 20px rgba(0,0,0,0.4)' : '0 4px 20px rgba(0,0,0,0.05)',
                height: '200px'
            }}
        >
            {/* Header Color Area */}
            <div
                className="h-24 w-full relative overflow-hidden"
                style={{ background: `linear-gradient(135deg, ${color}, ${adjustColor(color, -20)})` }}
            >
                {/* Abstract pattern overlay */}
                <div className="absolute inset-0 opacity-20"
                    style={{ backgroundImage: 'radial-gradient(circle at 10px 10px, rgba(255,255,255,0.2) 2px, transparent 0)', backgroundSize: '20px 20px' }}
                />
            </div>

            {/* Floating Icon */}
            <div
                className="absolute top-14 left-6 w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg transition-transform duration-300 group-hover:scale-110"
                style={{ background: theme.surface }}
            >
                <Icon
                    size={32}
                    color={color}
                    strokeWidth={1.5}
                />
            </div>

            {/* Type Badge */}
            <div className="absolute top-3 right-3 bg-white/20 backdrop-blur-md text-white text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider shadow-sm">
                {group.type === 'link' ? 'Enlace' : 'Grupo'}
            </div>

            {/* Content Body */}
            <div className="flex-1 pt-8 px-6 pb-4 flex flex-col justify-between">
                <div>
                    <h3
                        className="font-bold text-lg leading-tight mb-1 truncate pr-2"
                        style={{ color: theme.text }}
                    >
                        {group.name}
                    </h3>
                    <p className="text-xs opacity-60 font-medium truncate" style={{ color: theme.text }}>
                        {group.type === 'link' ? 'Recurso Externo' : 'Contenedor de Archivos'}
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

// Helper to darken/lighten color slightly for gradient
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

export default function CompanyGroupDashboard({ groups = [], title = "Grupos de Empresas", subtitle = "Panel de Control Financiero y Operativo", isLoading = false }) {
    const { isDark } = useTheme();
    const theme = isDark ? darkTheme : lightTheme;
    const router = useRouter();
    const [searchTerm, setSearchTerm] = useState('');

    const handleCardClick = (group) => {
        if (group.type === 'link') {
            router.push(`/grupos/${group.id}?type=link&resourceId=${group.resource_id}`);
        } else {
            router.push(`/grupos/${group.id}`);
        }
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
            {/* Header Section */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <div>
                    <h1 className="text-3xl md:text-4xl font-bold mb-2 tracking-tight" style={{ color: theme.text }}>
                        {title}
                    </h1>
                    <p className="text-lg opacity-60 font-light" style={{ color: theme.text }}>
                        {subtitle}
                    </p>
                </div>

                {/* Search Bar */}
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

            {/* Grid */}
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
