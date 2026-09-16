/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f5f3ff',
          100: '#ede9fe',
          200: '#ddd6fe',
          300: '#c4b5fd',
          400: '#a78bfa',
          500: '#8b5cf6',
          600: '#7c3aed',
          700: '#6d28d9',
          800: '#5b21b6',
          900: '#4c1d95',
          950: '#2e1065',
        },
        surface: {
          900: '#0d1016',
          800: '#12161d',
          700: '#171b24',
          600: '#1d222c',
          500: '#252b36',
        },
        trust: {
          50: '#fefce8',
          100: '#fef9c3',
          500: '#eab308',
          600: '#ca8a04',
          700: '#a16207',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      boxShadow: {
        'subtle': '0 1px 3px 0 rgba(0, 0, 0, 0.18), 0 1px 2px 0 rgba(0, 0, 0, 0.14)',
        'premium': '0 14px 35px -8px rgba(0, 0, 0, 0.28), 0 8px 16px -8px rgba(0, 0, 0, 0.20)',
        'card': '0 0 0 1px rgba(255, 255, 255, 0.06), 0 14px 34px rgba(0, 0, 0, 0.20)',
      }
    },
  },
  plugins: [],
}
