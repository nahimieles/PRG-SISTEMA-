'use client';

import './globals.css'
import { Inter } from 'next/font/google'
import dynamic from 'next/dynamic'
import { ThemeProvider } from '../contexts/ThemeContext'

// Dynamic import MsalWrapper to completely avoid SSR for MSAL
const MsalWrapper = dynamic(() => import('../components/MsalWrapper'), {
  ssr: false,
  loading: () => null
});

const inter = Inter({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
})

import { usePathname } from 'next/navigation'

export default function RootLayout({ children }) {
  const pathname = usePathname()
  const isEncuesta = pathname?.startsWith('/encuesta')

  return (
    <html lang="es">
      <head>
        {!isEncuesta && (
          <>
            <title>PRG</title>
            <meta name="description" content="Sistema de gestión de trabajos y auditorías" />
          </>
        )}
      </head>
      <body className={inter.className}>
        {isEncuesta ? (
          children
        ) : (
          <MsalWrapper>
            <ThemeProvider>
              {children}
            </ThemeProvider>
          </MsalWrapper>
        )}
      </body>
    </html>
  )
}