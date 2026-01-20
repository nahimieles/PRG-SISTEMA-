'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
    LayoutDashboard,
    FileText,
    Users,
    Building2,
    PieChart,
    Calendar,
    Clock,
    LogOut,
    Menu,
    X,
    ChevronLeft
} from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import ThemeToggle from './ThemeToggle';
import { lightTheme, darkTheme } from '../lib/colors';

export default function Sidebar({
    items = [],
    activeTab,
    onTabChange,
    userName = '',
    onLogout,
    showBackButton = true
}) {
    const { isDark } = useTheme();
    const theme = isDark ? darkTheme : lightTheme;
    const pathname = usePathname();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    // Iconos por defecto según el id del item
    const defaultIcons = {
        actividades: FileText,
        asistencia: Clock,
        funcionarios: Users,
        empresas: Building2,
        dashboards: PieChart,
        reportes: Calendar,
        dashboard: LayoutDashboard
    };

    const sidebarBg = isDark ? '#0d1117' : '#1e293b';
    const sidebarItemBg = isDark ? 'rgba(32, 59, 112, 0.4)' : 'rgba(255, 255, 255, 0.1)';
    const sidebarItemHover = isDark ? 'rgba(32, 59, 112, 0.6)' : 'rgba(255, 255, 255, 0.15)';

    const renderMenuItem = (item, index) => {
        const Icon = item.icon || defaultIcons[item.id] || FileText;
        const isActive = activeTab === item.id;

        return (
            <button
                key={item.id || index}
                onClick={() => {
                    onTabChange(item.id);
                    setIsMobileMenuOpen(false);
                }}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all cursor-pointer group"
                style={{
                    background: isActive ? sidebarItemBg : 'transparent',
                    color: isActive ? '#fff' : 'rgba(255,255,255,0.7)',
                    borderLeft: isActive ? '3px solid #d4af37' : '3px solid transparent'
                }}
            >
                <Icon className="w-5 h-5 flex-shrink-0" />
                <span className="font-medium text-sm">{item.label}</span>
            </button>
        );
    };

    const SidebarContent = () => (
        <>
            {/* Logo */}
            <div className="p-4 mb-4 flex justify-center">
                <img
                    src="/Sin título-1-08.png"
                    alt="Logo PRG"
                    className="w-28 h-28 object-contain"
                />
            </div>

            {/* Navegación */}
            <nav className="flex-1 px-3 space-y-1">
                {items.map(renderMenuItem)}
            </nav>

            {/* Separador */}
            <div className="border-t border-gray-700 mx-4 my-4"></div>

            {/* Sección inferior */}
            <div className="px-3 pb-4 space-y-2">
                {/* Usuario */}
                {userName && (
                    <div className="px-4 py-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.05)' }}>
                        <p className="text-white font-medium text-sm truncate">Hola, {userName}</p>
                    </div>
                )}

                {/* Tema */}
                <div className="flex items-center justify-between px-4 py-2">
                    <span className="text-sm text-gray-400">Tema</span>
                    <ThemeToggle />
                </div>

                {/* Botón volver */}
                {showBackButton && (
                    <Link
                        href="/"
                        className="w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all cursor-pointer text-gray-400 hover:text-white hover:bg-gray-700/50"
                    >
                        <ChevronLeft className="w-5 h-5" />
                        <span className="text-sm">Volver al inicio</span>
                    </Link>
                )}

                {/* Cerrar sesión */}
                {onLogout && (
                    <button
                        onClick={onLogout}
                        className="w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all cursor-pointer text-red-400 hover:text-red-300 hover:bg-red-500/10"
                    >
                        <LogOut className="w-5 h-5" />
                        <span className="text-sm font-medium">Cerrar Sesión</span>
                    </button>
                )}
            </div>
        </>
    );

    return (
        <>
            {/* Sidebar Desktop */}
            <aside
                className="hidden lg:flex flex-col fixed left-0 top-0 h-full w-64 z-40"
                style={{ background: sidebarBg }}
            >
                <SidebarContent />
            </aside>

            {/* Mobile Header */}
            <div
                className="lg:hidden fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 py-3"
                style={{ background: sidebarBg }}
            >
                <div className="flex items-center gap-3">
                    <img
                        src="/Sin título-1-08.png"
                        alt="Logo PRG"
                        className="w-12 h-12 object-contain"
                    />
                </div>
                <button
                    onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                    className="text-white p-2 rounded-lg hover:bg-gray-700/50 cursor-pointer"
                >
                    {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                </button>
            </div>

            {/* Mobile Menu Overlay */}
            {isMobileMenuOpen && (
                <div
                    className="lg:hidden fixed inset-0 z-40 bg-black/50"
                    onClick={() => setIsMobileMenuOpen(false)}
                />
            )}

            {/* Mobile Sidebar */}
            <aside
                className={`lg:hidden fixed left-0 top-14 bottom-0 w-64 z-50 transform transition-transform duration-300 ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
                    }`}
                style={{ background: sidebarBg }}
            >
                <SidebarContent />
            </aside>

            {/* Spacer for mobile header */}
            <div className="lg:hidden h-14"></div>
        </>
    );
}
