import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Users, CheckCircle2, Circle, Sun, GraduationCap, TrendingUp, AlertCircle } from 'lucide-react';

export default function ManagementDashboard({ theme, isDark }) {
    const [stats, setStats] = useState({
        totalWorkers: 0,
        totalTasks: 0,
        completedTasks: 0,
        activeVacations: 0,
        upcomingTrainings: 0
    });
    const [workersData, setWorkersData] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchData = async () => {
        setLoading(true);
        const currentDate = new Date();
        const currentMonth = currentDate.getMonth() + 1;
        const currentYear = currentDate.getFullYear();
        const todayStr = currentDate.toISOString().split('T')[0];

        try {

            const { data: workers } = await supabase.from('workers').select('id, full_name, role').eq('status', 'activo');

            const { data: tasks } = await supabase.from('hr_tasks').select('*').eq('month', currentMonth).eq('year', currentYear);

            const { data: vacations } = await supabase.from('hr_vacations').select('*').eq('status', 'approved');

            const { data: trainings } = await supabase.from('hr_trainings').select('*');

            const workersArr = workers || [];
            const tasksArr = tasks || [];
            const vacationsArr = vacations || [];
            const trainingsArr = trainings || [];

            let completedT = tasksArr.filter(t => t.status === 'completed').length;

            let activeV = vacationsArr.filter(v => {
                return todayStr >= v.start_date && todayStr <= v.end_date;
            }).length;

            let upTrainings = trainingsArr.filter(t => {
                return t.date >= todayStr && t.status !== 'cancelled';
            }).length;

            setStats({
                totalWorkers: workersArr.length,
                totalTasks: tasksArr.length,
                completedTasks: completedT,
                activeVacations: activeV,
                upcomingTrainings: upTrainings
            });

            const wData = workersArr.map(w => {
                const wTasks = tasksArr.filter(t => t.worker_id === w.id);
                const wCompleted = wTasks.filter(t => t.status === 'completed').length;
                const productivity = wTasks.length === 0 ? 0 : Math.round((wCompleted / wTasks.length) * 100);

                const wVacation = vacationsArr.find(v => v.worker_id === w.id && todayStr >= v.start_date && todayStr <= v.end_date);

                return {
                    id: w.id,
                    name: w.full_name,
                    role: w.role || 'No asignado',
                    tasksTotal: wTasks.length,
                    tasksCompleted: wCompleted,
                    productivity,
                    isOnVacation: !!wVacation,
                    vacationDetails: wVacation
                };
            });

            wData.sort((a, b) => b.productivity - a.productivity);

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
                <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <div className="animate-fade-in space-y-6">

            {}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 rounded-xl border flex flex-col gap-1 shadow-sm" style={{ borderColor: theme.border, background: isDark ? 'rgba(59, 130, 246, 0.05)' : '#ffffff' }}>
                    <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold uppercase tracking-wider text-blue-500">Colaboradores</span>
                        <Users size={16} className="text-blue-500" />
                    </div>
                    <div className="text-3xl font-black text-blue-600 dark:text-blue-400">
                        {stats.totalWorkers}
                    </div>
                    <span className="text-[10px] uppercase font-bold text-gray-500">Activos en el sistema</span>
                </div>

                <div className="p-4 rounded-xl border flex flex-col gap-1 shadow-sm" style={{ borderColor: theme.border, background: isDark ? 'rgba(139, 92, 246, 0.05)' : '#ffffff' }}>
                    <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold uppercase tracking-wider text-purple-500">Tareas del Mes</span>
                        <CheckCircle2 size={16} className="text-purple-500" />
                    </div>
                    <div className="text-3xl font-black text-purple-600 dark:text-purple-400">
                        {stats.completedTasks} <span className="text-lg opacity-50">/ {stats.totalTasks}</span>
                    </div>
                    <span className="text-[10px] uppercase font-bold text-gray-500">Tareas Globales Completadas</span>
                </div>

                <div className="p-4 rounded-xl border flex flex-col gap-1 shadow-sm" style={{ borderColor: theme.border, background: isDark ? 'rgba(245, 158, 11, 0.05)' : '#ffffff' }}>
                    <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold uppercase tracking-wider text-amber-500">Vacaciones Activas</span>
                        <Sun size={16} className="text-amber-500" />
                    </div>
                    <div className="text-3xl font-black text-amber-600 dark:text-amber-400">
                        {stats.activeVacations}
                    </div>
                    <span className="text-[10px] uppercase font-bold text-gray-500">Personal actualmente ausente</span>
                </div>

                <div className="p-4 rounded-xl border flex flex-col gap-1 shadow-sm" style={{ borderColor: theme.border, background: isDark ? 'rgba(16, 185, 129, 0.05)' : '#ffffff' }}>
                    <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold uppercase tracking-wider text-emerald-500">Capacitaciones</span>
                        <GraduationCap size={16} className="text-emerald-500" />
                    </div>
                    <div className="text-3xl font-black text-emerald-600 dark:text-emerald-400">
                        {stats.upcomingTrainings}
                    </div>
                    <span className="text-[10px] uppercase font-bold text-gray-500">Próximos eventos programados</span>
                </div>
            </div>

            {}
            <div className="rounded-2xl border overflow-hidden shadow-sm" style={{ borderColor: theme.border, background: theme.surface }}>
                <div className="px-6 py-4 border-b flex justify-between items-center" style={{ borderColor: theme.border, background: isDark ? 'rgba(0,0,0,0.2)' : '#f9fafb' }}>
                    <h3 className="font-bold text-sm flex items-center gap-2" style={{ color: theme.text }}>
                        <TrendingUp size={18} className="text-blue-500" /> 
                        Rendimiento por Colaborador
                    </h3>
                    <span className="text-xs font-bold uppercase px-3 py-1 bg-blue-500/10 text-blue-500 rounded-full">Mes Actual</span>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="border-b" style={{ borderColor: theme.border, background: isDark ? 'rgba(255,255,255,0.02)' : '#f3f4f6', color: theme.textSecondary }}>
                            <tr>
                                <th className="px-6 py-3 font-black uppercase tracking-wider text-[10px]">Colaborador</th>
                                <th className="px-6 py-3 font-black uppercase tracking-wider text-[10px]">Productividad</th>
                                <th className="px-6 py-3 font-black uppercase tracking-wider text-[10px]">Tareas</th>
                                <th className="px-6 py-3 font-black uppercase tracking-wider text-[10px]">Estado Actual</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y" style={{ borderColor: theme.border, color: theme.text }}>
                            {workersData.map(worker => (
                                <tr key={worker.id} className="hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="font-bold">{worker.name}</div>
                                        <div className="text-xs opacity-70">{worker.role}</div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-24 h-2 rounded-full overflow-hidden" style={{ background: isDark ? '#374151' : '#e5e7eb' }}>
                                                <div 
                                                    className="h-full rounded-full transition-all duration-1000"
                                                    style={{ 
                                                        width: `${worker.productivity}%`,
                                                        background: worker.productivity >= 80 ? '#10b981' : worker.productivity >= 50 ? '#f59e0b' : '#ef4444'
                                                    }}
                                                />
                                            </div>
                                            <span className="text-xs font-bold">{worker.productivity}%</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2 text-xs font-bold">
                                            <CheckCircle2 size={14} className="text-emerald-500" /> {worker.tasksCompleted}
                                            <span className="opacity-30">/</span>
                                            <Circle size={14} className="text-gray-400" /> {worker.tasksTotal - worker.tasksCompleted}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        {worker.isOnVacation ? (
                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold bg-amber-500/10 text-amber-500 border border-amber-500/20">
                                                <Sun size={12} /> EN VACACIONES
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold bg-blue-500/10 text-blue-500 border border-blue-500/20">
                                                ACTIVO
                                            </span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                            {workersData.length === 0 && (
                                <tr>
                                    <td colSpan="4" className="px-6 py-12 text-center">
                                        <div className="flex flex-col items-center justify-center gap-2 opacity-50">
                                            <AlertCircle size={24} />
                                            <span className="text-sm">No hay datos disponibles</span>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
