/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        clinic: {
          bg: '#F7F8FA',
          ink: '#16222A',
          teal: '#0F4C5C',
          coral: '#FF6B4A',
        },
      },
    },
  },
  plugins: [],
};
