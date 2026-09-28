/** @type {import('tailwindcss').Config} */
export default {
  // The stats page (src/stats) has its own stylesheet and doesn't use Tailwind.
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}', '!./src/stats/**'],
  theme: {
    extend: {},
  },
  plugins: [],
};
