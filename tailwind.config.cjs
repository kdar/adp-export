/** @type {import('tailwindcss').Config} */
module.exports = {
  prefix: 'tw-',
  // important: "#adp-export-app",
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {},
  },
  plugins: [require('daisyui')],
  daisyui: {
  }
};
