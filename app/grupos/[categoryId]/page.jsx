'use client';

import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { lightTheme, darkTheme } from '../../lib/colors';

// Helper to get title from ID
const getTitle = (id) => {
    const titles = {
        patrimonio: 'Patrimonio',
        metas: 'Metas',
        financial_plan: 'Plan Financiero',
        dashboard_plan: 'Dashboard Plan',
        real_data: 'Control Datos Reales',
        debt_control: 'Control Deuda',
        tc_control: 'Control TC',
        tax_planning: 'Tax Planning',
        real_vs_plan: 'Dash Real / Real vs Plan'
    };
    return titles[id] || 'Módulo';
};

export default function GroupModulePage() {
    const params = useParams();
    const router = useRouter();
    const { isDark } = useTheme();
    const theme = isDark ? darkTheme : lightTheme;
    const categoryId = params.categoryId;
    const title = getTitle(categoryId);

    return (
        <div className="min-h-screen p-8 animate-fade-in" style={{ background: theme.background, color: theme.text }}>
            <button
                onClick={() => router.back()}
                className="flex items-center gap-2 mb-6 opacity-70 hover:opacity-100 transition-opacity"
            >
                <ArrowLeft size={20} /> Volver
            </button>

            <div className="max-w-7xl mx-auto">
                <h1 className="text-3xl font-bold mb-4" style={{ color: theme.primary }}>{title}</h1>

                <div className="p-12 rounded-2xl shadow-lg border text-center" style={{ background: theme.surface, borderColor: theme.border }}>
                    <div className="mb-4 text-6xl">🚧</div>
                    <h2 className="text-xl font-semibold mb-2">Módulo en Construcción</h2>
                    <p style={{ color: theme.textSecondary }}>
                        Estamos preparando la visualización y métricas para <strong>{title}</strong>.
                    </p>
                    <div className="mt-8 flex justify-center">
                        <div className="h-2 w-48 bg-gray-200 rounded-full overflow-hidden">
                            <div className="h-full bg-blue-500 w-1/3 animate-pulse"></div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
