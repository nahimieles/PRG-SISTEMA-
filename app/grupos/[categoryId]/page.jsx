'use client';

import { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import CompanyGroupDashboard from '@/components/CompanyGroupDashboard';
import { getGroups } from '@/lib/groups'; // We can optimize this to fetch by parent_id later if needed
import { useTheme } from '@/contexts/ThemeContext';
import { lightTheme, darkTheme } from '@/lib/colors';
import OneDriveExplorer from '@/components/OneDriveExplorer'; // Import for direct integration

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
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function loadData() {
            setLoading(true);
            try {
                // Parallel fetch for performance optimization
                const [group, kids] = await Promise.all([
                    getGroupById(categoryId),
                    getGroupsByParent(categoryId)
                ]);

                setCurrentGroup(group);
                setChildren(kids);

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
    // If it's a link, we want to show the files for that resource
    if (isLink && resourceId) {
        // Note: OneDriveExplorer usually takes a "site" object or similar.
        // Since we just have a resourceID (driveId or similar), we might need to adapt OneDriveExplorer 
        // or specific logic. For now, assuming standard integration logic isn't ready for raw resourceID,
        // but if the design intent was to "Connect SharePoint Resources", we'd pass this ID.

        // However, existing OneDriveExplorer relies heavily on "selectedSite" object for context.
        // Let's create a wrapper or simple view if direct file browsing is intended.
        // Or simplistic: Just show "Not Implemented for Links yet" or a specialized view.

        // BETTER APPROACH FOR NOW: Show a placeholder or the same dashboard if it has children?
        // Links shouldn't have children.

        // Let's assume we want to open the specific folder ID in the Explorer.
        // But OneDriveExplorer expects a site.

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
                        href={`https://unocrm.sharepoint.com/sites/${resourceId}`} // Guessing URL structure
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
            <CompanyGroupDashboard
                groups={children}
                isLoading={loading}
                title={currentGroup?.name || "Cargando..."}
                subtitle={currentGroup?.type === 'folder' ? 'Carpeta de Archivos' : 'Sub-grupos Operativos'}
            />
            {/* Back button or breadcrumbs could go here */}
        </div>
    );
}
