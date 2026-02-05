/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['sans-serif'],
      },
      colors: {
        primary: {
          50: '#f0f0ff',
          100: '#e6e6ff',
          200: '#d1d1ff',
          300: '#b3b3ff',
          400: '#8e8eff',
          500: '#5955D1',
          600: '#4a46b8',
          700: '#3d3a9f',
          800: '#333085',
          900: '#2d2a6f',
          DEFAULT: '#5955D1',
          dark: '#4a46b8',
        },
        secondary: '#6c757d',
        success: '#28a745',
        danger: '#dc3545',
        warning: '#ffc107',
        info: '#17a2b8',
        light: '#f8f9fa',
        dark: '#1C274C',
      },
    },
  },
  plugins: [],
}

