/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#0B1420',        // near-black navy background
        navy: {
          950: '#0B1420',
          900: '#0F1C2E',
          800: '#152841',
          700: '#1D3557',
          600: '#26456F',
        },
        teal: {
          400: '#4FD1C5',
          500: '#2CB1A3',
          600: '#1E8F84',
        },
        parchment: '#F3EFE6', // warm off-white for text on dark, and light-mode cards
        amber: '#E8A94C',      // accent for AI / "wow" features
      },
      fontFamily: {
        display: ['"Fraunces"', 'serif'],
        body: ['"Inter"', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      boxShadow: {
        glow: '0 0 0 1px rgba(79,209,197,0.15), 0 8px 30px rgba(0,0,0,0.35)',
      },
    },
  },
  plugins: [],
};
