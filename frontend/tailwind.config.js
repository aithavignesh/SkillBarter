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
          50: '#edf8fc',
          100: '#d8eff7',
          200: '#b8dfed',
          300: '#91cbe0',
          400: '#70b8d6',
          500: '#55a6c9',
          600: '#478eae',
          700: '#427a93',
          800: '#356276',
          900: '#294b5a',
          950: '#172c36',
        },
        surface: {
          900: '#171d21',
          800: '#1e2529',
          700: '#252d32',
          600: '#2c3439',
          500: '#374147',
        },
        trust: {
          50: '#edf8fc',
          100: '#d8eff7',
          500: '#55a6c9',
          600: '#478eae',
          700: '#356276',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      boxShadow: {
        subtle: '0 1px 3px 0 rgba(0, 0, 0, 0.22), 0 1px 2px 0 rgba(0, 0, 0, 0.16)',
        premium: '0 14px 35px -8px rgba(0, 0, 0, 0.32), 0 8px 16px -8px rgba(0, 0, 0, 0.24)',
        card: '0 0 0 1px rgba(255, 255, 255, 0.06), 0 14px 34px rgba(0, 0, 0, 0.22)',
      }
    },
  },
  plugins: [],
}
