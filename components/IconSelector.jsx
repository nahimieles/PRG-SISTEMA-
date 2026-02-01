'use client';

import React, { useState, useMemo } from 'react';
import * as LucideIcons from 'lucide-react';

export default function IconSelector({ selectedIcon, onSelect }) {
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
        <div className="border rounded-lg p-4 bg-gray-50/50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Icono del Curso
            </label>

            <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800">
                    <SelectedIconComponent size={24} />
                </div>

                <input
                    type="text"
                    placeholder="Buscar icono (ej: chart, users...)"
                    className="flex-1 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>

            <div className="grid grid-cols-6 sm:grid-cols-8 gap-2 max-h-40 overflow-y-auto p-1 custom-scrollbar">
                {iconList.map(iconName => {
                    const Icon = LucideIcons[iconName];
                    return (
                        <button
                            key={iconName}
                            type="button"
                            onClick={() => onSelect(iconName)}
                            className={`p-2 rounded-lg flex items-center justify-center transition-all ${selectedIcon === iconName
                                    ? 'bg-blue-500 text-white shadow-md scale-110'
                                    : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white'
                                }`}
                            title={iconName}
                        >
                            <Icon size={20} />
                        </button>
                    );
                })}
            </div>

            <style jsx>{`
                .custom-scrollbar::-webkit-scrollbar {
                    width: 6px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background-color: rgba(156, 163, 175, 0.5);
                    border-radius: 20px;
                }
            `}</style>
        </div>
    );
}
