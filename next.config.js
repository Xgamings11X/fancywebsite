/** @type {import('next').NextConfig} */
module.exports = {
  reactStrictMode: true,
  compress: true,
  poweredByHeader: false,
  productionBrowserSourceMaps: false,

  images: {
    domains: ['crafatar.com','minotar.net','i.imgur.com','cdn.discordapp.com'],
    unoptimized: false,         // aktifkan optimasi gambar Next.js
    minimumCacheTTL: 86400,     // cache gambar 24 jam
    formats: ['image/webp'],
  },

  async headers() {
    return [
      // Static assets — cache 1 tahun
      {
        source: '/_next/static/(.*)',
        headers: [{ key:'Cache-Control', value:'public, max-age=31536000, immutable' }],
      },
      // Gambar publik — cache 7 hari
      {
        source: '/images/(.*)',
        headers: [{ key:'Cache-Control', value:'public, max-age=604800, stale-while-revalidate=86400' }],
      },
      // API tidak di-cache
      {
        source: '/api/(.*)',
        headers: [
          { key:'Cache-Control', value:'no-store, no-cache' },
          { key:'X-Content-Type-Options', value:'nosniff' },
        ],
      },
      // SSE endpoint khusus
      {
        source: '/api/support/events',
        headers: [
          { key:'Cache-Control',      value:'no-cache' },
          { key:'X-Accel-Buffering',  value:'no' },
        ],
      },
      // Security headers semua halaman
      {
        source: '/(.*)',
        headers: [
          { key:'X-Content-Type-Options', value:'nosniff' },
          { key:'X-Frame-Options',        value:'SAMEORIGIN' },
          { key:'Referrer-Policy',        value:'strict-origin-when-cross-origin' },
        ],
      },
    ];
  },
};
