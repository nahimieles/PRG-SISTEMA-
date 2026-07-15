'use client';

import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, AlertCircle, RefreshCw, Folder } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useTheme } from '../contexts/ThemeContext';
import { lightTheme, darkTheme } from '../lib/colors';

export default function CatalogManager({ session }) {
  const { isDark } = useTheme();
  const theme = isDark ? darkTheme : lightTheme;

  const [activeTab, setActiveTab] = useState('unidades');
  const [data, setData] = useState({
    unidades: [], actividades: [], subactividades: [], incidencias: [], capacitaciones: [], estados: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const tabs = [
    { id: 'unidades', label: 'Unidades de Negocio' },
    { id: 'actividades', label: 'Actividades' },
    { id: 'subactividades', label: 'Subactividades' },
    { id: 'incidencias', label: 'Tipos de Incidencia' },
    { id: 'capacitaciones', label: 'Tipos de Capacitación' },
    { id: 'estados', label: 'Estados' }
  ];

  useEffect(() => { loadCatalogs(); }, []);

  const loadCatalogs = async () => {
    setLoading(true);
    setError(null);
    try {
      const [
        { data: unidades, error: e1 }, { data: actividades, error: e2 },
        { data: subactividades, error: e3 }, { data: incidencias, error: e4 },
        { data: capacitaciones, error: e5 }, { data: estados, error: e6 }
      ] = await Promise.all([
        supabase.from('catalogo_unidades_negocio').select('*').order('orden'),
        supabase.from('catalogo_actividades').select('*, catalogo_unidades_negocio(nombre)').order('orden'),
        supabase.from('catalogo_subactividades').select('*, catalogo_actividades(nombre, catalogo_unidades_negocio(nombre))').order('orden'),
        supabase.from('catalogo_tipos_incidencia').select('*').order('nombre'),
        supabase.from('catalogo_tipos_capacitacion').select('*').order('nombre'),
        supabase.from('catalogo_estados').select('*').order('entidad').order('orden')
      ]);

      if (e1?.code === '42P01') throw new Error('Las tablas de catálogo no existen. Ejecuta las migraciones SQL.');
      if (e1 || e2 || e3 || e4 || e5 || e6) throw new Error('Error al cargar datos. Revisa la consola.');

      setData({
        unidades: unidades || [], actividades: actividades || [], subactividades: subactividades || [],
        incidencias: incidencias || [], capacitaciones: capacitaciones || [], estados: estados || []
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const renderContent = () => {
    if (loading) return <div className="flex justify-center items-center h-48"><RefreshCw className="h-8 w-8 animate-spin" style={{ color: theme.primary }} /></div>;
    if (error) return (
      <div className="p-6 rounded-lg flex items-start gap-3 border" style={{ background: isDark ? '#7f1d1d' : '#fef2f2', borderColor: '#ef4444', color: isDark ? '#fca5a5' : '#991b1b' }}>
        <AlertCircle className="h-6 w-6 shrink-0" />
        <div><h3 className="font-bold">No se pudieron cargar los catálogos</h3><p className="text-sm mt-1">{error}</p></div>
      </div>
    );

    const currentData = data[activeTab] || [];

    return (
      <div className="mt-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold capitalize" style={{ color: theme.text }}>
            {tabs.find(t => t.id === activeTab)?.label}
          </h3>
          <button className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm text-white" style={{ background: theme.primary }}>
            <Plus className="h-4 w-4" /> Nuevo Registro
          </button>
        </div>

        {currentData.length === 0 ? (
          <div className="text-center py-10 rounded-lg border border-dashed" style={{ borderColor: theme.border, background: isDark ? '#1a1a2e' : '#f8f9fa' }}>
            <Folder className="h-10 w-10 mx-auto mb-2 opacity-50" style={{ color: theme.textSecondary }} />
            <p style={{ color: theme.textSecondary }}>No hay registros en este catálogo.</p>
          </div>
        ) : (
          <div className="overflow-x-auto border rounded-lg" style={{ borderColor: theme.border }}>
            <table className="w-full text-left text-sm" style={{ color: theme.text }}>
              <thead style={{ background: isDark ? '#161b22' : '#f8f9fa', borderBottom: `1px solid ${theme.border}` }}>
                <tr>
                  <th className="px-4 py-3 font-medium">Nombre</th>
                  {activeTab === 'actividades' && <th className="px-4 py-3 font-medium">Unidad de Negocio</th>}
                  {activeTab === 'subactividades' && <><th className="px-4 py-3 font-medium">Actividad</th><th className="px-4 py-3 font-medium">Unidad</th></>}
                  {activeTab === 'estados' && <th className="px-4 py-3 font-medium">Entidad</th>}
                  {(activeTab === 'estados' || activeTab === 'incidencias') && <th className="px-4 py-3 font-medium">Color</th>}
                  <th className="px-4 py-3 font-medium">Estado</th>
                  <th className="px-4 py-3 font-medium text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y" style={{ borderColor: theme.border, background: theme.surface }}>
                {currentData.map((item) => (
                  <tr key={item.id} className="transition-colors hover:opacity-90" style={{ background: theme.surface }}>
                    <td className="px-4 py-3 font-medium">{item.nombre}</td>
                    {activeTab === 'actividades' && <td className="px-4 py-3">{item.catalogo_unidades_negocio?.nombre}</td>}
                    {activeTab === 'subactividades' && <><td className="px-4 py-3">{item.catalogo_actividades?.nombre}</td><td className="px-4 py-3">{item.catalogo_actividades?.catalogo_unidades_negocio?.nombre}</td></>}
                    {activeTab === 'estados' && <td className="px-4 py-3 capitalize">{item.entidad}</td>}
                    {(activeTab === 'estados' || activeTab === 'incidencias') && (
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 rounded-full border border-gray-200" style={{ backgroundColor: item.color || '#cccccc' }}></div>
                          <span className="text-xs">{item.color}</span>
                        </div>
                      </td>
                    )}
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium" style={{ background: item.activo ? '#d1fae5' : '#fee2e2', color: item.activo ? '#065f46' : '#991b1b' }}>
                        {item.activo ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button className="p-1.5 rounded-lg transition-colors hover:opacity-70" title="Editar"><Edit2 className="h-4 w-4" style={{ color: theme.primary }} /></button>
                        <button className="p-1.5 rounded-lg transition-colors hover:opacity-70" title="Eliminar"><Trash2 className="h-4 w-4 text-red-500" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="rounded-xl shadow-sm border overflow-hidden" style={{ background: theme.surface, borderColor: theme.border }}>
      <div className="border-b" style={{ borderColor: theme.border, background: isDark ? '#111827' : '#f8f9fa' }}>
        <div className="flex overflow-x-auto p-2 gap-2 hide-scrollbar">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="whitespace-nowrap px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              style={{
                background: activeTab === tab.id ? theme.surface : 'transparent',
                color: activeTab === tab.id ? theme.primary : theme.textSecondary,
                border: activeTab === tab.id ? `1px solid ${theme.border}` : '1px solid transparent',
                boxShadow: activeTab === tab.id ? '0 1px 2px rgba(0,0,0,0.05)' : 'none'
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>
      <div className="p-6">{renderContent()}</div>
    </div>
  );
}
