import type { Metadata, Viewport } from 'next'
import { Epilogue } from 'next/font/google'
import './globals.css'

// Self-hosted by next/font: no request to Google at runtime, no layout shift
// when it swaps in, and nothing to load on a phone with one bar of signal.
const epilogue = Epilogue({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-epilogue',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Nosey',
  description: 'Write it down first. Then find out what it was.',
  appleWebApp: { capable: true, statusBarStyle: 'default', title: 'Nosey' },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  // The save button sits where the home indicator is.
  viewportFit: 'cover',
  themeColor: '#dfa3f5',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={epilogue.variable}>
      <body className="bg-ground font-sans text-ink antialiased">{children}</body>
    </html>
  )
}
