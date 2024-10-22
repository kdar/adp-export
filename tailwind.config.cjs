/** @type {import('tailwindcss').Config} */
module.exports = {
  prefix: 'tw-',
  // important: "#adp-export-app",
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {},
    colors: {
      'primary-shade': 'color-mix(in srgb, oklch(var(--p)), black 40%)'
    }
  },
  plugins: [require('daisyui')],
  daisyui: {
  }
};
