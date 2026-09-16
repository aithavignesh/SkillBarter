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
          50: '#fff5f5',
          100: '#ffe4e5',
          200: '#ffc9cb',
          300: '#ff9ea2',
          400: '#f66d73',
          500: '#d31d24',
          600: '#c21a21',
          700: '#b8171d',
          800: '#94151a',
          900: '#711217',
          950: '#4a0c10',
        },
        surface: {
          50: '#ffffff',
          100: '#f7f7f5',
          200: '#f7f8f7',
          300: '#eef1f5',
          400: '#e1e4e8',
          500: '#cfd5dc',
          600: '#aeb7c2',
          700: '#697386',
          800: '#344054',
          900: '#17233b',
        },
        trust: {
          50: '#fff5f5',
          100: '#ffe4e5',
          500: '#d31d24',
          600: '#c21a21',
          700: '#b8171d',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      boxShadow: {
        subtle: '0 1px 3px rgba(23, 35, 59, 0.05), 0 1px 2px rgba(23, 35, 59, 0.03)',
        premium: '0 12px 30px rgba(23, 35, 59, 0.08)',
        card: '0 2px 10px rgba(23, 35, 59, 0.035)',
      }
    },
  },
  plugins: [],
}
