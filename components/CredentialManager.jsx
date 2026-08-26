'use client';

import React, { useState, useEffect } from 'react';
import { X, Save, Lock, Trash2, Shield, CheckCircle, AlertCircle } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { lightTheme, darkTheme } from '../lib/colors';
import { getStandardPlatforms, getAccountingPlatform } from '../lib/platforms/registry';
import {
    savePlatformCredentialAction,
    deletePlatformCredentialAction,
    checkCompanyCredentialsAction
} from '../lib/actions';
import { getAdminSession } from '../lib/auth';

export default function CredentialManager({ company, onClose }) {
    const { isDark } = useTheme();
    const theme = isDark ? darkTheme : lightTheme;
    
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(null);
    const [status, setStatus] = useState({}); // { [slug]: boolean }
    const [credentials, setCredentials] = useState({}); // { [slug]: { username: '', password: '' } }
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const allStandard = getStandardPlatforms().filter(p => p.requiereCredenciales);
    const accounting = company.sistema_contable_slug ? getAccountingPlatform(company.sistema_contable_slug) : null;
    const platforms = accounting && accounting.requiereCredenciales ? [...allStandard, accounting] : allStandard;

    useEffect(() => {
        loadStatus();
    }, []);

    const loadStatus = async () => {
        setLoading(true);
        setError('');
        try {
            const admin = getAdminSession();
            if (!admin) throw new Error('No autorizado');

            const res = await checkCompanyCredentialsAction(admin.id, company.id);
            if (res.success) {
                setStatus(res.status);
            } else {
                setError(res.error || 'Error al cargar credenciales');
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (slug) => {
        const creds = credentials[slug];
        if (!creds || !creds.username || !creds.password) {
            setError('Ingresa usuario y contraseña para guardar');
            return;
        }

        setSaving(slug);
        setError('');
        setSuccess('');

        try {
            const admin = getAdminSession();
            const res = await savePlatformCredentialAction(admin.id, company.id, slug, creds);
            if (res.success) {
                setStatus(prev => ({ ...prev, [slug]: true }));
                setCredentials(prev => {
                    const next = { ...prev };
                    delete next[slug];
                    return next;
                });
                setSuccess(`Credenciales de ${platforms.find(p => p.slug === slug)?.nombre} guardadas.`);
                setTimeout(() => setSuccess(''), 3000);
            } else {
                setError(res.error || 'Error al guardar');
            }
        } catch (err) {
            setError('Error de conexión');
        } finally {
            setSaving(null);
        }
    };

    const handleDelete = async (slug) => {
        if (!confirm('¿Estás seguro de eliminar estas credenciales? La automatización dejará de funcionar para esta plataforma.')) return;

        setSaving(slug);
        setError('');
        setSuccess('');

        try {
            const admin = getAdminSession();
            const res = await deletePlatformCredentialAction(admin.id, company.id, slug);
            if (res.success) {
                setStatus(prev => ({ ...prev, [slug]: false }));
                setSuccess(`Credenciales de ${platforms.find(p => p.slug === slug)?.nombre} eliminadas.`);
                setTimeout(() => setSuccess(''), 3000);
            } else {
                setError(res.error || 'Error al eliminar');
            }
        } catch (err) {
            setError('Error de conexión');
        } finally {
            setSaving(null);
        }
    };

    const handleInputChange = (slug, field, value) => {
        setCredentials(prev => ({
            ...prev,
            [slug]: {
                ...(prev[slug] || { username: '', password: '' }),
                [field]: value
            }
        }));
    };

    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
            <div 
                className="rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden border flex flex-col max-h-[90vh]" 
                style={{ background: theme.surface, borderColor: theme.border }}
            >
                {/* Header */}
                <div className="p-5 border-b flex justify-between items-center bg-gray-50/50 dark:bg-white/5" style={{ borderColor: theme.border }}>
                    <div>
                        <h2 className="text-xl font-bold flex items-center gap-2" style={{ color: theme.text }}>
                            <Shield className="text-blue-500" />
                            Gestión de Credenciales
                        </h2>
                        <p className="text-sm mt-1 opacity-70" style={{ color: theme.text }}>
                            {company.name} {company.ruc && `(RUC: ${company.ruc})`}
                        </p>
                    </div>
                    <button 
                        onClick={onClose}
                        className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-white/10 transition-colors"
                        style={{ color: theme.textSecondary }}
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Body */}
                <div className="p-5 overflow-y-auto custom-scrollbar flex-1">
                    {/* Alerts */}
                    {error && (
                        <div className="mb-4 p-3 rounded-lg bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400 border border-red-200 dark:border-red-500/20 flex items-center gap-2 text-sm font-medium">
                            <AlertCircle size={16} /> {error}
                        </div>
                    )}
                    {success && (
                        <div className="mb-4 p-3 rounded-lg bg-green-50 text-green-600 dark:bg-green-500/10 dark:text-green-400 border border-green-200 dark:border-green-500/20 flex items-center gap-2 text-sm font-medium">
                            <CheckCircle size={16} /> {success}
                        </div>
                    )}

                    <div className="mb-6 p-4 rounded-xl bg-blue-50 dark:bg-blue-500/10 border border-blue-100 dark:border-blue-500/20 text-sm" style={{ color: isDark ? '#93c5fd' : '#1e40af' }}>
                        <p className="font-semibold mb-1 flex items-center gap-2">
                            <Lock size={16} /> Cifrado AES-256-GCM
                        </p>
                        <p className="opacity-90">
                            Estas credenciales se almacenan fuertemente cifradas. Por seguridad, no es posible ver la contraseña una vez guardada. Si necesitas actualizarla, simplemente ingresa una nueva y guarda.
                        </p>
                    </div>

                    {loading ? (
                        <div className="py-12 flex flex-col items-center justify-center">
                            <div className="w-8 h-8 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mb-4" />
                            <p className="text-sm font-medium" style={{ color: theme.textSecondary }}>Cargando estado...</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {platforms.map(platform => {
                                const isSaved = status[platform.slug];
                                const creds = credentials[platform.slug] || { username: '', password: '' };
                                const isWorking = saving === platform.slug;

                                return (
                                    <div 
                                        key={platform.slug}
                                        className={`p-4 rounded-xl border transition-colors ${isSaved ? 'bg-gray-50/50 dark:bg-white/5 border-gray-200 dark:border-white/10' : ''}`}
                                        style={{ borderColor: theme.border }}
                                    >
                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-3">
                                            <div className="flex items-center gap-3">
                                                <div 
                                                    className="w-10 h-10 rounded-lg flex items-center justify-center shadow-sm"
                                                    style={{ backgroundColor: platform.color, color: 'white' }}
                                                >
                                                    <Lock size={18} />
                                                </div>
                                                <div>
                                                    <h3 className="font-bold text-base" style={{ color: theme.text }}>
                                                        {platform.nombre}
                                                    </h3>
                                                    <div className="flex items-center gap-2 mt-0.5">
                                                        <span className={`text-[10px] uppercase font-black px-2 py-0.5 rounded-full ${isSaved ? 'bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400' : 'bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-400'}`}>
                                                            {isSaved ? 'Configurado' : 'Sin Configurar'}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>

                                            {isSaved && (
                                                <button
                                                    onClick={() => handleDelete(platform.slug)}
                                                    disabled={isWorking}
                                                    className="px-3 py-1.5 text-xs font-bold text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg flex items-center gap-1.5 transition-colors disabled:opacity-50"
                                                >
                                                    <Trash2 size={14} /> Eliminar
                                                </button>
                                            )}
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
                                            <div>
                                                <label className="block text-[11px] font-bold uppercase mb-1.5 opacity-70" style={{ color: theme.text }}>Usuario / RUC</label>
                                                <input
                                                    type="text"
                                                    value={creds.username}
                                                    onChange={e => handleInputChange(platform.slug, 'username', e.target.value)}
                                                    placeholder={isSaved ? '••••••••' : 'Ej: 1712345678001'}
                                                    className="w-full px-3 py-2 text-sm rounded-lg border outline-none focus:ring-2 focus:ring-blue-500 transition-all bg-transparent"
                                                    style={{ borderColor: theme.border, color: theme.text }}
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-[11px] font-bold uppercase mb-1.5 opacity-70" style={{ color: theme.text }}>Contraseña</label>
                                                <div className="flex gap-2">
                                                    <input
                                                        type="password"
                                                        value={creds.password}
                                                        onChange={e => handleInputChange(platform.slug, 'password', e.target.value)}
                                                        placeholder={isSaved ? '••••••••' : 'Contraseña'}
                                                        className="w-full px-3 py-2 text-sm rounded-lg border outline-none focus:ring-2 focus:ring-blue-500 transition-all bg-transparent"
                                                        style={{ borderColor: theme.border, color: theme.text }}
                                                    />
                                                    <button
                                                        onClick={() => handleSave(platform.slug)}
                                                        disabled={isWorking || !creds.username || !creds.password}
                                                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-sm shadow-md transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                                    >
                                                        {isWorking ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save size={16} />}
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
