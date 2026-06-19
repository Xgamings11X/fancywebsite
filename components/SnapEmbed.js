/**
 * components/SnapEmbed.js
 *
 * Menanam (embed) box pembayaran RESMI Midtrans Snap langsung ke dalam halaman
 * lewat sebuah <div>. Ini BUKAN Snap pop-up (snap.pay) dan BUKAN UI pembayaran
 * custom (Core API) — daftar metode pembayaran yang tampil 100% datang dari
 * Midtrans sendiri, hanya wadahnya saja yang menyatu dengan halaman.
 *
 * Cara kerja:
 * 1. Load <script src=".../snap/snap.js" data-client-key="..."> dari Midtrans.
 * 2. Setelah script siap, panggil `window.snap.embed(snapToken, { embedId, ... })`.
 * 3. Midtrans merender pilihan metode pembayaran resmi di dalam <div id={embedId}>.
 *
 * Props:
 * - snapToken  (wajib) → token dari backend (lihat lib/midtrans.js → createSnapTransaction)
 * - embedId    (opsional, default 'snap-container') → id elemen <div> tempat embed
 * - onSuccess / onPending / onError / onClose (opsional) → callback dari Snap
 *
 * ENV yang dipakai (sudah ada di .env.example):
 * - NEXT_PUBLIC_MIDTRANS_CLIENT_KEY
 * - NEXT_PUBLIC_MIDTRANS_ENV  ('sandbox' | 'production')
 */
import { useEffect, useRef, useState } from 'react';
import Script from 'next/script';

const isProdEnv = process.env.NEXT_PUBLIC_MIDTRANS_ENV === 'production';

// URL resmi Snap.js dari Midtrans — beda untuk sandbox vs production.
const SNAP_JS_URL = isProdEnv
  ? 'https://app.midtrans.com/snap/snap.js'
  : 'https://app.sandbox.midtrans.com/snap/snap.js';

const CLIENT_KEY = process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY || '';

export default function SnapEmbed({
  snapToken,
  embedId = 'snap-container',
  onSuccess,
  onPending,
  onError,
  onClose,
  style,
}) {
  const [scriptReady, setScriptReady] = useState(false);
  const [embedError,  setEmbedError]  = useState(null);

  // Simpan token yang SUDAH di-embed, supaya snap.embed() tidak dipanggil ulang
  // di setiap re-render (mis. saat polling status tiap 3 detik) — kalau dipanggil
  // ulang, form yang sedang diisi user di dalam box Midtrans akan ke-reset.
  const embeddedTokenRef = useRef(null);

  useEffect(() => {
    if (!scriptReady || !snapToken) return;
    if (embeddedTokenRef.current === snapToken) return;

    if (!window.snap || typeof window.snap.embed !== 'function') {
      setEmbedError('Snap.js belum siap. Coba refresh halaman.');
      return;
    }

    // ⬇️ INI BAGIAN UTAMANYA: snap.embed(), BUKAN snap.pay()
    window.snap.embed(snapToken, {
      embedId,
      onSuccess: (result) => onSuccess?.(result),
      onPending: (result) => onPending?.(result),
      onError:   (result) => onError?.(result),
      onClose:   ()       => onClose?.(),
    });

    embeddedTokenRef.current = snapToken;
  }, [scriptReady, snapToken, embedId]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <>
      <Script
        src={SNAP_JS_URL}
        data-client-key={CLIENT_KEY}
        strategy="afterInteractive"
        onReady={() => setScriptReady(true)}
        onError={() => setEmbedError('Gagal memuat Snap.js dari Midtrans. Periksa koneksi internet kamu.')}
      />

      {embedError && (
        <p style={{ fontSize: 12.5, color: '#ff3b30', marginBottom: 10 }}>{embedError}</p>
      )}

      {/* Wadah resmi tempat Midtrans merender pilihan pembayarannya */}
      <div id={embedId} style={{ minHeight: 420, width: '100%', ...style }} />
    </>
  );
}
