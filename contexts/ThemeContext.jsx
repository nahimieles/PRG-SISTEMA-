'use client';

import React, { createContext, useState, useEffect } from 'react';

export const ThemeContext = createContext();

export function ThemeProvider({ children }) {
  const [isDark, setIsDark] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // 1. Initial Load: Read preference
    const saved = localStorage.getItem('theme');
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    if (saved === 'dark') {
      setIsDark(true);
    } else if (saved === 'light') {
      setIsDark(false);
    } else {
      setIsDark(mediaQuery.matches);
    }
    
    setMounted(true);

    // Listen for OS theme changes
    const handleChange = (e) => {
      // Only auto-switch if the user hasn't explicitly saved a preference
      if (!localStorage.getItem('theme')) {
        setIsDark(e.matches);
      }
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  // 2. Sync DOM with State
  useEffect(() => {
    if (!mounted) return;

    const root = document.documentElement;
    if (isDark) {
      root.classList.add('dark');
      root.style.colorScheme = 'dark';
    } else {
      root.classList.remove('dark');
      root.style.colorScheme = 'light';
    }
  }, [isDark, mounted]);

  const toggleTheme = () => {
    setIsDark(prev => {
      const newValue = !prev;
      localStorage.setItem('theme', newValue ? 'dark' : 'light');
      return newValue;
    });
  };

  return (
    <ThemeContext.Provider value={{ isDark, setIsDark, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = React.useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme debe ser usado dentro de ThemeProvider');
  }
  return context;
}
