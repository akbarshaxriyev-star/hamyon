export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        sandiq: {
          green: '#10b981', // Premium green
          dark: '#0f172a',  // Apple dark mode slate
          glass: 'rgba(255, 255, 255, 0.05)',
        }
      },
      backdropBlur: {
        'xs': '2px',
      }
    },
  },
  plugins: [],
}
