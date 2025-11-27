/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        mono: ['"Share Tech Mono"', 'monospace'],
      },
      colors: {
        'muse': {
          'primary': '#4ade80',
          'secondary': '#22d3ee',
          'accent': '#facc15',
          'dark': '#0a0a0a',
        }
      }
    },
  },
  plugins: [],
}
