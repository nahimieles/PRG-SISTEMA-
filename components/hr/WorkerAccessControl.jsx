import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Shield, Building2, Save, Users } from 'lucide-react';
import { getCompanyGroups, getCompanies, getWorkerCompanyAccess, setWorkerCompanyAccess } from '../../lib/auth';

export default function WorkerAccessControl({ workerId, theme, isDark }) {
    const [groups, setGroups] = useState([]);
    const [companies, setCompanies] = useState([]);
    const [selectedGroups, setSelectedGroups] = useState(new Set());
    const [selectedCompanies, setSelectedCompanies] = useState(new Set());
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');

    useEffect(() => {
        const loadData = async () => {
            const [fetchedGroups, fetchedCompanies, access] = await Promise.all([
                getCompanyGroups(),
                getCompanies(),
                getWorkerCompanyAccess(workerId)
            ]);
            
            setGroups(fetchedGroups);
            setCompanies(fetchedCompanies);
            setSelectedGroups(new Set(access.groupIds));
            setSelectedCompanies(new Set(access.companyIds));
            setLoading(false);
        };
        loadData();
    }, [workerId]);

    const handleSave = async () => {
        setSaving(true);
        setSuccessMessage('');
        const res = await setWorkerCompanyAccess(workerId, Array.from(selectedGroups), Array.from(selectedCompanies));
        setSaving(false);
        if (res.success) {
            setSuccessMessage('Permisos actualizados correctamente.');
            setTimeout(() => setSuccessMessage(''), 3000);
        }
    };

    const toggleGroup = (id) => {
        const newSet = new Set(selectedGroups);
        if (newSet.has(id)) newSet.delete(id);
        else newSet.add(id);
        setSelectedGroups(newSet);
    };

    const toggleCompany = (id) => {
        const newSet = new Set(selectedCompanies);
        if (newSet.has(id)) newSet.delete(id);
        else newSet.add(id);
        setSelectedCompanies(newSet);
    };

    if (loading) {
        return <div className="text-center p-8 opacity-50" style={{ color: theme.text }}>Cargando permisos...</div>;
    }

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 flex gap-3 text-sm">
                <Shield className="text-blue-500 shrink-0 mt-0.5" size={18} />
                <div style={{ color: theme.textSecondary }}>
                    <p className="font-bold text-blue-600 dark:text-blue-400 mb-1">Control de Acceso</p>
                    <p>Selecciona los grupos de empresas o las empresas específicas a las que este trabajador tendrá acceso para reportar horas y actividades.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Grupos */}
                <div className="rounded-xl border p-4" style={{ borderColor: theme.border, background: isDark ? 'rgba(0,0,0,0.1)' : '#f9fafb' }}>
                    <h4 className="font-bold mb-4 flex items-center gap-2" style={{ color: theme.text }}>
                        <Users size={18} className="text-emerald-500" />
                        Acceso por Grupos
                    </h4>
                    <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                        {groups.map(group => (
                            <label key={group.id} className="flex items-center gap-3 p-3 rounded-lg border cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 transition-colors" style={{ borderColor: theme.border, background: theme.surface }}>
                                <input 
                                    type="checkbox" 
                                    className="w-4 h-4 rounded text-blue-600"
                                    checked={selectedGroups.has(group.id)}
                                    onChange={() => toggleGroup(group.id)}
                                />
                                <div style={{ color: theme.text }}>
                                    <p className="text-sm font-bold">{group.name}</p>
                                    {group.descripcion && <p className="text-xs opacity-60 truncate">{group.descripcion}</p>}
                                </div>
                            </label>
                        ))}
                        {groups.length === 0 && <p className="text-sm opacity-50">No hay grupos creados.</p>}
                    </div>
                </div>

                {/* Empresas Específicas */}
                <div className="rounded-xl border p-4" style={{ borderColor: theme.border, background: isDark ? 'rgba(0,0,0,0.1)' : '#f9fafb' }}>
                    <h4 className="font-bold mb-4 flex items-center gap-2" style={{ color: theme.text }}>
                        <Building2 size={18} className="text-indigo-500" />
                        Acceso Individual a Empresas
                    </h4>
                    <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                        {companies.map(company => {
                            // If user already has access via group, we can indicate it or just disable it.
                            const hasGroupAccess = Boolean(company.group_id && selectedGroups.has(company.group_id));
                            return (
                                <label key={company.id} className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${hasGroupAccess ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:bg-black/5 dark:hover:bg-white/5'}`} style={{ borderColor: theme.border, background: theme.surface }}>
                                    <input 
                                        type="checkbox" 
                                        className="w-4 h-4 rounded text-blue-600"
                                        checked={selectedCompanies.has(company.id) || hasGroupAccess}
                                        disabled={hasGroupAccess}
                                        onChange={() => {
                                            if (!hasGroupAccess) toggleCompany(company.id);
                                        }}
                                    />
                                    <div style={{ color: theme.text }}>
                                        <p className="text-sm font-bold flex items-center gap-2">
                                            {company.name} 
                                            {hasGroupAccess && <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600">Por Grupo</span>}
                                        </p>
                                        <p className="text-xs opacity-60">{company.type}</p>
                                    </div>
                                </label>
                            );
                        })}
                    </div>
                </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t mt-6" style={{ borderColor: theme.border }}>
                {successMessage ? (
                    <span className="text-sm font-bold text-emerald-600 flex items-center gap-2 animate-fade-in">
                        {successMessage}
                    </span>
                ) : <div />}
                
                <button 
                    onClick={handleSave}
                    disabled={saving}
                    className="flex items-center gap-2 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition-colors disabled:opacity-50"
                >
                    <Save size={18} />
                    {saving ? 'Guardando...' : 'Guardar Permisos'}
                </button>
            </div>
        </div>
    );
}
