/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'dark': {
          900: '#0a0a0f',
          800: '#12121a',
          700: '#1a1a24',
          600: '#22222e',
          500: '#2a2a38',
        },
        'accent': {
          green: '#22c55e',
          red: '#d4af37',
          blue: '#3b82f6',
          gold: '#d4af37',
        },
        'bid': '#22c55e',
        'ask': '#3b82f6',
        'gold': '#d4af37',
      }
    },
  },
  plugins: [],
}
