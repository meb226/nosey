/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    return [
      {
        // Tasting data is never cached. Pull-to-refresh in standalone mode
        // will reload mid-session; these must always hit the server.
        source: '/:path(session|log)/:rest*',
        headers: [{ key: 'Cache-Control', value: 'no-store, must-revalidate' }],
      },
    ]
  },
}

export default nextConfig
