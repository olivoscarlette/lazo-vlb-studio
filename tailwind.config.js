export default {
  content: [
    "./client/index.html",
    "./client/src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        lazo: {
          50: '#FCFAF7',
          100: '#F7F3EE',
          200: '#EAE3DA',
          300: '#DDD2C4',
          400: '#B88A82',
          500: '#9C665C',
          600: '#8A574E',
          700: '#70443D',
          800: '#58352F',
          900: '#332A28',
          cream: '#FCFAF7',
          beige: '#F7F3EE',
          sand: '#EAE3DA',
          rose: '#9C665C',
          'rose-dark': '#8A574E',
          blush: '#EFE2DF',
          sage: '#CCDACC',
          'sage-dark': '#455C44',
          dark: '#332A28'
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
