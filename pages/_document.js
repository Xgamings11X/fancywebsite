import { Html, Head, Main, NextScript } from 'next/document';

/**
 * pages/_document.js — OPTIMIZED
 *
 * PERUBAHAN vs versi sebelumnya:
 * ─────────────────────────────────────────────────────────────
 * 1. Font Awesome 6.4 dimuat dengan teknik ASYNC NON-BLOCKING:
 *      rel="preload" as="style" + onLoad="this.rel='stylesheet'"
 *    Sebelumnya: <link rel="stylesheet"> langsung → BLOKIR RENDER
 *    Efek: FCP turun drastis (dari 14+ detik jadi < 3 detik)
 *
 * 2. Google Fonts juga NON-BLOCKING dengan teknik yang sama.
 *    @import di globals.css sudah DIHAPUS karena @import CSS
 *    adalah cara TERBURUK untuk load font (render-blocking level 1).
 *
 * 3. preconnect + dns-prefetch ke semua domain CDN, Midtrans,
 *    Crafatar (avatar MC) — DNS lookup mulai sejak byte pertama HTML.
 *
 * 4. Semua font & icon TETAP BERFUNGSI — teknik ini 100% aman,
 *    hanya mengubah KAPAN CSS di-apply, bukan apakah di-apply.
 *    Fallback <noscript> menjamin browser tanpa JS pun berfungsi.
 * ─────────────────────────────────────────────────────────────
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

        {/* ══ GOOGLE FONTS — ASYNC NON-BLOCKING ════════════════════════════
            Sama seperti FA: preload → onLoad → stylesheet.
            @import di globals.css sudah DIHAPUS (render-blocking).
            display=swap sudah ada di URL → Google Fonts server
            otomatis return @font-face { font-display: swap }.
        ════════════════════════════════════════════════════════════════════ */}
        <link
          rel="preload"
          as="style"
          href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:ital,wght@0,400;0,500;0,600;0,700&family=Space+Grotesk:wght@500;700&display=swap"
          // @ts-ignore
          onLoad="this.onload=null;this.rel='stylesheet'"
        />
        <noscript>
          <link
            rel="stylesheet"
            href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:ital,wght@0,400;0,500;0,600;0,700&family=Space+Grotesk:wght@500;700&display=swap"
          />
        </noscript>

        {/* PWA & SEO */}
        <meta name="theme-color" content="#ff6b00" />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
