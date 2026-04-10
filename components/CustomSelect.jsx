"use client";
import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { lightTheme, darkTheme } from '@/lib/colors';

export default function CustomSelect({ value, onChange, options, placeholder = 'Seleccionar...', className = '', size = 'md' }) {
    const [isOpen, setIsOpen] = useState(false);
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

    // Close on Escape
    useEffect(() => {
        const handler = (e) => {
            if (e.key === 'Escape') setIsOpen(false);
        };
        if (isOpen) document.addEventListener('keydown', handler);
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
            {/* Trigger Button */}
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

            {/* Dropdown Menu */}
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
                    {options.map((opt, i) => {
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
                                className="w-[calc(100%-12px)] mx-auto flex items-center justify-between gap-2 px-3 py-2.5 text-left text-sm rounded-xl transition-all duration-200 mb-0.5 last:mb-0"
                                style={{
                                    background: isSelected
                                        ? (isDark ? 'rgba(59,130,246,0.2)' : '#eff6ff')
                                        : 'transparent',
                                    color: isSelected
                                        ? (isDark ? '#60a5fa' : '#2563eb')
                                        : theme.text,
                                    fontWeight: isSelected ? 600 : 500,
                                }}
                                onMouseEnter={(e) => {
                                    if (!isSelected) {
                                        e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)';
                                    }
                                }}
                                onMouseLeave={(e) => {
                                    if (!isSelected) {
                                        e.currentTarget.style.background = 'transparent';
                                    }
                                }}
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
