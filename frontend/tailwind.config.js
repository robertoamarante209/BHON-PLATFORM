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
          navy: 'var(--color-navy)',
          'navy-hover': 'var(--color-navy-hover)',
          teal: 'var(--color-teal)',
          'teal-dark': 'var(--color-teal-dark)',
          'teal-subtle': 'var(--color-teal-subtle)',
          gold: '#B79A63',
          ivory: '#F8F9F7',
          bg: 'var(--color-bg)',
          surface: 'var(--color-surface)',
          text: 'var(--color-text)',
          muted: 'var(--color-muted)',
          border: 'var(--color-border)',
          'border-strong': 'var(--color-border-strong)',
          
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
