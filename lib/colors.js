// Paleta de colores PRG - Profesional y moderna
export const colors = {
  // Primarios PRG
  primary: {
    light: '#203b70', // Azul oscuro PRG
    main: '#1a2e47',  // Azul más profundo
    dark: '#0f1d2d',
  },
  // Secundarios
  secondary: {
    light: '#d4af37', // Dorado/Oro
    main: '#b8941f',
    dark: '#8a6d15',
  },
  // Acentos
  accent: {
    green: '#2ecc71', // Verde éxito
    red: '#e74c3c',   // Rojo error
    orange: '#f39c12', // Naranja warning
    blue: '#3498db',  // Azul información
  },
  // Neutrales
  neutral: {
    white: '#f9f9f9',
    light: '#f8f9fa',
    medium: '#e9ecef',
    dark: '#495057',
    darker: '#212529',
  },
};

export const lightTheme = {
  background: colors.neutral.white,
  surface: '#f8f9fa',
  text: colors.neutral.darker,
  textSecondary: colors.neutral.dark,
  border: colors.neutral.medium,
  primary: colors.primary.main,
  primaryLight: colors.primary.light,
  secondary: colors.secondary.light,
};

export const darkTheme = {
  background: '#0f1419',
  surface: '#1a1f2e',
  text: colors.neutral.white,
  textSecondary: '#b0b0b0',
  border: '#2d3748',
  primary: colors.primary.light,
  primaryLight: '#2a4a7c',
  secondary: colors.secondary.light,
};
