'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ChevronDown } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { lightTheme, darkTheme } from '../lib/colors';

/**
 * DropdownMenu — Componente dropdown reutilizable.
 * 
 * Características:
 *   - Cierra al hacer clic fuera
 *   - Navegación por teclado (↑ ↓ Enter Escape)
 *   - Animación suave
 *   - Responsive
 *   - Reutiliza theme del ThemeContext
 * 
 * @param {Object} props
 * @param {React.ReactNode} props.children - Contenido del botón trigger
 * @param {Array} props.items - Array de { label, icon: LucideIcon, color, onClick, disabled }
 * @param {string} [props.buttonClassName] - Clases adicionales para el botón
 * @param {Object} [props.buttonStyle] - Estilos inline adicionales para el botón
 * @param {string} [props.align] - 'left' | 'right' (default: 'left')
 * @param {boolean} [props.disabled] - Deshabilitar el dropdown
 */
export default function DropdownMenu({ 
    children, 
    items = [], 
    buttonClassName = '', 
    buttonStyle = {},
    align = 'left',
    disabled = false,
}) {
    const { isDark } = useTheme();
    const theme = isDark ? darkTheme : lightTheme;

    const [isOpen, setIsOpen] = useState(false);
    const [openDirection, setOpenDirection] = useState('down');
    const [focusIndex, setFocusIndex] = useState(-1);
    const containerRef = useRef(null);
    const itemRefs = useRef([]);

    // Cerrar al hacer clic fuera
    useEffect(() => {
        const handler = (e) => {
            if (containerRef.current && !containerRef.current.contains(e.target)) {
                setIsOpen(false);
                setFocusIndex(-1);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    // Navegación por teclado
    const handleKeyDown = useCallback((e) => {
        if (!isOpen) {
            if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
                e.preventDefault();
                setIsOpen(true);
                setFocusIndex(0);
            }
            return;
        }

        const enabledItems = items.filter(item => !item.disabled);
        const enabledCount = enabledItems.length;

        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                setFocusIndex(prev => (prev + 1) % enabledCount);
                break;
            case 'ArrowUp':
                e.preventDefault();
                setFocusIndex(prev => (prev - 1 + enabledCount) % enabledCount);
                break;
            case 'Enter':
                e.preventDefault();
                if (focusIndex >= 0 && focusIndex < enabledCount) {
                    enabledItems[focusIndex].onClick?.();
                    setIsOpen(false);
                    setFocusIndex(-1);
                }
                break;
            case 'Escape':
                e.preventDefault();
                setIsOpen(false);
                setFocusIndex(-1);
                break;
        }
    }, [isOpen, items, focusIndex]);

    // Focus management
    useEffect(() => {
        if (focusIndex >= 0 && itemRefs.current[focusIndex]) {
            itemRefs.current[focusIndex].focus();
        }
    }, [focusIndex]);

    if (items.length === 0) return null;

    return (
        <div className="relative" ref={containerRef}>
            <button
                type="button"
                onClick={(e) => { 
                    e.stopPropagation(); 
                    if (!disabled) {
                        if (!isOpen) {
                            // Calcular espacio disponible abajo para decidir dirección
                            if (containerRef.current) {
                                const rect = containerRef.current.getBoundingClientRect();
                                const spaceBelow = window.innerHeight - rect.bottom;
                                // Asumimos un menú promedio de 200px. Si hay menos de 220px, abrimos hacia arriba.
                                setOpenDirection(spaceBelow < 220 ? 'up' : 'down');
                            }
                            setIsOpen(true);
                        } else {
                            setIsOpen(false);
                        }
                        setFocusIndex(-1);
                    }
                }}
                onKeyDown={handleKeyDown}
                disabled={disabled}
                className={`flex items-center justify-center gap-1 transition-all disabled:opacity-40 ${buttonClassName}`}
                style={buttonStyle}
                aria-haspopup="true"
                aria-expanded={isOpen}
            >
                {children}
                <ChevronDown 
                    size={11} 
                    className={`transition-transform duration-300 ease-out ${isOpen ? 'rotate-180' : ''}`} 
                />
            </button>

            <div 
                className={`absolute min-w-[180px] rounded-xl border shadow-xl z-50 overflow-hidden flex flex-col transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] ${
                    isOpen 
                        ? 'opacity-100 scale-100 pointer-events-auto translate-y-0' 
                        : 'opacity-0 scale-95 pointer-events-none'
                } ${
                    openDirection === 'up' 
                        ? (isOpen ? 'bottom-full mb-2 origin-bottom' : 'bottom-full mb-2 translate-y-2 origin-bottom') 
                        : (isOpen ? 'top-full mt-2 origin-top' : 'top-full mt-2 -translate-y-2 origin-top')
                }`}
                style={{ 
                    background: theme.surface, 
                    borderColor: theme.border,
                    [align === 'right' ? 'right' : 'left']: 0,
                }}
                role="menu"
                onKeyDown={handleKeyDown}
            >
                {items.map((item, index) => {
                    const Icon = item.icon;
                    return (
                        <button
                            key={item.label}
                            ref={el => itemRefs.current[index] = el}
                            type="button"
                            role="menuitem"
                            tabIndex={focusIndex === index ? 0 : -1}
                            disabled={item.disabled}
                            onClick={(e) => { 
                                e.stopPropagation(); 
                                item.onClick?.(); 
                                setIsOpen(false);
                                setFocusIndex(-1);
                            }}
                            className={`w-full px-3.5 py-2.5 text-left text-[11px] sm:text-xs font-semibold flex items-center gap-2.5 transition-colors disabled:opacity-30 ${
                                index === 0 ? '' : 'border-t'
                            } ${
                                focusIndex === index 
                                    ? 'bg-blue-50 dark:bg-blue-500/10' 
                                    : 'hover:bg-gray-50 dark:hover:bg-white/5'
                            }`}
                            style={{ 
                                color: item.color || theme.text, 
                                borderColor: theme.border 
                            }}
                        >
                            {Icon && (
                                <span 
                                    className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors"
                                    style={{ 
                                        backgroundColor: item.color 
                                            ? `${item.color}15` 
                                            : (isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)')
                                    }}
                                >
                                    <Icon size={13} />
                                </span>
                            )}
                            {item.label}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
