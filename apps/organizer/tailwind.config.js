/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        blue: {
          DEFAULT: '#3B5BDE',
          dark: '#2F48C0',
          light: '#5B7BF8',
        },
        navy: '#1E2A56',
        gold: '#F8C630',
        promoted: '#F97316',
        green: '#21C45D',
        red: '#EF4444',
        slate: {
          50: '#F8FAFC',
          100: '#F1F5F9',
          200: '#E2E8F0',
          300: '#CBD5E1',
          400: '#94A3B8',
          500: '#64748B',
          700: '#334155',
          900: '#0F172A',
        },
      },
      fontFamily: {
        sans: ['Geist', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        xl: '20px',
        '2xl': '24px',
      },
      boxShadow: {
        card: '0 1px 4px rgba(0,0,0,0.07)',
        blue: '0 4px 24px rgba(59,91,222,0.12)',
      },
    },
  },
  plugins: [],
}
