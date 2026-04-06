import { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '../../lib/supabase';
import { useTheme } from '../../contexts/ThemeContext';
import { lightTheme, darkTheme } from '../../lib/colors';
import { Users, Clock, CheckCircle2, XCircle, Search, Eye, Filter, ArrowDown, ArrowUp, ClipboardList, ArrowLeft } from 'lucide-react';
import Toast from '../Toast';

export default function SurveyDashboard({ survey, onUpdate, onBack, headerPortalNode }) {
  const { isDark } = useTheme();
  const theme = isDark ? darkTheme : lightTheme;

  const [candidates, setCandidates] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);

  const [sortOrder, setSortOrder] = useState('desc'); // 'asc' or 'desc' by created_at
  const [searchTerm, setSearchTerm] = useState('');

  // Modal detail state
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [candidateResponses, setCandidateResponses] = useState([]);
  const [loadingDetails, setLoadingDetails] = useState(false);

  const showToast = (text, type = 'success') => {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), 3000);
  };

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        // Load candidates
        const { data: cands, error: cErr } = await supabase
          .from('recruitment_candidates')
          .select('*')
          .eq('survey_id', survey.id)
          .order('created_at', { ascending: false });

        if (cErr) throw cErr;
        setCandidates(cands || []);

        // Load Survey Questions for context in details
        const { data: qs, error: qErr } = await supabase
          .from('recruitment_questions')
          .select('*')
          .eq('survey_id', survey.id);
          
        if (!qErr) setQuestions(qs || []);

      } catch (err) {
        console.error("Error loading dashboard:", err);
        setError("No se pudieron cargar los datos del dashboard.");
      } finally {
        setLoading(false);
      }
    };
    fetchDashboardData();
  }, [survey.id]);

  // States are no longer managed interactively

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
      setCandidateResponses(data || []);
    } catch (err) {
      showToast('Error cargando respuestas', 'error');
    } finally {
      setLoadingDetails(false);
    }
  };

  // Derived Metrics
  const stats = useMemo(() => {
    return { 
       total: candidates.length, 
       questions: questions.length 
    };
  }, [candidates, questions]);

  // Derived Filtered List
  const filteredCandidates = useMemo(() => {
    let result = candidates;
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
  }, [candidates, sortOrder, searchTerm]);

  if (loading) return <div className="p-10 text-center flex flex-col items-center">
     <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
     <span>Cargando analíticas...</span>
  </div>;

  if (error) return <div className="p-10 text-center text-red-500 bg-red-50 border border-red-200 rounded-xl m-4">{error}</div>;

  return (
    <div className="space-y-6 animate-fade-in">
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
               <ClipboardList className="w-5 h-5 text-blue-500" /> Resultados de Encuesta
             </h2>
           </div>
         </div>
      , headerPortalNode)}

      {/* Header Info */}
      <div className="p-6 rounded-xl shadow-sm border" style={{ borderColor: theme.border, background: theme.surface }}>
        <h2 className="text-2xl font-bold mb-2 text-blue-600">{survey.title}</h2>
        <p className="mb-6 max-w-3xl" style={{ color: theme.textSecondary }}>{survey.description}</p>
        <div className="p-4 rounded-lg flex align-center gap-4" style={{ background: theme.isDark ? 'rgba(30, 58, 138, 0.2)' : '#eff6ff', border: `1px solid ${theme.isDark ? 'rgba(30, 58, 138, 0.5)' : '#dbeafe'}` }}>
           <div className="w-full">
             <p className="font-bold text-sm mb-2" style={{ color: theme.isDark ? '#93c5fd' : '#1e3a8a' }}>Enlace Público para Candidatos</p>
             <div className="flex w-full">
               <code className="text-sm break-all px-4 py-2 rounded-md select-all w-full border font-mono" style={{ background: theme.isDark ? 'rgba(0,0,0,0.3)' : '#ffffff', borderColor: theme.isDark ? 'rgba(30, 58, 138, 0.5)' : '#bfdbfe', color: theme.text }}>
                 https://nextjs-boilerplate-delta-bay-eez7fy3o9d.vercel.app/encuesta/{survey.id}
               </code>
             </div>
           </div>
         </div>
      </div>      {/* Metricas */}
      <div className="grid grid-cols-2 md:grid-cols-2 gap-4">
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
            <p className="text-xs font-bold uppercase tracking-wider mt-1" style={{ color: theme.textSecondary }}>Preguntas de Encuesta</p>
          </div>
      </div>

      {/* Candidate Table Controls */}
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

          <div className="flex gap-2 w-full sm:w-auto">
             <button 
               onClick={() => setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')}
               className="flex items-center justify-center px-4 py-2 border rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition"
               style={{ borderColor: theme.border, color: theme.text }}
               title="Ordenar por fecha"
             >
               {sortOrder === 'desc' ? <ArrowDown size={18} className="mr-2"/> : <ArrowUp size={18} className="mr-2"/>}
               Ordenar
             </button>
          </div>
        </div>

        {/* Candidate List */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm" style={{ color: theme.text }}>
            <thead className="border-b" style={{ borderColor: theme.border, color: theme.textSecondary, background: theme.isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)' }}>
              <tr>
                <th className="p-4 font-semibold">Candidato</th>
                <th className="p-4 font-semibold">Email</th>
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
                filteredCandidates.map(cand => (
                  <tr key={cand.id} className="hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition">
                    <td className="p-4 font-medium">{cand.full_name}</td>
                    <td className="p-4" style={{ color: theme.textSecondary }}>{cand.email}</td>
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
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detaill Modal (Slide Over simulation or Modal) */}
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
                   style={{ background: theme.isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)', color: theme.textSecondary }}
                 >
                   <XCircle size={20} />
                 </button>
              </div>

              <div className="p-6 border-b" style={{ borderColor: theme.border, background: theme.surface }}>
                 <div className="flex justify-between items-center text-sm">
                    <p className="font-bold" style={{ color: theme.textSecondary }}>Respuestas del Candidato</p>
                    <p className="font-medium" style={{ color: theme.textSecondary }}>{new Date(selectedCandidate.created_at).toLocaleString()}</p>
                 </div>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                 {loadingDetails ? (
                   <div className="text-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div></div>
                 ) : (
                   candidateResponses.length === 0 ? (
                     <p className="text-center text-gray-500 py-10">No se encontraron respuestas para este candidato.</p>
                   ) : (
                     candidateResponses.map((resp, i) => {
                       // Find corresponding question for context
                       const q = questions.find(qu => qu.id === resp.question_id);
                       const displayVal = resp.response_value;
                       
                       const renderValue = (val) => {
                         if (!val) return <p className="text-gray-500 italic">Sin respuesta</p>;
                         if (typeof val !== 'object') {
                           return <p className="text-lg whitespace-pre-wrap font-medium" style={{ color: theme.text }}>{String(val)}</p>;
                         }
                         
                         // Si es objeto (como preguntas de completar espacios u otros tipos compuestos)
                         return (
                           <div className="grid grid-cols-1 gap-2 mt-2">
                             {Object.entries(val).map(([k, v]) => (
                               <div key={k} className="flex max-sm:flex-col sm:items-center p-3 rounded-lg border gap-4" style={{ background: theme.isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)', borderColor: theme.border }}>
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
                           <p className="font-medium text-blue-600 dark:text-blue-400 mb-3 block border-b pb-2" style={{ borderColor: theme.border }}>
                             {i+1}. {q ? q.text : 'Pregunta desconocida (eliminada)'}
                           </p>
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
