/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'card-red': '#dc2626',
        'card-black': '#1f2937',
        'felt-green': '#166534',
        'felt-dark': '#14532d',
      },
      fontFamily: {
        'display': ['Space Grotesk', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
