'use client';

import React, { useState, useEffect } from 'react';
import { Save, AlertCircle, RefreshCw, CheckCircle2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useTheme } from '../contexts/ThemeContext';
import { lightTheme, darkTheme } from '../lib/colors';

export default function SystemSettingsManager({ session }) {
  const { isDark } = useTheme();
  const theme = isDark ? darkTheme : lightTheme;

  const [settings, setSettings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  const [formData, setFormData] = useState({});

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from('system_settings').select('*');
      if (error) {
        if (error.code === '42P01') {
          setMessage({ type: 'warning', text: 'La tabla de configuración aún no existe. Ejecuta las migraciones SQL en Supabase.' });
          setLoading(false);
          return;
        }
        throw error;
      }

      setSettings(data || []);
      const initialData = {};
      data.forEach(s => {
        initialData[s.key] = s.value;
      });
      setFormData(initialData);
    } catch (err) {

      setMessage({ type: 'error', text: 'Error al cargar la configuración.' });
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (key, value, type) => {
    let parsedValue = value;
    if (type === 'number') parsedValue = Number(value);
    if (type === 'boolean') parsedValue = value === 'true';

    setFormData(prev => ({
      ...prev,
      [key]: parsedValue
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const updates = Object.keys(formData).map(key => ({
        key,
        value: formData[key],
        updated_at: new Date().toISOString(),
        updated_by: session?.id
      }));

      const { error } = await supabase
        .from('system_settings')
        .upsert(updates, { onConflict: 'key' });

      if (error) throw error;

      setMessage({ type: 'success', text: 'Configuración guardada correctamente.' });
      loadSettings();
    } catch (err) {

      setMessage({ type: 'error', text: 'Error al guardar la configuración.' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <RefreshCw className="animate-spin h-8 w-8" style={{ color: theme.primary }} />
      </div>
    );
  }

  if (settings.length === 0 && message?.type !== 'warning') {
    return (
      <div className="p-6 rounded-lg text-center" style={{ background: isDark ? '#1a1a2e' : '#f0f4f8', color: theme.text }}>
        <p>No hay parámetros de configuración disponibles. Verifica que los SEEDS se hayan ejecutado.</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl shadow-sm border p-6" style={{ background: theme.surface, borderColor: theme.border }}>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-xl font-bold" style={{ color: theme.text }}>Configuración del Sistema</h2>
          <p className="text-sm mt-1" style={{ color: theme.textSecondary }}>
            Administra los parámetros globales que rigen el comportamiento del sistema.
          </p>
        </div>
        <button 
          onClick={handleSave}
          disabled={saving || message?.type === 'warning'}
          className="flex items-center gap-2 px-4 py-2 rounded-lg transition-colors disabled:opacity-50 text-white"
          style={{ background: theme.primary }}
        >
          {saving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Guardar Cambios
        </button>
      </div>

      {message && (
        <div className="mb-6 p-4 rounded-lg flex items-center gap-3 border" style={{ 
          background: message.type === 'success' ? (isDark ? '#064e3b' : '#ecfdf5') : 
                      message.type === 'warning' ? (isDark ? '#78350f' : '#fffbeb') : 
                      (isDark ? '#7f1d1d' : '#fef2f2'),
          borderColor: message.type === 'success' ? '#10b981' : message.type === 'warning' ? '#f59e0b' : '#ef4444',
          color: message.type === 'success' ? (isDark ? '#34d399' : '#065f46') : 
                 message.type === 'warning' ? (isDark ? '#fbbf24' : '#92400e') : 
                 (isDark ? '#f87171' : '#991b1b')
        }}>
          {message.type === 'success' ? <CheckCircle2 className="h-5 w-5" /> : <AlertCircle className="h-5 w-5" />}
          <p>{message.text}</p>
        </div>
      )}

      {message?.type !== 'warning' && (
        <div className="space-y-6">
          <div className="p-5 rounded-lg border" style={{ background: isDark ? '#1a1a2e' : '#f8f9fa', borderColor: theme.border }}>
            <h3 className="text-lg font-semibold mb-4" style={{ color: theme.text }}>Políticas de Jornada Laboral</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: theme.text }}>
                  Horas de Jornada Diaria Estándar
                </label>
                <input 
                  type="number" 
                  value={formData['WORK_HOURS_PER_DAY'] || ''}
                  onChange={(e) => handleChange('WORK_HOURS_PER_DAY', e.target.value, 'number')}
                  className="w-full border rounded-lg p-2.5"
                  style={{ background: theme.background, color: theme.text, borderColor: theme.border }}
                  min="1"
                  max="24"
                />
                <p className="text-xs mt-1" style={{ color: theme.textSecondary }}>Usado como base para calcular el % de cumplimiento.</p>
              </div>
            </div>
          </div>

          <div className="p-5 rounded-lg border" style={{ background: isDark ? '#1a1a2e' : '#f8f9fa', borderColor: theme.border }}>
            <h3 className="text-lg font-semibold mb-4" style={{ color: theme.text }}>Políticas de Vacaciones</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: theme.text }}>
                  Días de Vacaciones por Año
                </label>
                <input 
                  type="number" 
                  value={formData['VACATION_DAYS_YEAR'] || ''}
                  onChange={(e) => handleChange('VACATION_DAYS_YEAR', e.target.value, 'number')}
                  className="w-full border rounded-lg p-2.5"
                  style={{ background: theme.background, color: theme.text, borderColor: theme.border }}
                  min="0"
                />
                <p className="text-xs mt-1" style={{ color: theme.textSecondary }}>Cantidad de días generados por cada año de trabajo.</p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: theme.text }}>
                  Acumulación de Vacaciones
                </label>
                <select 
                  value={formData['ALLOW_VACATION_ROLLOVER'] === true ? 'true' : 'false'}
                  onChange={(e) => handleChange('ALLOW_VACATION_ROLLOVER', e.target.value, 'boolean')}
                  className="w-full border rounded-lg p-2.5"
                  style={{ background: theme.background, color: theme.text, borderColor: theme.border }}
                >
                  <option value="true">Permitir acumular días de años anteriores</option>
                  <option value="false">Los días no utilizados expiran al final del período</option>
                </select>
                <p className="text-xs mt-1" style={{ color: theme.textSecondary }}>Política de expiración de saldos.</p>
              </div>
            </div>
          </div>

          <div className="p-5 rounded-lg border" style={{ background: isDark ? '#1a1a2e' : '#f8f9fa', borderColor: theme.border }}>
            <h3 className="text-lg font-semibold mb-4" style={{ color: theme.text }}>Personalización de UI</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: theme.text }}>
                  Color Primario
                </label>
                <div className="flex items-center gap-3">
                  <input 
                    type="color" 
                    value={formData['PRIMARY_COLOR_HEX']?.replace(/"/g, '') || '#3498db'}
                    onChange={(e) => handleChange('PRIMARY_COLOR_HEX', `"${e.target.value}"`, 'string')}
                    className="h-10 w-20 border rounded-lg cursor-pointer"
                    style={{ borderColor: theme.border, background: theme.background }}
                  />
                  <span className="text-sm" style={{ color: theme.textSecondary }}>{formData['PRIMARY_COLOR_HEX']?.replace(/"/g, '') || '#3498db'}</span>
                </div>
              </div>
            </div>
          </div>

        </div>
      )}
    </div>
  );
}
