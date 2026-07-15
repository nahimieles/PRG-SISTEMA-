import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Plus, X, Clock, Users, Building2, MapPin, Tag } from 'lucide-react';
import CustomSelect from './CustomSelect';
import CustomDatePicker from './CustomDatePicker';
import ConfirmModal from './ConfirmModal';

export default function CorporateCalendar({ theme, isDark }) {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [events, setEvents] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [editingEvent, setEditingEvent] = useState(null);
    const [workers, setWorkers] = useState([]);
    const [companies, setCompanies] = useState([]);
    const [loading, setLoading] = useState(true);
    
    // Form state
    const [formData, setFormData] = useState({
        titulo: '',
        descripcion: '',
        tipo: 'interno',
        fecha: new Date().toISOString().split('T')[0],
        hora: '09:00',
        hora_fin: '10:00',
        responsable_id: '',
        empresa_id: ''
    });

    const eventTypes = [
        { id: 'reunion', label: 'Reunión' },
        { id: 'interno', label: 'Evento Interno' },
        { id: 'capacitacion', label: 'Capacitación' },
        { id: 'vacacion', label: 'Vacación' }
    ];

    const loadData = async () => {
        setLoading(true);
        try {
            // Load events
            const { data: eventsData } = await supabase.from('eventos_calendario').select('*');
            if (eventsData) setEvents(eventsData);

            // Load workers for select
            const { data: workersData } = await supabase.from('workers').select('id, full_name').eq('status', 'activo');
            if (workersData) setWorkers(workersData);

            // Load companies for select
            const { data: companiesData } = await supabase.from('companies').select('id, name');
            if (companiesData) setCompanies(companiesData);

        } catch (error) {
            console.error('Error loading calendar data:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const getDaysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
    const getFirstDayOfMonth = (year, month) => {
        let day = new Date(year, month, 1).getDay();
        return day === 0 ? 6 : day - 1; // 0 = Lunes
    };

    const monthNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
    
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const daysInMonth = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfMonth(year, month);
    
    const days = [];
    for (let i = 0; i < firstDay; i++) days.push(null);
    for (let i = 1; i <= daysInMonth; i++) days.push(i);

    const handlePrevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
    const handleNextMonth = () => setCurrentDate(new Date(year, month + 1, 1));
    const handleToday = () => setCurrentDate(new Date());

    const openModal = (date = null, event = null) => {
        if (event) {
            setEditingEvent(event);
            setFormData({
                ...event,
                fecha: event.fecha.split('T')[0]
            });
        } else {
            setEditingEvent(null);
            setFormData({
                titulo: '',
                descripcion: '',
                tipo: 'interno',
                fecha: date ? `${year}-${String(month + 1).padStart(2, '0')}-${String(date).padStart(2, '0')}` : new Date().toISOString().split('T')[0],
                hora: '09:00',
                hora_fin: '10:00',
                responsable_id: '',
                empresa_id: ''
            });
        }
        setShowModal(true);
    };

    const handleSaveEvent = async (e) => {
        e.preventDefault();
        try {
            let color = '#3b82f6'; // blue (interno)
            if (formData.tipo === 'reunion') color = '#a855f7'; // purple
            if (formData.tipo === 'capacitacion') color = '#10b981'; // green
            if (formData.tipo === 'vacacion') color = '#f59e0b'; // amber

            const payload = {
                ...formData,
                color,
                responsable_id: formData.responsable_id || null,
                empresa_id: formData.empresa_id || null
            };

            if (editingEvent) {
                await supabase.from('eventos_calendario').update(payload).eq('id', editingEvent.id);
            } else {
                await supabase.from('eventos_calendario').insert([payload]);
            }
            setShowModal(false);
            loadData();
        } catch (error) {
            console.error('Error saving event:', error);
        }
    };

    const handleDeleteEvent = async (id) => {
        if (!confirm('¿Eliminar este evento?')) return;
        try {
            await supabase.from('eventos_calendario').delete().eq('id', id);
            setShowModal(false);
            loadData();
        } catch (error) {
            console.error('Error deleting event:', error);
        }
    };

    const getEventsForDay = (day) => {
        if (!day) return [];
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        return events.filter(e => e.fecha === dateStr);
    };

    return (
        <div className="animate-fade-in space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <div className="p-3 rounded-xl bg-blue-500/10 text-blue-500">
                        <CalendarIcon size={24} />
                    </div>
                    <div>
                        <h2 className="text-xl font-black uppercase tracking-tight" style={{ color: theme.text }}>Calendario Corporativo</h2>
                        <p className="text-sm" style={{ color: theme.textSecondary }}>Gestiona reuniones, capacitaciones y eventos internos.</p>
                    </div>
                </div>
                
                <button 
                    onClick={() => openModal()}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl text-white font-bold text-sm bg-blue-600 hover:bg-blue-700 transition-colors shadow-lg shadow-blue-500/20"
                >
                    <Plus size={16} /> NUEVO EVENTO
                </button>
            </div>

            <div className="rounded-2xl border shadow-sm overflow-hidden" style={{ background: theme.surface, borderColor: theme.border }}>
                <div className="p-4 sm:p-6 border-b flex items-center justify-between" style={{ borderColor: theme.border, background: isDark ? 'rgba(0,0,0,0.2)' : '#f9fafb' }}>
                    <div className="flex items-center gap-2">
                        <button onClick={handlePrevMonth} className="p-2 hover:bg-black/5 dark:hover:bg-white/5 rounded-lg transition-colors" style={{ color: theme.textSecondary }}>
                            <ChevronLeft size={20} />
                        </button>
                        <button onClick={handleNextMonth} className="p-2 hover:bg-black/5 dark:hover:bg-white/5 rounded-lg transition-colors" style={{ color: theme.textSecondary }}>
                            <ChevronRight size={20} />
                        </button>
                        <button onClick={handleToday} className="ml-2 px-3 py-1.5 text-xs font-bold uppercase rounded-lg border hover:bg-black/5 dark:hover:bg-white/5 transition-colors" style={{ borderColor: theme.border, color: theme.text }}>
                            HOY
                        </button>
                    </div>
                    <h3 className="text-lg sm:text-xl font-black uppercase tracking-widest text-blue-500">
                        {monthNames[month]} {year}
                    </h3>
                </div>

                <div className="grid grid-cols-7 border-b text-center" style={{ borderColor: theme.border, background: isDark ? 'rgba(0,0,0,0.1)' : '#f3f4f6' }}>
                    {['LUN', 'MAR', 'MIE', 'JUE', 'VIE', 'SAB', 'DOM'].map(d => (
                        <div key={d} className="py-3 text-[10px] font-black uppercase tracking-widest" style={{ color: theme.textSecondary }}>
                            {d}
                        </div>
                    ))}
                </div>

                <div className="grid grid-cols-7 auto-rows-[120px] sm:auto-rows-[150px]">
                    {days.map((day, i) => {
                        const dayEvents = getEventsForDay(day);
                        const isToday = day === new Date().getDate() && month === new Date().getMonth() && year === new Date().getFullYear();
                        
                        return (
                            <div 
                                key={i} 
                                className={`border-b border-r relative group p-1 sm:p-2 transition-colors ${day ? 'hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer' : ''}`}
                                style={{ borderColor: theme.border, background: isToday ? (isDark ? 'rgba(59, 130, 246, 0.1)' : '#eff6ff') : 'transparent' }}
                                onClick={() => day && openModal(day)}
                            >
                                {day && (
                                    <>
                                        <div className={`text-xs font-bold mb-1 w-6 h-6 flex items-center justify-center rounded-full ${isToday ? 'bg-blue-500 text-white' : ''}`} style={{ color: !isToday ? theme.textSecondary : '' }}>
                                            {day}
                                        </div>
                                        <div className="space-y-1 overflow-y-auto max-h-[80px] sm:max-h-[100px] no-scrollbar">
                                            {dayEvents.map(evt => (
                                                <div 
                                                    key={evt.id} 
                                                    onClick={(e) => { e.stopPropagation(); openModal(day, evt); }}
                                                    className="text-[10px] sm:text-xs px-2 py-1 rounded-md font-bold truncate transition-transform hover:scale-[1.02]"
                                                    style={{ 
                                                        backgroundColor: `${evt.color}15`, 
                                                        color: evt.color, 
                                                        border: `1px solid ${evt.color}30` 
                                                    }}
                                                >
                                                    {evt.hora && <span className="opacity-70 mr-1">{evt.hora.substring(0,5)}</span>}
                                                    {evt.titulo}
                                                </div>
                                            ))}
                                        </div>
                                    </>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Event Modal */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div 
                        className="w-full max-w-lg rounded-2xl shadow-2xl border flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200" 
                        style={{ background: theme.surface, borderColor: theme.border }}
                    >
                        <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: theme.border }}>
                            <h3 className="font-bold text-lg" style={{ color: theme.text }}>
                                {editingEvent ? 'Editar Evento' : 'Nuevo Evento'}
                            </h3>
                            <button onClick={() => setShowModal(false)} className="p-1 hover:bg-black/10 dark:hover:bg-white/10 rounded-lg transition-colors" style={{ color: theme.textSecondary }}>
                                <X size={20} />
                            </button>
                        </div>
                        
                        <div className="p-4 sm:p-6 overflow-y-auto flex-1">
                            <form id="event-form" onSubmit={handleSaveEvent} className="space-y-4">
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-wider mb-1" style={{ color: theme.textSecondary }}>Título del Evento</label>
                                    <input 
                                        type="text" 
                                        required
                                        value={formData.titulo}
                                        onChange={(e) => setFormData({...formData, titulo: e.target.value})}
                                        className="w-full px-3 py-2 rounded-lg border text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                                        style={{ background: theme.background, borderColor: theme.border, color: theme.text }}
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-[10px] font-black uppercase tracking-wider mb-1" style={{ color: theme.textSecondary }}>Tipo</label>
                                        <CustomSelect 
                                            options={eventTypes}
                                            value={formData.tipo}
                                            onChange={(val) => setFormData({...formData, tipo: val})}
                                            theme={theme}
                                            isDark={isDark}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black uppercase tracking-wider mb-1" style={{ color: theme.textSecondary }}>Fecha</label>
                                        <CustomDatePicker 
                                            value={formData.fecha}
                                            onChange={(val) => setFormData({...formData, fecha: val})}
                                            className="w-full px-3 py-2 rounded-lg border text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                                            style={{ background: theme.background, borderColor: theme.border, color: theme.text }}
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-[10px] font-black uppercase tracking-wider mb-1" style={{ color: theme.textSecondary }}>Hora Inicio</label>
                                        <input 
                                            type="time" 
                                            value={formData.hora}
                                            onChange={(e) => setFormData({...formData, hora: e.target.value})}
                                            className="w-full px-3 py-2 rounded-lg border text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                                            style={{ background: theme.background, borderColor: theme.border, color: theme.text }}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black uppercase tracking-wider mb-1" style={{ color: theme.textSecondary }}>Hora Fin</label>
                                        <input 
                                            type="time" 
                                            value={formData.hora_fin}
                                            onChange={(e) => setFormData({...formData, hora_fin: e.target.value})}
                                            className="w-full px-3 py-2 rounded-lg border text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                                            style={{ background: theme.background, borderColor: theme.border, color: theme.text }}
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-wider mb-1" style={{ color: theme.textSecondary }}>Colaborador Responsable (Opcional)</label>
                                    <CustomSelect 
                                        options={[{id: '', label: 'Ninguno'}, ...workers.map(w => ({id: w.id, label: w.full_name}))]}
                                        value={formData.responsable_id}
                                        onChange={(val) => setFormData({...formData, responsable_id: val})}
                                        theme={theme}
                                        isDark={isDark}
                                        placeholder="Seleccionar..."
                                    />
                                </div>

                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-wider mb-1" style={{ color: theme.textSecondary }}>Empresa Asociada (Opcional)</label>
                                    <CustomSelect 
                                        options={[{id: '', label: 'Ninguna'}, ...companies.map(c => ({id: c.id, label: c.name}))]}
                                        value={formData.empresa_id}
                                        onChange={(val) => setFormData({...formData, empresa_id: val})}
                                        theme={theme}
                                        isDark={isDark}
                                        placeholder="Seleccionar..."
                                    />
                                </div>

                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-wider mb-1" style={{ color: theme.textSecondary }}>Descripción</label>
                                    <textarea 
                                        rows="3"
                                        value={formData.descripcion}
                                        onChange={(e) => setFormData({...formData, descripcion: e.target.value})}
                                        className="w-full px-3 py-2 rounded-lg border text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/50 resize-none"
                                        style={{ background: theme.background, borderColor: theme.border, color: theme.text }}
                                    ></textarea>
                                </div>
                            </form>
                        </div>
                        
                        <div className="p-4 border-t flex justify-end gap-2" style={{ borderColor: theme.border, background: isDark ? 'rgba(0,0,0,0.2)' : '#f9fafb' }}>
                            {editingEvent && (
                                <button 
                                    type="button" 
                                    onClick={() => handleDeleteEvent(editingEvent.id)}
                                    className="mr-auto px-4 py-2 text-sm font-bold text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                                >
                                    Eliminar
                                </button>
                            )}
                            <button 
                                type="button" 
                                onClick={() => setShowModal(false)}
                                className="px-4 py-2 text-sm font-bold rounded-lg transition-colors hover:bg-black/5 dark:hover:bg-white/5"
                                style={{ color: theme.textSecondary }}
                            >
                                Cancelar
                            </button>
                            <button 
                                type="submit" 
                                form="event-form"
                                className="px-6 py-2 text-sm font-bold rounded-lg text-white bg-blue-600 hover:bg-blue-700 transition-colors shadow-lg shadow-blue-500/20"
                            >
                                Guardar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
