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
          navy: '#121B2A',
          'navy-hover': '#1A273D',
          teal: '#13AA99',
          'teal-dark': '#0E8073',
          'teal-subtle': '#E6F6F4',
          bg: '#F8FAFB',
          surface: '#FFFFFF',
          text: '#172033',
          muted: '#687386',
          border: '#E4E9EE',
          'border-strong': '#CBD5E1',
          
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
        mono: ['"IBM Plex Mono"', 'monospace'],
      }
    },
  },
  plugins: [],
}
