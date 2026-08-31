'use client';
import { useState } from 'react';
import { submitPublicSurveyAction } from '../../lib/actions_public_survey';
import { CheckCircle2, AlertCircle, Send, User, Mail, ClipboardList } from 'lucide-react';

export default function CandidateTestView({ survey, questions }) {
  const [step, setStep] = useState(1);
  const [candidateData, setCandidateData] = useState({ full_name: '', email: '' });
  const [responses, setResponses] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleStart = (e) => {
    e.preventDefault();
    if (!candidateData.full_name.trim() || !candidateData.email.trim()) {
      setError('Por favor, llena todos los campos.');
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(candidateData.email)) {
      setError('Por favor, ingresa un correo electrónico válido.');
      return;
    }
    setError('');
    setStep(2);
  };

  const handleOptionChange = (questionId, optionValue, score) => {
    setResponses(prev => ({
      ...prev,
      [questionId]: { response_text: optionValue, score: score }
    }));
  };

  const handleTextChange = (questionId, text) => {
    setResponses(prev => ({
      ...prev,
      [questionId]: { response_text: text, score: 0 }
    }));
  };

  const handleSubmit = async () => {
    // Validar requeridos
    for (const q of questions) {
      if (q.is_required && (!responses[q.id] || !responses[q.id].response_text?.trim())) {
        setError('Por favor, responde todas las preguntas obligatorias.');
        return;
      }
    }
    
    setSubmitting(true);
    setError('');
    
    // Preparar array de respuestas
    const responsesArray = Object.keys(responses).map(qId => ({
      question_id: qId,
      response_text: responses[qId].response_text,
      score: responses[qId].score
    }));
    
    const result = await submitPublicSurveyAction(survey.id, candidateData, responsesArray);
    
    setSubmitting(false);
    
    if (result.success) {
      setSuccess(true);
    } else {
      setError(result.error || 'Ocurrió un error al enviar la prueba.');
    }
  };

  if (success) {
    return (
      <div className="max-w-xl mx-auto p-8 mt-12 bg-white rounded-2xl shadow-xl border border-gray-100 text-center animate-fade-in">
        <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle2 size={40} />
        </div>
        <h2 className="text-3xl font-black text-gray-800 mb-4">¡Prueba Completada!</h2>
        <p className="text-gray-600 mb-8">
          Tus respuestas han sido enviadas exitosamente. El equipo de Recursos Humanos revisará tus resultados.
        </p>
        <p className="text-sm text-gray-400 font-medium">Puedes cerrar esta ventana.</p>
      </div>
    );
  }

    <div className="max-w-3xl mx-auto p-4 sm:p-8 mt-4 sm:mt-12 bg-white/90 backdrop-blur-xl sm:rounded-3xl sm:shadow-2xl sm:border border-gray-100 animate-fade-in relative overflow-hidden">
      
      {/* Elemento de diseño de fondo */}
      <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-r from-blue-500 to-indigo-600 opacity-10"></div>
      
      <div className="text-center mb-10 pb-8 border-b border-gray-100 relative z-10">
        <div className="w-20 h-20 bg-gradient-to-tr from-blue-600 to-indigo-500 text-white rounded-2xl shadow-lg flex items-center justify-center mx-auto mb-6 transform -rotate-3 hover:rotate-0 transition-transform duration-300">
          <ClipboardList size={36} />
        </div>
        <h1 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-gray-900 to-gray-600 mb-4">{survey.title}</h1>
        <p className="text-gray-600 max-w-xl mx-auto text-lg">{survey.description}</p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-xl flex items-start gap-3 border border-red-100 animate-shake">
          <AlertCircle size={20} className="mt-0.5 flex-shrink-0" />
          <p className="font-medium">{error}</p>
        </div>
      )}

      {step === 1 ? (
        <form onSubmit={handleStart} className="space-y-6 max-w-md mx-auto">
          <div className="text-center mb-6">
            <h3 className="text-xl font-bold text-gray-800">Tus Datos</h3>
            <p className="text-sm text-gray-500">Por favor, ingresa tu información para comenzar.</p>
          </div>
          
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Nombre Completo</label>
            <div className="relative group">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors" size={20} />
              <input
                type="text"
                required
                placeholder="Ej. Juan Pérez"
                value={candidateData.full_name}
                onChange={e => setCandidateData(prev => ({...prev, full_name: e.target.value}))}
                className="w-full pl-12 pr-4 py-3.5 bg-gray-50 border border-gray-200 text-gray-900 font-medium rounded-xl focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 outline-none transition-all shadow-sm"
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Correo Electrónico</label>
            <div className="relative group">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors" size={20} />
              <input
                type="email"
                required
                placeholder="ejemplo@correo.com"
                value={candidateData.email}
                onChange={e => setCandidateData(prev => ({...prev, email: e.target.value}))}
                className="w-full pl-12 pr-4 py-3.5 bg-gray-50 border border-gray-200 text-gray-900 font-medium rounded-xl focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 outline-none transition-all shadow-sm"
              />
            </div>
          </div>
          
          <button
            type="submit"
            className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition shadow-lg shadow-blue-500/30 flex items-center justify-center gap-2 mt-4"
          >
            Comenzar Prueba
          </button>
        </form>
      ) : (
        <div className="space-y-8">
          {questions.map((q, index) => (
            <div key={q.id} className="p-6 bg-gray-50 border border-gray-100 rounded-2xl">
              <p className="font-bold text-gray-900 mb-4 text-lg">
                {index + 1}. {q.text}
                {q.is_required && <span className="text-red-500 ml-1" title="Obligatorio">*</span>}
              </p>
              
              {q.type === 'text' && (
                <textarea
                  className="w-full p-4 bg-gray-50 border border-gray-200 text-gray-900 font-medium rounded-xl focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 outline-none transition-all shadow-sm resize-none min-h-[140px]"
                  placeholder="Escribe tu respuesta detallada aquí..."
                  value={responses[q.id]?.response_text || ''}
                  onChange={e => handleTextChange(q.id, e.target.value)}
                />
              )}
              
              {q.type === 'multiple_choice' && q.options && (
                <div className="space-y-3">
                  {q.options.map((opt, i) => {
                    const isSelected = responses[q.id]?.response_text === opt.text;
                    return (
                      <label 
                        key={i} 
                        className={`flex items-start p-4 rounded-xl border cursor-pointer transition-all duration-200 ${
                          isSelected 
                            ? 'border-blue-500 bg-blue-50 shadow-sm shadow-blue-500/10' 
                            : 'border-gray-200 bg-white hover:border-blue-300 hover:bg-blue-50/50'
                        }`}
                      >
                        <div className="flex items-center h-5">
                          <input
                            type="radio"
                            name={`question_${q.id}`}
                            value={opt.text}
                            checked={isSelected}
                            onChange={() => handleOptionChange(q.id, opt.text, opt.points)}
                            className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 focus:ring-blue-500 focus:ring-2"
                          />
                        </div>
                        <div className="ml-3 text-sm flex-1 pt-0.5">
                          <span className={`font-medium ${isSelected ? 'text-blue-900' : 'text-gray-700'}`}>
                            {opt.text}
                          </span>
                        </div>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
          
          <div className="pt-6 border-t border-gray-200 flex justify-end">
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="px-8 py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition shadow-lg shadow-blue-500/30 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <Send size={18} />
                  Finalizar Prueba
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
