'use client';

import React, { useState, useEffect } from 'react';
import { 
    Plus, Trash2, Eye, EyeOff, Search, ChevronRight, 
    Users, Briefcase, Mail, Phone, Calendar, AlertTriangle
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useTheme } from '../contexts/ThemeContext';
import { lightTheme, darkTheme } from '../lib/colors';
import Toast from './Toast';
import WorkerProfile from './WorkerProfile';
import { createWorkerAction, deleteWorkerAction } from '../lib/actions';

export default function WorkerManager({ adminSession, searchTerm, showForm, setShowForm }) {
    const { isDark } = useTheme();
    const theme = isDark ? darkTheme : lightTheme;
    const [workers, setWorkers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [toast, setToast] = useState(null);
    const [showPasswordsSet, setShowPasswordsSet] = useState({});

    const [selectedWorker, setSelectedWorker] = useState(null);
    const [submitting, setSubmitting] = useState(false);

    const [formData, setFormData] = useState({
        username: '',
        password: '',
        full_name: '',
        email: '',
        telefono: ''
    });
    const [showPassword, setShowPassword] = useState(false);
    const [workerToDelete, setWorkerToDelete] = useState(null);

    useEffect(() => {
        fetchWorkers();
    }, []);

    const fetchWorkers = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('workers')
            .select('*')
            .order('created_at', { ascending: false });

        if (!error && data) {
            setWorkers(data);
        }
        setLoading(false);
    };

    const handleCreateWorker = async (e) => {
        e.preventDefault();
        setSubmitting(true);

        try {
            const result = await createWorkerAction(formData, adminSession?.id);
            if (result.success) {
                setToast({ type: 'success', message: 'Funcionario creado correctamente' });
                setFormData({ username: '', password: '', full_name: '', email: '', telefono: '' });
                setShowForm(false);
                fetchWorkers();
            } else {
                setToast({ type: 'error', message: result.error || 'Error al crear funcionario' });
            }
        } catch (error) {
            setToast({ type: 'error', message: 'Error de conexión' });
        }

        setSubmitting(false);
    };

    const handleDelete = (id) => {
        setWorkerToDelete(id);
    };

    const confirmDelete = async () => {
        if (!workerToDelete) return;

        const result = await deleteWorkerAction(workerToDelete, adminSession?.id);
        if (result.success) {
            setToast({ type: 'success', message: 'Funcionario eliminado' });
            setWorkers(workers.filter(w => w.id !== workerToDelete));
        } else {
            setToast({ type: 'error', message: result.error || 'Error al eliminar funcionario' });
        }
        setWorkerToDelete(null);
    };

    const filteredWorkers = workers.filter(w => 
        (w.full_name || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
        (w.username || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (w.cargo || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (selectedWorker) {
        return (
            <WorkerProfile 
                worker={selectedWorker} 
                onBack={() => {
                    setSelectedWorker(null);
                    fetchWorkers(); // Refresh in case profile was updated
                }} 
                theme={theme} 
                isDark={isDark} 
                adminSession={adminSession}
            />
        );
    }

    return (
        <div className="animate-fade-in space-y-6">
            {showForm && (
                <div className="rounded-2xl shadow-sm border p-6 mb-6" style={{ background: theme.surface, borderColor: theme.border }}>
                    <h3 className="text-lg font-bold mb-4" style={{ color: theme.text }}>Registrar Nuevo Funcionario</h3>
                    <form onSubmit={handleCreateWorker} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold mb-1" style={{ color: theme.textSecondary }}>Usuario</label>
                            <input
                                required
                                type="text"
                                placeholder="Ej: jdoe"
                                value={formData.username}
                                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                                className="w-full px-3 py-2 rounded-lg text-sm border focus:ring-2 focus:ring-blue-500 outline-none"
                                style={{ background: isDark ? 'rgba(0,0,0,0.2)' : '#f9fafb', borderColor: theme.border, color: theme.text }}
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold mb-1" style={{ color: theme.textSecondary }}>Contraseña</label>
                            <div className="relative">
                                <input
                                    required
                                    type={showPassword ? "text" : "password"}
                                    placeholder="••••••••"
                                    value={formData.password}
                                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                    className="w-full pl-3 pr-10 py-2 rounded-lg text-sm border focus:ring-2 focus:ring-blue-500 outline-none"
                                    style={{ background: isDark ? 'rgba(0,0,0,0.2)' : '#f9fafb', borderColor: theme.border, color: theme.text }}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 opacity-50 hover:opacity-100 transition-opacity"
                                    style={{ color: theme.text }}
                                >
                                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs font-bold mb-1" style={{ color: theme.textSecondary }}>Nombre Completo</label>
                            <input
                                required
                                type="text"
                                placeholder="Ej: John Doe"
                                value={formData.full_name}
                                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                                className="w-full px-3 py-2 rounded-lg text-sm border focus:ring-2 focus:ring-blue-500 outline-none"
                                style={{ background: isDark ? 'rgba(0,0,0,0.2)' : '#f9fafb', borderColor: theme.border, color: theme.text }}
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold mb-1" style={{ color: theme.textSecondary }}>Correo Electrónico</label>
                            <input
                                type="email"
                                placeholder="opcional@empresa.com"
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                className="w-full px-3 py-2 rounded-lg text-sm border focus:ring-2 focus:ring-blue-500 outline-none"
                                style={{ background: isDark ? 'rgba(0,0,0,0.2)' : '#f9fafb', borderColor: theme.border, color: theme.text }}
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold mb-1" style={{ color: theme.textSecondary }}>Teléfono</label>
                            <input
                                type="text"
                                placeholder="Ej: 0999999999"
                                value={formData.telefono}
                                onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                                className="w-full px-3 py-2 rounded-lg text-sm border focus:ring-2 focus:ring-blue-500 outline-none"
                                style={{ background: isDark ? 'rgba(0,0,0,0.2)' : '#f9fafb', borderColor: theme.border, color: theme.text }}
                            />
                        </div>
                        <div className="md:col-span-2 pt-2">
                            <button
                                type="submit"
                                disabled={submitting}
                                className="w-full text-white px-4 py-2 rounded-lg hover:opacity-90 font-bold shadow-md disabled:opacity-50 transition-all"
                                style={{ background: theme.primary }}
                            >
                                {submitting ? 'Creando...' : 'Crear Funcionario'}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {loading ? (
                    <div className="col-span-full py-12 flex justify-center">
                        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                    </div>
                ) : filteredWorkers.length === 0 ? (
                    <div className="col-span-full text-center py-12 border border-dashed rounded-xl" style={{ borderColor: theme.border }}>
                        <Users size={32} className="mx-auto mb-3 opacity-20" style={{ color: theme.text }} />
                        <p className="font-medium" style={{ color: theme.textSecondary }}>No se encontraron funcionarios</p>
                    </div>
                ) : (
                    filteredWorkers.map(worker => (
                        <div 
                            key={worker.id}
                            className="rounded-xl border shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden flex flex-col group cursor-pointer"
                            style={{ background: theme.surface, borderColor: theme.border }}
                            onClick={() => setSelectedWorker(worker)}
                        >
                            <div className="p-5 flex-1">
                                <div className="flex justify-between items-start mb-3">
                                    {worker.avatar_url ? (
                                        <img 
                                            src={worker.avatar_url} 
                                            alt={worker.full_name || worker.username}
                                            className="w-12 h-12 rounded-full object-cover shadow-md"
                                        />
                                    ) : (
                                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold shadow-md">
                                            {worker.full_name?.charAt(0)?.toUpperCase() || worker.username?.charAt(0)?.toUpperCase()}
                                        </div>
                                    )}
                                    <button 
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleDelete(worker.id);
                                        }}
                                        className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500 transition-all"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                                <h4 className="font-bold text-lg leading-tight mb-1" style={{ color: theme.text }}>
                                    {worker.full_name || worker.username}
                                </h4>
                                <p className="text-sm font-medium opacity-70 mb-4" style={{ color: theme.textSecondary }}>
                                    {worker.cargo || 'Sin cargo'}
                                </p>

                                <div className="space-y-2 text-xs">
                                    <div className="flex items-center gap-2" style={{ color: theme.textSecondary }}>
                                        <Mail size={14} />
                                        <span className="truncate">{worker.email || 'Sin email'}</span>
                                    </div>
                                    <div className="flex items-center gap-2" style={{ color: theme.textSecondary }}>
                                        <Briefcase size={14} />
                                        <span className="truncate">{worker.departamento || 'Sin departamento'}</span>
                                    </div>
                                </div>
                            </div>
                            <div className="px-5 py-3 border-t flex justify-between items-center group-hover:bg-blue-50 dark:group-hover:bg-white/5 transition-colors" style={{ borderColor: theme.border }}>
                                <span className="text-xs font-bold" style={{ color: theme.primary }}>Ver Perfil</span>
                                <ChevronRight size={16} style={{ color: theme.primary }} className="transform group-hover:translate-x-1 transition-transform" />
                            </div>
                        </div>
                    ))
                )}
            </div>

            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

            {}
            {workerToDelete && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
                    <div 
                        className="w-full max-w-sm rounded-2xl p-6 shadow-2xl animate-in zoom-in-95 duration-200"
                        style={{ background: theme.surface, border: `1px solid ${theme.border}` }}
                    >
                        <div className="flex flex-col items-center text-center gap-4">
                            <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-500/20 flex items-center justify-center text-red-600 dark:text-red-400">
                                <AlertTriangle size={24} />
                            </div>

                            <div>
                                <h3 className="text-lg font-bold mb-2" style={{ color: theme.text }}>
                                    Eliminar funcionario
                                </h3>
                                <p className="text-sm" style={{ color: theme.textSecondary }}>
                                    ¿Estás seguro de que deseas eliminar a este funcionario? Esto también eliminará de forma permanente sus registros y accesos.
                                </p>
                            </div>

                            <div className="flex gap-3 w-full mt-2">
                                <button
                                    onClick={() => setWorkerToDelete(null)}
                                    className="flex-1 py-2.5 rounded-xl text-sm font-bold border transition-colors hover:bg-gray-50 dark:hover:bg-white/5"
                                    style={{ color: theme.text, borderColor: theme.border }}
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={confirmDelete}
                                    className="flex-1 py-2.5 rounded-xl text-sm font-bold bg-red-600 text-white hover:bg-red-700 transition-colors shadow-sm"
                                >
                                    Sí, eliminar
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
