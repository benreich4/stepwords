/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  corePlugins: {
    preflight: true,
  },
  theme: {
    extend: {
      fontFamily: {
        serif: ['Lora', 'Georgia', 'Cambria', 'Times New Roman', 'serif'],
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
        crossword: ['Libre Franklin', 'Franklin Gothic Medium', 'Arial Narrow', 'Arial', 'Helvetica Neue', 'sans-serif'],
      },
      colors: {
        // Brand navy (primary actions, accents)
        brand: {
          50: '#eef3f8',
          100: '#d7e2ee',
          300: '#7fa0c2',
          500: '#3a648f',
          600: '#2b4d72',
          700: '#1f3a5c',
          800: '#162c46',
          900: '#0f1f33',
        },
        // Warm gold (Quick / highlights / stars)
        gold: {
          400: '#d9b44a',
          500: '#c79a2e',
          600: '#a87f20',
        },
        // Light-mode warm parchment surfaces
        parchment: {
          50: '#fdfbf6',
          100: '#f3ecdd',
          200: '#e7dcc7',
          300: '#d8c9ab',
          400: '#c4b18d',
        },
        // Dark-mode deep navy surfaces
        navyink: {
          900: '#0c1626',
          850: '#101d31',
          800: '#152337',
          700: '#1c2d44',
          600: '#283b56',
        },
      },
      boxShadow: {
        card: '0 1px 2px rgba(16, 31, 51, 0.04), 0 8px 24px -12px rgba(16, 31, 51, 0.18)',
        'card-dark': '0 1px 2px rgba(0, 0, 0, 0.3), 0 12px 32px -16px rgba(0, 0, 0, 0.6)',
      },
      keyframes: {
        'fade-in-up': {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'fade-in-up': 'fade-in-up 0.45s cubic-bezier(0.22, 1, 0.36, 1) both',
      },
    },
  },
  plugins: [],
}
