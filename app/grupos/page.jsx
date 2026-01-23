'use client';

import { useState, useEffect } from 'react';
import CompanyGroupDashboard from '@/components/CompanyGroupDashboard';
import { getGroups, getGroupsByParent } from '@/lib/groups';
import { useTheme } from '@/contexts/ThemeContext';
import { lightTheme, darkTheme } from '@/lib/colors';

export default function GroupsPage() {
    const { isDark } = useTheme();
    const theme = isDark ? darkTheme : lightTheme;
    const [groups, setGroups] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function loadData() {
            try {
                // Fetch root groups only (parent_id is null) using optimized query
                const rootGroups = await getGroupsByParent(null);
                setGroups(rootGroups);
            } catch (error) {
                console.error('Error loading groups:', error);
            } finally {
                setLoading(false);
            }
        }
        loadData();
    }, []);

    return (
        <div style={{ background: theme.background, minHeight: '100vh', color: theme.text }}>
            <CompanyGroupDashboard
                groups={groups}
                isLoading={loading}
                title="Grupos de Empresas"
                subtitle="Seleccione un grupo para ver sus contenidos"
            />
        </div>
    );
}
