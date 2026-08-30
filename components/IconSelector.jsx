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
        return icons.slice(0, 50); 
    }, [searchTerm]);
    const SelectedIconComponent = selectedIcon && LucideIcons[selectedIcon]
        ? LucideIcons[selectedIcon]
        : LucideIcons.FileText;
    return (
        <div
            className="border rounded-xl sm:rounded-xl p-3 sm:p-5 shadow-sm"
            style={{
                backgroundColor: isDark ? '#1f2937' : '#ffffff',
                borderColor: isDark ? '#374151' : '#e5e7eb'
            }}
        >
            <div className="flex items-center justify-between mb-3 sm:mb-4">
                <label className="text-[9px] sm:text-[10px] font-black uppercase tracking-wide sm:tracking-widest" style={{ color: isDark ? '#9ca3af' : '#6b7280' }}>
                    Icono Visual
                </label>
                <div
                    className="text-[8px] sm:text-[10px] font-bold px-1.5 sm:px-2 py-0.5 rounded-full uppercase"
                    style={{
                        backgroundColor: isDark ? 'rgba(59, 130, 246, 0.1)' : '#eff6ff',
                        color: '#3b82f6'
                    }}
                >
                    Personalizado
                </div>
            </div>
            <div className="flex items-center gap-2 sm:gap-4 mb-4 sm:mb-6">
                <div
                    className="w-10 h-10 sm:w-14 sm:h-14 lg:w-16 lg:h-16 rounded-xl sm:rounded-xl flex items-center justify-center text-blue-600 transition-transform border shadow-inner flex-shrink-0"
                    style={{
                        backgroundColor: isDark ? '#374151' : '#ffffff',
                        borderColor: isDark ? '#4b5563' : '#e5e7eb'
                    }}
                >
                    <SelectedIconComponent size={20} className="sm:w-6 sm:h-6 lg:w-8 lg:h-8" strokeWidth={2.5} />
                </div>
                <div className="flex-1 relative min-w-0">
                    <div className="absolute left-2.5 sm:left-3 top-1/2 -translate-y-1/2" style={{ color: '#9ca3af' }}>
                        <LucideIcons.Search size={14} className="sm:w-4 sm:h-4" />
                    </div>
                    <input
                        type="text"
                        placeholder="Buscar..."
                        className="w-full pl-8 sm:pl-10 pr-3 sm:pr-4 py-2 sm:py-3 rounded-lg sm:rounded-xl border focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all text-xs sm:text-sm font-bold"
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
            <div className="grid grid-cols-6 sm:grid-cols-7 md:grid-cols-8 lg:grid-cols-10 gap-1.5 sm:gap-2 max-h-36 sm:max-h-48 overflow-y-auto p-1 custom-scrollbar">
                {iconList.map(iconName => {
                    const Icon = LucideIcons[iconName];
                    const isSelected = selectedIcon === iconName;
                    return (
                        <button
                            key={iconName}
                            type="button"
                            onClick={() => onSelect(iconName)}
                            className="p-1.5 sm:p-2 rounded-lg sm:rounded-xl flex items-center justify-center transition-all duration-200"
                            style={{
                                backgroundColor: isSelected ? '#2563eb' : (isDark ? '#374151' : '#f9fafb'),
                                color: isSelected ? '#ffffff' : (isDark ? '#9ca3af' : '#6b7280'),
                                border: isSelected ? '2px solid #2563eb' : `1px solid ${isDark ? '#4b5563' : '#e5e7eb'}`,
                                transform: isSelected ? 'scale(1.05)' : 'scale(1)',
                                boxShadow: isSelected ? '0 4px 12px rgba(37, 99, 235, 0.4)' : 'none'
                            }}
                            title={iconName}
                        >
                            <Icon size={16} className="sm:w-5 sm:h-5" strokeWidth={isSelected ? 3 : 2} />
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
