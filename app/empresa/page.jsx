'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { MonitorPlay, LogOut, Info } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import Sidebar from '../../components/Sidebar';
import { getCompanySession, clearUnifiedSession } from '../../lib/auth.js';
import { lightTheme, darkTheme } from '../../lib/colors';

const CourseViewer = dynamic(() => import('../../components/CourseViewer'), { ssr: false });
const CompanyInformation = dynamic(() => import('../../components/CompanyInformation'), { ssr: false });

export default function CompanyPage() {
    const router = useRouter();
    const { isDark } = useTheme();
    const theme = isDark ? darkTheme : lightTheme;

    const [company, setCompany] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('informacion');
    const [isSidebarExpanded, setIsSidebarExpanded] = useState(false);

    const sidebarItems = [
        { id: 'informacion', label: 'Información', icon: Info },
        { id: 'cursos', label: 'Cursos', icon: MonitorPlay }
    ];

    useEffect(() => {
        const session = getCompanySession();
        if (!session) {
            router.push('/');
        } else {
            setCompany(session);
            setLoading(false);
        }
    }, [router]);

    const handleLogout = () => {
        clearUnifiedSession();
        router.push('/');
    };

    if (loading) {
        return (
            <div
                className="min-h-screen flex items-center justify-center"
                style={{ background: theme.background }}
            >
                <div className="animate-pulse">
                    <img
                        src="/Sin título-1-08.png"
                        alt="Cargando..."
                        className="w-20 h-20 object-contain opacity-50"
                    />
                </div>
            </div>
        );
    }

    if (!company) return null;

    return (
        <div className="dashboard-layout" style={{ background: theme.background, minHeight: '100vh' }}>
            <Sidebar
                items={sidebarItems}
                activeTab={activeTab}
                onTabChange={setActiveTab}
                userName={company.name}
                userRole="Empresa"
                avatarUrl={company.logo_url || company.avatar_url}
                onLogout={handleLogout}
                showBackButton={false}
                onHoverChange={setIsSidebarExpanded}
            />

            <main
                className="dashboard-content min-h-screen transition-all duration-300 ease-in-out"
                style={{
                    background: theme.background,
                    color: theme.text,
                    marginLeft: isSidebarExpanded ? '256px' : '72px',
                    minHeight: '100vh' // Fix for background trail
                }}
            >
                <div className="max-w-7xl mx-auto py-8 px-4">
                    {activeTab === 'informacion' && <CompanyInformation company={company} />}
                    {activeTab === 'cursos' && <CourseViewer companyId={company.id} company={company} />}
                </div>
            </main>
        </div>
    );
}
