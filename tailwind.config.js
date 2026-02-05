/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Colores principales del sistema
        primary: '#22c55e',
        'primary-50': '#f0fdf4',
        'primary-100': '#dcfce7',
        'primary-200': '#bbf7d0',
        'primary-300': '#86efac',
        'primary-400': '#4ade80',
        'primary-500': '#22c55e',
        'primary-600': '#16a34a',
        'primary-700': '#15803d',
        'primary-800': '#166534',
        'primary-900': '#14532d',
        // Fondo oscuro principal
        dark: {
          100: '#2d2d44',
          200: '#252538',
          300: '#1f1f30',
          400: '#1a1a2e',
          500: '#16162a',
          600: '#121225',
          700: '#0f0f20',
          800: '#0c0c1a',
          900: '#080814',
        },
        // Alertas y estados
        danger: '#ef4444',
        warning: '#f59e0b',
        success: '#22c55e',
        info: '#3b82f6',
      },
      fontFamily: {
        sans: ['Inter', 'Roboto', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      fontSize: {
        'price-xl': ['2.5rem', { lineHeight: '1', fontWeight: '700' }],
        'price-lg': ['2rem', { lineHeight: '1', fontWeight: '700' }],
        'product': ['1.125rem', { lineHeight: '1.2', fontWeight: '600' }],
      },
      spacing: {
        'btn-product': '120px',
      },
      animation: {
        'pulse-fast': 'pulse 0.5s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'glow': 'glow 0.3s ease-out',
        'slide-in': 'slideIn 0.2s ease-out',
        'shake': 'shake 0.5s cubic-bezier(.36,.07,.19,.97) both',
      },
      keyframes: {
        glow: {
          '0%': { boxShadow: '0 0 0 0 rgba(34, 197, 94, 0.7)' },
          '100%': { boxShadow: '0 0 20px 10px rgba(34, 197, 94, 0)' },
        },
        slideIn: {
          '0%': { transform: 'translateX(100%)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        shake: {
          '10%, 90%': { transform: 'translate3d(-1px, 0, 0)' },
          '20%, 80%': { transform: 'translate3d(2px, 0, 0)' },
          '30%, 50%, 70%': { transform: 'translate3d(-4px, 0, 0)' },
          '40%, 60%': { transform: 'translate3d(4px, 0, 0)' },
        },
      },
      boxShadow: {
        'product': '0 4px 6px -1px rgba(0, 0, 0, 0.3), 0 2px 4px -2px rgba(0, 0, 0, 0.3)',
        'product-hover': '0 10px 15px -3px rgba(0, 0, 0, 0.3), 0 4px 6px -4px rgba(0, 0, 0, 0.3)',
        'cart': '0 -4px 20px rgba(0, 0, 0, 0.3)',
        'overlay': '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
      },
      transitionDuration: {
        '50': '50ms',
      },
    },
  },
  plugins: [],
}
