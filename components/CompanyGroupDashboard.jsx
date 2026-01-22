'use client';

import React from 'react';
import { Home, Target, TrendingUp, BarChart3, PieChart, CreditCard, Calculator, DollarSign, Activity, FileText } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { lightTheme, darkTheme } from '../lib/colors';

const DashboardCard = ({ icon: Icon, label, color, onClick }) => {
    const { isDark } = useTheme();

    return (
        <button
            onClick={onClick}
            className={`
        relative overflow-hidden group p-6 rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300
        flex flex-col items-center justify-center gap-4 text-center border
      `}
            style={{
                background: isDark ? 'linear-gradient(145deg, #1f2937, #111827)' : 'linear-gradient(145deg, #ffffff, #f3f4f6)',
                borderColor: isDark ? '#374151' : '#e5e7eb',
                height: '180px'
            }}
        >
            <div
                className="p-4 rounded-full mb-2 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3"
                style={{ background: `${color}20`, color: color }}
            >
                <Icon size={32} strokeWidth={1.5} />
            </div>

            <span className="font-semibold text-lg tracking-wide" style={{ color: isDark ? '#f3f4f6' : '#1f2937' }}>
                {label}
            </span>

            {/* Decorative gradient overlay */}
            <div
                className="absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity duration-300 pointer-events-none"
                style={{ background: color }}
            />
        </button>
    );
};

export default function CompanyGroupDashboard() {
    const { isDark } = useTheme();
    const theme = isDark ? darkTheme : lightTheme;

    const cards = [
        { id: 'patrimonio', label: 'Patrimonio', icon: Home, color: '#3b82f6' }, // Blue
        { id: 'metas', label: 'Metas', icon: Target, color: '#ec4899' }, // Pink
        { id: 'financial_plan', label: 'Plan Financiero', icon: TrendingUp, color: '#8b5cf6' }, // Purple
        { id: 'dashboard_plan', label: 'Dashboard Plan', icon: BarChart3, color: '#10b981' }, // Green
        { id: 'real_data', label: 'Control Datos Reales', icon: Activity, color: '#f59e0b' }, // Amber
        { id: 'debt_control', label: 'Control Deuda', icon: DollarSign, color: '#ef4444' }, // Red
        { id: 'tc_control', label: 'Control TC', icon: CreditCard, color: '#6366f1' }, // Indigo
        { id: 'tax_planning', label: 'Tax Planning', icon: Calculator, color: '#14b8a6' }, // Teal
        { id: 'real_vs_plan', label: 'Dash Real / Plan', icon: PieChart, color: '#f97316' }, // Orange
    ];

    return (
        <div className="w-full max-w-7xl mx-auto p-6 animate-fade-in">
            <div className="mb-8 text-center md:text-left">
                <h1 className="text-3xl font-bold mb-2" style={{ color: theme.primary }}>
                    Grupos de Empresas
                </h1>
                <p style={{ color: theme.textSecondary }}>
                    Panel de Control Financiero y Operativo
                </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {cards.map((card) => (
                    <DashboardCard
                        key={card.id}
                        {...card}
                        onClick={() => alert(`Navegando a módulo: ${card.label}`)}
                    />
                ))}
            </div>
        </div>
    );
}
