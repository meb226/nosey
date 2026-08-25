import type { Config } from 'tailwindcss'
import palette from './palette.json'

/**
 * Colour lives in palette.json, which scripts/generate-icons.mjs reads too —
 * so the home-screen icon and the UI cannot drift apart. Do not add a hex here.
 */
const { _comment, _logo, ...colors } = palette

export default {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors,
      fontFamily: {
        sans: ['var(--font-epilogue)', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
} satisfies Config
