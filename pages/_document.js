import { Html, Head, Main, NextScript } from 'next/document';

/**
 * Dokumen global: koneksi awal untuk font/avatar/payment dan font publik.
 * Google Fonts dimuat sebagai stylesheet biasa agar Outfit dan Plus Jakarta
 * Sans selalu aktif pada SSR maupun navigasi client.
 */
export default function Document() {
  return (
    <Html lang="id">
      <Head>
        {/* ══ PRECONNECT — DNS + TLS handshake dimulai secepat mungkin ════ */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />

        {/* DNS prefetch untuk domain yang tidak perlu koneksi awal */}
        <link rel="dns-prefetch" href="https://app.sandbox.midtrans.com" />
        <link rel="dns-prefetch" href="https://app.midtrans.com" />
        <link rel="dns-prefetch" href="https://crafatar.com" />
        <link rel="dns-prefetch" href="https://minotar.net" />

        {/* Font publik. Stylesheet biasa dipakai agar font benar-benar aktif
            pada SSR maupun navigasi client. display=swap mencegah blank text. */}
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Outfit:wght@500;600;700;800&display=swap"
        />

        {/* PWA & SEO */}
        <meta name="theme-color" content="#f97316" />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
