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
        brand: {
          blue: '#1A6B8A',
          dark: '#0D4D65',
          light: '#D6EAF3',
        },
        success: {
          green: '#27AE60',
          light: '#D5F0E0',
        },
        alert: {
          orange: '#E67E22',
          red: '#C0392B',
        },
        neutral: {
          dark: '#2C3E50',
          grey: '#7F8C8D',
          light: '#ECF0F1',
          white: '#FFFFFF',
        },
        accent: {
          purple: '#6C3483',
        }
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Helvetica', 'Arial', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
