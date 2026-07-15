import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { AlertCircle, CheckCircle2, Circle, Plus, X, Edit2, Trash2 } from 'lucide-react';
import ConfirmModal from '../ConfirmModal';

export default function WorkerTasks({ workerId, theme, isDark, readOnly = false }) {
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [newTask, setNewTask] = useState({ title: '', description: '' });
    const [adding, setAdding] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState(null);

    const currentDate = new Date();
    const currentMonth = currentDate.getMonth() + 1;
    const currentYear = currentDate.getFullYear();

    const fetchTasks = async () => {
        setLoading(true);
        const { data } = await supabase
            .from('hr_tasks')
            .select('*')
            .eq('worker_id', workerId)
            .eq('month', currentMonth)
            .eq('year', currentYear)
            .order('created_at', { ascending: false });
        if (data) setTasks(data);
        setLoading(false);
    };

    useEffect(() => {
        if (workerId) fetchTasks();
    }, [workerId]);

    const handleDelete = async () => {
        if (!confirmDelete || readOnly) return;
        const id = confirmDelete;
        setConfirmDelete(null);
        setTasks(tasks.filter(t => t.id !== id));
        await supabase.from('hr_tasks').delete().eq('id', id);
    };

    const handleEdit = (task) => {
        if (readOnly) return;
        setNewTask({ title: task.title, description: task.description, id: task.id });
        setShowForm(true);
    };

    const handleToggleStatus = async (task) => {
        const newStatus = task.status === 'completed' ? 'pending' : 'completed';
        setTasks(tasks.map(t => t.id === task.id ? { ...t, status: newStatus } : t));
        await supabase.from('hr_tasks').update({ status: newStatus }).eq('id', task.id);
    };

    const handleSaveTask = async (e) => {
        e.preventDefault();
        if (!newTask.title.trim() || readOnly) return;
        setAdding(true);
        
        if (newTask.id) {
            const { data } = await supabase.from('hr_tasks').update({
                title: newTask.title,
                description: newTask.description
            }).eq('id', newTask.id).select().single();
            
            if (data) {
                setTasks(tasks.map(t => t.id === newTask.id ? data : t));
                setNewTask({ title: '', description: '' });
                setShowForm(false);
            }
        } else {
            const { data, error } = await supabase.from('hr_tasks').insert({
                worker_id: workerId,
                title: newTask.title,
                description: newTask.description,
                month: currentMonth,
                year: currentYear
            }).select().single();

            if (error) {
                console.error('Error adding task:', error);
                // Graceful fail without native alert
            } else if (data) {
                // Send notification to the worker
                await supabase.from('notificaciones').insert({
                    worker_id: workerId,
                    titulo: 'Nueva Tarea Asignada',
                    mensaje: `Se te ha asignado la tarea: ${newTask.title}`,
                    tipo: 'tarea'
                });

                setTasks([data, ...tasks]);
                setNewTask({ title: '', description: '' });
                setShowForm(false);
            }
        }
        setAdding(false);
    };

    return (
        <div className="animate-fade-in space-y-4">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-black tracking-tight" style={{ color: theme.text }}>
                    Tareas del Mes
                </h3>
                {!readOnly && (
                    <button 
                        onClick={() => setShowForm(!showForm)}
                        className="text-xs px-3 py-1.5 rounded-lg bg-blue-600 text-white font-bold hover:bg-blue-700 transition-colors flex items-center gap-1"
                    >
                        {showForm ? <><X size={14} /> Cancelar</> : <><Plus size={14} /> Nueva Tarea</>}
                    </button>
                )}
            </div>

            {showForm && (
                <form onSubmit={handleSaveTask} className="p-4 rounded-xl border mb-4 space-y-3" style={{ borderColor: theme.border, background: isDark ? 'rgba(0,0,0,0.2)' : '#f9fafb' }}>
                    <div>
                        <input 
                            type="text" 
                            placeholder="Título de la tarea..." 
                            value={newTask.title}
                            onChange={(e) => setNewTask({...newTask, title: e.target.value})}
                            className="w-full px-3 py-2 rounded-lg text-sm border focus:ring-2 focus:ring-blue-500 outline-none"
                            style={{ background: isDark ? 'rgba(0,0,0,0.2)' : '#ffffff', borderColor: theme.border, color: theme.text }}
                            required
                        />
                    </div>
                    <div>
                        <textarea 
                            placeholder="Descripción (opcional)..." 
                            value={newTask.description}
                            onChange={(e) => setNewTask({...newTask, description: e.target.value})}
                            rows={2}
                            className="w-full px-3 py-2 rounded-lg text-sm border focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                            style={{ background: isDark ? 'rgba(0,0,0,0.2)' : '#ffffff', borderColor: theme.border, color: theme.text }}
                        />
                    </div>
                    <div className="flex justify-end">
                        <button 
                            type="submit" 
                            disabled={adding}
                            className="text-xs px-4 py-2 rounded-lg bg-blue-600 text-white font-bold hover:bg-blue-700 transition-colors disabled:opacity-50"
                        >
                            {adding ? 'Guardando...' : 'Guardar Tarea'}
                        </button>
                    </div>
                </form>
            )}

            {loading ? (
                <div className="flex justify-center p-8">
                    <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                </div>
            ) : tasks.length > 0 ? (
                <div className="space-y-2">
                    {tasks.map(task => (
                        <div 
                            key={task.id} 
                            className={`group p-4 rounded-xl border flex items-start gap-3 transition-all ${task.status === 'completed' ? 'opacity-60' : ''}`}
                            style={{ borderColor: theme.border, background: isDark ? 'rgba(255,255,255,0.02)' : '#ffffff' }}
                        >
                            <div className="mt-0.5 flex-shrink-0 cursor-pointer" onClick={() => handleToggleStatus(task)}>
                                {task.status === 'completed' ? (
                                    <CheckCircle2 size={20} className="text-emerald-500" />
                                ) : (
                                    <Circle size={20} className="text-gray-400" />
                                )}
                            </div>
                            <div className="flex-1">
                                <h5 className={`font-bold text-sm ${task.status === 'completed' ? 'line-through' : ''}`} style={{ color: theme.text }}>
                                    {task.title}
                                </h5>
                                {task.description && (
                                    <p className="text-xs mt-1" style={{ color: theme.textSecondary }}>{task.description}</p>
                                )}
                            </div>
                            {!readOnly && (
                                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => handleEdit(task)} className="p-1.5 rounded bg-blue-500/10 text-blue-500 hover:bg-blue-500/20">
                                        <Edit2 size={14} />
                                    </button>
                                    <button onClick={() => setConfirmDelete(task.id)} className="p-1.5 rounded bg-red-500/10 text-red-500 hover:bg-red-500/20">
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            ) : (
                <div className="border border-dashed rounded-xl p-8 flex flex-col items-center justify-center" style={{ borderColor: theme.border }}>
                    <AlertCircle size={24} className="opacity-30 mb-2" style={{ color: theme.text }} />
                    <p className="text-sm text-center" style={{ color: theme.textSecondary }}>No hay tareas registradas este mes.</p>
                </div>
            )}

            <ConfirmModal 
                isOpen={!!confirmDelete}
                title="Eliminar Tarea"
                message="¿Estás seguro de que deseas eliminar esta tarea permanentemente? Esta acción no se puede deshacer."
                onConfirm={handleDelete}
                onCancel={() => setConfirmDelete(null)}
                theme={theme}
                isDark={isDark}
            />
        </div>
    );
}
