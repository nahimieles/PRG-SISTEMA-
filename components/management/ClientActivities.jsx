import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Search, Calendar, Briefcase, Clock, FileText, AlertCircle } from 'lucide-react';
import CustomSelect from '../CustomSelect';
import CustomDatePicker from '../CustomDatePicker';

export default function ClientActivities({ theme, isDark }) {
    const [companies, setCompanies] = useState([]);
    const [records, setRecords] = useState([]);
    const [loading, setLoading] = useState(false);
    
    // Filters
    const [selectedCompany, setSelectedCompany] = useState('');
    const [startDate, setStartDate] = useState(() => {
        const d = new Date();
        d.setDate(1); // First day of current month
        return d.toISOString().split('T')[0];
    });
    const [endDate, setEndDate] = useState(() => {
        return new Date().toISOString().split('T')[0];
    });

    useEffect(() => {
        const loadCompanies = async () => {
            const { data } = await supabase.from('companies').select('id, name').order('name');
            if (data) setCompanies(data);
        };
        loadCompanies();
    }, []);

    const fetchActivities = async () => {
        if (!selectedCompany) return;
        setLoading(true);
        try {
            // Get the company name because audit_records currently stores company_name string
            const company = companies.find(c => c.id === selectedCompany);
            if (!company) return;

            const { data, error } = await supabase
                .from('audit_records')
                .select('*')
                .eq('company_name', company.name)
                .gte('created_at', `${startDate}T00:00:00Z`)
                .lte('created_at', `${endDate}T23:59:59Z`)
                .order('created_at', { ascending: false });

            if (!error && data) {
                setRecords(data);
            }
        } catch (error) {
            console.error('Error fetching activities:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (selectedCompany) {
            fetchActivities();
        } else {
            setRecords([]);
        }
    }, [selectedCompany, startDate, endDate]);

    const totalHours = records.reduce((acc, r) => acc + (parseFloat(r.hours_worked) || 0), 0);

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Controls */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 sm:p-6 rounded-2xl border shadow-sm" style={{ background: theme.surface, borderColor: theme.border }}>
                <div>
                    <label className="block text-[10px] font-black uppercase tracking-wider mb-2" style={{ color: theme.textSecondary }}>Cliente / Empresa</label>
                    <CustomSelect 
                        options={[{value: '', label: 'Seleccionar Cliente...'}, ...companies.map(c => ({value: c.id, label: c.name}))]}
                        value={selectedCompany}
                        onChange={setSelectedCompany}
                        theme={theme}
                        isDark={isDark}
                        isSearchable={true}
                    />
                </div>
                <div>
                    <label className="block text-[10px] font-black uppercase tracking-wider mb-2" style={{ color: theme.textSecondary }}>Fecha Inicio</label>
                    <div className="relative">
                        <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 opacity-50 z-10" style={{ color: theme.text }} />
                        <CustomDatePicker
                            value={startDate}
                            onChange={(val) => setStartDate(val)}
                            className="pl-9"
                            style={{ background: theme.background, borderColor: theme.border, color: theme.text }}
                        />
                    </div>
                </div>
                <div>
                    <label className="block text-[10px] font-black uppercase tracking-wider mb-2" style={{ color: theme.textSecondary }}>Fecha Fin</label>
                    <div className="relative">
                        <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 opacity-50 z-10" style={{ color: theme.text }} />
                        <CustomDatePicker
                            value={endDate}
                            onChange={(val) => setEndDate(val)}
                            className="pl-9"
                            style={{ background: theme.background, borderColor: theme.border, color: theme.text }}
                        />
                    </div>
                </div>
            </div>

            {/* Results Header */}
            {selectedCompany && (
                <div className="flex items-center justify-between p-4 rounded-xl border bg-blue-500/5" style={{ borderColor: theme.border }}>
                    <div>
                        <h3 className="font-black text-lg text-blue-500">Historial de Actividades</h3>
                        <p className="text-xs" style={{ color: theme.textSecondary }}>Se encontraron {records.length} registros en el periodo seleccionado.</p>
                    </div>
                    <div className="text-right">
                        <div className="text-2xl font-black text-blue-600 dark:text-blue-400">{totalHours.toFixed(1)}h</div>
                        <div className="text-[10px] uppercase font-bold text-gray-500">Total Horas Invertidas</div>
                    </div>
                </div>
            )}

            {/* Results List */}
            {!selectedCompany ? (
                <div className="p-12 text-center rounded-2xl border border-dashed" style={{ borderColor: theme.border, background: theme.surface }}>
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center bg-gray-500/10 text-gray-400">
                        <Search size={32} />
                    </div>
                    <h3 className="text-lg font-bold mb-1" style={{ color: theme.text }}>Selecciona un Cliente</h3>
                    <p className="text-sm" style={{ color: theme.textSecondary }}>Busca un cliente para visualizar las actividades realizadas y horas invertidas.</p>
                </div>
            ) : loading ? (
                <div className="flex justify-center p-12">
                    <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                </div>
            ) : records.length === 0 ? (
                <div className="p-12 text-center rounded-2xl border" style={{ borderColor: theme.border, background: theme.surface }}>
                    <AlertCircle size={32} className="mx-auto mb-4 text-gray-400 opacity-50" />
                    <p className="text-sm font-bold" style={{ color: theme.textSecondary }}>No se encontraron actividades en este rango de fechas.</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {records.map(record => (
                        <div key={record.id} className="p-4 rounded-xl border shadow-sm hover:shadow-md transition-shadow" style={{ background: theme.surface, borderColor: theme.border }}>
                            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                                <div>
                                    <div className="flex items-center gap-2 mb-2">
                                        <span className="text-xs font-black uppercase tracking-wider px-2 py-0.5 rounded bg-blue-500/10 text-blue-500">
                                            {record.service_type || 'General'}
                                        </span>
                                        <span className="text-xs font-bold" style={{ color: theme.textSecondary }}>
                                            {new Date(record.created_at).toLocaleDateString()}
                                        </span>
                                    </div>
                                    <p className="text-sm font-medium leading-relaxed mb-3" style={{ color: theme.text }}>
                                        {record.description || 'Sin descripción detallada'}
                                    </p>
                                    <div className="flex items-center gap-2 text-xs font-bold" style={{ color: theme.textSecondary }}>
                                        <div className="w-6 h-6 rounded-full bg-gray-500/20 flex items-center justify-center text-[10px]">
                                            {record.worker_name?.substring(0,2).toUpperCase()}
                                        </div>
                                        {record.worker_name}
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border font-bold text-sm" style={{ borderColor: theme.border, background: theme.background, color: theme.text }}>
                                        <Clock size={14} className="text-blue-500" />
                                        {record.hours_worked}h
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
