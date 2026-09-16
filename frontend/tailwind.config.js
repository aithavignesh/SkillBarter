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
          50: '#effaff',
          100: '#dff7ff',
          200: '#b9efff',
          300: '#7ddfff',
          400: '#38c9f4',
          500: '#16b9ea',
          600: '#089ed0',
          700: '#0780aa',
          800: '#086a8b',
          900: '#0a5873',
          950: '#063b4e',
        },
        surface: {
          900: '#0b1015',
          800: '#11171d',
          700: '#171d23',
          600: '#20272e',
          500: '#29323a',
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
        subtle: '0 1px 3px 0 rgba(0, 0, 0, 0.22), 0 1px 2px 0 rgba(0, 0, 0, 0.16)',
        premium: '0 16px 40px -10px rgba(0, 0, 0, 0.34), 0 8px 18px -8px rgba(0, 0, 0, 0.24)',
        card: '0 0 0 1px rgba(255, 255, 255, 0.06), 0 16px 36px rgba(0, 0, 0, 0.24)',
      }
    },
  },
  plugins: [],
}
