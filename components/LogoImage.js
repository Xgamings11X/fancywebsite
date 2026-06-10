/**
 * LogoImage.js
 * Memuat gambar logo dari URL (postimg, Discord CDN, dsb).
 * Jika logo sudah transparent (removebg), langsung tampilkan.
 * Jika berlatar hitam, coba hapus via canvas — dengan fallback berlapis
 * agar tidak blank di device lain (mobile Safari, CORS strict, dsb).
 */
import { useState, useEffect } from 'react';

const RAW_SRC = 'https://i.postimg.cc/T1h4d6Xw/1002511502-removebg-preview.png';

/**
 * Hapus background hitam via canvas.
 * Return: dataURL string jika berhasil, null jika gagal (CORS / dimensi 0).
 */
function removeBlackBg(imgEl, threshold = 40) {
  // Guard: dimensi belum siap → jangan proses (bug mobile Safari)
  if (!imgEl.naturalWidth || !imgEl.naturalHeight) return null;

  const canvas = document.createElement('canvas');
  canvas.width  = imgEl.naturalWidth;
  canvas.height = imgEl.naturalHeight;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(imgEl, 0, 0);

  let imageData;
  try {
    imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  } catch {
    // Canvas tainted (CORS) — tidak bisa getImageData
    return null;
  }

  const data = imageData.data;

  // Deteksi sudut: kalau background tidak hitam, langsung return
  const corners = [
    [0, 0], [canvas.width - 1, 0],
    [0, canvas.height - 1], [canvas.width - 1, canvas.height - 1],
  ];
  let darkCorners = 0;
  for (const [cx, cy] of corners) {
    const i = (cy * canvas.width + cx) * 4;
    if (data[i] < 30 && data[i+1] < 30 && data[i+2] < 30) darkCorners++;
  }
  // Latar tidak hitam → tidak perlu diproses
  if (darkCorners < 2) return canvas.toDataURL('image/png');

  // Flood-fill dari 4 sudut → pixel hitam jadi transparan
  const visited = new Uint8Array(canvas.width * canvas.height);
  const stack   = [];
  const push = (x, y) => {
    if (x < 0 || y < 0 || x >= canvas.width || y >= canvas.height) return;
    const idx = y * canvas.width + x;
    if (visited[idx]) return;
    const i = idx * 4;
    if (data[i] < threshold && data[i+1] < threshold && data[i+2] < threshold) {
      visited[idx] = 1;
      stack.push([x, y]);
    }
  };
  for (const [cx, cy] of corners) push(cx, cy);
  while (stack.length > 0) {
    const [x, y] = stack.pop();
    const i = (y * canvas.width + x) * 4;
    data[i+3] = 0;
    push(x-1, y); push(x+1, y); push(x, y-1); push(x, y+1);
  }

  // Pixel gelap terisolasi
  for (let j = 0; j < data.length; j += 4) {
    if (data[j] < 20 && data[j+1] < 20 && data[j+2] < 20) data[j+3] = 0;
  }

  // Smooth edge
  for (let j = 0; j < data.length; j += 4) {
    if (data[j+3] === 255) {
      const brightness = (data[j] + data[j+1] + data[j+2]) / 3;
      if (brightness < threshold * 2)
        data[j+3] = Math.round((brightness / (threshold * 2)) * 255);
    }
  }

  ctx.putImageData(imageData, 0, 0);
  return canvas.toDataURL('image/png');
}

/** Update favicon halaman */
export function updateFavicon(dataUrl) {
  if (typeof document === 'undefined') return;
  let link = document.querySelector('link[rel~="icon"]');
  if (!link) { link = document.createElement('link'); link.rel = 'icon'; document.head.appendChild(link); }
  link.type = 'image/png';
  link.href = dataUrl;
}

/**
 * Hook: { src, ready }
 * Strategi loading berlapis:
 *   1. Coba dengan crossOrigin=anonymous → proses canvas
 *   2. Kalau CORS gagal (onerror) → retry tanpa crossOrigin (tampil langsung)
 *   3. Kalau canvas return null (dimensi 0 / tainted) → pakai rawSrc langsung
 *   4. Kalau semua gagal → tetap pakai rawSrc (browser render biasa)
 */
export function useTransparentLogo(rawSrc = RAW_SRC) {
  const [src,   setSrc]   = useState(rawSrc); // langsung set supaya tidak blank sebelum ready
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!rawSrc) { setReady(true); return; }
    let cancelled = false;

    // Fallback: tampilkan URL langsung tanpa canvas processing
    const showDirect = () => {
      if (cancelled) return;
      setSrc(rawSrc);
      setReady(true);
    };

    // Coba canvas processing dengan CORS
    const img = new window.Image();
    img.crossOrigin = 'anonymous';
    img.referrerPolicy = 'no-referrer';

    img.onload = () => {
      if (cancelled) return;
      try {
        const dataUrl = removeBlackBg(img);
        if (dataUrl) {
          setSrc(dataUrl);
          setReady(true);
          try { updateFavicon(dataUrl); } catch {}
        } else {
          // canvas gagal (dimensi 0 atau tainted) → pakai URL langsung
          showDirect();
        }
      } catch {
        showDirect();
      }
    };

    // CORS ditolak server → retry tanpa crossOrigin
    img.onerror = () => {
      if (cancelled) return;
      const img2 = new window.Image();
      img2.referrerPolicy = 'no-referrer';
      img2.onload  = showDirect;
      img2.onerror = showDirect; // URL tetap tidak bisa load → tetap set ready
      img2.src = rawSrc;
    };

    img.src = rawSrc;
    return () => { cancelled = true; };
  }, [rawSrc]);

  return { src, ready };
}

/**
 * <LogoImage> — drop-in <img> dengan background sudah dihapus (jika berlatar hitam)
 */
export default function LogoImage({ style = {}, className = '', alt = 'Logo', src: srcProp, ...rest }) {
  const { src, ready } = useTransparentLogo(srcProp || RAW_SRC);
  return (
    <img
      src={src}
      alt={alt}
      className={className}
      referrerPolicy="no-referrer"
      onError={e=>{ e.target.onerror=null; }}
      style={{
        background: 'transparent',
        ...style,
        opacity: ready ? 1 : 0,
        transition: 'opacity 0.3s',
      }}
      {...rest}
    />
  );
}
