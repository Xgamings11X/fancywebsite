import { Html, Head, Main, NextScript } from 'next/document';
export default function Document() {
  return (
    <Html lang="id">
      <Head>
        {/* Preconnect untuk CDN utama — mengurangi latency */}
        <link rel="preconnect" href="https://fonts.googleapis.com"/>
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous"/>
        <link rel="preconnect" href="https://cdnjs.cloudflare.com" crossOrigin="anonymous"/>
        <link rel="dns-prefetch" href="https://app.sandbox.midtrans.com"/>
        <link rel="dns-prefetch" href="https://app.midtrans.com"/>

        {/* Google Fonts — async, cegah render-blocking */}
        <link
          href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&family=Space+Grotesk:wght@500;700&display=swap"
          rel="stylesheet"
          media="print"
          onLoad="this.media='all'"
        />
        <noscript>
          <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&family=Space+Grotesk:wght@500;700&display=swap" rel="stylesheet"/>
        </noscript>

        {/* Font Awesome — async, cegah render-blocking, icons tetap muncul */}
        <link
          href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css"
          rel="stylesheet"
          media="print"
          onLoad="this.media='all'"
        />
        <noscript>
          <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" rel="stylesheet"/>
        </noscript>

        <meta name="theme-color" content="#ff6b00"/>
      </Head>
      <body>
        <Main/><NextScript/>
      </body>
    </Html>
  );
}
