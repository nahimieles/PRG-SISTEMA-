import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../lib/supabase';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Building2, TrendingUp } from 'lucide-react';
import RealTimeMonitor from '../RealTimeMonitor';
import CustomDatePicker from '../CustomDatePicker';

const COLORS = ['#3498db', '#27ae60', '#e74c3c', '#d4af37', '#9b59b6', '#1abc9c', '#34495e', '#e67e22'];

export default function AdminDashboard({ theme, isDark }) {
    const [records, setRecords] = useState([]);
    const [filterType, setFilterType] = useState('mes'); 
    const [customStart, setCustomStart] = useState('');
    const [customEnd, setCustomEnd] = useState('');

    const dateRange = useMemo(() => {
        const d = new Date();
        let start, end;

        if (filterType === 'mes') {
            start = new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split('T')[0];
            end = new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().split('T')[0];
        } else if (filterType === 'semana') {
            const day = d.getDay();
            const diff = d.getDate() - day + (day === 0 ? -6 : 1); 
            const first = new Date(d.setDate(diff));
            const last = new Date(d.setDate(first.getDate() + 6));
            start = first.toISOString().split('T')[0];
            end = last.toISOString().split('T')[0];
        } else {
            start = customStart || new Date().toISOString().split('T')[0];
            end = customEnd || new Date().toISOString().split('T')[0];
        }

        return { start, end };
    }, [filterType, customStart, customEnd]);

    useEffect(() => {
        const fetchRecords = async () => {
            const { data } = await supabase
                .from('audit_records')
                .select('company_name, worker_name, hours_worked')
                .gte('created_at', `${dateRange.start}T00:00:00Z`)
                .lte('created_at', `${dateRange.end}T23:59:59Z`);

            if (data) setRecords(data);
        };
        fetchRecords();
    }, [dateRange]);

    const { topCompanies, workerData } = useMemo(() => {
        const hoursByCompany = {};
        const hoursByWorker = {};
        const SYSTEM_NAMES = ['desconocido', 'usuario desconocido', 'sharepoint', 'system', 'onedrive', 'app@sharepoint'];

        records.forEach(r => {
            const worker = (r.worker_name || 'Sin Nombre').trim();
            if (SYSTEM_NAMES.includes(worker.toLowerCase())) return;
            const company = r.company_name || 'Sin Empresa';
            const hrs = parseFloat(r.hours_worked) || 0;

            hoursByCompany[company] = (hoursByCompany[company] || 0) + hrs;
            hoursByWorker[worker] = (hoursByWorker[worker] || 0) + hrs;
        });

        const sortedCompanies = Object.entries(hoursByCompany)
            .map(([name, val]) => ({ name: name.length > 18 ? name.substring(0, 18) + '...' : name, value: parseFloat(val.toFixed(2)) }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 6);

        const sortedWorkers = Object.entries(hoursByWorker)
            .map(([name, val]) => ({ name, value: parseFloat(val.toFixed(2)) }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 6);

        return { topCompanies: sortedCompanies, workerData: sortedWorkers };
    }, [records]);

    return (
        <div className="flex flex-col gap-4 sm:gap-8 animate-fade-in">
            {}
            <div className="flex flex-col sm:flex-row gap-4 justify-between items-center p-4 rounded-3xl border shadow-sm transition-all" style={{ background: theme.surface, borderColor: theme.border }}>
                <div className="flex gap-2">
                    <button 
                        onClick={() => setFilterType('mes')}
                        className={`px-4 py-2 rounded-xl text-sm font-bold transition-colors ${filterType === 'mes' ? 'bg-blue-500 text-white' : 'hover:bg-black/10 dark:hover:bg-white/10'}`}
                        style={{ color: filterType === 'mes' ? 'white' : theme.text }}
                    >
                        Mes Actual
                    </button>
                    <button 
                        onClick={() => setFilterType('semana')}
                        className={`px-4 py-2 rounded-xl text-sm font-bold transition-colors ${filterType === 'semana' ? 'bg-blue-500 text-white' : 'hover:bg-black/10 dark:hover:bg-white/10'}`}
                        style={{ color: filterType === 'semana' ? 'white' : theme.text }}
                    >
                        Semana
                    </button>
                    <button 
                        onClick={() => setFilterType('custom')}
                        className={`px-4 py-2 rounded-xl text-sm font-bold transition-colors ${filterType === 'custom' ? 'bg-blue-500 text-white' : 'hover:bg-black/10 dark:hover:bg-white/10'}`}
                        style={{ color: filterType === 'custom' ? 'white' : theme.text }}
                    >
                        Personalizado
                    </button>
                </div>
                {filterType === 'custom' && (
                    <div className="flex gap-2 items-center text-sm z-10">
                        <CustomDatePicker value={customStart} onChange={setCustomStart} placeholder="Inicio" className="w-36" />
                        <span style={{ color: theme.text }}>-</span>
                        <CustomDatePicker value={customEnd} onChange={setCustomEnd} placeholder="Fin" className="w-36" />
                    </div>
                )}
            </div>

            {}
            <div className="p-3 sm:p-6 rounded-3xl border shadow-sm transition-all hover:shadow-md animate-in fade-in slide-in-from-bottom-4 duration-500 overflow-hidden" style={{ background: theme.surface, borderColor: theme.border }}>
                <div className="flex items-center justify-between mb-4 sm:mb-6">
                    <h3 className="text-[11px] sm:text-sm font-black uppercase tracking-[0.15em] flex items-center gap-2" style={{ color: theme.text }}>
                        <Building2 size={16} className="text-blue-500" /> Dedicación por Empresa (Horas)
                    </h3>
                </div>
                <div className="h-[150px] sm:h-[300px] w-full px-3">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={topCompanies} layout="vertical" margin={{ left: -15, right: 35, top: 0, bottom: 0 }}>
                            <XAxis type="number" hide />
                            <YAxis 
                                dataKey="name" 
                                type="category" 
                                width={typeof window !== 'undefined' && window.innerWidth < 640 ? 70 : 130} 
                                stroke={theme.text} 
                                tick={{ fill: theme.text, fontSize: 9, fontWeight: 'bold' }} 
                                axisLine={false} 
                                tickLine={false} 
                            />
                            <Tooltip 
                                cursor={{ fill: 'transparent' }} 
                                contentStyle={{ borderRadius: '12px', border: 'none', background: isDark ? '#1a2234' : '#fff', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', fontSize: '12px', color: theme.text }}
                                labelStyle={{ color: theme.text, fontWeight: 'bold', marginBottom: '4px' }}
                                itemStyle={{ color: theme.text }}
                                formatter={(val) => [`${val}h`, 'Horas Invertidas']}
                            />
                            <Bar dataKey="value" radius={[0, 10, 10, 0]} barSize={12}>
                                {topCompanies.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {}
            <div className="p-4 sm:p-6 rounded-3xl border shadow-sm transition-all hover:shadow-md animate-in fade-in slide-in-from-bottom-4 duration-500 delay-100" style={{ background: theme.surface, borderColor: theme.border }}>
                <div className="flex items-center justify-between mb-4 sm:mb-6">
                    <h3 className="text-[11px] sm:text-sm font-black uppercase tracking-[0.15em] flex items-center gap-2" style={{ color: theme.text }}>
                        <TrendingUp size={16} className="text-emerald-500" /> Horas por Funcionario
                    </h3>
                </div>
                <div className="h-[150px] sm:h-[300px] w-full px-3">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={workerData} layout="vertical" margin={{ left: -15, right: 35, top: 0, bottom: 0 }}>
                            <XAxis type="number" hide />
                            <YAxis 
                                dataKey="name" 
                                type="category" 
                                width={typeof window !== 'undefined' && window.innerWidth < 640 ? 70 : 140} 
                                stroke={theme.text} 
                                tick={{ fill: theme.text, fontSize: 9, fontWeight: 'bold' }} 
                                axisLine={false} 
                                tickLine={false} 
                            />
                            <Tooltip 
                                cursor={{ fill: 'transparent' }} 
                                contentStyle={{ borderRadius: '12px', border: 'none', background: isDark ? '#1a2234' : '#fff', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', fontSize: '12px', color: theme.text }}
                                labelStyle={{ color: theme.text, fontWeight: 'bold', marginBottom: '4px' }}
                                itemStyle={{ color: theme.text }}
                                formatter={(val) => [`${val}h`, 'Horas Totales']}
                            />
                            <Bar dataKey="value" radius={[0, 10, 10, 0]} barSize={12}>
                                {workerData.map((entry, index) => (
                                    <Cell key={`cell-w-${index}`} fill={COLORS[(index + 1) % COLORS.length]} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {}
            <RealTimeMonitor />
        </div>
    );
}
