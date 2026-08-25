import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Nosey',
    short_name: 'Nosey',
    description: 'Write it down first. Then find out what it was.',
    start_url: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#dfa3f5',
    theme_color: '#dfa3f5',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  }
}
