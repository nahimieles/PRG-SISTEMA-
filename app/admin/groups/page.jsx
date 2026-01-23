'use client';

import GroupManager from '../../../components/admin/GroupManager';
import { useTheme } from '../../../contexts/ThemeContext';
import { lightTheme, darkTheme } from '../../../lib/colors';
import Sidebar from '../../../components/Sidebar';
import { PieChart, Calendar, Users, FileText, LayoutGrid } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function GroupsAdminPage() {
    const { isDark } = useTheme();
    const theme = isDark ? darkTheme : lightTheme;
    const router = useRouter();

    const sidebarItems = [
        { id: 'dashboards', label: 'Dashboards', icon: PieChart, onClick: () => router.push('/administracion') },
        { id: 'reportes', label: 'Reportes', icon: Calendar, onClick: () => router.push('/administracion') },
        { id: 'funcionarios', label: 'Funcionarios', icon: Users, onClick: () => router.push('/administracion') },
        { id: 'archivos', label: 'Archivos Cloud', icon: FileText, onClick: () => router.push('/administracion') },
        { id: 'grupos', label: 'Gestor de Grupos', icon: LayoutGrid, active: true }
    ];

    return (
        <div className="dashboard-layout">
            <Sidebar
                items={sidebarItems}
                activeTab="grupos"
                onTabChange={() => { }}
                userName="Administrador"
                onLogout={() => router.push('/')}
                showBackButton={true}
            />
            <main
                className="dashboard-content min-h-screen transition-colors p-4 lg:p-6 page-transition"
                style={{ background: theme.background, color: theme.text }}
            >
                <div className="max-w-7xl mx-auto h-[calc(100vh-3rem)]">
                    <GroupManager />
                </div>
            </main>
        </div>
    );
}
