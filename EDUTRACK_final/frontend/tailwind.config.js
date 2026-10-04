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
          light: '#E7ECEF',           // Fundo da página (tema claro)
          'light-hover': '#D8E0E5',
          'light-card': '#FFFFFF',    // Superfície/card (tema claro)
          dark: '#2C2E4C',            // Superfície/card (tema escuro), texto no claro
          'dark-bg': '#16172B',       // Fundo da página (tema escuro)
          'dark-surface': '#20223A',
          'dark-card': '#2C2E4C',
          'dark-card-hover': '#373A5E',
          'text-secondary-light': '#4A4D70',
          'text-secondary-dark': '#B8BED0',
          gold: '#C8B755',            // Destaque (botões, badges, bordas)
          'gold-text-light': '#6B6019', // Dourado escurecido para contraste WCAG AA no tema claro
          'gold-hover': '#B7A442',
          'gold-light': '#F4EFCF',
        }
      },
      fontFamily: {
        jost: ['Jost', 'sans-serif'],
      },
      minHeight: {
        touch: '44px',
      },
      minWidth: {
        touch: '44px',
      }
    },
  },
  plugins: [],
}
