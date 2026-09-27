/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        ibe: {
          yellow: '#FCD011',
          yellowHover: '#E5BC05',
          black: '#121212',
          charcoal: '#1E1E24',
          gray: '#71717A',
          light: '#F8F9FA',
          cream: '#FFFBEB',
        },
      },
      boxShadow: { soft: '0 16px 50px rgba(18, 18, 18, 0.08)' },
    },
  },
  plugins: [],
};

