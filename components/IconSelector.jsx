'use client';

import React, { useState, useMemo } from 'react';
import * as LucideIcons from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

export default function IconSelector({ selectedIcon, onSelect }) {
    const { isDark } = useTheme();
    const [searchTerm, setSearchTerm] = useState('');

    // Filter available icons based on search
    const iconList = useMemo(() => {
        const icons = Object.keys(LucideIcons).filter(name =>
            // Filter out non-component exports and filter by search term
            name !== 'createLucideIcon' &&
            name !== 'default' &&
            name.toLowerCase().includes(searchTerm.toLowerCase())
        );
        return icons.slice(0, 50); // Limit to top 50 matches for performance
    }, [searchTerm]);

    // Render the currently selected icon component dynamically
    const SelectedIconComponent = selectedIcon && LucideIcons[selectedIcon]
        ? LucideIcons[selectedIcon]
        : LucideIcons.FileText;

    return (
        <div
            className="border rounded-2xl p-5 shadow-sm"
            style={{
                backgroundColor: isDark ? '#1f2937' : '#ffffff',
                borderColor: isDark ? '#374151' : '#e5e7eb'
            }}
        >
            <div className="flex items-center justify-between mb-4">
                <label className="text-[10px] font-black uppercase tracking-widest" style={{ color: isDark ? '#9ca3af' : '#6b7280' }}>
                    Icono Visual de la Clase
                </label>
                <div
                    className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase"
                    style={{
                        backgroundColor: isDark ? 'rgba(59, 130, 246, 0.1)' : '#eff6ff',
                        color: '#3b82f6'
                    }}
                >
                    Personalizado
                </div>
            </div>

            <div className="flex items-center gap-4 mb-6">
                <div
                    className="w-16 h-16 rounded-2xl flex items-center justify-center text-blue-600 transition-transform hover:scale-105 border shadow-inner group"
                    style={{
                        backgroundColor: isDark ? '#374151' : '#ffffff',
                        borderColor: isDark ? '#4b5563' : '#e5e7eb'
                    }}
                >
                    <SelectedIconComponent size={32} strokeWidth={2.5} className="drop-shadow-sm" />
                </div>

                <div className="flex-1 relative">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#9ca3af' }}>
                        <LucideIcons.Search size={16} />
                    </div>
                    <input
                        type="text"
                        placeholder="Buscar icono..."
                        className="w-full pl-10 pr-4 py-3 rounded-xl border focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all text-sm font-bold"
                        style={{
                            backgroundColor: isDark ? '#374151' : '#f9fafb',
                            borderColor: isDark ? '#4b5563' : '#e5e7eb',
                            color: isDark ? '#f3f4f6' : '#111827'
                        }}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            <div className="grid grid-cols-5 sm:grid-cols-7 gap-2 max-h-48 overflow-y-auto p-1 custom-scrollbar">
                {iconList.map(iconName => {
                    const Icon = LucideIcons[iconName];
                    const isSelected = selectedIcon === iconName;
                    return (
                        <button
                            key={iconName}
                            type="button"
                            onClick={() => onSelect(iconName)}
                            className="p-2.5 rounded-xl flex items-center justify-center transition-all duration-200"
                            style={{
                                backgroundColor: isSelected ? '#2563eb' : (isDark ? '#374151' : '#f9fafb'),
                                color: isSelected ? '#ffffff' : (isDark ? '#9ca3af' : '#6b7280'),
                                border: isSelected ? '2px solid #2563eb' : `1px solid ${isDark ? '#4b5563' : '#e5e7eb'}`,
                                transform: isSelected ? 'scale(1.05)' : 'scale(1)',
                                boxShadow: isSelected ? '0 4px 12px rgba(37, 99, 235, 0.4)' : 'none'
                            }}
                            title={iconName}
                        >
                            <Icon size={20} strokeWidth={isSelected ? 3 : 2} />
                        </button>
                    );
                })}
            </div>

            <style jsx>{`
                .custom-scrollbar::-webkit-scrollbar {
                    width: 4px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background-color: rgba(59, 130, 246, 0.2);
                    border-radius: 20px;
                }
            `}</style>
        </div>
    );
}
