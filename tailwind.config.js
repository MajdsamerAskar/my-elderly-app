/** @type {import('tailwindcss').Config} */
module.exports = {
  // Update these paths if your files are located elsewhere
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        brand: {
          green: '#10b981',
          teal: '#14b8a6',
          blue: '#3b82f6',
        },
        /** Uni Final Project – shared app surfaces & accents */
        uni: {
          primary: '#2D6A4F',
          'primary-soft': '#E8F2EC',
          canvas: '#F8F9FA',
          surface: '#FFFFFF',
          ink: '#1A1A2E',
          muted: '#71717A',
          'muted-light': '#A1A1AA',
          border: '#E4E4E7',
          danger: '#E63946',
          'danger-ring': '#C1121F',
          success: '#52B788',
        },
      },
      borderRadius: {
        'uni-card': '1rem',
        'uni-sheet': '1.75rem',
      },
    },
  },
  plugins: [],
}