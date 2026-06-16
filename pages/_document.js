import { Html, Head, Main, NextScript } from 'next/document';

export default function Document() {
  return (
    <Html lang="id">
      <Head>
        {/* ✅ PERFORMA: Preconnect ke semua CDN penting
            Browser mulai handshake lebih awal → FCP turun */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://cdnjs.cloudflare.com" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://upload.wikimedia.org" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://logo.clearbit.com" crossOrigin="anonymous" />

        {/* ✅ DNS prefetch untuk Midtrans payment gateway */}
        <link rel="dns-prefetch" href="https://app.sandbox.midtrans.com" />
        <link rel="dns-prefetch" href="https://app.midtrans.com" />
        <link rel="dns-prefetch" href="https://crafatar.com" />
        <link rel="dns-prefetch" href="https://minotar.net" />

        {/* ✅ PERFORMA: Google Fonts NON-BLOCKING
            media="print" lalu onLoad="this.media='all'" = load async
            tidak blokir render sama sekali */}
        <link
          href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&family=Space+Grotesk:wght@500;700&display=swap"
          rel="stylesheet"
          media="print"
          // @ts-ignore — onLoad diperbolehkan di Next.js _document
          onLoad="this.media='all'"
        />
        {/* Fallback untuk pengguna tanpa JavaScript */}
        <noscript>
          <link
            href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&family=Space+Grotesk:wght@500;700&display=swap"
            rel="stylesheet"
          />
        </noscript>

        {/* ✅ PERFORMA: Font Awesome NON-BLOCKING
            Tanpa ini, FA memblokir render dan menyebabkan FCP anjlok.
            Dengan media="print" + onLoad, ikon muncul setelah page load
            tanpa menghalangi konten utama tampil. */}
        <link
          rel="stylesheet"
          href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css"
          media="print"
          // @ts-ignore
          onLoad="this.media='all'"
          integrity="sha512-iecdLmaskl7CVkqkXNQ/ZH/XLlvWZOJyj7Yy7tcenmpD1ypASozpmT/E0iPtmFIB46ZmdtAc9eNBvH0H/ZpiBw=="
          crossOrigin="anonymous"
        />
        <noscript>
          <link
            rel="stylesheet"
            href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css"
          />
        </noscript>

        {/* PWA theme color */}
        <meta name="theme-color" content="#ff6b00" />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
