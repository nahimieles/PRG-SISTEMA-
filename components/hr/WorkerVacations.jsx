import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Calendar as CalendarIcon, Plus, X, Sun, Edit2, Trash2 } from 'lucide-react';
import CustomSelect from '../CustomSelect';
import CustomDatePicker from '../CustomDatePicker';
import ConfirmModal from '../ConfirmModal';

export default function WorkerVacations({ workerId, theme, isDark }) {
    const [vacations, setVacations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [adding, setAdding] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState(null);

    const [newVacation, setNewVacation] = useState({ 
        start_date: '', 
        end_date: '',
        days_used: 1,
        status: 'requested'
    });

    const fetchVacations = async () => {
        setLoading(true);
        const { data } = await supabase
            .from('hr_vacations')
            .select('*')
            .eq('worker_id', workerId)
            .order('start_date', { ascending: false });
        if (data) setVacations(data);
        setLoading(false);
    };

    useEffect(() => {
        if (workerId) fetchVacations();
    }, [workerId]);

    const handleDelete = async () => {
        if (!confirmDelete) return;
        const id = confirmDelete;
        setConfirmDelete(null);
        setVacations(vacations.filter(t => t.id !== id));
        await supabase.from('hr_vacations').delete().eq('id', id);
    };

    const handleEdit = (vacation) => {
        setNewVacation({ 
            start_date: vacation.start_date, 
            end_date: vacation.end_date, 
            status: vacation.status, 
            days_used: vacation.days_used,
            id: vacation.id
        });
        setShowForm(true);
    };

    const handleSaveVacation = async (e) => {
        e.preventDefault();
        if (!newVacation.start_date || !newVacation.end_date) return;
        setAdding(true);

        if (newVacation.id) {
            const { data } = await supabase.from('hr_vacations').update({
                start_date: newVacation.start_date,
                end_date: newVacation.end_date,
                days_used: newVacation.days_used,
                status: newVacation.status
            }).eq('id', newVacation.id).select().single();

            if (data) {
                setVacations(vacations.map(v => v.id === newVacation.id ? data : v).sort((a,b) => new Date(b.start_date) - new Date(a.start_date)));
                setNewVacation({ start_date: '', end_date: '', days_used: 1, status: 'requested' });
                setShowForm(false);
            }
        } else {
            const { data, error } = await supabase.from('hr_vacations').insert({
                worker_id: workerId,
                start_date: newVacation.start_date,
                end_date: newVacation.end_date,
                days_used: newVacation.days_used,
                status: newVacation.status
            }).select().single();

            if (error) {

            } else if (data) {
                setVacations([data, ...vacations].sort((a,b) => new Date(b.start_date) - new Date(a.start_date)));
                setNewVacation({ start_date: '', end_date: '', days_used: 1, status: 'requested' });
                setShowForm(false);
            }
        }
        setAdding(false);
    };

    const getStatusColor = (status) => {
        switch(status) {
            case 'approved': return 'bg-emerald-500';
            case 'taken': return 'bg-blue-500';
            case 'cancelled': return 'bg-red-500';
            default: return 'bg-amber-500'; 
        }
    };

    const getStatusLabel = (status) => {
        switch(status) {
            case 'approved': return 'Aprobadas';
            case 'taken': return 'Tomadas';
            case 'cancelled': return 'Canceladas';
            default: return 'Solicitadas';
        }
    };

    return (
        <div className="animate-fade-in space-y-4">
            <div className="flex justify-between items-center mb-4">
                <h4 className="font-bold text-sm" style={{ color: theme.text }}>
                    Control de Vacaciones
                </h4>
                <button 
                    onClick={() => setShowForm(!showForm)}
                    className="text-xs px-3 py-1.5 rounded-lg bg-amber-600 text-white font-bold hover:bg-amber-700 transition-colors flex items-center gap-1"
                >
                    {showForm ? <><X size={14} /> Cancelar</> : <><Plus size={14} /> Solicitar/Programar</>}
                </button>
            </div>

            {showForm && (
                <form onSubmit={handleSaveVacation} className="p-4 rounded-xl border mb-4 space-y-3" style={{ borderColor: theme.border, background: isDark ? 'rgba(0,0,0,0.2)' : '#f9fafb' }}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold mb-1" style={{ color: theme.textSecondary }}>Fecha de Inicio</label>
                            <CustomDatePicker 
                                value={newVacation.start_date}
                                onChange={(val) => setNewVacation({...newVacation, start_date: val})}
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold mb-1" style={{ color: theme.textSecondary }}>Fecha de Fin</label>
                            <CustomDatePicker 
                                value={newVacation.end_date}
                                onChange={(val) => setNewVacation({...newVacation, end_date: val})}
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold mb-1" style={{ color: theme.textSecondary }}>Días Utilizados</label>
                            <input 
                                type="number" 
                                min="1"
                                value={newVacation.days_used}
                                onChange={(e) => setNewVacation({...newVacation, days_used: parseInt(e.target.value) || 1})}
                                className="w-full px-3 py-2 rounded-lg text-sm border focus:ring-2 focus:ring-amber-500 outline-none"
                                style={{ background: isDark ? 'rgba(0,0,0,0.2)' : '#ffffff', borderColor: theme.border, color: theme.text }}
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold mb-1" style={{ color: theme.textSecondary }}>Estado</label>
                            <CustomSelect 
                                value={newVacation.status}
                                onChange={val => setNewVacation({...newVacation, status: val})}
                                options={[
                                    {value: 'requested', label: 'Solicitadas'},
                                    {value: 'approved', label: 'Aprobadas'},
                                    {value: 'taken', label: 'Tomadas'},
                                    {value: 'cancelled', label: 'Canceladas'}
                                ]}
                            />
                        </div>
                    </div>
                    <div className="flex justify-end">
                        <button 
                            type="submit" 
                            disabled={adding}
                            className="text-xs px-4 py-2 rounded-lg bg-amber-600 text-white font-bold hover:bg-amber-700 transition-colors disabled:opacity-50 mt-2"
                        >
                            {adding ? 'Guardando...' : 'Guardar Vacaciones'}
                        </button>
                    </div>
                </form>
            )}

            {loading ? (
                <div className="flex justify-center p-8">
                    <div className="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
                </div>
            ) : vacations.length > 0 ? (
                <div className="space-y-3">
                    {vacations.map(vacation => (
                        <div 
                            key={vacation.id} 
                            className="group p-4 rounded-xl border flex flex-col gap-2 transition-all hover:shadow-sm relative"
                            style={{ borderColor: theme.border, background: isDark ? 'rgba(255,255,255,0.02)' : '#ffffff' }}
                        >
                            <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity bg-white dark:bg-gray-900 rounded-md shadow-sm p-1">
                                <button onClick={() => handleEdit(vacation)} className="p-1.5 rounded text-blue-500 hover:bg-blue-500/10">
                                    <Edit2 size={14} />
                                </button>
                                <button onClick={() => setConfirmDelete(vacation.id)} className="p-1.5 rounded text-red-500 hover:bg-red-500/10">
                                    <Trash2 size={14} />
                                </button>
                            </div>
                            <div className="flex justify-between items-start pr-16">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 rounded-lg bg-amber-500/10 text-amber-500">
                                        <Sun size={20} />
                                    </div>
                                    <div>
                                        <h5 className="font-bold text-sm" style={{ color: theme.text }}>
                                            {vacation.days_used} {vacation.days_used === 1 ? 'día' : 'días'} de vacaciones
                                        </h5>
                                        <p className="text-xs font-medium mt-0.5" style={{ color: theme.textSecondary }}>
                                            Del {new Date(vacation.start_date).toLocaleDateString()} al {new Date(vacation.end_date).toLocaleDateString()}
                                        </p>
                                    </div>
                                </div>
                                <span className={`text-[10px] font-bold px-2.5 py-1 rounded-md text-white shadow-sm ${getStatusColor(vacation.status)}`}>
                                    {getStatusLabel(vacation.status)}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="border border-dashed rounded-xl p-8 flex flex-col items-center justify-center" style={{ borderColor: theme.border }}>
                    <Sun size={24} className="opacity-30 mb-2" style={{ color: theme.text }} />
                    <p className="text-sm text-center" style={{ color: theme.textSecondary }}>El colaborador no tiene vacaciones registradas.</p>
                </div>
            )}

            <ConfirmModal 
                isOpen={!!confirmDelete}
                title="Eliminar Vacaciones"
                message="¿Estás seguro de que deseas eliminar este registro de vacaciones permanentemente?"
                onConfirm={handleDelete}
                onCancel={() => setConfirmDelete(null)}
                theme={theme}
                isDark={isDark}
            />
        </div>
    );
}
