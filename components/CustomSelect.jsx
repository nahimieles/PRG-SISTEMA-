"use client";
import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { lightTheme, darkTheme } from '@/lib/colors';

export default function CustomSelect({ value, onChange, options, placeholder = 'Seleccionar...', className = '', size = 'md', isSearchable = false }) {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const ref = useRef(null);
    const { isDark } = useTheme();
    const theme = isDark ? darkTheme : lightTheme;

    // Close on outside click
    useEffect(() => {
        const handler = (e) => {
            if (ref.current && !ref.current.contains(e.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    useEffect(() => {
        const handler = (e) => {
            if (e.key === 'Escape') setIsOpen(false);
        };
        if (isOpen) {
            document.addEventListener('keydown', handler);
            setSearchTerm(''); // Reset search when opened
        }
        return () => document.removeEventListener('keydown', handler);
    }, [isOpen]);

    const selectedOption = options.find(opt =>
        typeof opt === 'object' ? opt.value === value : opt === value
    );

    const displayLabel = selectedOption
        ? (typeof selectedOption === 'object' ? selectedOption.label : selectedOption)
        : placeholder;

    const isPlaceholder = !selectedOption || value === '' || value === undefined;

    const sizeClasses = {
        sm: 'py-1.5 px-2.5 text-xs',
        md: 'py-2 px-3 text-sm',
    };

    return (
        <div ref={ref} className={`relative ${className}`}>
            {}
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className={`w-full flex items-center justify-between gap-2 rounded-2xl outline-none transition-all duration-300 ${sizeClasses[size] || sizeClasses.md}`}
                style={{
                    background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(240,242,245,0.8)',
                    color: isPlaceholder ? (isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)') : theme.text,
                    fontWeight: 600,
                    letterSpacing: '-0.02em',
                    boxShadow: isOpen 
                        ? (isDark ? '0 0 0 2px rgba(59,130,246,0.5)' : '0 0 0 2px rgba(59,130,246,0.3)') 
                        : 'none',
                    backdropFilter: 'blur(8px)',
                }}
            >
                <span className="truncate text-left">{displayLabel}</span>
                <ChevronDown
                    className={`w-4 h-4 flex-shrink-0 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}
                    style={{ opacity: 0.6 }}
                />
            </button>

            {}
            {isOpen && (
                <div
                    className="absolute z-[100] mt-2 w-full rounded-2xl overflow-hidden py-1.5"
                    style={{
                        background: isDark ? 'rgba(30, 37, 56, 0.95)' : 'rgba(255, 255, 255, 0.98)',
                        border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)'}`,
                        boxShadow: isDark
                            ? '0 12px 40px rgba(0,0,0,0.6), 0 4px 12px rgba(0,0,0,0.4)'
                            : '0 10px 30px rgba(0,0,0,0.1), 0 4px 8px rgba(0,0,0,0.04)',
                        maxHeight: '280px',
                        overflowY: 'auto',
                        backdropFilter: 'blur(16px)',
                        animation: 'customSelectScaleIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                    }}
                >
                    {isSearchable && (
                        <div className="px-2 pb-2 sticky top-0 z-10" style={{ background: isDark ? 'rgba(30, 37, 56, 0.95)' : 'rgba(255, 255, 255, 0.98)' }}>
                            <input
                                type="text"
                                className="w-full px-3 py-2 text-sm rounded-xl outline-none"
                                style={{
                                    background: isDark ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.05)',
                                    color: theme.text,
                                    border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`
                                }}
                                placeholder="Buscar..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                onClick={(e) => e.stopPropagation()}
                                autoFocus
                            />
                        </div>
                    )}

                    {options.filter(opt => {
                        if (!isSearchable || !searchTerm) return true;
                        const optLabel = typeof opt === 'object' ? opt.label : opt;
                        return String(optLabel).toLowerCase().includes(searchTerm.toLowerCase());
                    }).map((opt, i) => {
                        const optValue = typeof opt === 'object' ? opt.value : opt;
                        const optLabel = typeof opt === 'object' ? opt.label : opt;
                        const isSelected = optValue === value;

                        return (
                            <button
                                key={`${optValue}-${i}`}
                                type="button"
                                onClick={() => {
                                    onChange(optValue);
                                    setIsOpen(false);
                                }}
                                className={`w-full text-left px-4 py-2.5 text-sm transition-colors flex items-center justify-between ${
                                    isSelected 
                                    ? (isDark ? 'bg-blue-500/20 text-blue-400 font-bold' : 'bg-blue-50 text-blue-600 font-bold')
                                    : (isDark ? 'text-gray-300 hover:bg-white/5 hover:text-white' : 'text-gray-700 hover:bg-black/5 hover:text-black')
                                }`}
                            >
                                <span className="truncate">{optLabel}</span>
                                {isSelected && <Check className="w-4 h-4 flex-shrink-0 text-blue-500" strokeWidth={3} />}
                            </button>
                        );
                    })}
                </div>
            )}

            <style>{`
                @keyframes customSelectScaleIn {
                    from { opacity: 0; transform: scale(0.96) translateY(-8px); }
                    to { opacity: 1; transform: scale(1) translateY(0); }
                }
            `}</style>
        </div>
    );
}
