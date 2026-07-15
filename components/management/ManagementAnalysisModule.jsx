import React, { useState } from 'react';
import { Briefcase, Clock, FileCheck, Calendar as CalendarIcon } from 'lucide-react';
import ClientActivities from './ClientActivities';
import HoursAnalysis from './HoursAnalysis';
import ComplianceReport from './ComplianceReport';
import UnifiedCalendar from './UnifiedCalendar';

export default function ManagementAnalysisModule({ theme, isDark }) {
    const [activeSubTab, setActiveSubTab] = useState('clientes');

    const tabs = [
        { id: 'clientes', label: 'Actividades por Cliente', icon: Briefcase },
        { id: 'horas', label: 'Análisis de Horas', icon: Clock },
        { id: 'cumplimiento', label: 'Informe de Cumplimiento', icon: FileCheck },
        { id: 'calendario', label: 'Calendarios', icon: CalendarIcon }
    ];

    return (
        <div className="flex flex-col h-full animate-fade-in">
            {/* Header Tabs */}
            <div className="flex flex-wrap gap-2 mb-6 border-b" style={{ borderColor: theme.border }}>
                {tabs.map(tab => {
                    const Icon = tab.icon;
                    const isActive = activeSubTab === tab.id;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => setActiveSubTab(tab.id)}
                            className={`px-4 py-2 font-bold text-xs sm:text-sm transition-colors border-b-2 flex items-center gap-2 ${
                                isActive 
                                ? 'text-blue-500 border-blue-500 bg-blue-500/5' 
                                : 'text-gray-500 border-transparent hover:text-gray-700 hover:bg-black/5 dark:hover:bg-white/5'
                            }`}
                        >
                            <Icon size={16} />
                            {tab.label}
                        </button>
                    );
                })}
            </div>

            {/* Content Area */}
            <div className="flex-1 w-full">
                {activeSubTab === 'clientes' && <ClientActivities theme={theme} isDark={isDark} />}
                {activeSubTab === 'horas' && <HoursAnalysis theme={theme} isDark={isDark} />}
                {activeSubTab === 'cumplimiento' && <ComplianceReport theme={theme} isDark={isDark} />}
                {activeSubTab === 'calendario' && <UnifiedCalendar theme={theme} isDark={isDark} />}
            </div>
        </div>
    );
}
