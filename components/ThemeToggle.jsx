'use client';
import { useTheme } from '../contexts/ThemeContext';
import { Moon, Sun } from 'lucide-react';
export default function ThemeToggle() {
  const { isDark, toggleTheme } = useTheme();
  return (
    <button
      onClick={toggleTheme}
      className="p-2 rounded-lg transition-colors"
      style={{
        background: isDark ? '#2d3748' : '#e9ecef',
        color: isDark ? '#ffd700' : '#f39c12',
      }}
      title={isDark ? 'Modo claro' : 'Modo oscuro'}
    >
      {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
    </button>
  );
}
