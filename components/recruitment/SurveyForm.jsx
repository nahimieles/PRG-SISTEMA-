'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function SurveyForm({ interviewId }) {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [survey, setSurvey] = useState(null);
  const [questions, setQuestions] = useState([]);

  // Form State
  const [candidate, setCandidate] = useState({ full_name: '', email: '', phone: '' });
  const [responses, setResponses] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  // Draft Key based on interviewId to avoid mixing multiple tests
  const draftKey = `survey_draft_${interviewId}`;

  // Load draft from localStorage on mount
  useEffect(() => {
    try {
      const savedDraft = localStorage.getItem(draftKey);
      if (savedDraft) {
        const { candidate: savedCandidate, responses: savedResponses } = JSON.parse(savedDraft);
        if (savedCandidate) setCandidate(savedCandidate);
        if (savedResponses) setResponses(savedResponses);
      }
    } catch (err) {
      console.warn('Error loading draft from localStorage:', err);
    }
  }, [draftKey]);

  // Save draft to localStorage whenever candidate or responses change
  useEffect(() => {
    if (!success && !submitting) {
      localStorage.setItem(draftKey, JSON.stringify({ candidate, responses }));
    }
  }, [candidate, responses, draftKey, success, submitting]);

  useEffect(() => {
    const fetchSurvey = async () => {
      try {
        const res = await fetch(`/api/prueba/${interviewId}?t=${Date.now()}`, { cache: 'no-store' });
        const data = await res.json();

        if (!res.ok) throw new Error(data.error || 'Error al cargar la prueba');

        setSurvey(data.survey);
        setQuestions(data.questions);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchSurvey();
  }, [interviewId]);

  const handleResponseChange = (questionId, value, isCheckbox = false) => {
    setResponses(prev => {
       if (!isCheckbox) return { ...prev, [questionId]: value };
       
       const currentArr = prev[questionId] || [];
       if (currentArr.includes(value)) {
           return { ...prev, [questionId]: currentArr.filter(v => v !== value) };
       } else {
           return { ...prev, [questionId]: [...currentArr, value] };
       }
    });
  };

  const handleMultiTextChange = (questionId, field, value) => {
    setResponses(prev => {
        const currentObj = prev[questionId] || {};
        return { ...prev, [questionId]: { ...currentObj, [field]: value } };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    // Prepare payload
    const hasAnswer = (value) => {
      if (Array.isArray(value)) return value.length > 0;
      if (value && typeof value === 'object') {
        return Object.values(value).some(v => String(v ?? '').trim() !== '');
      }
      return String(value ?? '').trim() !== '';
    };

    const formattedResponses = questions
      .filter(q => hasAnswer(responses[q.id]))
      .map(q => ({
        question_id: q.id,
        response_value: responses[q.id]
      }));

    try {
      const res = await fetch(`/api/prueba/${interviewId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ candidate, responses: formattedResponses })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al enviar');

      setSuccess(true);
      localStorage.removeItem(draftKey); // Clear draft on success
      window.scrollTo(0, 0);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex justify-center items-center bg-gradient-to-br from-slate-50 via-gray-100 to-zinc-100">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-10 w-10 border-4 border-indigo-200 border-t-indigo-600"></div>
          <p className="text-indigo-600/80 font-bold tracking-widest text-sm uppercase">Cargando...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex justify-center items-center bg-gradient-to-br from-slate-50 via-gray-100 to-zinc-100 p-6">
        <div className="bg-white/90 backdrop-blur-xl p-10 rounded-3xl shadow-2xl shadow-red-900/5 max-w-md w-full text-center border border-white/50">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6 text-red-500">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
          </div>
          <h2 className="text-2xl font-black text-gray-900 mb-3 tracking-tight">Acceso Inválido</h2>
          <p className="text-gray-500 leading-relaxed font-medium">{error}</p>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex justify-center items-center bg-gradient-to-br from-indigo-50 via-white to-blue-50 p-6">
        <div className="bg-white/90 backdrop-blur-xl p-12 rounded-[2rem] shadow-2xl shadow-indigo-900/5 max-w-lg w-full text-center border border-white/50">
          <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-8 shadow-lg shadow-green-500/30 text-white animate-bounce-short">
            <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>
          </div>
          <h2 className="text-3xl font-bold text-gray-900 mb-2 tracking-tight">Prueba enviada</h2>
        </div>
      </div>
    );
  }

  const inputClass = "w-full px-5 py-4 bg-white/70 backdrop-blur-sm border border-gray-200/60 rounded-2xl focus:ring-4 focus:ring-indigo-500/15 focus:border-indigo-500 hover:bg-white outline-none transition-all shadow-sm text-gray-800 placeholder-gray-400 font-medium text-lg";
  const labelClass = "block text-xs font-black text-gray-400 tracking-widest uppercase mb-2 ml-1";

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-gray-50 to-zinc-200 p-4 md:p-8 font-sans overflow-x-hidden selection:bg-indigo-500/30 flex justify-center">
      <div className="w-full max-w-5xl">
        {/* Flow Header */}
        <div className="mb-10 text-center">
          <h1 className="text-3xl md:text-4xl font-bold text-slate-800 tracking-tight leading-loose mb-3">{survey.title}</h1>
          {survey.description && <p className="text-base md:text-lg text-slate-500 max-w-3xl mx-auto font-normal leading-relaxed">{survey.description}</p>}
        </div>

        <form onSubmit={handleSubmit} className="space-y-8 relative">
          
          {/* Main Card */}
          <div className="bg-white/95 backdrop-blur-2xl rounded-[1.5rem] shadow-xl border border-white p-5 sm:p-8 md:p-10 md:px-14 space-y-12">
            
            {/* Candidate Section */}
            <div className="space-y-6">
                <h2 className="text-2xl font-bold text-slate-800 mb-6 tracking-tight">Información Personal</h2>
                
                <div className="space-y-6">
                  <div>
                    <label className={labelClass}>Nombre Completo *</label>
                    <input 
                      required 
                      type="text" 
                      placeholder="Escribe tu nombre aquí..."
                      className={inputClass} 
                      value={candidate.full_name}
                      onChange={e => setCandidate(prev => ({...prev, full_name: e.target.value}))}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className={labelClass}>Correo Electrónico *</label>
                      <input 
                        required 
                        type="email" 
                        placeholder="Escribe tu correo aquí..."
                        className={inputClass} 
                        value={candidate.email}
                        onChange={e => setCandidate(prev => ({...prev, email: e.target.value}))}
                      />
                    </div>
                    <div>
                      <label className={labelClass}>Teléfono (Opcional)</label>
                      <input 
                        type="tel" 
                        placeholder="Escribe tu teléfono aquí..."
                        className={inputClass} 
                        value={candidate.phone}
                        onChange={e => setCandidate(prev => ({...prev, phone: e.target.value}))}
                      />
                    </div>
                  </div>
                </div>
            </div>

            <hr className="border-gray-200/60" />

            {/* Questions Section */}
            <div className="space-y-8">
                <h2 className="text-2xl font-bold text-slate-800 mb-8 tracking-tight">Prueba</h2>
                
                <div className="space-y-12">
                {questions.map((q, idx) => (
                  <div key={q.id} className="group flex flex-col space-y-4">
                    <label className="text-lg md:text-xl font-semibold text-slate-800 flex items-start gap-4 leading-snug">
                      <span className="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 text-sm font-bold mt-0.5">{idx + 1}</span> 
                      <span>{q.text} {q.is_required && <span className="text-pink-500 ml-1">*</span>}</span>
                    </label>

                    <div className="pl-0 md:pl-12 w-full">
                      {q.type === 'text' && (
                        <textarea 
                          required={q.is_required}
                          rows={3}
                          className={`${inputClass} resize-y rounded-3xl min-h-[120px]`}
                          value={responses[q.id] || ''}
                          onChange={e => handleResponseChange(q.id, e.target.value)}
                          placeholder="Escribe tu análisis aquí..."
                        />
                      )}

                      {q.type === 'multiple_choice' && q.options && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {Array.isArray(q.options) && q.options.map((opt, i) => (
                            <label key={i} className={`relative flex items-center p-5 rounded-2xl cursor-pointer transition-all duration-200 border-2 ${responses[q.id] === opt ? 'border-indigo-500 bg-indigo-50/50 shadow-md shadow-indigo-100' : 'border-gray-100 bg-white hover:border-indigo-200 hover:bg-gray-50 shadow-sm'}`}>
                              <input 
                                type="radio" 
                                name={`req_${q.id}`} 
                                required={q.is_required}
                                value={opt}
                                checked={responses[q.id] === opt}
                                onChange={() => handleResponseChange(q.id, opt)}
                                className="peer sr-only"
                              />
                              <div className={`flex-shrink-0 w-6 h-6 rounded-full border-2 mr-4 flex items-center justify-center transition-colors ${responses[q.id] === opt ? 'border-indigo-500' : 'border-gray-300'}`}>
                                <div className={`w-3 h-3 rounded-full bg-indigo-500 transition-transform ${responses[q.id] === opt ? 'scale-100' : 'scale-0'}`}></div>
                              </div>
                              <span className="text-slate-700 text-lg font-medium">{opt}</span>
                            </label>
                          ))}
                        </div>
                      )}

                      {q.type === 'checkbox' && q.options && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {Array.isArray(q.options) && q.options.map((opt, i) => {
                            const isChecked = (responses[q.id] || []).includes(opt);
                            return (
                            <label key={i} className={`relative flex items-center p-5 rounded-2xl cursor-pointer transition-all duration-200 border-2 ${isChecked ? 'border-indigo-500 bg-indigo-50/50 shadow-md shadow-indigo-100' : 'border-gray-100 bg-white hover:border-indigo-200 hover:bg-gray-50 shadow-sm'}`}>
                              <input 
                                type="checkbox" 
                                name={`req_${q.id}`} 
                                value={opt}
                                checked={isChecked}
                                onChange={() => handleResponseChange(q.id, opt, true)}
                                className="peer sr-only"
                              />
                              <div className={`flex-shrink-0 w-6 h-6 rounded-md border-2 mr-4 flex items-center justify-center transition-colors ${isChecked ? 'border-indigo-500 bg-indigo-500' : 'border-gray-300 bg-white'}`}>
                                <svg className={`w-4 h-4 text-white transition-opacity ${isChecked ? 'opacity-100' : 'opacity-0'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>
                              </div>
                              <span className="text-slate-700 text-lg font-medium">{opt}</span>
                            </label>
                          )})}
                        </div>
                      )}

                      {q.type === 'dropdown' && q.options && (
                        <div className="relative">
                           <select
                             required={q.is_required}
                             className={`${inputClass} cursor-pointer appearance-none pr-12`}
                             value={responses[q.id] || ''}
                             onChange={e => handleResponseChange(q.id, e.target.value)}
                           >
                             <option value="" disabled hidden>Selecciona de la lista...</option>
                             {Array.isArray(q.options) && q.options.map((opt, i) => (
                                <option key={i} value={opt} className="py-2">{opt}</option>
                             ))}
                           </select>
                           <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                             <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                           </div>
                        </div>
                      )}

                      {q.type === 'scale' && q.options && (
                        <div className="flex flex-col space-y-6 pt-4 pb-2 px-2">
                          <input 
                            type="range" 
                            min={q.options.min || 1} 
                            max={q.options.max || 5} 
                            required={q.is_required}
                            value={responses[q.id] || ''}
                            onChange={e => handleResponseChange(q.id, Number(e.target.value))}
                            className="w-full accent-indigo-600 h-3 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                          />
                          <div className="flex justify-between items-center px-1">
                             <div className="flex flex-col items-start"><span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Mínimo</span><span className="text-lg font-bold text-slate-800">{q.options.min || 1}</span></div>
                             <div className="flex flex-col items-center"><span className="text-xs font-semibold text-indigo-500 uppercase tracking-widest">Valor</span><span className="text-3xl font-bold text-indigo-600">{responses[q.id] || '-'}</span></div>
                             <div className="flex flex-col items-end"><span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Máximo</span><span className="text-lg font-bold text-slate-800">{q.options.max || 5}</span></div>
                          </div>
                        </div>
                      )}

                      {q.type === 'multi_text' && q.options && (
                        <div className="grid gap-6">
                          {Array.isArray(q.options) && q.options.map((opt, i) => (
                            <div key={i} className="flex flex-col">
                              <label className={labelClass}>{opt}</label>
                              <input 
                                type="text" 
                                required={q.is_required}
                                className={inputClass} 
                                value={(responses[q.id] || {})[opt] || ''}
                                onChange={e => handleMultiTextChange(q.id, opt, e.target.value)}
                                placeholder="Escribe aquí..."
                              />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                </div>
              </div>

          </div>

          {/* Submit Action within flow */}
          <div className="pt-8 flex justify-end">
            <button 
              type="submit" 
              disabled={submitting}
              className={`w-full md:w-auto px-10 py-4 bg-indigo-600 hover:bg-indigo-700 text-white text-lg font-semibold rounded-2xl shadow-lg hover:shadow-indigo-500/30 focus:ring-4 focus:ring-indigo-500/50 transition-all ${submitting ? 'opacity-70 cursor-wait' : 'transform hover:-translate-y-0.5'}`}
            >
              <div className="flex items-center justify-center gap-3">
                {submitting ? 'Procesando...' : 'Enviar Mis Respuestas'}
                {!submitting && <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M14 5l7 7m0 0l-7 7m7-7H3"></path></svg>}
              </div>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
