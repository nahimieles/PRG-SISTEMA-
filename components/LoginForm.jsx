'use client';

import { useState } from 'react';
import { Lock, UserCheck, Eye, EyeOff } from 'lucide-react';
import Link from 'next/link';
import { useTheme } from '../contexts/ThemeContext';
import ThemeToggle from './ThemeToggle';
import { lightTheme, darkTheme } from '../lib/colors';

export default function LoginForm({
  title,
  subtitle,
  onLogin,
  inputType = 'password',
  usernamePlaceholder,
  passwordPlaceholder,
  showUsername = false
}) {
  const { isDark } = useTheme();
  const theme = isDark ? darkTheme : lightTheme;
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    const result = await onLogin(username, password);
    setLoading(false);

    if (!result.success) {
      setError(result.message);
      setTimeout(() => setError(''), 3000);
      setPassword('');
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4 transition-colors"
      style={{ background: theme.background, color: theme.text }}
    >
      <div className="max-w-md w-full">
        <div className="flex justify-between items-center mb-6">
          <Link href="/" className="flex items-center gap-2 hover:underline" style={{ color: theme.textSecondary }}>
            ← Volver al inicio
          </Link>
          <ThemeToggle />
        </div>

        <div
          className="rounded-2xl shadow-2xl p-8"
          style={{ background: theme.surface }}
        >
          <div className="text-center mb-6">
            <div
              className="rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-4 text-white"
              style={{ background: theme.primary }}
            >
              <UserCheck className="w-10 h-10" />
            </div>
            <h2 className="text-3xl font-bold" style={{ color: theme.text }}>
              {title}
            </h2>
            <p className="mt-2" style={{ color: theme.textSecondary }}>
              {subtitle}
            </p>
          </div>

          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4 dark:bg-red-900 dark:text-red-200">
              ❌ {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {showUsername && (
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder={usernamePlaceholder || "Usuario"}
                className="w-full px-4 py-3 border-2 rounded-lg focus:outline-none transition-colors"
                style={{
                  borderColor: theme.border,
                  background: isDark ? '#0f1419' : '#fff',
                  color: theme.text,
                }}
                required
              />
            )}

            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSubmit(e)}
                placeholder={passwordPlaceholder || "Contraseña"}
                className="w-full px-4 py-3 pr-12 border-2 rounded-lg focus:outline-none transition-colors"
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
                className="absolute right-3 top-1/2 transform -translate-y-1/2 p-1 hover:opacity-70 transition cursor-pointer"
                style={{ color: theme.textSecondary }}
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full text-white py-3 rounded-lg font-semibold hover:opacity-90 transition disabled:opacity-50 cursor-pointer"
              style={{ background: theme.primary }}
            >
              {loading ? '⏳ Verificando...' : '🔓 Ingresar'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}