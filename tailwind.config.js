/** @type {import('tailwindcss').Config} */
export default {
  content:  ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          50:  '#F0F9F4',
          100: '#D8F0E3',
          200: '#B0E0C7',
          300: '#7DC9A4',
          400: '#4DB87A',
          500: '#2D7A4F',
          600: '#256641',
          700: '#1B5233',
          800: '#123D26',
          900: '#0A2918',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      borderRadius: { '2xl': '1rem', '3xl': '1.5rem' },
      boxShadow: {
        'card':     '0 1px 4px 0 rgb(0 0 0 / .06), 0 1px 2px -1px rgb(0 0 0 / .04)',
        'card-hover':'0 4px 12px 0 rgb(0 0 0 / .10)',
        'glow':     '0 0 20px rgba(45,122,79,.25)',
        'glow-lg':  '0 0 40px rgba(45,122,79,.18)',
      },
      animation: {
        'fade-up':   'fadeUp .4s ease forwards',
        'fade-in':   'fadeIn .25s ease forwards',
        'pulse-slow':'pulse 3s ease-in-out infinite',
      },
      keyframes: {
        fadeUp:  { from:{opacity:0,transform:'translateY(12px)'}, to:{opacity:1,transform:'translateY(0)'} },
        fadeIn:  { from:{opacity:0}, to:{opacity:1} },
      }
    }
  },
  plugins: []
}
