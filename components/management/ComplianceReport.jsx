import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { ShieldCheck, AlertTriangle, Download } from 'lucide-react';
import { exportToPDFAdvanced, exportToExcelAdvanced } from '../../lib/exportUtils';

export default function ComplianceReport({ theme, isDark }) {
    const [workersData, setWorkersData] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchData = async () => {
        setLoading(true);
        const currentDate = new Date();
        const currentMonth = currentDate.getMonth() + 1;
        const currentYear = currentDate.getFullYear();

        const EXPECTED_MONTHLY_HOURS = 160; 

        try {

            const { data: workers } = await supabase.from('workers').select('id, full_name, role').eq('estado_laboral', 'activo');

            const { data: tasks } = await supabase.from('hr_tasks').select('*').eq('month', currentMonth).eq('year', currentYear);

            const startDate = new Date(currentYear, currentMonth - 1, 1).toISOString().split('T')[0];
            const endDate = new Date(currentYear, currentMonth, 0).toISOString().split('T')[0];
            const { data: records } = await supabase
                .from('audit_records')
                .select('worker_id, hours_worked')
                .gte('created_at', `${startDate}T00:00:00Z`)
                .lte('created_at', `${endDate}T23:59:59Z`);

            const workersArr = workers || [];
            const tasksArr = tasks || [];
            const recordsArr = records || [];

            const wData = workersArr.map(w => {

                const wTasks = tasksArr.filter(t => t.worker_id === w.id);
                const wCompleted = wTasks.filter(t => t.status === 'completed').length;
                const taskCompliance = wTasks.length === 0 ? 100 : Math.round((wCompleted / wTasks.length) * 100); 

                const wRecords = recordsArr.filter(r => r.worker_id === w.id);
                const loggedHours = wRecords.reduce((acc, r) => acc + (parseFloat(r.hours_worked) || 0), 0);
                const hoursCompliance = Math.min(100, Math.round((loggedHours / EXPECTED_MONTHLY_HOURS) * 100));
                return {
                    id: w.id,
                    name: w.full_name,
                    role: w.role || 'No asignado',
                    tasksTotal: wTasks.length,
                    tasksCompleted: wCompleted,
                    taskCompliance,
                    loggedHours: parseFloat(loggedHours.toFixed(1)),
                    hoursCompliance,
                    expectedHours: EXPECTED_MONTHLY_HOURS
                };
            });

            wData.sort((a, b) => (b.taskCompliance + b.hoursCompliance) - (a.taskCompliance + a.hoursCompliance));

            setWorkersData(wData);
        } catch (error) {

        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    if (loading) {
        return (
            <div className="flex justify-center p-12">
                <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex justify-end gap-2 px-1">
                <button 
                    onClick={() => exportToPDFAdvanced('compliance-table', 'Reporte_Cumplimiento')}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
                >
                    <Download size={16} /> Exportar PDF
                </button>
                <button 
                    onClick={() => exportToExcelAdvanced(workersData, 'Reporte_Cumplimiento')}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 transition-colors"
                >
                    <Download size={16} /> Exportar Excel
                </button>
            </div>

            <div id="compliance-table" className="rounded-2xl border shadow-sm overflow-hidden" style={{ background: theme.surface, borderColor: theme.border }}>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="border-b" style={{ borderColor: theme.border, background: isDark ? 'rgba(255,255,255,0.02)' : '#f3f4f6', color: theme.textSecondary }}>
                            <tr>
                                <th className="px-6 py-4 font-black uppercase tracking-wider text-[10px]">Colaborador</th>
                                <th className="px-6 py-4 font-black uppercase tracking-wider text-[10px] text-center">Horas Registradas</th>
                                <th className="px-6 py-4 font-black uppercase tracking-wider text-[10px] text-center">Cumplimiento Tareas</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y" style={{ borderColor: theme.border, color: theme.text }}>
                            {workersData.map(worker => (
                                <tr key={worker.id} className="hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="font-bold">{worker.name}</div>
                                        <div className="text-xs opacity-70">{worker.role === 'worker' ? 'Funcionario' : worker.role}</div>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <div className="flex flex-col items-center gap-1">
                                            <div className="font-black text-sm text-emerald-500">
                                                {worker.loggedHours}h
                                            </div>
                                            <div className="w-24 h-1.5 rounded-full overflow-hidden" style={{ background: isDark ? '#374151' : '#e5e7eb' }}>
                                                <div 
                                                    className="h-full rounded-full"
                                                    style={{ 
                                                        width: `${Math.min(100, (worker.loggedHours / Math.max(...workersData.map(w => w.loggedHours), 1)) * 100)}%`,
                                                        background: '#10b981'
                                                    }}
                                                />
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <div className="flex flex-col items-center gap-1">
                                            <div className="font-bold text-xs flex items-center justify-center gap-1">
                                                {worker.taskCompliance}%
                                                <span className="opacity-50 text-[10px] font-medium">({worker.tasksCompleted}/{worker.tasksTotal})</span>
                                            </div>
                                            <div className="w-24 h-1.5 rounded-full overflow-hidden" style={{ background: isDark ? '#374151' : '#e5e7eb' }}>
                                                <div 
                                                    className="h-full rounded-full"
                                                    style={{ 
                                                        width: `${worker.taskCompliance}%`,
                                                        background: worker.taskCompliance >= 80 ? '#10b981' : worker.taskCompliance >= 50 ? '#f59e0b' : '#ef4444'
                                                    }}
                                                />
                                            </div>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
