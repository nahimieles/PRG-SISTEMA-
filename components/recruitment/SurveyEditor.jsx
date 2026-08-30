'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '../../lib/supabase';
import { ArrowLeft, Plus, GripVertical, Trash2, Save, AlignLeft, CheckSquare, GitCommit } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { lightTheme, darkTheme } from '../../lib/colors';
import Toast from '../Toast';
import CustomSelect from '../CustomSelect';
import { getAdminSession } from '../../lib/auth';
import { saveSurveyQuestionsAction, getSurveyQuestionsAction } from '../../lib/actions';

export default function SurveyEditor({ surveyId, onBack, headerPortalNode }) {
  const { isDark } = useTheme();
  const theme = isDark ? darkTheme : lightTheme;

  const [survey, setSurvey] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  const [draggedIdx, setDraggedIdx] = useState(null);

  const showToast = (text, type = 'success') => {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), 3000);
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data: sData, error: sErr } = await supabase
          .from('recruitment_surveys')
          .select('*')
          .eq('id', surveyId)
          .single();
        if (sErr) throw sErr;

        const parentId = sData.parent_survey_id || sData.id;
        const qRes = await getSurveyQuestionsAction(surveyId, parentId);

        if (!qRes.success) {
           throw new Error(qRes.error || 'Failed to fetch questions');
        }

        setSurvey(sData);
        setQuestions(qRes.questions);
      } catch (err) {

        showToast('Error cargando prueba: ' + err.message, 'error');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [surveyId]);

  const handleAddQuestion = () => {
    const newQ = {
      id: 'temp_' + Date.now(),
      survey_id: surveyId,
      text: 'Nueva Pregunta',
      type: 'text',
      is_required: true,
      options: null,
      order_index: questions.length + 1,
      isNew: true
    };
    setQuestions([...questions, newQ]);
  };

  const handleQuestionChange = (id, field, value) => {
    setQuestions(prev => prev.map(q => q.id === id ? { ...q, [field]: value } : q));
  };

  const handleDeleteQuestion = (id) => {
    setQuestions(questions.filter(q => q.id !== id));
  };

  const moveQuestion = (index, direction) => {
    if (direction === 'up' && index > 0) {
      const newQs = [...questions];
      const temp = newQs[index];
      newQs[index] = newQs[index - 1];
      newQs[index - 1] = temp;
      setQuestions(newQs);
    } else if (direction === 'down' && index < questions.length - 1) {
      const newQs = [...questions];
      const temp = newQs[index];
      newQs[index] = newQs[index + 1];
      newQs[index + 1] = temp;
      setQuestions(newQs);
    }
  };

  const handleDragStart = (e, index) => {
    setDraggedIdx(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e, index) => {
    e.preventDefault(); 
  };

  const handleDrop = (e, index) => {
    e.preventDefault();
    if (draggedIdx === null || draggedIdx === index) return;

    setQuestions(prev => {
      const newQs = [...prev];
      const items = newQs.splice(draggedIdx, 1);
      newQs.splice(index, 0, items[0]);
      return newQs;
    });
    setDraggedIdx(null);
  };

  const handleSave = async () => {
    setSaving(true);
    try {

      const { data: newSurveyId, error: sErr } = await supabase.rpc('create_new_survey_version', {
        p_old_survey_id: surveyId,
        p_title: survey.title,
        p_description: survey.description
      });

      if (sErr) throw sErr;

      if (questions.length > 0) {
        const inserts = questions.map((q, idx) => ({
           survey_id: newSurveyId,
           text: q.text,
           type: q.type,
           is_required: q.is_required,
           options: q.options,
           order_index: idx + 1
        }));
        const res = await saveSurveyQuestionsAction(inserts, getAdminSession()?.id);
        if (!res.success) throw new Error(res.error);
      }

      const { data: newlyCreatedSurvey } = await supabase
        .from('recruitment_surveys')
        .select('*')
        .eq('id', newSurveyId)
        .single();

      if (newlyCreatedSurvey) {
        setSurvey(newlyCreatedSurvey);

      }
      showToast('Prueba guardada y nueva versión creada correctamente.');
      setTimeout(() => {
        onBack(); 
      }, 1500);
    } catch (err) {

      showToast('Error al guardar: ' + err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-10 flex flex-col items-center justify-center">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
    <span style={{ color: theme.textSecondary }}>Cargando editor de prueba...</span>
  </div>;

  if (!survey) return <div className="p-10 text-center text-red-500 bg-red-50 border border-red-200 rounded-xl m-4">
    <h3 className="text-lg font-bold mb-2">Error Crítico: No se pudo cargar la prueba</h3>
    <p className="text-sm text-gray-700">Verifica que haya conexion con la base de datos y que las politicas RLS permitan la lectura.</p>
  </div>;

  return (
    <div className="space-y-6 animate-fade-in relative">
      <style>{`.main-page-header { display: none !important; }`}</style>
      {message && <Toast message={message.text} type={message.type} onClose={() => setMessage(null)} />}

      {headerPortalNode ? createPortal(
         <div className="flex justify-between items-center w-full">
           <button 
             onClick={onBack}
             className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition font-medium text-sm"
             style={{ color: theme.textSecondary }}
           >
             <ArrowLeft size={16} /> Volver
           </button>

           <button 
             onClick={handleSave}
             disabled={saving}
             className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition shadow-sm font-medium"
           >
             <Save size={18} /> <span className="hidden sm:inline">{saving ? 'Guardando...' : 'Guardar Cambios'}</span>
           </button>
         </div>
      , headerPortalNode) : (
         <div className="flex justify-between items-center border-b pb-4 mb-4" style={{ borderColor: theme.border }}>
           <button onClick={onBack} className="flex items-center gap-2 hover:opacity-70 transition font-medium text-sm" style={{ color: theme.textSecondary }}>
             <ArrowLeft size={16} /> Volver
           </button>
           <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition shadow-sm font-medium">
             <Save size={18} /> {saving ? 'Guardando...' : 'Guardar Cambios'}
           </button>
         </div>
      )}

      <div className="space-y-4 max-w-4xl">
        <div className="p-5 rounded-xl border space-y-4" style={{ borderColor: theme.border, background: theme.surface }}>
           <div>
             <label className="block text-sm font-bold mb-1" style={{ color: theme.textSecondary }}>Título de la Prueba</label>
             <input 
               type="text" 
               className="w-full p-2 border rounded-md outline-none focus:ring-2 focus:ring-blue-500 bg-transparent text-xl font-bold"
               style={{ borderColor: theme.border, color: theme.text }}
               value={survey.title}
               onChange={e => setSurvey({...survey, title: e.target.value})}
             />
           </div>
           <div>
             <label className="block text-sm font-bold mb-1" style={{ color: theme.textSecondary }}>Descripción</label>
             <textarea 
               className="w-full p-2 border rounded-md outline-none focus:ring-2 focus:ring-blue-500 bg-transparent resize-y"
               style={{ borderColor: theme.border, color: theme.text }}
               rows={2}
               value={survey.description || ''}
               onChange={e => setSurvey({...survey, description: e.target.value})}
             />
           </div>
           <div className="text-xs" style={{ color: theme.textSecondary }}>
             Versión actual: {survey.version}. Al guardar cambios, la versión aumentará para no afectar respuestas previas.
           </div>
        </div>

        <div className="flex justify-between items-center mt-8 mb-4">
          <h3 className="text-lg font-bold" style={{ color: theme.text }}>Preguntas</h3>
          <button 
           onClick={handleAddQuestion}
           className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium border rounded-md hover:bg-black/5 dark:hover:bg-white/5 transition"
           style={{ borderColor: theme.border, color: theme.text }}
          >
            <Plus size={16} /> Añadir Pregunta
          </button>
        </div>

        {questions.length === 0 && (
          <div className="p-10 border border-dashed rounded-xl text-center" style={{ borderColor: theme.border, color: theme.textSecondary }}>
             No hay preguntas todavía. Añade la primera.
          </div>
        )}

        <div className="space-y-4">
          {questions.map((q, index) => (
            <div 
               key={q.id} 
               draggable
               onDragStart={(e) => handleDragStart(e, index)}
               onDragOver={(e) => handleDragOver(e, index)}
               onDrop={(e) => handleDrop(e, index)}
               className={`flex gap-4 p-4 border rounded-xl shadow-sm transition ${draggedIdx === index ? 'opacity-50' : 'opacity-100'} cursor-move`} 
               style={{ borderColor: theme.border, background: theme.surface }}
            >
               {}
               <div className="flex flex-col items-center justify-center gap-2 border-r pr-4" style={{ borderColor: theme.border }}>
                  <GripVertical size={20} style={{ color: theme.textSecondary }} className="mb-2" />
                  <span className="font-bold text-lg" style={{ color: theme.textSecondary }}>{index + 1}</span>
               </div>

               {}
               <div className="flex-1 space-y-4">
                 <div className="flex justify-between gap-4">
                    <input 
                      type="text" 
                      className="flex-1 p-2 border-b-2 border-transparent hover:border-gray-200 focus:border-blue-500 bg-transparent outline-none text-lg font-semibold transition"
                      style={{ color: theme.text }}
                      value={q.text}
                      placeholder="Escribe la pregunta aquí..."
                      onChange={e => handleQuestionChange(q.id, 'text', e.target.value)}
                    />
                    <CustomSelect 
                      value={q.type}
                      onChange={val => {
                        const newType = val;
                        const needsOptions = ['multiple_choice', 'checkbox', 'dropdown', 'multi_text'].includes(newType);
                        const newOpts = newType === 'scale' ? { min: 1, max: 5 } : needsOptions ? ['Opción 1'] : null;
                        handleQuestionChange(q.id, 'type', newType);
                        handleQuestionChange(q.id, 'options', newOpts);
                      }}
                      options={[
                        {value: 'text', label: 'Texto Abierto'},
                        {value: 'multi_text', label: 'Campos Múltiples (Textos cortos)'},
                        {value: 'multiple_choice', label: 'Opciones (Selección Única)'},
                        {value: 'dropdown', label: 'Lista Desplegable'},
                        {value: 'checkbox', label: 'Opciones (Selección Múltiple)'},
                        {value: 'scale', label: 'Escala Numérica'}
                      ]}
                    />
                 </div>

                 {}
                 {['multiple_choice', 'checkbox', 'dropdown', 'multi_text'].includes(q.type) && (
                   <div className="pl-4 border-l-2 border-blue-500 space-y-2">
                     <p className="text-xs font-bold text-gray-500 uppercase mb-2">{q.type === 'multi_text' ? 'Campos / Etiquetas' : 'Opciones'}</p>
                     {(q.options || []).map((opt, optIdx) => (
                       <div key={optIdx} className="flex gap-2 items-center">
                         <div className="w-4 h-4 rounded-full border border-gray-400" />
                         <input 
                           type="text" 
                           value={opt} 
                           className="flex-1 p-1 bg-transparent border-b border-dashed border-gray-300 focus:border-blue-500 outline-none text-sm"
                           style={{ color: theme.text }}
                           onChange={e => {
                             const newOpts = [...q.options];
                             newOpts[optIdx] = e.target.value;
                             handleQuestionChange(q.id, 'options', newOpts);
                           }}
                         />
                         <button 
                           onClick={() => {
                             const newOpts = [...q.options];
                             newOpts.splice(optIdx, 1);
                             handleQuestionChange(q.id, 'options', newOpts);
                           }}
                           className="text-red-400 hover:text-red-500 p-1"
                         ><Trash2 size={14}/></button>
                       </div>
                     ))}
                     <button 
                       onClick={() => {
                         const newOpts = [...(q.options || []), `Nueva Opción ${(q.options?.length||0)+1}`];
                         handleQuestionChange(q.id, 'options', newOpts);
                       }}
                       className="text-sm text-blue-500 hover:underline mt-2 inline-block font-medium"
                     >+ Añadir Opción</button>
                   </div>
                 )}

                 {q.type === 'scale' && (
                   <div className="pl-4 border-l-2 border-green-500 space-y-2 flex gap-4 items-center">
                     <div>
                       <label className="text-xs font-bold text-gray-500 uppercase block">Valor Mínimo</label>
                       <input type="number" value={q.options?.min || 1} 
                         onChange={e => handleQuestionChange(q.id, 'options', { ...q.options, min: Number(e.target.value) })}
                         className="w-20 p-1 border rounded bg-transparent mt-1" style={{ borderColor: theme.border, color: theme.text }}
                       />
                     </div>
                     <div>
                       <label className="text-xs font-bold text-gray-500 uppercase block">Valor Máximo</label>
                       <input type="number" value={q.options?.max || 5} 
                         onChange={e => handleQuestionChange(q.id, 'options', { ...q.options, max: Number(e.target.value) })}
                         className="w-20 p-1 border rounded bg-transparent mt-1" style={{ borderColor: theme.border, color: theme.text }}
                       />
                     </div>
                   </div>
                 )}

               </div>

               {}
               <div className="flex flex-col items-end justify-between border-l pl-4" style={{ borderColor: theme.border }}>
                  <button 
                    onClick={() => handleDeleteQuestion(q.id)}
                    className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded transition"
                  >
                     <Trash2 size={16} />
                  </button>

                  <label className="flex items-center gap-2 cursor-pointer mt-4">
                     <span className="text-xs font-medium" style={{ color: theme.textSecondary }}>Obligatorio</span>
                     <div className="relative">
                       <input type="checkbox" className="sr-only" checked={q.is_required} onChange={e => handleQuestionChange(q.id, 'is_required', e.target.checked)} />
                       <div className={`block w-8 h-5 rounded-full transition ${q.is_required ? 'bg-blue-500' : 'bg-gray-300 dark:bg-gray-600'}`}></div>
                       <div className={`dot absolute left-1 top-1 bg-white w-3 h-3 rounded-full transition transform ${q.is_required ? 'translate-x-3' : 'translate-x-0'}`}></div>
                     </div>
                  </label>
               </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
