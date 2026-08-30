'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { Plus, Clock, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { lightTheme, darkTheme } from '@/lib/colors';
import CustomDatePicker from './CustomDatePicker';

export default function ActivityLogger() {
  const { isDark } = useTheme();
  const theme = isDark ? darkTheme : lightTheme;

  const [activities, setActivities] = useState(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('prg_manual_activities');
        return stored ? JSON.parse(stored) : [];
      } catch { return []; }
    }
    return [];
  });

  const [showForm, setShowForm] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [newActivity, setNewActivity] = useState({
    system: '',
    hours: '',
    description: '',
    date: new Date().toISOString().slice(0, 10),
  });

  const saveActivities = useCallback((data) => {
    setActivities(data);
    if (typeof window !== 'undefined') {
      localStorage.setItem('prg_manual_activities', JSON.stringify(data));
    }
  }, []);

  const handleAdd = (e) => {
    e.preventDefault();
    if (!newActivity.system || !newActivity.hours) return;

    const entry = {
      id: Date.now().toString(),
      system: newActivity.system,
      hours: parseFloat(newActivity.hours),
      description: newActivity.description,
      date: newActivity.date,
      createdAt: new Date().toISOString(),
    };

    const updated = [entry, ...activities];
    saveActivities(updated);
    setNewActivity({ system: '', hours: '', description: '', date: new Date().toISOString().slice(0, 10) });
    setShowForm(false);
  };

  const handleDelete = (id) => {
    saveActivities(activities.filter(a => a.id !== id));
  };

  const totalHours = useMemo(() => activities.reduce((s, a) => s + a.hours, 0), [activities]);

  const quickSystems = ['Contifico', 'Perseo', 'SRI', 'IESS', 'Reunión', 'Otro'];

  return (
    <div className="rounded-2xl overflow-hidden" style={{
      background: theme.surface,
      border: `1px solid ${theme.border}`,
      boxShadow: isDark ? '0 1px 4px rgba(0,0,0,0.3)' : '0 1px 8px rgba(0,0,0,0.05)',
    }}>
      {}
      <div className="px-5 py-4 flex justify-between items-center" style={{ borderBottom: `1px solid ${theme.border}` }}>
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{
            background: isDark ? 'rgba(168,85,247,0.15)' : '#f3e8ff',
          }}>
            <Clock className="w-4 h-4" style={{ color: '#a855f7' }} />
          </div>
          <div>
            <h3 className="text-sm font-bold tracking-tight" style={{ color: theme.text, letterSpacing: '-0.02em' }}>
              Registro de Actividades Manuales
            </h3>
            <p className="text-[11px]" style={{ color: theme.textSecondary }}>
              {activities.length} actividades • {totalHours.toFixed(1)}h registradas
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full transition-all"
            style={{
              background: showForm ? (isDark ? 'rgba(168,85,247,0.15)' : '#f3e8ff') : 'transparent',
              color: showForm ? '#a855f7' : theme.textSecondary,
              border: `1px solid ${showForm ? (isDark ? 'rgba(168,85,247,0.3)' : '#e9d5ff') : theme.border}`,
            }}
          >
            <Plus className="w-3.5 h-3.5" />
            Registrar
          </button>
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="w-7 h-7 flex items-center justify-center rounded-full transition-all"
            style={{
              background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
              color: theme.textSecondary,
            }}
          >
            {isCollapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
          </button>
        </div>
      </div>

      {!isCollapsed && (
        <>
          {}
          {showForm && (
            <form onSubmit={handleAdd} className="px-5 py-4 space-y-3 animate-fade-in" style={{
              background: isDark ? 'rgba(255,255,255,0.01)' : 'rgba(0,0,0,0.01)',
              borderBottom: `1px solid ${theme.border}`,
            }}>
              {}
              <div className="flex flex-wrap gap-1.5">
                {quickSystems.map(sys => (
                  <button
                    key={sys}
                    type="button"
                    onClick={() => setNewActivity(a => ({ ...a, system: sys }))}
                    className="px-3 py-1 text-[11px] font-semibold rounded-full transition-all"
                    style={{
                      background: newActivity.system === sys
                        ? (isDark ? 'rgba(168,85,247,0.2)' : '#f3e8ff')
                        : (isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)'),
                      color: newActivity.system === sys ? '#a855f7' : theme.textSecondary,
                      border: `1px solid ${newActivity.system === sys ? (isDark ? 'rgba(168,85,247,0.3)' : '#e9d5ff') : 'transparent'}`,
                    }}
                  >
                    {sys}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <input
                  type="text"
                  placeholder="Sistema / Actividad"
                  value={newActivity.system}
                  onChange={(e) => setNewActivity(a => ({ ...a, system: e.target.value }))}
                  className="px-3 py-2 text-sm rounded-xl outline-none"
                  style={{
                    background: isDark ? 'rgba(255,255,255,0.05)' : '#fff',
                    border: `1px solid ${theme.border}`,
                    color: theme.text,
                  }}
                  required
                />
                <input
                  type="number"
                  placeholder="Horas"
                  step="0.5"
                  min="0.5"
                  max="24"
                  value={newActivity.hours}
                  onChange={(e) => setNewActivity(a => ({ ...a, hours: e.target.value }))}
                  className="px-3 py-2 text-sm rounded-xl outline-none"
                  style={{
                    background: isDark ? 'rgba(255,255,255,0.05)' : '#fff',
                    border: `1px solid ${theme.border}`,
                    color: theme.text,
                  }}
                  required
                />
                <CustomDatePicker
                  value={newActivity.date}
                  onChange={(val) => setNewActivity(a => ({ ...a, date: val }))}
                  className="px-3 py-2 text-sm rounded-xl outline-none"
                  style={{
                    background: isDark ? 'rgba(255,255,255,0.05)' : '#fff',
                    border: `1px solid ${theme.border}`,
                    color: theme.text,
                  }}
                />
              </div>

              <div className="flex gap-3">
                <input
                  type="text"
                  placeholder="Descripción (opcional)"
                  value={newActivity.description}
                  onChange={(e) => setNewActivity(a => ({ ...a, description: e.target.value }))}
                  className="flex-1 px-3 py-2 text-sm rounded-xl outline-none"
                  style={{
                    background: isDark ? 'rgba(255,255,255,0.05)' : '#fff',
                    border: `1px solid ${theme.border}`,
                    color: theme.text,
                  }}
                />
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold rounded-xl text-white transition-all"
                  style={{ background: '#a855f7' }}
                >
                  Guardar
                </button>
              </div>
            </form>
          )}

          {}
          <div className="overflow-y-auto" style={{ maxHeight: '16rem' }}>
            {activities.length === 0 ? (
              <div className="text-center py-8 px-6">
                <p className="text-xs" style={{ color: theme.textSecondary, opacity: 0.5 }}>
                  Sin actividades manuales registradas
                </p>
              </div>
            ) : (
              <div className="divide-y" style={{ borderColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)' }}>
                {activities.slice(0, 10).map((activity) => (
                  <div key={activity.id} className="group flex items-center justify-between px-5 py-2.5 transition-colors hover:bg-black/[0.02] dark:hover:bg-white/[0.02]">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 text-xs font-bold text-white"
                        style={{ background: '#a855f7' }}
                      >
                        {activity.hours}h
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold truncate" style={{ color: theme.text }}>{activity.system}</p>
                        <p className="text-[11px] truncate" style={{ color: theme.textSecondary }}>
                          {activity.description || 'Sin descripción'} • {new Date(activity.date).toLocaleDateString('es-EC')}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDelete(activity.id)}
                      className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg transition-all"
                      style={{ color: '#ef4444', background: isDark ? 'rgba(239,68,68,0.1)' : 'rgba(239,68,68,0.06)' }}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
