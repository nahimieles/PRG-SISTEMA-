import './globals.css'
import { Montserrat } from 'next/font/google'
import { ThemeProvider } from '../contexts/ThemeContext'

const montserrat = Montserrat({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
})

export const metadata = {
  title: 'PRG - Sistema de Trabajos',
  description: 'Sistema de gestión de trabajos y auditorías',
}

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body className={montserrat.className}>
        <ThemeProvider>
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}