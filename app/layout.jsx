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
  weight: ['400', '500', '600'],
})

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <head>
        <title>PRG</title>
        <meta name="description" content="Sistema de gestión de trabajos y auditorías" />
      </head>
      <body className={inter.className}>
        <MsalWrapper>
          <ThemeProvider>
            {children}
          </ThemeProvider>
        </MsalWrapper>
      </body>
    </html>
  )
}