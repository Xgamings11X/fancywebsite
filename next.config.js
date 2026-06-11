/** @type {import('next').NextConfig} */
module.exports = {
  reactStrictMode: true,
  compress: true,
  poweredByHeader: false,
  productionBrowserSourceMaps: false,

  // ── Optimasi gambar ──
  images: {
    domains: ['crafatar.com','minotar.net','i.imgur.com','cdn.discordapp.com'],
    unoptimized: true,
    minimumCacheTTL: 86400,
    formats: ['image/webp'],
  },

  // ── Optimasi bundle — hapus console.log di production ──
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production'
      ? { exclude: ['error', 'warn'] }
      : false,
  },

  // ── Webpack — optimasi chunk splitting ──
  webpack(config, { dev, isServer }) {
    if (!dev && !isServer) {
      config.optimization.splitChunks = {
        chunks: 'all',
        cacheGroups: {
          default: false,
          vendors: false,
          // Pisahkan vendor besar jadi chunk terpisah
          framework: {
            name: 'framework',
            chunks: 'all',
            test: /(?<!node_modules.*)[\\/]node_modules[\\/](react|react-dom|scheduler|next)[\\/]/,
            priority: 40,
            enforce: true,
          },
          commons: {
            name: 'commons',
            chunks: 'all',
            minChunks: 2,
            priority: 20,
          },
          lib: {
            test: /[\\/]node_modules[\\/]/,
            name(module) {
              const packageName = module.context.match(/[\\/]node_modules[\\/](.*?)([\\/]|$)/)?.[1] || 'lib';
              return `npm.${packageName.replace('@', '')}`;
            },
            priority: 10,
            minChunks: 1,
            reuseExistingChunk: true,
          },
        },
      };
    }
    return config;
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
      // Gambar upload user — cache 7 hari
      {
        source: '/uploads/(.*)',
        headers: [{ key:'Cache-Control', value:'public, max-age=604800, stale-while-revalidate=86400' }],
      },
      // Font Awesome & webfonts — cache agresif
      {
        source: '/fonts/(.*)',
        headers: [{ key:'Cache-Control', value:'public, max-age=31536000, immutable' }],
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
