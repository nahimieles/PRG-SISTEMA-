import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Activity, Clock, CheckCircle2, TrendingUp, AlertCircle } from 'lucide-react';

export default function WorkerAnalysis({ workerId, theme, isDark }) {
    const [stats, setStats] = useState({
        totalHours: 0,
        tasksCompleted: 0,
        totalTasks: 0,
        productivity: 0
    });
    const [loading, setLoading] = useState(true);

    const fetchAnalysisData = async () => {
        setLoading(true);
        const currentDate = new Date();
        const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).toISOString();
        
        // 1. Fetch work records for hours
        const { data: records } = await supabase
            .from('work_records')
            .select('hours_worked')
            .eq('worker_id', workerId)
            .gte('start_datetime', startOfMonth);

        const totalHrs = records ? records.reduce((acc, curr) => acc + (Number(curr.hours_worked) || 0), 0) : 0;

        // 2. Fetch tasks for this month
        const { data: tasks } = await supabase
            .from('hr_tasks')
            .select('status')
            .eq('worker_id', workerId)
            .eq('month', currentDate.getMonth() + 1)
            .eq('year', currentDate.getFullYear());

        let totalT = 0;
        let completedT = 0;
        if (tasks) {
            totalT = tasks.length;
            completedT = tasks.filter(t => t.status === 'completed').length;
        }

        const prod = totalT === 0 ? 0 : Math.round((completedT / totalT) * 100);

        setStats({
            totalHours: totalHrs.toFixed(1),
            tasksCompleted: completedT,
            totalTasks: totalT,
            productivity: prod
        });
        setLoading(false);
    };

    useEffect(() => {
        if (workerId) fetchAnalysisData();
    }, [workerId]);

    if (loading) {
        return (
            <div className="flex justify-center p-8">
                <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <div className="animate-fade-in space-y-6">
            <div className="flex justify-between items-center mb-2">
                <h4 className="font-bold text-sm" style={{ color: theme.text }}>
                    Análisis de Actividades del Mes Actual
                </h4>
                <button onClick={fetchAnalysisData} className="text-xs px-3 py-1 border rounded-lg hover:bg-gray-50 dark:hover:bg-white/5 transition-colors" style={{ color: theme.textSecondary, borderColor: theme.border }}>
                    Actualizar
                </button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 rounded-xl border flex flex-col gap-1 transition-all hover:shadow-md" style={{ borderColor: theme.border, background: isDark ? 'rgba(59, 130, 246, 0.1)' : '#eff6ff' }}>
                    <div className="flex items-center gap-2 mb-1" style={{ color: theme.textSecondary }}>
                        <TrendingUp size={16} className="text-blue-500" />
                        <span className="text-xs font-bold uppercase tracking-wider">Productividad</span>
                    </div>
                    <div className="text-3xl font-black text-blue-600 dark:text-blue-400">
                        {stats.productivity}%
                    </div>
                </div>

                <div className="p-4 rounded-xl border flex flex-col gap-1 transition-all hover:shadow-md" style={{ borderColor: theme.border, background: isDark ? 'rgba(16, 185, 129, 0.1)' : '#ecfdf5' }}>
                    <div className="flex items-center gap-2 mb-1" style={{ color: theme.textSecondary }}>
                        <Clock size={16} className="text-emerald-500" />
                        <span className="text-xs font-bold uppercase tracking-wider">Horas Invertidas</span>
                    </div>
                    <div className="text-3xl font-black text-emerald-600 dark:text-emerald-400">
                        {stats.totalHours}h
                    </div>
                </div>

                <div className="p-4 rounded-xl border flex flex-col gap-1 transition-all hover:shadow-md" style={{ borderColor: theme.border, background: isDark ? 'rgba(139, 92, 246, 0.1)' : '#f5f3ff' }}>
                    <div className="flex items-center gap-2 mb-1" style={{ color: theme.textSecondary }}>
                        <CheckCircle2 size={16} className="text-purple-500" />
                        <span className="text-xs font-bold uppercase tracking-wider">Tareas Realizadas</span>
                    </div>
                    <div className="text-3xl font-black text-purple-600 dark:text-purple-400">
                        {stats.tasksCompleted} <span className="text-sm font-medium opacity-60">/ {stats.totalTasks}</span>
                    </div>
                </div>
            </div>

            {stats.totalTasks === 0 && stats.totalHours == 0 && (
                <div className="border border-dashed rounded-xl p-8 flex flex-col items-center justify-center" style={{ borderColor: theme.border }}>
                    <Activity size={24} className="opacity-30 mb-2" style={{ color: theme.text }} />
                    <p className="text-sm text-center" style={{ color: theme.textSecondary }}>Aún no hay actividades ni horas registradas en este mes.</p>
                </div>
            )}
        </div>
    );
}
