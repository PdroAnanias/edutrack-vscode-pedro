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
          light: '#E7ECEF',      // Fundos dentro do app, cards suaves
          'light-hover': '#D8E0E5',
          dark: '#2C2E4C',       // Fundos auth, sidebar, texto forte
          'dark-surface': '#20223A',
          'dark-card': '#36385B',
          gold: '#C8B755',       // Detalhes, botões, bordas ativas
          'gold-hover': '#B7A442',
          'gold-light': '#F4EFCF',
        }
      },
      fontFamily: {
        jost: ['Jost', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
