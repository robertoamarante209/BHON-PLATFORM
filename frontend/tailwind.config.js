/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bhon: {
          navy: '#0F1115',
          'navy-hover': '#202329',
          teal: '#00B894',
          'teal-dark': '#00A383',
          'teal-subtle': '#12342F',
          gold: '#B79A63',
          ivory: '#F8F9F7',
          bg: '#0F1115',
          surface: '#181A1F',
          text: '#F8F9F7',
          muted: '#9CA3AF',
          border: '#2A2D32',
          'border-strong': '#3A3E45',
          
          // Status semafóricos operacionais estritos
          critical: '#D9383A',
          'critical-bg': '#FDF2F2',
          warning: '#D97706',
          'warning-bg': '#FEF3C7',
          attention: '#2563EB',
          'attention-bg': '#EFF6FF',
          success: '#059669',
          'success-bg': '#ECFDF5',
        }
      },
      fontFamily: {
        sans: ['Manrope', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['Manrope', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'monospace'],
      }
    },
  },
  plugins: [],
}
