/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './*.html',
    './components/**/*.js',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'Noto Sans TC', 'sans-serif'],
      },
      colors: {
        earth: {
          bg:    '#FAF9F6',
          dark:  '#2A2522',
          muted: '#58504a',
          sage:  '#8A9A86',
        },
      },
    },
  },
  plugins: [],
}
