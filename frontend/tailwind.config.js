/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          dark: '#121212',
          card: '#18181b',
          blue: '#0071e3',
          'blue-hover': '#0077ed',
          green: '#1e3a2f',
          'green-dark': '#132820',
          'green-light': '#2d6a4f',
          'green-soft': '#edf4ee',
        },
      },
      maxWidth: {
        '8xl': '88rem',
      },
    },
  },
  plugins: [],
};
