import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { AlertCircle, Plus, X, GraduationCap, Calendar as CalendarIcon, Edit2, Trash2 } from 'lucide-react';
import CustomSelect from '../CustomSelect';
import CustomDatePicker from '../CustomDatePicker';
import ConfirmModal from '../ConfirmModal';

export default function WorkerTrainings({ workerId, theme, isDark }) {
    const [trainings, setTrainings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [adding, setAdding] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState(null);
    
    const [newTraining, setNewTraining] = useState({ 
        title: '', 
        date: new Date().toISOString().split('T')[0],
        status: 'scheduled',
        notes: ''
    });

    const fetchTrainings = async () => {
        setLoading(true);
        const { data } = await supabase
            .from('hr_trainings')
            .select('*')
            .eq('worker_id', workerId)
            .order('date', { ascending: false });
        if (data) setTrainings(data);
        setLoading(false);
    };

    useEffect(() => {
        if (workerId) fetchTrainings();
    }, [workerId]);

    const handleDelete = async () => {
        if (!confirmDelete) return;
        const id = confirmDelete;
        setConfirmDelete(null);
        setTrainings(trainings.filter(t => t.id !== id));
        await supabase.from('hr_trainings').delete().eq('id', id);
    };

    const handleEdit = (training) => {
        setNewTraining({ 
            title: training.title, 
            date: training.date, 
            status: training.status, 
            notes: training.notes || '',
            id: training.id
        });
        setShowForm(true);
    };

    const handleSaveTraining = async (e) => {
        e.preventDefault();
        if (!newTraining.title.trim()) return;
        setAdding(true);
        
        if (newTraining.id) {
            const { data } = await supabase.from('hr_trainings').update({
                title: newTraining.title,
                date: newTraining.date,
                status: newTraining.status,
                notes: newTraining.notes
            }).eq('id', newTraining.id).select().single();

            if (data) {
                setTrainings(trainings.map(t => t.id === newTraining.id ? data : t).sort((a,b) => new Date(b.date) - new Date(a.date)));
                setNewTraining({ title: '', date: new Date().toISOString().split('T')[0], status: 'scheduled', notes: '' });
                setShowForm(false);
            }
        } else {
            const { data, error } = await supabase.from('hr_trainings').insert({
                worker_id: workerId,
                title: newTraining.title,
                date: newTraining.date,
                status: newTraining.status,
                notes: newTraining.notes
            }).select().single();

            if (error) {
                console.error(error);
                // Graceful fail without native alert
            } else if (data) {
                setTrainings([data, ...trainings].sort((a,b) => new Date(b.date) - new Date(a.date)));
                setNewTraining({ title: '', date: new Date().toISOString().split('T')[0], status: 'scheduled', notes: '' });
                setShowForm(false);
            }
        }
        setAdding(false);
    };

    const getStatusColor = (status) => {
        switch(status) {
            case 'completed': return 'bg-emerald-500';
            case 'cancelled': return 'bg-red-500';
            default: return 'bg-amber-500'; // scheduled
        }
    };

    const getStatusLabel = (status) => {
        switch(status) {
            case 'completed': return 'Completada';
            case 'cancelled': return 'Cancelada';
            default: return 'Programada';
        }
    };

    return (
        <div className="animate-fade-in space-y-4">
            <div className="flex justify-between items-center mb-4">
                <h4 className="font-bold text-sm" style={{ color: theme.text }}>
                    Control de Capacitaciones
                </h4>
                <button 
                    onClick={() => setShowForm(!showForm)}
                    className="text-xs px-3 py-1.5 rounded-lg bg-emerald-600 text-white font-bold hover:bg-emerald-700 transition-colors flex items-center gap-1"
                >
                    {showForm ? <><X size={14} /> Cancelar</> : <><Plus size={14} /> Registrar Capacitación</>}
                </button>
            </div>

            {showForm && (
                <form onSubmit={handleSaveTraining} className="p-4 rounded-xl border mb-4 space-y-3" style={{ borderColor: theme.border, background: isDark ? 'rgba(0,0,0,0.2)' : '#f9fafb' }}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="md:col-span-2">
                            <label className="block text-xs font-bold mb-1" style={{ color: theme.textSecondary }}>Tema / Título</label>
                            <input 
                                type="text" 
                                value={newTraining.title}
                                onChange={(e) => setNewTraining({...newTraining, title: e.target.value})}
                                className="w-full px-3 py-2 rounded-lg text-sm border focus:ring-2 focus:ring-emerald-500 outline-none"
                                style={{ background: isDark ? 'rgba(0,0,0,0.2)' : '#ffffff', borderColor: theme.border, color: theme.text }}
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold mb-1" style={{ color: theme.textSecondary }}>Fecha</label>
                            <CustomDatePicker 
                                value={newTraining.date}
                                onChange={(val) => setNewTraining({...newTraining, date: val})}
                                className="w-full px-3 py-2 rounded-lg text-sm border focus:ring-2 focus:ring-emerald-500 outline-none"
                                style={{ background: isDark ? 'rgba(0,0,0,0.2)' : '#ffffff', borderColor: theme.border, color: theme.text }}
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold mb-1" style={{ color: theme.textSecondary }}>Estado</label>
                            <CustomSelect 
                                value={newTraining.status}
                                onChange={val => setNewTraining({...newTraining, status: val})}
                                options={[
                                    {value: 'scheduled', label: 'Programada'},
                                    {value: 'completed', label: 'Completada'},
                                    {value: 'cancelled', label: 'Cancelada'}
                                ]}
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-bold mb-1" style={{ color: theme.textSecondary }}>Notas adicionales</label>
                        <textarea 
                            value={newTraining.notes}
                            onChange={(e) => setNewTraining({...newTraining, notes: e.target.value})}
                            rows={2}
                            className="w-full px-3 py-2 rounded-lg text-sm border focus:ring-2 focus:ring-emerald-500 outline-none resize-none"
                            style={{ background: isDark ? 'rgba(0,0,0,0.2)' : '#ffffff', borderColor: theme.border, color: theme.text }}
                        />
                    </div>
                    <div className="flex justify-end">
                        <button 
                            type="submit" 
                            disabled={adding}
                            className="text-xs px-4 py-2 rounded-lg bg-emerald-600 text-white font-bold hover:bg-emerald-700 transition-colors disabled:opacity-50"
                        >
                            {adding ? 'Guardando...' : 'Guardar Capacitación'}
                        </button>
                    </div>
                </form>
            )}

            {loading ? (
                <div className="flex justify-center p-8">
                    <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                </div>
            ) : trainings.length > 0 ? (
                <div className="space-y-3">
                    {trainings.map(training => (
                        <div 
                            key={training.id} 
                            className="group p-4 rounded-xl border flex flex-col gap-2 transition-all hover:shadow-sm relative"
                            style={{ borderColor: theme.border, background: isDark ? 'rgba(255,255,255,0.02)' : '#ffffff' }}
                        >
                            <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity bg-white dark:bg-gray-900 rounded-md shadow-sm p-1">
                                <button onClick={() => handleEdit(training)} className="p-1.5 rounded text-blue-500 hover:bg-blue-500/10">
                                    <Edit2 size={14} />
                                </button>
                                <button onClick={() => setConfirmDelete(training.id)} className="p-1.5 rounded text-red-500 hover:bg-red-500/10">
                                    <Trash2 size={14} />
                                </button>
                            </div>
                            <div className="flex justify-between items-start pr-16">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-500">
                                        <GraduationCap size={20} />
                                    </div>
                                    <div>
                                        <h5 className="font-bold text-sm" style={{ color: theme.text }}>
                                            {training.title}
                                        </h5>
                                        <p className="text-xs font-medium mt-0.5 flex items-center gap-1" style={{ color: theme.textSecondary }}>
                                            <CalendarIcon size={12} /> {new Date(training.date).toLocaleDateString()}
                                        </p>
                                    </div>
                                </div>
                                <span className={`text-[10px] font-bold px-2.5 py-1 rounded-md text-white shadow-sm ${getStatusColor(training.status)}`}>
                                    {getStatusLabel(training.status)}
                                </span>
                            </div>
                            {training.notes && (
                                <p className="text-xs mt-2 pl-12" style={{ color: theme.textSecondary }}>
                                    {training.notes}
                                </p>
                            )}
                        </div>
                    ))}
                </div>
            ) : (
                <div className="border border-dashed rounded-xl p-8 flex flex-col items-center justify-center" style={{ borderColor: theme.border }}>
                    <AlertCircle size={24} className="opacity-30 mb-2" style={{ color: theme.text }} />
                    <p className="text-sm text-center" style={{ color: theme.textSecondary }}>El colaborador no tiene capacitaciones registradas.</p>
                </div>
            )}

            <ConfirmModal 
                isOpen={!!confirmDelete}
                title="Eliminar Capacitación"
                message="¿Estás seguro de que deseas eliminar esta capacitación permanentemente? Esta acción no se puede deshacer."
                onConfirm={handleDelete}
                onCancel={() => setConfirmDelete(null)}
                theme={theme}
                isDark={isDark}
            />
        </div>
    );
}
