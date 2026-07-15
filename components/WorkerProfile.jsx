'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
    User, Mail, Phone, Briefcase, Calendar, Shield, MapPin, 
    ChevronLeft, DollarSign, FileText, Activity, AlertCircle, Edit2, Camera
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { updateWorkerAction } from '../lib/actions';
import { uploadFile } from '../lib/auth';
import Toast from './Toast';
import CustomSelect from './CustomSelect';
import CustomDatePicker from './CustomDatePicker';
import WorkerTasks from './hr/WorkerTasks';
import WorkerTrainings from './hr/WorkerTrainings';
import WorkerVacations from './hr/WorkerVacations';
import WorkerAnalysis from './hr/WorkerAnalysis';
import WorkerAccessControl from './hr/WorkerAccessControl';

export default function WorkerProfile({ worker, onBack, theme, isDark, adminSession }) {
    const [profileData, setProfileData] = useState({ ...worker });
    const [isEditing, setIsEditing] = useState(false);
    const [saving, setSaving] = useState(false);
    const [toast, setToast] = useState(null);
    const [activeTab, setActiveTab] = useState('tareas'); // 'tareas', 'capacitaciones', 'vacaciones', 'analisis'

    // Initial fields for Phase 4
    const [formData, setFormData] = useState({
        cargo: worker.cargo || '',
        departamento: worker.departamento || '',
        sueldo: worker.sueldo || '',
        tipo_contrato: worker.tipo_contrato || '',
        telefono: worker.telefono || '',
        full_name: worker.full_name || '',
        email: worker.email || '',
        username: worker.username || '',
        fecha_ingreso: worker.fecha_ingreso || '',
        estado_laboral: worker.estado_laboral || 'activo'
    });

    const [uploadingAvatar, setUploadingAvatar] = useState(false);
    const avatarInputRef = useRef(null);

    const handleAvatarUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            setUploadingAvatar(true);
            const path = await uploadFile(file, 'documents', `avatars/${worker.id}`);
            const { data } = supabase.storage.from('documents').getPublicUrl(path);
            
            // Save directly to the user profile
            const result = await updateWorkerAction(worker.id, { avatar_url: data.publicUrl }, adminSession?.id);
            if (result.success) {
                setProfileData(prev => ({ ...prev, avatar_url: data.publicUrl }));
                setToast({ type: 'success', message: 'Foto de perfil actualizada' });
            } else {
                throw new Error('Error al guardar foto en la base de datos');
            }
        } catch (error) {
            console.error("Error al subir foto:", error);
            setToast({ type: 'error', message: 'Error al actualizar la foto de perfil' });
        } finally {
            setUploadingAvatar(false);
            if (avatarInputRef.current) avatarInputRef.current.value = '';
        }
    };

    const handleSave = async () => {
        setSaving(true);
        const payload = {
            cargo: formData.cargo,
            departamento: formData.departamento,
            sueldo: formData.sueldo ? parseFloat(formData.sueldo) : null,
            tipo_contrato: formData.tipo_contrato,
            telefono: formData.telefono,
            full_name: formData.full_name,
            email: formData.email,
            username: formData.username,
            fecha_ingreso: formData.fecha_ingreso || null,
            estado_laboral: formData.estado_laboral
        };
        const result = await updateWorkerAction(worker.id, payload, adminSession?.id);

        setSaving(false);
        if (!result.success) {
            setToast({ type: 'error', message: 'Error al actualizar perfil' });
        } else {
            setProfileData(prev => ({ ...prev, ...payload }));
            setIsEditing(false);
            setToast({ type: 'success', message: 'Perfil actualizado correctamente' });
        }
    };

    if (!worker) return null;

    return (
        <div className="animate-fade-in pb-8">
            <div className="flex items-center gap-3 mb-6">
                <button 
                    onClick={onBack} 
                    className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-xl transition-colors text-gray-400 hover:text-gray-700 dark:hover:text-white"
                >
                    <ChevronLeft size={24} />
                </button>
                <h2 className="text-2xl font-bold" style={{ color: theme.text }}>Perfil del Colaborador</h2>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column - Main Info */}
                <div className="lg:col-span-1 space-y-6">
                    <div className="rounded-2xl border shadow-sm p-6 text-center" style={{ background: theme.surface, borderColor: theme.border }}>
                        <div className="relative w-24 h-24 mx-auto mb-4 group">
                            <div className="w-full h-full rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-3xl font-bold shadow-lg border-4 overflow-hidden" style={{ borderColor: theme.background }}>
                                {profileData.avatar_url ? (
                                    <img src={profileData.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                                ) : (
                                    profileData.full_name?.charAt(0)?.toUpperCase() || profileData.username?.charAt(0)?.toUpperCase() || '?'
                                )}
                            </div>
                            
                            <label className="absolute inset-0 flex items-center justify-center bg-black/50 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                                <input 
                                    type="file" 
                                    className="hidden" 
                                    accept="image/*" 
                                    onChange={handleAvatarUpload} 
                                    ref={avatarInputRef}
                                />
                                {uploadingAvatar ? (
                                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                ) : (
                                    <Camera size={20} />
                                )}
                            </label>
                        </div>
                        <h3 className="text-xl font-bold mb-1" style={{ color: theme.text }}>{profileData.full_name}</h3>
                        <p className="text-sm opacity-70 mb-4" style={{ color: theme.textSecondary }}>@{profileData.username}</p>
                        
                        <div className="inline-block px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider mb-6" style={{ 
                            background: profileData.estado_laboral === 'activo' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                            color: profileData.estado_laboral === 'activo' ? '#10b981' : '#ef4444' 
                        }}>
                            {profileData.estado_laboral || 'activo'}
                        </div>

                        <div className="space-y-3 text-sm text-left">
                            <div className="flex items-center gap-3" style={{ color: theme.textSecondary }}>
                                <Mail size={16} />
                                <span className="truncate">{profileData.email || 'No especificado'}</span>
                            </div>
                            <div className="flex items-center gap-3" style={{ color: theme.textSecondary }}>
                                <Phone size={16} />
                                <span>{profileData.telefono || 'No especificado'}</span>
                            </div>
                            <div className="flex items-center gap-3" style={{ color: theme.textSecondary }}>
                                <Briefcase size={16} />
                                <span>{profileData.departamento || 'Sin departamento'}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Column - Details & Edit */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="rounded-2xl border shadow-sm p-6" style={{ background: theme.surface, borderColor: theme.border }}>
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-lg font-bold flex items-center gap-2" style={{ color: theme.text }}>
                                <FileText size={20} className="text-blue-500" />
                                Información Contractual
                            </h3>
                            {!isEditing ? (
                                <button 
                                    onClick={() => setIsEditing(true)}
                                    className="flex items-center gap-2 text-sm font-medium px-3 py-1.5 rounded-lg transition-colors hover:bg-black/5 dark:hover:bg-white/5"
                                    style={{ color: theme.primary }}
                                >
                                    <Edit2 size={16} /> Editar
                                </button>
                            ) : (
                                <div className="flex gap-2">
                                    <button 
                                        onClick={() => {
                                            setFormData({
                                                cargo: profileData.cargo || '',
                                                departamento: profileData.departamento || '',
                                                sueldo: profileData.sueldo || '',
                                                tipo_contrato: profileData.tipo_contrato || '',
                                                telefono: profileData.telefono || '',
                                                full_name: profileData.full_name || '',
                                                email: profileData.email || '',
                                                username: profileData.username || '',
                                                fecha_ingreso: profileData.fecha_ingreso || '',
                                                estado_laboral: profileData.estado_laboral || 'activo'
                                            });
                                            setIsEditing(false);
                                        }}
                                        className="text-xs px-3 py-1.5 rounded-lg border hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
                                        style={{ color: theme.text, borderColor: theme.border }}
                                    >
                                        Cancelar
                                    </button>
                                    <button 
                                        onClick={handleSave}
                                        disabled={saving}
                                        className="text-xs font-bold px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors disabled:opacity-50"
                                    >
                                        {saving ? 'Guardando...' : 'Guardar Cambios'}
                                    </button>
                                </div>
                            )}
                        </div>

                        {isEditing ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold mb-1" style={{ color: theme.textSecondary }}>Nombre Completo</label>
                                    <input 
                                        type="text"
                                        value={formData.full_name}
                                        onChange={e => setFormData({...formData, full_name: e.target.value})}
                                        className="w-full px-3 py-2 rounded-lg text-sm border focus:ring-2 focus:ring-blue-500 outline-none"
                                        style={{ background: isDark ? 'rgba(0,0,0,0.2)' : '#f9fafb', borderColor: theme.border, color: theme.text }}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold mb-1" style={{ color: theme.textSecondary }}>Usuario</label>
                                    <input 
                                        type="text"
                                        value={formData.username}
                                        onChange={e => setFormData({...formData, username: e.target.value})}
                                        className="w-full px-3 py-2 rounded-lg text-sm border focus:ring-2 focus:ring-blue-500 outline-none"
                                        style={{ background: isDark ? 'rgba(0,0,0,0.2)' : '#f9fafb', borderColor: theme.border, color: theme.text }}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold mb-1" style={{ color: theme.textSecondary }}>Correo Electrónico</label>
                                    <input 
                                        type="email"
                                        value={formData.email}
                                        onChange={e => setFormData({...formData, email: e.target.value})}
                                        className="w-full px-3 py-2 rounded-lg text-sm border focus:ring-2 focus:ring-blue-500 outline-none"
                                        style={{ background: isDark ? 'rgba(0,0,0,0.2)' : '#f9fafb', borderColor: theme.border, color: theme.text }}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold mb-1" style={{ color: theme.textSecondary }}>Teléfono</label>
                                    <input 
                                        type="text"
                                        value={formData.telefono}
                                        onChange={e => setFormData({...formData, telefono: e.target.value})}
                                        className="w-full px-3 py-2 rounded-lg text-sm border focus:ring-2 focus:ring-blue-500 outline-none"
                                        style={{ background: isDark ? 'rgba(0,0,0,0.2)' : '#f9fafb', borderColor: theme.border, color: theme.text }}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold mb-1" style={{ color: theme.textSecondary }}>Cargo</label>
                                    <input 
                                        type="text"
                                        value={formData.cargo}
                                        onChange={e => setFormData({...formData, cargo: e.target.value})}
                                        className="w-full px-3 py-2 rounded-lg text-sm border focus:ring-2 focus:ring-blue-500 outline-none"
                                        style={{ background: isDark ? 'rgba(0,0,0,0.2)' : '#f9fafb', borderColor: theme.border, color: theme.text }}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold mb-1" style={{ color: theme.textSecondary }}>Departamento</label>
                                    <input 
                                        type="text"
                                        value={formData.departamento}
                                        onChange={e => setFormData({...formData, departamento: e.target.value})}
                                        className="w-full px-3 py-2 rounded-lg text-sm border focus:ring-2 focus:ring-blue-500 outline-none"
                                        style={{ background: isDark ? 'rgba(0,0,0,0.2)' : '#f9fafb', borderColor: theme.border, color: theme.text }}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold mb-1" style={{ color: theme.textSecondary }}>Tipo de Contrato</label>
                                    <CustomSelect 
                                        value={formData.tipo_contrato}
                                        onChange={val => setFormData({...formData, tipo_contrato: val})}
                                        options={[
                                            {value: '', label: 'Seleccione...'},
                                            {value: 'indefinido', label: 'Indefinido'},
                                            {value: 'fijo', label: 'Plazo Fijo'},
                                            {value: 'servicios', label: 'Servicios Profesionales'},
                                            {value: 'prueba', label: 'Período de Prueba'}
                                        ]}
                                        placeholder="Seleccione..."
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold mb-1" style={{ color: theme.textSecondary }}>Sueldo ($)</label>
                                    <input 
                                        type="number"
                                        step="0.01"
                                        value={formData.sueldo}
                                        onChange={e => setFormData({...formData, sueldo: e.target.value})}
                                        className="w-full px-3 py-2 rounded-lg text-sm border focus:ring-2 focus:ring-blue-500 outline-none"
                                        style={{ background: isDark ? 'rgba(0,0,0,0.2)' : '#f9fafb', borderColor: theme.border, color: theme.text }}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold mb-1" style={{ color: theme.textSecondary }}>Fecha de Ingreso</label>
                                    <CustomDatePicker 
                                        value={formData.fecha_ingreso}
                                        onChange={val => setFormData({...formData, fecha_ingreso: val})}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold mb-1" style={{ color: theme.textSecondary }}>Estado Laboral</label>
                                    <CustomSelect 
                                        value={formData.estado_laboral}
                                        onChange={val => setFormData({...formData, estado_laboral: val})}
                                        options={[
                                            {value: 'activo', label: 'Activo'},
                                            {value: 'vacaciones', label: 'En Vacaciones'},
                                            {value: 'inactivo', label: 'Inactivo / Salida'}
                                        ]}
                                        placeholder="Seleccione estado"
                                    />
                                </div>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-y-6 gap-x-4">
                                <div className="flex items-start gap-3">
                                    <div className="p-2 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
                                        <Briefcase size={20} />
                                    </div>
                                    <div>
                                        <p className="text-xs uppercase font-bold opacity-60" style={{ color: theme.textSecondary }}>Cargo</p>
                                        <p className="font-medium" style={{ color: theme.text }}>{profileData.cargo || 'No registrado'}</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-3">
                                    <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                                        <DollarSign size={20} />
                                    </div>
                                    <div>
                                        <p className="text-xs uppercase font-bold opacity-60" style={{ color: theme.textSecondary }}>Sueldo</p>
                                        <p className="font-medium" style={{ color: theme.text }}>{profileData.sueldo ? `$${profileData.sueldo}` : 'No registrado'}</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-3">
                                    <div className="p-2 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400">
                                        <FileText size={20} />
                                    </div>
                                    <div>
                                        <p className="text-xs uppercase font-bold opacity-60" style={{ color: theme.textSecondary }}>Contrato</p>
                                        <p className="font-medium capitalize" style={{ color: theme.text }}>{profileData.tipo_contrato || 'No registrado'}</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-3">
                                    <div className="p-2 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
                                        <Calendar size={20} />
                                    </div>
                                    <div>
                                        <p className="text-xs uppercase font-bold opacity-60" style={{ color: theme.textSecondary }}>Fecha Ingreso</p>
                                        <p className="font-medium" style={{ color: theme.text }}>{profileData.fecha_ingreso ? new Date(profileData.fecha_ingreso).toLocaleDateString() : 'No registrado'}</p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="rounded-2xl border shadow-sm p-6" style={{ background: theme.surface, borderColor: theme.border }}>
                        <div className="flex space-x-2 mb-6 overflow-x-auto p-1 rounded-xl bg-gray-100/50 dark:bg-white/5 no-scrollbar">
                            {['tareas', 'capacitaciones', 'vacaciones', 'analisis', 'accesos'].map(tab => (
                                <button
                                    key={tab}
                                    onClick={() => setActiveTab(tab)}
                                    className={`px-4 py-2 font-medium text-sm transition-all rounded-lg whitespace-nowrap flex-1 text-center ${
                                        activeTab !== tab ? 'hover:bg-black/5 dark:hover:bg-white/10' : 'shadow-sm'
                                    }`}
                                    style={{ 
                                        background: activeTab === tab ? (isDark ? 'rgba(59, 130, 246, 0.2)' : 'rgba(59, 130, 246, 0.1)') : 'transparent',
                                        color: activeTab === tab ? theme.primary : theme.textSecondary
                                    }}
                                >
                                    {tab === 'analisis' ? 'Análisis de Actividades' : tab === 'accesos' ? 'Accesos y Permisos' : tab.charAt(0).toUpperCase() + tab.slice(1)}
                                </button>
                            ))}
                        </div>
                        
                        {activeTab === 'tareas' && (
                            <WorkerTasks workerId={worker.id} theme={theme} isDark={isDark} />
                        )}

                        {activeTab === 'capacitaciones' && (
                            <WorkerTrainings workerId={worker.id} theme={theme} isDark={isDark} />
                        )}

                        {activeTab === 'vacaciones' && (
                            <WorkerVacations workerId={worker.id} theme={theme} isDark={isDark} />
                        )}

                        {activeTab === 'analisis' && (
                            <WorkerAnalysis workerId={worker.id} theme={theme} isDark={isDark} />
                        )}
                        
                        {activeTab === 'accesos' && (
                            <WorkerAccessControl workerId={worker.id} theme={theme} isDark={isDark} />
                        )}
                    </div>
                </div>
            </div>

            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
        </div>
    );
}
