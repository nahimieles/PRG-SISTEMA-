import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../lib/supabase';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { Clock, TrendingUp, AlertCircle, Calendar } from 'lucide-react';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316'];

export default function HoursAnalysis({ theme, isDark }) {
    const [records, setRecords] = useState([]);
    const [loading, setLoading] = useState(true);

    const [monthOffset, setMonthOffset] = useState(0); 

    const dateRange = useMemo(() => {
        const d = new Date();
        d.setMonth(d.getMonth() + monthOffset);

        const firstDay = new Date(d.getFullYear(), d.getMonth(), 1);
        const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0);

        return {
            start: firstDay.toISOString().split('T')[0],
            end: lastDay.toISOString().split('T')[0],
            monthName: firstDay.toLocaleString('es-ES', { month: 'long', year: 'numeric' })
        };
    }, [monthOffset]);

    useEffect(() => {
        const fetchRecords = async () => {
            setLoading(true);
            try {
                const { data } = await supabase
                    .from('audit_records')
                    .select('hours_worked, business_unit_name, company_name, worker_name')
                    .gte('created_at', `${dateRange.start}T00:00:00Z`)
                    .lte('created_at', `${dateRange.end}T23:59:59Z`);

                setRecords(data || []);
            } catch (error) {

            } finally {
                setLoading(false);
            }
        };
        fetchRecords();
    }, [dateRange]);

    const stats = useMemo(() => {
        let total = 0;
        const byUnit = {};
        const byCompany = {};

        records.forEach(r => {
            const hrs = parseFloat(r.hours_worked) || 0;
            total += hrs;

            const unit = r.business_unit_name || 'General';
            byUnit[unit] = (byUnit[unit] || 0) + hrs;

            const comp = r.company_name || 'Desconocida';
            byCompany[comp] = (byCompany[comp] || 0) + hrs;
        });

        const unitData = Object.keys(byUnit).map(name => ({ name, value: parseFloat(byUnit[name].toFixed(2)) })).sort((a,b) => b.value - a.value);
        const companyData = Object.keys(byCompany).map(name => ({ name, value: parseFloat(byCompany[name].toFixed(2)) })).sort((a,b) => b.value - a.value).slice(0, 8); 

        return { total, unitData, companyData };
    }, [records]);

    return (
        <div className="space-y-6 animate-fade-in">
            {}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl border shadow-sm" style={{ background: theme.surface, borderColor: theme.border }}>
                <div className="flex items-start sm:items-center gap-3">
                    <div className="p-2 rounded-lg bg-blue-500/10 text-blue-500 shrink-0">
                        <Clock size={20} />
                    </div>
                    <div>
                        <h3 className="font-black" style={{ color: theme.text }}>Análisis de Horas</h3>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <button onClick={() => setMonthOffset(prev => prev - 1)} className="px-3 py-1.5 text-xs font-bold rounded-lg border hover:bg-black/5 dark:hover:bg-white/5 transition-colors" style={{ borderColor: theme.border, color: theme.textSecondary }}>
                        Anterior
                    </button>
                    {monthOffset !== 0 && (
                        <button onClick={() => setMonthOffset(0)} className="px-3 py-1.5 text-xs font-bold rounded-lg bg-blue-500/10 text-blue-500 hover:bg-blue-500/20 transition-colors">
                            Mes Actual
                        </button>
                    )}
                    <button onClick={() => setMonthOffset(prev => prev + 1)} disabled={monthOffset >= 0} className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition-colors ${monthOffset >= 0 ? 'opacity-30 cursor-not-allowed' : 'hover:bg-black/5 dark:hover:bg-white/5'}`} style={{ borderColor: theme.border, color: theme.textSecondary }}>
                        Siguiente
                    </button>
                </div>
            </div>

            {loading ? (
                <div className="flex justify-center p-12">
                    <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                </div>
            ) : records.length === 0 ? (
                <div className="p-12 text-center rounded-2xl border" style={{ borderColor: theme.border, background: theme.surface }}>
                    <AlertCircle size={32} className="mx-auto mb-4 text-gray-400 opacity-50" />
                    <p className="text-sm font-bold" style={{ color: theme.textSecondary }}>No se registraron horas en este periodo.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                    {}
                    <div className="lg:col-span-3 p-6 rounded-2xl border bg-gradient-to-br from-blue-500/10 to-purple-500/10" style={{ borderColor: theme.border }}>
                        <div className="text-sm font-bold text-blue-600 mb-1 uppercase tracking-wider">Total Invertido ({dateRange.monthName})</div>
                        <div className="text-4xl font-black text-blue-700 dark:text-blue-400">{stats.total.toFixed(1)} <span className="text-2xl opacity-50">horas</span></div>
                    </div>

                    {}
                    <div className="p-4 sm:p-6 rounded-2xl border shadow-sm flex flex-col" style={{ background: theme.surface, borderColor: theme.border }}>
                        <h4 className="text-sm font-black uppercase tracking-wider mb-6 flex items-center gap-2" style={{ color: theme.text }}>
                            <PieChart size={16} className="text-purple-500"/>
                            Unidad de Negocio
                        </h4>
                        <div className="flex-1 h-[250px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={stats.unitData}
                                        cx="50%"
                                        cy="45%"
                                        innerRadius={60}
                                        outerRadius={80}
                                        paddingAngle={5}
                                        dataKey="value"
                                    >
                                        {stats.unitData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip 
                                        contentStyle={{ borderRadius: '12px', border: 'none', background: isDark ? '#1a2234' : '#fff', color: theme.text }}
                                        formatter={(val) => [`${val} hrs`, 'Inversión']}
                                    />
                                    <Legend wrapperStyle={{ fontSize: '11px', fontWeight: 'bold' }} />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {}
                    <div className="lg:col-span-2 p-4 sm:p-6 rounded-2xl border shadow-sm flex flex-col" style={{ background: theme.surface, borderColor: theme.border }}>
                        <h4 className="text-sm font-black uppercase tracking-wider mb-6 flex items-center gap-2" style={{ color: theme.text }}>
                            <TrendingUp size={16} className="text-emerald-500"/>
                            Top Clientes
                        </h4>
                        <div className="flex-1 h-[250px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={stats.companyData} margin={{ left: -20, right: 10, top: 10, bottom: 0 }}>
                                    <XAxis 
                                        dataKey="name" 
                                        tick={{ fill: theme.textSecondary, fontSize: 10, fontWeight: 'bold' }}
                                        axisLine={false}
                                        tickLine={false}
                                        tickFormatter={(val) => val.length > 10 ? val.substring(0,10) + '...' : val}
                                    />
                                    <YAxis 
                                        tick={{ fill: theme.textSecondary, fontSize: 10 }}
                                        axisLine={false}
                                        tickLine={false}
                                    />
                                    <Tooltip 
                                        cursor={{ fill: 'transparent' }}
                                        contentStyle={{ borderRadius: '12px', border: 'none', background: isDark ? '#1a2234' : '#fff', color: theme.text }}
                                        formatter={(val) => [`${val} hrs`, 'Inversión']}
                                    />
                                    <Bar dataKey="value" radius={[6, 6, 0, 0]} barSize={30}>
                                        {stats.companyData.map((entry, index) => (
                                            <Cell key={`cell-c-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                </div>
            )}
        </div>
    );
}
