'use client';

import React, { useState } from 'react';
import { Users, Lock, Building2 } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import ThemeToggle from '../components/ThemeToggle';
import PortalCard from '../components/PortalCard';
import { lightTheme, darkTheme } from '../lib/colors';

export default function HomePage() {
  const { isDark } = useTheme();
  const theme = isDark ? darkTheme : lightTheme;

  return (
    <div
      className="min-h-screen transition-colors p-4"
      style={{ background: theme.background, color: theme.text }}
    >
      <div className="w-full mx-auto">
        {/* Header con logo, título y tema */}
        <div className="flex justify-between items-center mb-8 px-8 py-4 rounded-xl shadow-lg" style={{ background: theme.surface }}>
          {/* Logo */}
          <img 
            src="/Sin título-1-08.png"
            alt="Logo PRG Auditores" 
            className="w-20 h-20 object-contain"
          />

          {/* Título Centrado */}
          <h1 className="text-3xl font-bold flex-1 text-center" style={{ color: theme.primary }}>
            Registro de Actividades
          </h1>

          {/* Toggle Tema */}
          <ThemeToggle />
        </div>

        {/* Portal Cards - Acceso rápido visual */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8 auto-rows-fr max-w-5xl mx-auto">
          <PortalCard
            href="/trabajadores"
            icon={<Users className="w-16 h-22" />}
            title="Funcionarios"
            description="Registra tus actividades diarias"
            theme={theme}
          />
          
          <PortalCard
            href="/administracion"
            icon={<Lock className="w-16 h-22" />}
            title="Administración"
            description="Gestión integral del sistema"
            theme={theme}
          />
          
          <PortalCard
            href="/clientes"
            icon={<Building2 className="w-16 h-16" />}
            title="Clientes"
            description="Consulta las actividades realizadas"
            theme={theme}
          />
        </div>

        {/* Footer */}
        <div
          className="rounded-2xl shadow-lg p-6 text-center w-full"
          style={{ background: theme.surface }}
        >
          <p style={{ color: theme.textSecondary }}>
            © 2026 PRG Auditores • Tu confianza, nuestro compromiso
          </p>
        </div>
      </div>
    </div>
  );
}