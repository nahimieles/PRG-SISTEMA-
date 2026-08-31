import { getPublicSurveyAction } from '../../../lib/actions_public_survey';
import CandidateTestView from '../../../components/recruitment/CandidateTestView';
import { AlertCircle } from 'lucide-react';

export const metadata = {
  title: 'Evaluación',
  description: 'Plataforma de Evaluación',
};

export default async function PublicSurveyPage({ params }) {
  const { id } = await params;
  
  if (!id) {
    return <ErrorDisplay message="Enlace inválido." />;
  }
  
  const result = await getPublicSurveyAction(id);
  
  if (!result.success) {
    return <ErrorDisplay message={result.error} />;
  }
  
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <CandidateTestView survey={result.survey} questions={result.questions} />
    </div>
  );
}

function ErrorDisplay({ message }) {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 items-center">
      <div className="bg-white p-10 rounded-2xl shadow-xl max-w-md w-full text-center border border-gray-100 animate-fade-in">
        <div className="w-20 h-20 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
          <AlertCircle size={40} />
        </div>
        <h2 className="text-2xl font-black text-gray-900 mb-2">Acceso Denegado</h2>
        <p className="text-gray-600 mb-8">{message}</p>
        <p className="text-sm text-gray-400 font-medium border-t border-gray-100 pt-6 mt-4">
          Si crees que esto es un error, por favor contacta al departamento de Recursos Humanos.
        </p>
      </div>
    </div>
  );
}
