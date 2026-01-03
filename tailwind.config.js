/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Wir definieren ein extrem helles Orange für den Test
        stride: "#FF5500", 
      },
    },
  },
  plugins: [],
}