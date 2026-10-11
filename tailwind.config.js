export default {
  content: [
    "./client/index.html",
    "./client/src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        lazo: {
          50: '#FBF9F6',
          100: '#F5F1EB',
          200: '#ECE3D7',
          300: '#DECFC0',
          400: '#CCAFA2',
          500: '#B89785',
          600: '#9E7864',
          700: '#7F5E4D',
          800: '#5C4438',
          900: '#3D2D25',
          gold: '#C5A880',
          champagne: '#E7DFD5',
          dark: '#1C1917',
          olive: '#606C5D',
          rose: '#D4A373'
        }
      },
      fontFamily: {
        serif: ['"Cormorant Garamond"', 'Playfair Display', 'Georgia', 'serif'],
        sans: ['"Plus Jakarta Sans"', 'Inter', 'system-ui', '-apple-system', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
