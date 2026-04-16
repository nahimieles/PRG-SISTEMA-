'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '../../lib/supabase';
import { useTheme } from '../../contexts/ThemeContext';
import { lightTheme, darkTheme } from '../../lib/colors';
import { Plus, Settings, Eye, Trash2, ClipboardList, Users, ArrowLeft, RefreshCw, Settings2 } from 'lucide-react';
import Toast from '../Toast';
import { getAdminSession } from '../../lib/auth';
import SurveyDashboard from './SurveyDashboard';
import SurveyEditor from './SurveyEditor';
import { createSurveyAction, updateSurveyStatusAction, deleteSurveyAction } from '../../lib/actions';

export default function RecruitmentManager() {
  const { isDark } = useTheme();
  const theme = isDark ? darkTheme : lightTheme;

  const [surveys, setSurveys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSurvey, setSelectedSurvey] = useState(null);
  const [editingSurveyId, setEditingSurveyId] = useState(null);
  const [message, setMessage] = useState(null);

  // New Survey Modal States
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newSurveyTitle, setNewSurveyTitle] = useState('');
  const [newSurveyDesc, setNewSurveyDesc] = useState('');
  const [creating, setCreating] = useState(false);
  const [headerPortalNode, setHeaderPortalNode] = useState(null);

  const showToast = (text, type = 'success') => {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), 3000);
  };

  const loadSurveys = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('recruitment_surveys')
        .select(`
          id, title, description, is_active, created_at, access_token, version,
          recruitment_candidates (count)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSurveys(data || []);
    } catch (err) {
      console.error(err);
      showToast('Error al cargar entrevistas', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSurveys();
    setHeaderPortalNode(document.getElementById('interview-header-portal'));
  }, []);

  const handleCreateSurvey = async (e) => {
    e.preventDefault();
    if (!newSurveyTitle.trim()) {
       showToast('El título es obligatorio', 'error');
       return;
    }
    setCreating(true);
    try {
      const token = 'tkn_' + Math.random().toString(36).substr(2, 9) + Math.random().toString(36).substr(2, 9) + Math.random().toString(36).substr(2, 9);
          is_active: true
      }, getAdminSession()?.id);
        
      if (!res.success) throw new Error(res.error);
      
      showToast('Entrevista creada exitosamente.');
      setShowCreateModal(false);
      setNewSurveyTitle('');
      setNewSurveyDesc('');
      loadSurveys();
      setEditingSurveyId(res.data.id); // Dirigir al usuario al editor inmediatamente
    } catch (err) {
      showToast('Error al crear: ' + err.message, 'error');
    } finally {
      setCreating(false);
    }
  };

  const handleToggleActive = async (id, currentStatus) => {
    try {
      const res = await updateSurveyStatusAction(id, !currentStatus, getAdminSession()?.id);
      if (!res.success) throw new Error(res.error);
      
      setSurveys(surveys.map(s => s.id === id ? { ...s, is_active: !currentStatus } : s));
      showToast(currentStatus ? 'Entrevista desactivada' : 'Entrevista activada');
    } catch (err) {
      showToast('Error al actualizar: ' + err.message, 'error');
    }
  };

  const handleDelete = async (id) => {
    try {
      const res = await deleteSurveyAction(id, getAdminSession()?.id);
      
      if (!res.success) throw new Error(res.error);
      showToast('Entrevista eliminada');
      setSurveys(surveys.filter(s => s.id !== id));
    } catch (err) {
      showToast('Error al eliminar: ' + err.message, 'error');
    }
  };

  const handleEditConfig = (id) => {
      setEditingSurveyId(id);
  };

  if (editingSurveyId) {
     return <SurveyEditor surveyId={editingSurveyId} onBack={() => { setEditingSurveyId(null); loadSurveys(); }} headerPortalNode={headerPortalNode} />;
  }

  if (selectedSurvey) {
    return (
      <div className="space-y-4">
        <SurveyDashboard survey={selectedSurvey} onUpdate={loadSurveys} onBack={() => setSelectedSurvey(null)} headerPortalNode={headerPortalNode} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {message && <Toast message={message.text} type={message.type} onClose={() => setMessage(null)} />}

      {/* Render the unified header via Portal into the layout's top bar */}
      {headerPortalNode && createPortal(
        <div className="flex justify-between items-center w-full">
          <div>
            <h2 className="text-xl font-bold flex items-center gap-2" style={{ color: theme.text }}>
              <ClipboardList className="w-5 h-5 text-blue-500" /> Entrevistas
            </h2>
            <p className="text-sm" style={{ color: theme.textSecondary }}>Gestión de entrevistas y revisión de candidatos</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={loadSurveys}
              className="p-2 rounded-lg hover:opacity-80 transition"
              style={{ border: `1px solid ${theme.border}`, color: theme.text }}
              disabled={loading}
              title="Refrescar"
            >
              <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
            </button>
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-white font-medium hover:opacity-90 shadow-sm transition"
              style={{ background: '#3498db' }}
            >
              <Plus size={18} /> <span className="hidden sm:inline">Nueva Entrevista</span>
            </button>
          </div>
        </div>
      , headerPortalNode)}



      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex justify-center items-center p-4">
          <div className="rounded-xl max-w-md w-full p-6 shadow-xl animate-fade-in border" style={{ background: theme.surface, borderColor: theme.border }}>
             <h3 className="text-xl font-bold mb-4" style={{ color: theme.text }}>Crear Nueva Entrevista</h3>
             <form onSubmit={handleCreateSurvey} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold mb-1" style={{ color: theme.textSecondary }}>Título *</label>
                  <input 
                    type="text" 
                    required
                    placeholder="Ej. Entrevista Frontend Developer"
                    value={newSurveyTitle}
                    onChange={e => setNewSurveyTitle(e.target.value)}
                    className="w-full p-2.5 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500 bg-transparent"
                    style={{ borderColor: theme.border, color: theme.text }}
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1" style={{ color: theme.textSecondary }}>Descripción (Opcional)</label>
                  <textarea 
                    placeholder="Breve instrucción para el candidato..."
                    rows={3}
                    value={newSurveyDesc}
                    onChange={e => setNewSurveyDesc(e.target.value)}
                    className="w-full p-2.5 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500 bg-transparent resize-none"
                    style={{ borderColor: theme.border, color: theme.text }}
                  />
                </div>
                <div className="flex gap-3 justify-end pt-4">
                  <button 
                    type="button" 
                    onClick={() => setShowCreateModal(false)}
                    className="px-4 py-2 rounded-lg border font-medium hover:bg-black/5 dark:hover:bg-white/5 transition"
                    style={{ borderColor: theme.border, color: theme.text }}
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit" 
                    disabled={creating}
                    className="px-4 py-2 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 transition shadow-sm disabled:opacity-50"
                  >
                    {creating ? 'Creando...' : 'Crear Entrevista'}
                  </button>
                </div>
             </form>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading && surveys.length === 0 ? (
          <div className="col-span-full text-center py-10">Cargando entrevistas...</div>
        ) : surveys.length === 0 ? (
          <div className="col-span-full text-center py-10" style={{ color: theme.textSecondary }}>
            No hay entrevistas creadas. ¡Comienza creando una!
          </div>
        ) : (
          surveys.map(survey => (
            <div key={survey.id} className="rounded-xl shadow-md overflow-hidden flex flex-col border" style={{ borderColor: theme.border, background: theme.surface }}>
              {/* Header Card */}
              <div className="p-5 flex-1 relative">
                <div className="absolute top-4 right-4 flex gap-2 items-center">
                  <span className={`px-2 py-1 text-[10px] font-bold rounded-md uppercase ${survey.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {survey.is_active ? 'Activa' : 'Inactiva'}
                  </span>
                </div>
                <h3 className="font-bold text-lg mb-1 pr-16 truncate" style={{ color: theme.primary }}>{survey.title}</h3>
                <p className="text-xs mb-4 line-clamp-2 min-h-[32px]" style={{ color: theme.textSecondary }}>
                  {survey.description || 'Sin descripción'}
                </p>
                
                <div className="flex items-center gap-4 text-sm mt-3">
                  <div className="flex items-center gap-1.5 font-medium" style={{ color: theme.textSecondary }}>
                    <Users size={16} /> 
                    {survey.recruitment_candidates?.[0]?.count || 0} Candidatos
                  </div>
                </div>
              </div>
              
              {/* Actions Card */}
              <div className="p-3 border-t grid grid-cols-2 gap-2" style={{ borderColor: theme.border, background: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)' }}>
                <button
                  onClick={() => setSelectedSurvey(survey)}
                  className="flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg bg-blue-500 text-white font-medium text-xs hover:bg-blue-600 transition"
                >
                  <Eye size={14} /> Ver Panel
                </button>
                <div className="flex gap-2 justify-end">
                  <label className="flex items-center cursor-pointer mr-2 ml-1" title={survey.is_active ? "Desactivar" : "Activar"}>
                     <div className="relative">
                       <input type="checkbox" className="sr-only" checked={survey.is_active} onChange={() => handleToggleActive(survey.id, survey.is_active)} />
                       <div className={`block w-10 h-6 rounded-full transition ${survey.is_active ? 'bg-green-500' : isDark ? 'bg-gray-600' : 'bg-gray-300'}`}></div>
                       <div className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition transform ${survey.is_active ? 'translate-x-4' : 'translate-x-0'}`}></div>
                     </div>
                  </label>

                  <button
                    onClick={() => handleEditConfig(survey.id)}
                    title="Editar Entrevista"
                    className={`p-1.5 rounded-md transition ${isDark ? 'hover:bg-white/10' : 'hover:bg-black/10'}`}
                    style={{ color: theme.textSecondary }}
                  >
                    <Settings2 size={16} />
                  </button>
                  <button
                    onClick={() => handleDelete(survey.id)}
                    title="Eliminar Entrevista"
                    className="p-1.5 rounded-md hover:bg-red-100 hover:text-red-600 transition"
                    style={{ color: theme.textSecondary }}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
