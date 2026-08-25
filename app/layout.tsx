import type { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Wino',
  description: 'Write it down first. Then find out what it was.',
  appleWebApp: { capable: true, statusBarStyle: 'default', title: 'Wino' },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  // The taste screen's controls sit where the home indicator is.
  viewportFit: 'cover',
  // Safari zooms on focus for inputs under 16px and never zooms back.
  // Inputs are 16px+ in globals.css, so we can leave pinch-zoom alone.
  themeColor: '#faf7f2',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-paper text-ink antialiased">{children}</body>
    </html>
  )
}
