import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Light theme
        'light-bg': '#F5F7FA',
        'light-surface': '#FFFFFF',
        'light-card': '#FFFFFF',
        'light-primary': '#2979FF',
        'light-secondary': '#00BCD4',
        'light-accent': '#2979FF',
        'light-error': '#F44336',
        'light-success': '#4CAF50',
        'light-warning': '#FF9800',
        'light-text-primary': '#0A1929',
        'light-text-secondary': '#546E7A',
        'light-text-tertiary': '#90A4AE',
        'light-outline': '#CFD8DC',
        'light-card-border': '#E0E0E0',

        // Dark theme
        'dark-bg': '#0A1929',
        'dark-surface': '#1A2332',
        'dark-card': '#1E2A3A',
        'dark-primary': '#2979FF',
        'dark-secondary': '#00BCD4',
        'dark-accent': '#2979FF',
        'dark-error': '#F44336',
        'dark-success': '#4CAF50',
        'dark-warning': '#FF9800',
        'dark-text-primary': '#ECEFF1',
        'dark-text-secondary': '#B0BEC5',
        'dark-text-tertiary': '#78909C',
        'dark-outline': '#37474F',
        'dark-card-border': '#263238',
      },
    },
  },
  plugins: [],
};

export default config;
