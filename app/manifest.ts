import type { MetadataRoute } from 'next'
import palette from '@/palette.json'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Nosey',
    short_name: 'Nosey',
    description: 'Write it down first. Then find out what it was.',
    start_url: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: palette.ground,
    theme_color: palette.ground,
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
      // Android crops maskable icons to a circle, so this one carries more
      // padding than the any-purpose entries above.
      { src: '/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  }
}
