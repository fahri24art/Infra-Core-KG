/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"IBM Plex Sans"', 'Inter', 'system-ui', 'sans-serif'],
        heading: ['"Rubik"', 'system-ui', 'sans-serif'],
        rubik: ['"Rubik"', 'sans-serif'],
        plex: ['"IBM Plex Sans"', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
