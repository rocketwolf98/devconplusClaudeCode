/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  presets: [require('nativewind/preset')],
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
        // Slate scale (matches prototype CSS vars)
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
        DEFAULT: '12px',
        sm: '8px',
        lg: '20px',
        xl: '24px',
        pill: '30px',
      },
    },
  },
  plugins: [],
}
