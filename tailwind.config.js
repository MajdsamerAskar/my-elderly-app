/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    "./app/**/*.{js,jsx}",
    "./Componet/**/*.{js,jsx}",
    "./components/**/*.{js,jsx}",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        background: 'rgb(var(--background))',
        surface: 'rgb(var(--surface))',
        text: 'rgb(var(--text))',
        'text-secondary': 'rgb(var(--text-secondary))',
        border: 'rgb(var(--border))',
        primary_red: '#E63946',
        primary_blue: '#5B8CFF',        // Your blue brand color
        'primary-dark': '#4A7DE4',
      },
    },
  },
  plugins: [],
}
