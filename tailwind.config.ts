import type { Config } from 'tailwindcss'

export default {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // The ground, and the lighter wash it fades from at the top.
        ground: '#dfa3f5',
        groundtop: '#e9bcf9',

        // Folders: a row is this colour with white type. Open goes one step
        // deeper so open-versus-shut reads without the card changing colour.
        folder: '#9900cc',
        folderopen: '#7d00a8',
        onfolder: '#ffffff',
        onfoldermuted: '#eacff5',

        // Anything you type into is white with dark type.
        ink: '#241a2b',
        muted: '#6f6479',
        empty: '#b8aec2',
        hairline: '#ddd4e4',

        // On the ground itself.
        headline: '#2a1338',
        sub: '#3d2050',

        // The one control that commits a note, and the favourite star.
        amber: '#f2ac13',
      },
      fontFamily: {
        sans: ['var(--font-epilogue)', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
} satisfies Config
