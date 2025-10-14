/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f6f7f9',
          100: '#eceff3',
          200: '#d7dee6',
          300: '#b6c2cf',
          400: '#8fa3b6',
          500: '#6b879f',
          600: '#536c85',
          700: '#42566a',
          800: '#374657',
          900: '#2f3b49',
        },
      },
    },
  },
  plugins: [],
}


