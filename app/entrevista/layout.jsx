import '../globals.css'; // Mantenemos css base (como tailwind)

export const metadata = {
  title: 'Entrevista',
  description: 'Formulario estructurado de respuestas',
  icons: {
    icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="90">📝</text></svg>',
    shortcut: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="90">📝</text></svg>',
    apple: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="90">📝</text></svg>',
  },
};

export default function EntrevistaLayout({ children }) {
  // Aislado completamente. Renderiza los hijos de forma directa
  // para que SurveyForm controle su propio fondo fluid y diseño responsive.
  return (
    <div className="antialiased text-gray-900 font-sans">
      {children}
    </div>
  );
}
