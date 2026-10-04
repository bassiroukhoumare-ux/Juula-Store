import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#1E60F8',
          hover: '#164ED0',
          light: '#EFF4FF',
          50: '#EFF6FF',
          100: '#DBEAFE',
          500: '#1E60F8',
          600: '#164ED0',
          700: '#1D4ED8',
        },
        slate: {
          app: '#F2F4F7',
          card: '#FFFFFF',
          border: '#E5E9F0',
        },
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'sans-serif'],
      },
      boxShadow: {
        soft: '0 2px 10px rgba(15, 23, 42, 0.03)',
        card: '0 1px 3px 0 rgba(0, 0, 0, 0.02), 0 1px 2px -1px rgba(0, 0, 0, 0.02)',
      },
      borderRadius: {
        '2.5xl': '1.375rem',
        '3xl': '1.75rem',
      },
    },
  },
  plugins: [],
};

export default config;
