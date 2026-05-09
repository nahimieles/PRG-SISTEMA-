import { Suspense } from 'react';
import SurveyForm from '@/components/recruitment/SurveyForm';

export default async function PruebaPage({ params }) {
  const { interviewId } = await params; // Next.js 15 requires awaiting params
  
  return (
    <Suspense fallback={
      <div className="flex justify-center items-center p-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    }>
      <SurveyForm interviewId={interviewId} />
    </Suspense>
  );
}
