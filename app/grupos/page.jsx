'use client';

import CompanyGroupDashboard from '@/components/CompanyGroupDashboard';
import Sidebar from '@/components/Sidebar';
import { useTheme } from '@/contexts/ThemeContext';
import { lightTheme, darkTheme } from '@/lib/colors';
import { useState } from 'react';
import { Users, LayoutDashboard, Settings } from 'lucide-react';

export default function GroupsPage() {
    const { isDark } = useTheme();
    const theme = isDark ? darkTheme : lightTheme;
    const [activeTab, setActiveTab] = useState('overview');

    // Sidebar mock items for this specific view (if needed) or reuse main
    const sidebarItems = [
        { id: 'overview', label: 'Vista General', icon: LayoutDashboard },
        { id: 'settings', label: 'Configuración', icon: Settings },
    ];

    return (
        <div className="flex h-screen overflow-hidden" style={{ background: theme.background }}>
            {/* Use Sidebar or a Back Button layout. For now, assuming a full page view. 
           In a real scenario, this might need the main App Sidebar.
           We'll use a simple wrapper here or the Main Sidebar if imported.
           Let's import Sidebar but use a simple layout for now to avoid complexity in this demo.
       */}

            <main className="flex-1 overflow-y-auto p-4 md:p-8" style={{ color: theme.text }}>
                <CompanyGroupDashboard />
            </main>
        </div>
    );
}
