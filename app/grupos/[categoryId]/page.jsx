'use client';

import { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import CompanyGroupDashboard from '@/components/CompanyGroupDashboard';
import { getGroupsByParent, getGroupById } from '@/lib/groups';
import { getCompanies } from '@/lib/auth';
import { useTheme } from '@/contexts/ThemeContext';
import { lightTheme, darkTheme } from '@/lib/colors';
import OneDriveExplorer from '@/components/OneDriveExplorer';
import { Building2, Edit2, Trash2, Folder } from 'lucide-react';

export default function DynamicGroupPage() {
    const { categoryId } = useParams();
    const searchParams = useSearchParams();
    const { isDark } = useTheme();
    const theme = isDark ? darkTheme : lightTheme;

    // Check querystrings for special handling
    const isLink = searchParams.get('type') === 'link';
    const resourceId = searchParams.get('resourceId');

    const [currentGroup, setCurrentGroup] = useState(null);
    const [children, setChildren] = useState([]);
    const [companies, setCompanies] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function loadData() {
            setLoading(true);
            try {
                // Parallel fetch for performance optimization
                const [group, kids, allCompanies] = await Promise.all([
                    getGroupById(categoryId),
                    getGroupsByParent(categoryId),
                    getCompanies()
                ]);

                setCurrentGroup(group);
                setChildren(kids);

                // Filter companies for this group
                const groupCompanies = allCompanies.filter(c => c.group_id === categoryId);
                setCompanies(groupCompanies);

            } catch (error) {
                console.error('Error loading group data:', error);
            } finally {
                setLoading(false);
            }
        }

        if (categoryId) {
            loadData();
        }
    }, [categoryId]);


    // Handle Link Type: Render OneDrive Explorer directly?
    if (isLink && resourceId) {
        return (
            <div style={{ background: theme.background, minHeight: '100vh', padding: '20px', color: theme.text }}>
                <h1 className="text-2xl font-bold mb-4 flex items-center gap-2">
                    {currentGroup?.icon && <span className="opacity-50">{currentGroup.icon}</span>}
                    {currentGroup?.name || 'Recurso Vinculado'}
                </h1>
                <div className="bg-amber-50 border border-amber-200 p-4 rounded-lg text-amber-800">
                    <p className="font-bold">Enlace a SharePoint</p>
                    <p>Este grupo está vinculado al recurso ID: <code className="font-mono bg-white px-1 rounded">{resourceId}</code></p>
                    <p className="mt-2 text-sm">La integración directa para navegar este recurso específico se implementará en la siguiente fase.</p>
                    <a
                        href={`https://unocrm.sharepoint.com/sites/${resourceId}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-block mt-3 text-blue-600 hover:underline"
                    >
                        Intentar abrir en SharePoint (Pestaña nueva)
                    </a>
                </div>
            </div>
        );
    }

    return (
        <div style={{ background: theme.background, minHeight: '100vh', color: theme.text }}>

            {/* 1. Sub-Groups (if any) */}
            {(children.length > 0 || loading) && (
                <CompanyGroupDashboard
                    groups={children}
                    isLoading={loading}
                    title={currentGroup?.name || "Cargando..."}
                    subtitle="Sub-grupos Operativos"
                />
            )}

            {/* 2. Companies List */}
            {!loading && companies.length > 0 && (
                <div className="w-full max-w-7xl mx-auto p-4 md:p-8 animate-fade-in pt-0">
                    <h3 className="text-xl font-bold mb-6 flex items-center gap-2" style={{ color: theme.text }}>
                        <Building2 className="text-blue-500" />
                        Empresas Asignadas
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {companies.map(company => (
                            <div key={company.id} className="p-5 rounded-xl border shadow-sm hover:shadow-md transition-all group relative" style={{ background: theme.surface, borderColor: theme.border }}>
                                <div className="flex justify-between items-start mb-3">
                                    {company.avatar_url ? (
                                        <img src={company.avatar_url} className="w-14 h-14 rounded-xl object-cover border shadow-sm" />
                                    ) : (
                                        <div className="w-14 h-14 bg-gray-100 dark:bg-gray-800 rounded-xl flex items-center justify-center text-gray-400">
                                            <Building2 size={24} />
                                        </div>
                                    )}
                                </div>
                                <h3 className="font-bold text-lg mb-1 truncate" style={{ color: theme.text }}>{company.name}</h3>
                                <div className="flex flex-wrap gap-2 text-xs">
                                    <span className="px-2 py-1 rounded bg-gray-100 dark:bg-gray-800 opacity-70 uppercase">{company.type}</span>
                                    {company.username && <span className="px-2 py-1 rounded bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400 font-bold">USER: {company.username}</span>}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {!loading && children.length === 0 && companies.length === 0 && (
                <div className="w-full max-w-7xl mx-auto p-20 text-center opacity-50">
                    <Folder size={64} className="mx-auto mb-4 text-gray-300" />
                    <h2 className="text-xl font-bold">Grupo Vacío</h2>
                    <p>No hay subgrupos ni empresas asignadas.</p>
                </div>
            )}
        </div>
    );
}
