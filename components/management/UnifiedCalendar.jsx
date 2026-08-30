import React, { useState } from 'react';
import CorporateCalendar from '../CorporateCalendar';
import TaxCalendar2026 from '../TaxCalendar2026';
import { Calendar, Building, Building2 } from 'lucide-react';

export default function UnifiedCalendar({ theme, isDark }) {
    const [view, setView] = useState('corporate');

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 p-4 rounded-2xl border shadow-sm" style={{ background: theme.surface, borderColor: theme.border }}>
                <div>
                    <h3 className="font-black text-lg flex items-center gap-2" style={{ color: theme.text }}>
                        <Calendar size={20} className="text-blue-500" />
                        Calendarios
                    </h3>
                    <p className="text-xs" style={{ color: theme.textSecondary }}>Gestión de eventos internos, reuniones y obligaciones tributarias.</p>
                </div>

                <div className="flex p-1 rounded-xl w-full sm:w-auto" style={{ background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }}>
                    <button 
                        onClick={() => setView('corporate')}
                        className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${view === 'corporate' ? 'bg-white dark:bg-gray-800 shadow-sm text-blue-600' : 'text-gray-600 hover:bg-black/5 dark:text-gray-400 dark:hover:bg-white/5'}`}
                    >
                        <Building size={16} /> Corporativo
                    </button>
                    <button 
                        onClick={() => setView('tax')}
                        className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${view === 'tax' ? 'bg-white dark:bg-gray-800 shadow-sm text-purple-600' : 'text-gray-600 hover:bg-black/5 dark:text-gray-400 dark:hover:bg-white/5'}`}
                    >
                        <Building2 size={16} /> Tributario
                    </button>
                </div>
            </div>

            <div className="animate-fade-in">
                {view === 'corporate' ? (
                    <CorporateCalendar theme={theme} isDark={isDark} />
                ) : (
                    <div className="p-4 rounded-2xl border bg-white dark:bg-[#111827]" style={{ borderColor: theme.border }}>
                        <TaxCalendar2026 />
                    </div>
                )}
            </div>
        </div>
    );
}
