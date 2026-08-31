import { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '../../lib/supabase';
import { useTheme } from '../../contexts/ThemeContext';
import { lightTheme, darkTheme } from '../../lib/colors';
import { Users, Clock, CheckCircle2, XCircle, Search, Eye, Filter, ArrowDown, ArrowUp, ClipboardList, ArrowLeft } from 'lucide-react';
import { getSurveyQuestionsAction, getQuestionsByIdsAction } from '../../lib/actions';
import { getAdminSession } from '../../lib/auth';
import Toast from '../Toast';

export default function SurveyDashboard({ survey, onUpdate, onBack, headerPortalNode }) {
  const { isDark } = useTheme();
  const theme = isDark ? darkTheme : lightTheme;

  const [candidates, setCandidates] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);

  const [sortOrder, setSortOrder] = useState('desc'); 
  const [searchTerm, setSearchTerm] = useState('');

  const [availableVersions, setAvailableVersions] = useState([]);
  const [selectedVersion, setSelectedVersion] = useState('all');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [candidateResponses, setCandidateResponses] = useState([]);
  const [allCandidateResponses, setAllCandidateResponses] = useState({});
  const [loadingDetails, setLoadingDetails] = useState(false);

  const showToast = (text, type = 'success') => {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), 3000);
  };

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        const parentId = survey.parent_survey_id || survey.id;
        const { data: allVersions } = await supabase
          .from('recruitment_surveys')
          .select('id, version, created_at')
          .eq('parent_survey_id', parentId)
          .order('version', { ascending: false });

        setAvailableVersions(allVersions || []);

        const allIds = [parentId, ...(allVersions ? allVersions.map(v => v.id) : [])];

        const { data: cands, error: cErr } = await supabase
          .from('recruitment_candidates')
          .select('*')
          .in('survey_id', allIds)
          .order('created_at', { ascending: false });

        if (cErr) throw cErr;
        setCandidates(cands || []);

        const { data: allQuestions } = await supabase
          .from('recruitment_questions')
          .select('*')
          .in('survey_id', allIds);

        setQuestions(allQuestions || []);

        if (survey.is_graded && cands && cands.length > 0) {
          const candIds = cands.map(c => c.id);
          const { data: allResp } = await supabase
            .from('recruitment_responses')
            .select('*')
            .in('candidate_id', candIds);
            
          const respMap = {};
          (allResp || []).forEach(r => {
             if(!respMap[r.candidate_id]) respMap[r.candidate_id] = [];
             respMap[r.candidate_id].push(r);
          });
          setAllCandidateResponses(respMap);
        }

      } catch (err) {

        setError("No se pudieron cargar los datos del dashboard.");
      } finally {
        setLoading(false);
      }
    };
    fetchDashboardData();
  }, [survey.id]);

  const openCandidateDetail = async (candidate) => {
    setSelectedCandidate(candidate);
    setLoadingDetails(true);
    setCandidateResponses([]);
    try {
      const { data, error } = await supabase
        .from('recruitment_responses')
        .select('*')
        .eq('candidate_id', candidate.id);

      if (error) throw error;
      const responses = data || [];
      setCandidateResponses(responses);

      const missingQIds = [...new Set(responses.map(r => r.question_id).filter(id => !questions.find(q => q.id === id)))];

      if (missingQIds.length > 0) {
        const adminSession = getAdminSession();
        if (adminSession) {
          const res = await getQuestionsByIdsAction(missingQIds, adminSession.id);
          if (res.success && res.questions.length > 0) {
            setQuestions(prev => {
              const existingIds = new Set(prev.map(q => q.id));
              const toAdd = res.questions.filter(q => !existingIds.has(q.id));
              return [...prev, ...toAdd];
            });
          }
        } else {

          const { data: missingQs } = await supabase
            .from('recruitment_questions')
            .select('*')
            .in('id', missingQIds);

          if (missingQs && missingQs.length > 0) {
            setQuestions(prev => {
              const existingIds = new Set(prev.map(q => q.id));
              const toAdd = missingQs.filter(q => !existingIds.has(q.id));
              return [...prev, ...toAdd];
            });
          }
        }
      }
    } catch (err) {
      showToast('Error cargando respuestas', 'error');
    } finally {
      setLoadingDetails(false);
    }
  };

  const stats = useMemo(() => {
    return { 
       total: candidates.length, 
       questions: questions.length 
    };
  }, [candidates, questions]);

  const filteredCandidates = useMemo(() => {
    let result = candidates;

    if (selectedVersion !== 'all') {
      result = result.filter(c => c.survey_id === selectedVersion);
    }

    if (searchTerm) {
      result = result.filter(c => 
        c.full_name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        c.email.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    result = result.sort((a, b) => {
       const dateA = new Date(a.created_at).getTime();
       const dateB = new Date(b.created_at).getTime();
       return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
    });
    return result;
  }, [candidates, sortOrder, searchTerm, selectedVersion]);

  if (loading) return <div className="p-10 text-center flex flex-col items-center">
     <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
     <span>Cargando detalles de la prueba...</span>
  </div>;

  if (error) return <div className="p-10 text-center text-red-500 bg-red-50 border border-red-200 rounded-xl m-4">{error}</div>;

  return (
    <div className="space-y-6 animate-fade-in">
      <style>{`.main-page-header { display: none !important; }`}</style>
      {message && <Toast message={message.text} type={message.type} onClose={() => setMessage(null)} />}

      {headerPortalNode && createPortal(
         <div className="flex items-center gap-3">
           <button 
             onClick={onBack}
             className="p-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition"
             style={{ color: theme.textSecondary }}
             title="Volver"
           >
             <ArrowLeft size={18} />
           </button>
           <div>
             <h2 className="text-xl font-bold flex items-center gap-2" style={{ color: theme.text }}>
               <ClipboardList className="w-5 h-5 text-blue-500" /> Resultados de Prueba
             </h2>
           </div>
         </div>
      , headerPortalNode)}

      {}
      <div className="p-6 rounded-xl shadow-sm border" style={{ borderColor: theme.border, background: theme.surface }}>
        <h2 className="text-2xl font-bold mb-2 text-blue-600">{survey.title}</h2>
        <p className="mb-6 max-w-3xl" style={{ color: theme.textSecondary }}>{survey.description}</p>
        <div className="p-4 rounded-lg flex align-center gap-4" style={{ background: isDark ? 'rgba(30, 58, 138, 0.2)' : '#eff6ff', border: `1px solid ${isDark ? 'rgba(30, 58, 138, 0.5)' : '#dbeafe'}` }}>
           <div className="w-full">
             <p className="font-bold text-sm mb-2" style={{ color: isDark ? '#93c5fd' : '#1e3a8a' }}>Enlace Público para Candidatos</p>
             <div className="flex w-full">
               <code className="text-sm break-all px-4 py-2 rounded-md select-all w-full border font-mono" style={{ background: isDark ? 'rgba(0,0,0,0.3)' : '#ffffff', borderColor: isDark ? 'rgba(30, 58, 138, 0.5)' : '#bfdbfe', color: theme.text }}>
                 {`${typeof window !== 'undefined' ? window.location.origin : ''}/prueba/${survey.id}`}
               </code>
             </div>
           </div>
         </div>
      </div>      {}
      {}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-4 rounded-xl border flex flex-col items-center justify-center text-center" style={{ borderColor: theme.border, background: theme.surface }}>
            <div className="p-3 rounded-full bg-blue-100 mb-3">
              <Users size={20} className="text-blue-600" />
            </div>
            <p className="text-2xl font-black" style={{ color: theme.text }}>{stats.total}</p>
            <p className="text-xs font-bold uppercase tracking-wider mt-1" style={{ color: theme.textSecondary }}>Candidatos Totales</p>
          </div>
          <div className="p-4 rounded-xl border flex flex-col items-center justify-center text-center" style={{ borderColor: theme.border, background: theme.surface }}>
            <div className="p-3 rounded-full bg-purple-100 mb-3">
              <ClipboardList size={20} className="text-purple-600" />
            </div>
            <p className="text-2xl font-black" style={{ color: theme.text }}>{stats.questions}</p>
            <p className="text-xs font-bold uppercase tracking-wider mt-1" style={{ color: theme.textSecondary }}>Preguntas de Prueba</p>
          </div>
      </div>

      {}
      <div className="rounded-xl shadow-sm border overflow-hidden" style={{ borderColor: theme.border, background: theme.surface }}>
        <div className="p-4 border-b flex flex-col sm:flex-row gap-4 justify-between items-center bg-black/5 dark:bg-white/5" style={{ borderColor: theme.border }}>

          <div className="relative w-full sm:w-64">
             <Search className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: theme.textSecondary }} size={16} />
             <input 
               type="text" 
               placeholder="Buscar candidato..." 
               className="w-full pl-9 pr-4 py-2 border rounded-lg outline-none focus:border-blue-500 bg-transparent text-sm"
               style={{ borderColor: theme.border, color: theme.text }}
               value={searchTerm}
               onChange={e => setSearchTerm(e.target.value)}
             />
          </div>

          <div className="flex gap-2 w-full sm:w-auto relative">
             <div className="relative">
                <button 
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className="flex items-center justify-between w-48 pl-4 pr-3 py-2 border rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition outline-none cursor-pointer text-sm font-medium"
                  style={{ borderColor: theme.border, color: theme.text, background: 'transparent' }}
                >
                  <span className="truncate">
                    {selectedVersion === 'all' ? 'Todas las Versiones' : `Versión ${availableVersions.find(v => v.id === selectedVersion)?.version} (${new Date(availableVersions.find(v => v.id === selectedVersion)?.created_at).toLocaleDateString()})`}
                  </span>
                  <Filter size={14} style={{ color: theme.textSecondary }} className="ml-2 flex-shrink-0" />
                </button>

                {isDropdownOpen && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setIsDropdownOpen(false)}></div>
                    <div className="absolute top-full left-0 mt-1 w-64 rounded-xl shadow-lg border overflow-hidden z-20 animate-fade-in" style={{ background: theme.surface, borderColor: theme.border }}>
                      <button
                        onClick={() => { setSelectedVersion('all'); setIsDropdownOpen(false); }}
                        className={`w-full text-left px-4 py-3 text-sm transition hover:bg-black/5 dark:hover:bg-white/5 ${selectedVersion === 'all' ? 'font-bold bg-blue-50/50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400' : ''}`}
                        style={{ color: selectedVersion === 'all' ? undefined : theme.text }}
                      >
                        Todas las Versiones
                      </button>
                      {availableVersions.map(v => (
                        <button
                          key={v.id}
                          onClick={() => { setSelectedVersion(v.id); setIsDropdownOpen(false); }}
                          className={`w-full text-left px-4 py-3 text-sm transition hover:bg-black/5 dark:hover:bg-white/5 border-t ${selectedVersion === v.id ? 'font-bold bg-blue-50/50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400' : ''}`}
                          style={{ borderColor: theme.border, color: selectedVersion === v.id ? undefined : theme.text }}
                        >
                          <div className="flex justify-between items-center">
                            <span>Versión {v.version}</span>
                            <span className="text-[10px] opacity-60 font-normal">{new Date(v.created_at).toLocaleDateString()} {new Date(v.created_at).toLocaleTimeString([],{hour:'2-digit', minute:'2-digit'})}</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </>
                )}
             </div>

             <button 
               onClick={() => setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')}
               className="flex items-center justify-center px-4 py-2 border rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition text-sm font-medium"
               style={{ borderColor: theme.border, color: theme.text }}
               title="Ordenar por fecha"
             >
               {sortOrder === 'desc' ? <ArrowDown size={16} className="mr-2"/> : <ArrowUp size={16} className="mr-2"/>}
               Ordenar
             </button>
          </div>
        </div>

        {}
        <div className="overflow-x-auto">
          {}
          <table className="w-full text-left text-sm hidden sm:table" style={{ color: theme.text }}>
            <thead className="border-b" style={{ borderColor: theme.border, color: theme.textSecondary, background: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)' }}>
              <tr>
                <th className="p-4 font-semibold">Candidato</th>
                <th className="p-4 font-semibold">Email</th>
                <th className="p-4 font-semibold text-center">Versión</th>
                {survey.is_graded && <th className="p-4 font-semibold text-center">Puntaje</th>}
                <th className="p-4 font-semibold">Fecha Registro</th>
                <th className="p-4 font-semibold text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y" style={{ borderColor: theme.border }}>
              {filteredCandidates.length === 0 ? (
                <tr>
                  <td colSpan="5" className="p-8 text-center text-gray-500">No se encontraron candidatos con los filtros actuales.</td>
                </tr>
              ) : (
                filteredCandidates.map(cand => {
                  const cVersion = availableVersions.find(v => v.id === cand.survey_id)?.version || '?';
                  return (
                  <tr key={cand.id} className="hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition">
                    <td className="p-4 font-medium">{cand.full_name}</td>
                    <td className="p-4" style={{ color: theme.textSecondary }}>{cand.email}</td>
                    <td className="p-4 text-center">
                       <span className="inline-flex items-center justify-center px-2 py-1 text-xs font-bold rounded bg-gray-100 text-gray-600 dark:bg-white/10 dark:text-gray-300">
                         v{cVersion}
                       </span>
                    </td>
                    
                    {survey.is_graded && (
                      <td className="p-4 text-center font-bold text-blue-600 dark:text-blue-400">
                        {(() => {
                          let total = 0;
                          const candResponses = allCandidateResponses[cand.id] || [];
                          candResponses.forEach(r => {
                            const q = questions.find(qu => qu.id === r.question_id);
                            if (q && q.options) {
                              if (Array.isArray(q.options)) {
                                if (q.type === 'multiple_choice' || q.type === 'dropdown') {
                                  const optObj = q.options.find(o => typeof o === 'object' ? o.label === r.response_value : false);
                                  if (optObj && optObj.score) total += optObj.score;
                                } else if (q.type === 'checkbox') {
                                  if (Array.isArray(r.response_value)) {
                                    r.response_value.forEach(val => {
                                      const optObj = q.options.find(o => typeof o === 'object' ? o.label === val : false);
                                      if (optObj && optObj.score) total += optObj.score;
                                    });
                                  }
                                }
                              }
                            }
                          });
                          return total;
                        })()}
                      </td>
                    )}

                    <td className="p-4 uppercase text-xs" style={{ color: theme.textSecondary }}>
                       {new Date(cand.created_at).toLocaleDateString()} {new Date(cand.created_at).toLocaleTimeString([],{hour: '2-digit', minute:'2-digit'})}
                    </td>
                    <td className="p-4 text-center">
                       <button 
                         onClick={() => openCandidateDetail(cand)}
                         className="px-3 py-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400 dark:hover:bg-blue-900/50 rounded-md text-xs font-semibold transition"
                       >
                         Ver Respuestas
                       </button>
                    </td>
                  </tr>
                )})
              )}
            </tbody>
          </table>

          {}
          <div className="sm:hidden divide-y" style={{ borderColor: theme.border }}>
            {filteredCandidates.length === 0 ? (
              <div className="p-8 text-center text-gray-500">No se encontraron candidatos.</div>
            ) : (
              filteredCandidates.map(cand => {
                const cVersion = availableVersions.find(v => v.id === cand.survey_id)?.version || '?';
                return (
                <div key={cand.id} className="p-4 flex flex-col gap-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-bold flex items-center gap-2" style={{ color: theme.text }}>
                        {cand.full_name}
                        <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-gray-100 text-gray-600 dark:bg-white/10 dark:text-gray-300">
                           v{cVersion}
                        </span>
                      </p>
                      <p className="text-xs opacity-60">{cand.email}</p>
                    </div>
                    <span className="text-[10px] opacity-40 font-medium">
                       {new Date(cand.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <button 
                    onClick={() => openCandidateDetail(cand)}
                    className="w-full py-2.5 bg-blue-600 text-white rounded-lg text-xs font-bold shadow-sm"
                  >
                    Ver Respuestas
                  </button>
                </div>
              )})
            )}
          </div>
        </div>

      </div>

      {}
      {selectedCandidate && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm animate-fade-in transition-all">
           <div className="w-full max-w-2xl h-full shadow-2xl relative flex flex-col border-l" style={{ background: theme.background, borderColor: theme.border }}>
              <div className="p-6 border-b flex justify-between items-center bg-black/5 dark:bg-white/5" style={{ borderColor: theme.border }}>
                 <div>
                   <h3 className="text-2xl font-bold" style={{ color: theme.text }}>{selectedCandidate.full_name}</h3>
                   <div className="flex gap-4 mt-1 text-sm font-medium" style={{ color: theme.textSecondary }}>
                      <span>{selectedCandidate.email}</span>
                      {selectedCandidate.phone && <span>• {selectedCandidate.phone}</span>}
                   </div>
                 </div>
                 <button 
                   onClick={() => setSelectedCandidate(null)}
                   className="p-2 rounded-full transition hover:opacity-70"
                   style={{ background: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)', color: theme.textSecondary }}
                 >
                   <XCircle size={20} />
                 </button>
              </div>

              <div className="p-6 border-b flex justify-between items-center" style={{ borderColor: theme.border, background: theme.surface }}>
                 <div>
                    <p className="font-bold text-sm" style={{ color: theme.textSecondary }}>Respuestas del Candidato</p>
                    <p className="font-medium text-xs mt-1" style={{ color: theme.textSecondary }}>{new Date(selectedCandidate.created_at).toLocaleString()}</p>
                 </div>
                 {survey.is_graded && (
                   <div className="text-right">
                      <p className="font-bold text-sm" style={{ color: theme.textSecondary }}>Puntaje Total</p>
                      <p className="font-black text-2xl text-blue-600 dark:text-blue-400">
                        {candidateResponses.reduce((acc, resp) => {
                          const q = questions.find(qu => qu.id === resp.question_id);
                          if (!q || !q.options || !Array.isArray(q.options)) return acc;
                          let pts = 0;
                          if (q.type === 'multiple_choice' || q.type === 'dropdown') {
                            const optObj = q.options.find(o => typeof o === 'object' ? o.label === resp.response_value : false);
                            if (optObj && optObj.score) pts = optObj.score;
                          } else if (q.type === 'checkbox' && Array.isArray(resp.response_value)) {
                            resp.response_value.forEach(val => {
                              const optObj = q.options.find(o => typeof o === 'object' ? o.label === val : false);
                              if (optObj && optObj.score) pts += optObj.score;
                            });
                          }
                          return acc + pts;
                        }, 0)}
                      </p>
                   </div>
                 )}
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                 {loadingDetails ? (
                   <div className="text-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div></div>
                 ) : (
                   candidateResponses.length === 0 ? (
                     <p className="text-center text-gray-500 py-10">No se encontraron respuestas para este candidato.</p>
                   ) : (
                     candidateResponses.map((resp, i) => {

                       const q = questions.find(qu => qu.id === resp.question_id);
                       const displayVal = resp.response_value;
                       
                       let scoreForQuestion = null;
                       if (survey.is_graded && q && q.options && Array.isArray(q.options)) {
                         scoreForQuestion = 0;
                         if (q.type === 'multiple_choice' || q.type === 'dropdown') {
                           const optObj = q.options.find(o => typeof o === 'object' ? o.label === displayVal : false);
                           if (optObj && optObj.score) scoreForQuestion = optObj.score;
                         } else if (q.type === 'checkbox' && Array.isArray(displayVal)) {
                           displayVal.forEach(val => {
                             const optObj = q.options.find(o => typeof o === 'object' ? o.label === val : false);
                             if (optObj && optObj.score) scoreForQuestion += optObj.score;
                           });
                         }
                       }

                       const renderValue = (val) => {
                         if (!val) return <p className="text-gray-500 italic">Sin respuesta</p>;
                         if (typeof val !== 'object') {
                           return <p className="text-lg whitespace-pre-wrap font-medium" style={{ color: theme.text }}>{String(val)}</p>;
                         }

                         return (
                           <div className="grid grid-cols-1 gap-2 mt-2">
                             {Object.entries(val).map(([k, v]) => (
                               <div key={k} className="flex max-sm:flex-col sm:items-center p-3 rounded-lg border gap-4" style={{ background: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)', borderColor: theme.border }}>
                                 <div className="font-bold text-sm min-w-[120px] shrink-0" style={{ color: theme.textSecondary }}>{k}</div>
                                 <div className="font-semibold text-base break-all" style={{ color: theme.text }}>
                                   {v ? String(v) : <span className="text-red-400 italic font-normal">Sin responder</span>}
                                 </div>
                               </div>
                             ))}
                           </div>
                         );
                       };

                       return (
                         <div key={resp.id} className="rounded-xl border p-5 transition" style={{ borderColor: theme.border, background: theme.surface }}>
                           <div className="flex justify-between items-start mb-3 border-b pb-2" style={{ borderColor: theme.border }}>
                             <p className="font-medium text-blue-600 dark:text-blue-400">
                               {i+1}. {q ? q.text : 'Pregunta desconocida (eliminada)'}
                             </p>
                             {scoreForQuestion !== null && (
                               <span className="bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-2 py-1 rounded text-xs font-bold whitespace-nowrap ml-4 border border-blue-100 dark:border-blue-800">
                                 {scoreForQuestion} pts
                               </span>
                             )}
                           </div>
                           {renderValue(displayVal)}
                         </div>
                       )
                     })
                   )
                 )}
              </div>
           </div>
        </div>
      )}
    </div>
  );
}
