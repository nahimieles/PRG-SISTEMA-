'use client';

import React, { useState, useEffect } from 'react';
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
    ChevronLeft,
    ChevronRight
} from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import ThemeToggle from './ThemeToggle';
import { lightTheme, darkTheme } from '../lib/colors';
import LoginLogo from './LoginLogo';

export default function Sidebar({
    items = [],
    activeTab,
    onTabChange,
    userName = '',
    userRole = 'Admin',
    avatarUrl = null,
    onLogout,
    onProfileClick,
    showBackButton = true,
    onHoverChange // Add this
}) {
    const { isDark } = useTheme();
    const theme = isDark ? darkTheme : lightTheme;
    const pathname = usePathname();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isExpanded, setIsExpanded] = useState(false);
    const [profilePic, setProfilePic] = useState(null);

    // Fetch Microsoft Graph Profile Picture
    useEffect(() => {
        async function fetchProfilePic() {
            try {
                // If we are authenticated via MSAL, we could use the instance here.
                // For now, we simulate or fetch if a token is available in local storage/session.
                // Assuming `acquireTokenSilent` or a similar backend route is available.
                const msalToken = sessionStorage.getItem('msal_token') || localStorage.getItem('msal_token');
                if (!msalToken) return;

                const res = await fetch("https://graph.microsoft.com/v1.0/me/photo/$value", {
                    headers: { Authorization: `Bearer ${msalToken}` }
                });
                
                if (res.ok) {
                    const blob = await res.blob();
                    setProfilePic(URL.createObjectURL(blob));
                }
            } catch (error) {
                console.error("Error fetching MS profile pic:", error);
            }
        }
        if (userName) {
            fetchProfilePic();
        }
    }, [userName]);

    // Iconos por defecto según el id del item
    const defaultIcons = {
        actividades: FileText,
        asistencia: Clock,
        talento_humano: Users,
        empresas: Building2,
        dashboards: PieChart,
        reportes: Calendar,
        dashboard: LayoutDashboard
    };

    const sidebarBg = isDark ? '#0d1117' : '#0f172a';
    const sidebarItemBg = isDark ? 'rgba(59, 130, 246, 0.2)' : 'rgba(59, 130, 246, 0.15)';

    const renderMenuItem = (item, index, expanded = true) => {
        const Icon = item.icon || defaultIcons[item.id] || FileText;
        const isActive = activeTab === item.id;

        return (
            <button
                key={item.id || index}
                onClick={() => {
                    if (item.onClick) {
                        item.onClick();
                    } else {
                        onTabChange(item.id);
                    }
                    setIsMobileMenuOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all duration-200 cursor-pointer group ${expanded ? '' : 'justify-center'}`}
                style={{
                    background: isActive ? sidebarItemBg : 'transparent',
                    color: isActive ? '#fff' : 'rgba(255,255,255,0.6)',
                }}
                title={!expanded ? item.label : undefined}
            >
                <Icon className={`w-5 h-5 flex-shrink-0 transition-colors ${isActive ? 'text-blue-400' : 'text-gray-400 group-hover:text-white'}`} />
                {expanded && (
                    <span className={`font-medium text-sm transition-all duration-300 ${isActive ? 'text-white' : 'group-hover:text-white'}`}>
                        {item.label}
                    </span>
                )}
            </button>
        );
    };

    const SidebarContent = ({ expanded = true }) => (
        <>
            {/* Logo/Brand */}
            {/* Logo/Brand */}
            <div className={`flex items-center ${expanded ? 'px-4 py-4' : 'justify-center py-4'} transition-all duration-300`}>
                <div className={`flex items-center justify-center w-full transition-all duration-300`}>
                    <LoginLogo
                        className={`transition-all duration-300 ${expanded ? 'w-32 lg:w-48 h-auto' : 'w-10 h-auto'
                            }`}
                    />
                </div>
            </div>

            {/* Navegación */}
            <nav className={`flex-1 ${expanded ? 'px-3' : 'px-2'} space-y-1 mt-2`}>
                {items.map((item, index) => renderMenuItem(item, index, expanded))}
            </nav>

            {/* Separador */}
            <div className="border-t border-gray-700/50 mx-4 my-4"></div>

            {/* Sección inferior */}
            <div className={`${expanded ? 'px-3' : 'px-2'} pb-4 space-y-2`}>
                {/* Usuario */}
                {userName && expanded && (
                    <button
                        onClick={onProfileClick}
                        className="w-full px-3 py-2.5 rounded-xl bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/20 flex items-center gap-2.5 hover:from-blue-500/20 hover:to-purple-500/20 transition-all cursor-pointer text-left"
                    >
                        {(avatarUrl || profilePic) ? (
                            <img src={avatarUrl || profilePic} alt="Perfil" className="w-8 h-8 rounded-full object-cover flex-shrink-0 border border-blue-500/30" />
                        ) : (
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-bold text-xs flex-shrink-0">
                                {userName?.charAt(0)?.toUpperCase() || 'A'}
                            </div>
                        )}
                        <div className="min-w-0">
                            <p className="text-white font-medium text-sm truncate">{userName}</p>
                            <p className="text-[10px] text-gray-400">{userRole}</p>
                        </div>
                    </button>
                )}
                {userName && !expanded && (
                    <button
                        onClick={onProfileClick}
                        className="w-full flex justify-center py-2 cursor-pointer"
                        title={userName}
                    >
                        {(avatarUrl || profilePic) ? (
                            <img src={avatarUrl || profilePic} alt="Perfil" className="w-8 h-8 rounded-full object-cover flex-shrink-0" />
                        ) : (
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-bold text-xs">
                                {userName?.charAt(0)?.toUpperCase() || 'A'}
                            </div>
                        )}
                    </button>
                )}

                {/* Tema */}
                <div className={`flex items-center ${expanded ? 'justify-between px-4' : 'justify-center'} py-2`}>
                    {expanded && <span className="text-sm text-gray-400">Tema</span>}
                    <ThemeToggle />
                </div>

                {/* Botón volver */}
                {showBackButton && (
                    <Link
                        href="/"
                        className={`w-full flex items-center ${expanded ? 'gap-3 px-4' : 'justify-center'} py-3 rounded-xl transition-all cursor-pointer text-gray-400 hover:text-white hover:bg-gray-700/30`}
                        title={!expanded ? 'Volver al inicio' : undefined}
                    >
                        <ChevronLeft className="w-5 h-5" />
                        {expanded && <span className="text-sm">Volver al inicio</span>}
                    </Link>
                )}

                {/* Cerrar sesión */}
                {onLogout && (
                    <button
                        onClick={onLogout}
                        className={`w-full flex items-center ${expanded ? 'gap-3 px-4' : 'justify-center'} py-3 rounded-xl transition-all cursor-pointer text-red-400 hover:text-red-300 hover:bg-red-500/10`}
                        title={!expanded ? 'Cerrar Sesión' : undefined}
                    >
                        <LogOut className="w-5 h-5" />
                        {expanded && <span className="text-sm font-medium">Cerrar Sesión</span>}
                    </button>
                )}
            </div>
        </>
    );

    return (
        <>
            {/* Sidebar Desktop - Collapsible on hover */}
            <aside
                className="hidden lg:flex flex-col fixed left-0 top-0 h-full z-40 transition-all duration-300 ease-in-out"
                style={{
                    background: sidebarBg,
                    width: isExpanded ? '256px' : '72px',
                    boxShadow: '4px 0 24px rgba(0,0,0,0.15)'
                }}
                onMouseEnter={() => {
                    setIsExpanded(true);
                    if (onHoverChange) onHoverChange(true);
                }}
                onMouseLeave={() => {
                    setIsExpanded(false);
                    if (onHoverChange) onHoverChange(false);
                }}
            >
                <SidebarContent expanded={isExpanded} />

                {/* Expand indicator */}
                <div
                    className="absolute right-0 top-1/2 transform -translate-y-1/2 translate-x-1/2 w-6 h-6 rounded-full bg-gray-700 border border-gray-600 flex items-center justify-center cursor-pointer hover:bg-gray-600 transition-colors"
                    style={{ opacity: isExpanded ? 0 : 0.7 }}
                >
                    <ChevronRight className="w-4 h-4 text-gray-300" />
                </div>
            </aside>

            {/* Mobile Header */}
            <div
                className="lg:hidden fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 py-3 border-b border-white/5"
                style={{ background: sidebarBg }}
            >
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                        className="text-white p-2 rounded-xl hover:bg-gray-700/50 cursor-pointer transition-colors"
                    >
                        {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                    </button>
                    <LoginLogo className="w-20 sm:w-24 h-auto" />
                </div>

                {/* Perfil movido al SidebarContent interno */}
                
            </div>


            {/* Mobile Menu Overlay */}
            {isMobileMenuOpen && (
                <div
                    className="lg:hidden fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
                    onClick={() => setIsMobileMenuOpen(false)}
                />
            )}

            {/* Mobile Sidebar */}
            <aside
                className={`lg:hidden fixed left-0 top-14 bottom-0 w-64 z-50 transform transition-transform duration-300 ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
                    }`}
                style={{ background: sidebarBg }}
            >
                <SidebarContent expanded={true} />
            </aside>

            {/* Spacer for mobile header */}
            <div className="lg:hidden h-14"></div>
        </>
    );
}
