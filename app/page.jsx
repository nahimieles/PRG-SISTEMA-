'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, LogIn } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import ThemeToggle from '../components/ThemeToggle';
import { lightTheme, darkTheme } from '../lib/colors';
import { loginUnified, saveUnifiedSession, getUnifiedSession } from '../lib/auth';
import LoginLogo from '../components/LoginLogo';

export default function HomePage() {
  const router = useRouter();
  const { isDark } = useTheme();
  const theme = isDark ? darkTheme : lightTheme;

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);

  const [rememberMe, setRememberMe] = useState(false);

  // Pre-cargar usuario y preferencia de recordarme
  useEffect(() => {
    const savedRemember = localStorage.getItem('rememberMe') === 'true';
    const savedUsername = localStorage.getItem('rememberedUsername') || '';
    if (savedRemember) {
      setRememberMe(true);
      setUsername(savedUsername);
    }
  }, []);

  // Verificar sesión existente al cargar
  useEffect(() => {
    const session = getUnifiedSession();
    if (session) {
      // Redirigir según el rol
      if (session.role === 'admin') {
        router.push('/administracion');
      } else if (session.role === 'company') {
        router.push('/empresa');
      } else {
        router.push('/trabajadores');
      }
    } else {
      setCheckingSession(false);
    }
  }, [router]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const result = await loginUnified(username, password);

    if (result.success) {
      // Persistir preferencia del checkbox
      if (rememberMe) {
        localStorage.setItem('rememberMe', 'true');
        localStorage.setItem('rememberedUsername', username);
      } else {
        localStorage.removeItem('rememberMe');
        localStorage.removeItem('rememberedUsername');
      }

      const expiration = rememberMe ? 30 * 24 * 60 : 8 * 60;
      saveUnifiedSession(result.user, result.role, expiration);

      if (result.role === 'admin') {
        router.push('/administracion');
      } else if (result.role === 'company') {
        router.push('/empresa');
      } else {
        router.push('/trabajadores');
      }
    } else {
      setError(result.message);
      setPassword('');
      setTimeout(() => setError(''), 4000);
    }

    setLoading(false);
  };

  // Mostrar loading mientras verifica sesión
  if (checkingSession) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: theme.background }}
      >
        <div className="animate-pulse text-center">
          <LoginLogo className="w-24 h-auto mx-auto opacity-50" />
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center p-4 transition-colors animate-fade-in"
      style={{ background: theme.background, color: theme.text }}
    >

      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>

      <div className="w-full max-w-md">

        <div className="text-center mb-6">
          <div className="flex justify-center mb-0">
            <LoginLogo className="w-96 h-auto" />
          </div>
        </div>

        <div
          className="rounded-xl shadow-lg p-8"
          style={{
            background: theme.surface,
            boxShadow: isDark
              ? '0 25px 50px rgba(0,0,0,0.4)'
              : '0 25px 50px rgba(0,0,0,0.1)'
          }}
        >
          <h2
            className="text-xl font-semibold text-center mb-6"
            style={{ color: theme.text }}
          >
            Iniciar Sesión
          </h2>

          {error && (
            <div
              className="mb-4 p-4 rounded-xl text-center text-sm font-medium"
              style={{
                background: isDark ? 'rgba(231, 76, 60, 0.2)' : '#fef2f2',
                color: '#e74c3c',
                border: '1px solid rgba(231, 76, 60, 0.3)'
              }}
            >
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {}
            <div>
              <label
                className="block text-sm font-medium mb-2"
                style={{ color: theme.textSecondary }}
              >
                Usuario
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Ingresa tu usuario"
                className="w-full px-4 py-3 rounded-xl border-2 focus:outline-none transition-all"
                style={{
                  borderColor: theme.border,
                  background: isDark ? '#0f1419' : '#fff',
                  color: theme.text,
                }}
                required
                autoFocus
              />
            </div>

            {}
            <div>
              <label
                className="block text-sm font-medium mb-2"
                style={{ color: theme.textSecondary }}
              >
                Contraseña
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Ingresa tu contraseña"
                  className="w-full px-4 py-3 pr-12 rounded-xl border-2 focus:outline-none transition-all"
                  style={{
                    borderColor: theme.border,
                    background: isDark ? '#0f1419' : '#fff',
                    color: theme.text,
                  }}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 p-2 hover:opacity-70 transition cursor-pointer rounded-lg"
                  style={{ color: theme.textSecondary }}
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                marginTop: '4px',
                cursor: 'pointer',
                userSelect: 'none',
              }}
              onClick={() => setRememberMe(prev => !prev)}
            >
              {}
              <div style={{
                width: '40px',
                height: '22px',
                borderRadius: '11px',
                background: rememberMe ? theme.primary : (isDark ? '#374151' : '#d1d5db'),
                position: 'relative',
                flexShrink: 0,
                transition: 'background 0.2s ease',
              }}>
                <div style={{
                  position: 'absolute',
                  top: '3px',
                  left: rememberMe ? '21px' : '3px',
                  width: '16px',
                  height: '16px',
                  borderRadius: '50%',
                  background: '#ffffff',
                  transition: 'left 0.2s ease',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
                }} />
              </div>
              <span style={{
                fontSize: '13px',
                fontWeight: 500,
                color: theme.textSecondary,
              }}>
                Mantener sesión iniciada
              </span>
            </div>

            {}
            <button
              type="submit"
              disabled={loading}
              className="w-full text-white py-4 rounded-xl font-semibold hover:opacity-90 transition-all disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2 text-lg"
              style={{
                background: `linear-gradient(135deg, ${theme.primary} 0%, ${theme.primaryLight} 100%)`,
                boxShadow: `0 4px 15px ${theme.primary}40`
              }}
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Verificando...
                </>
              ) : (
                <>
                  <LogIn className="w-5 h-5" />
                  Ingresar
                </>
              )}
            </button>
          </form>
        </div>

        {}
        <div className="text-center mt-8">
          <p
            className="text-sm"
            style={{ color: theme.textSecondary }}
          >
            © 2026 PRG Auditores • Tu confianza, nuestro compromiso
          </p>
        </div>
      </div>
    </div>
  );
}