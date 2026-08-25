import type { Config } from 'tailwindcss'

export default {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#1a1614',
        paper: '#faf7f2',
        wine: '#6b2440',
        muted: '#8a7f78',
        line: '#e3dcd2',
      },
    },
  },
  plugins: [],
} satisfies Config
