/* ProductCard.js — v2: badge system, empty state, portrait fix */

const CATEGORY_COLOR = {
  rank:        '#ffd700',
  weapon:      '#e74c3c',
  sellwand:    '#2ecc71',
  auraskills:  '#9b59b6',
  'crate-key': '#3498db',
  kit:         '#1abc9c',
};
const DEFAULT_COLOR = '#ff6b00';

// Warna badge sesuai pilihan di admin
const BADGE_BG = {
  orange: '#ff6b00',
  red:    '#e74c3c',
  purple: '#9b59b6',
  blue:   '#3498db',
  green:  '#2ecc71',
  yellow: '#d4a017',
};
// Warna teks badge — kuning pakai teks gelap agar terbaca
const BADGE_TEXT = { yellow: '#1a1a00' };

const idr = v => `Rp ${Number(v || 0).toLocaleString('id-ID')}`;

export default function ProductCard({ product, index = 0, onBuy }) {
  const discount = product.original_price && product.original_price > product.price
    ? Math.round((1 - product.price / product.original_price) * 100)
    : 0;

  const features = (() => {
    try {
      return typeof product.features === 'string'
        ? JSON.parse(product.features)
        : (product.features || []);
    } catch { return []; }
  })();

  const accentColor  = CATEGORY_COLOR[product.category_slug] || DEFAULT_COLOR;
  const badgeText    = (product.badge || '').trim();
  const hasBadge     = !!badgeText;
  // Popular = kartu bergradient penuh (tampilan terbalik)
  const isPopular    = badgeText.toLowerCase().includes('popul');
  const badgeBg      = BADGE_BG[product.badge_color] || '#ff6b00';
  const badgeTxt     = BADGE_TEXT[product.badge_color] || '#ffffff';

  // 3 pill utama, sisanya di scrollable list
  const pills        = features.slice(0, 3);
  const listFeatures = features.slice(3);
  const displayList  = listFeatures.length > 0 ? listFeatures : features;
  const hasContent   = !!product.description || displayList.length > 0;

  return (
    <div
      /* CLASS fn-card, rank-card, product-card-enter WAJIB ADA — animasi bergantung pada ini */
      className={`fn-card rank-card product-card-enter relative flex flex-col overflow-hidden rounded-[24px] border h-[460px] transition-all duration-300 hover:-translate-y-1 hover:shadow-xl ${
        isPopular
          ? 'rank-card-popular border-[var(--primary)] bg-[var(--primary)] text-white shadow-[0_8px_30px_rgba(255,107,0,0.25)]'
          : 'border-white/10 bg-[#141414] text-white hover:border-white/20'
      }`}
      data-anim="fade-up"
      data-delay={String(Math.min((index % 8) + 1, 8))}
    >
      {/* Accent bar paling atas */}
      <div
        className="h-[3px] w-full flex-shrink-0"
        style={{ background: isPopular ? 'rgba(255,255,255,0.35)' : accentColor }}
      />

      {/* ── Badge ribbon — muncul untuk SEMUA jenis badge ─────────── */}
      {hasBadge && (
        <div className="absolute left-0 right-0 top-[3px] flex justify-center" style={{ zIndex: 10 }}>
          <span
            className="rounded-b-lg px-4 py-1 text-[10px] font-extrabold uppercase tracking-[0.2em] shadow-md"
            style={{
              background: isPopular ? '#ffffff' : badgeBg,
              color:      isPopular ? 'var(--primary)' : badgeTxt,
            }}
          >
            {badgeText}
          </span>
        </div>
      )}

      {/* ── Header: kategori + nama produk ────────────────────────── */}
      <div className={`flex-shrink-0 px-6 pb-3 ${hasBadge ? 'pt-9' : 'pt-5'}`}>
        <div
          className="mb-1.5 text-[10px] font-extrabold uppercase tracking-[0.2em]"
          style={{ color: isPopular ? 'rgba(255,255,255,0.6)' : accentColor }}
        >
          {product.category_name || 'Rank'}
        </div>
        <h3 className="text-[22px] font-black tracking-tight leading-[1.1]">
          {product.name}
        </h3>
      </div>

      {/* ── Deskripsi ─────────────────────────────────────────────── */}
      {product.description && (
        <p className="flex-shrink-0 px-6 pb-3 text-[12.5px] leading-relaxed opacity-65">
          {product.description}
        </p>
      )}

      {/* ── Pills (3 benefit utama) ────────────────────────────────── */}
      {pills.length > 0 && (
        <div className="flex-shrink-0 px-6 pb-4 flex flex-wrap gap-1.5">
          {pills.map((f, i) => (
            <span
              key={i}
              className={`inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-semibold ${
                isPopular
                  ? 'border-white/20 bg-white/10 text-white/90'
                  : 'border-white/10 bg-white/[0.05] text-white/75'
              }`}
            >
              {f}
            </span>
          ))}
        </div>
      )}

      {/* ── Divider sebelum list (hanya jika ada list) ────────────── */}
      {displayList.length > 0 && (
        <div
          className="flex-shrink-0 mx-6 mb-3"
          style={{ height: 1, background: isPopular ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.08)' }}
        />
      )}

      {/* ── Scrollable benefit list ────────────────────────────────── */}
      {displayList.length > 0 ? (
        <div className="product-card-scroll flex-1 overflow-y-auto px-6 pb-1">
          {listFeatures.length > 0 && (
            <div
              className="mb-2.5 text-[9.5px] font-extrabold uppercase tracking-[0.18em]"
              style={{ color: isPopular ? 'rgba(255,255,255,0.45)' : 'rgba(255,255,255,0.3)' }}
            >
              {product.name} Features
            </div>
          )}
          <ul className="flex flex-col gap-2.5">
            {displayList.map((f, fi) => (
              <li key={fi} className="flex items-start gap-2.5 text-[12.5px] leading-snug">
                <span
                  className="mt-[5px] flex-shrink-0 rounded-[2px]"
                  style={{
                    width: 5, height: 5,
                    background: isPopular ? 'rgba(255,255,255,0.55)' : accentColor,
                    opacity: 0.85,
                  }}
                />
                <span className="opacity-85">{f}</span>
              </li>
            ))}
          </ul>
        </div>

      ) : (
        /* ── Empty state — ketika tidak ada deskripsi & benefit ───── */
        <div className="flex-1 flex flex-col justify-center px-6 pb-3">
          {/* Blok dekoratif: nama produk besar sebagai watermark visual */}
          <div
            className="w-full rounded-2xl flex flex-col items-center justify-center gap-2 py-7"
            style={{
              background: isPopular
                ? 'rgba(255,255,255,0.07)'
                : `linear-gradient(135deg, ${accentColor}0d 0%, ${accentColor}18 100%)`,
              border: `1px solid ${isPopular ? 'rgba(255,255,255,0.1)' : accentColor + '28'}`,
            }}
          >
            {/* Nama produk — faded sebagai elemen tipografis dekoratif */}
            <span
              className="text-center text-[13px] font-black uppercase tracking-[0.12em] leading-tight px-4"
              style={{ color: isPopular ? 'rgba(255,255,255,0.22)' : accentColor, opacity: 0.55 }}
            >
              {product.name}
            </span>
            {/* Garis aksen pendek */}
            <span
              className="rounded-full"
              style={{
                width: 32, height: 2,
                background: isPopular ? 'rgba(255,255,255,0.25)' : accentColor,
                opacity: 0.4,
              }}
            />
            <span
              className="text-[10px] font-semibold uppercase tracking-[0.15em]"
              style={{ color: isPopular ? 'rgba(255,255,255,0.35)' : 'rgba(255,255,255,0.3)' }}
            >
              {product.category_name || 'Item'}
            </span>
          </div>
        </div>
      )}

      {/* ── Footer: harga + tombol beli ───────────────────────────── */}
      <div
        className="flex-shrink-0 px-6 pt-4 pb-5 flex items-center justify-between gap-3"
        style={{ borderTop: isPopular ? '1px solid rgba(255,255,255,0.15)' : '1px solid rgba(255,255,255,0.08)' }}
      >
        <div className="flex flex-col">
          {discount > 0 && (
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-[11px] line-through opacity-35">
                {idr(product.original_price)}
              </span>
              <span className="rounded bg-red-500/20 px-1.5 py-0.5 text-[10px] font-bold text-red-400">
                -{discount}%
              </span>
            </div>
          )}
          <div className="font-space text-[20px] font-extrabold leading-none">
            {idr(product.price)}
          </div>
        </div>

        {/* Tombol beli — teks saja, tanpa ikon */}
        <button
          onClick={() => onBuy(product)}
          className={`rounded-full px-6 py-2.5 text-[13px] font-bold tracking-wide transition-transform hover:scale-105 active:scale-95 ${
            isPopular
              ? 'bg-white text-[var(--primary)] hover:bg-gray-100'
              : 'bg-[var(--primary)] text-white hover:bg-[var(--primary-light)]'
          }`}
        >
          Beli
        </button>
      </div>
    </div>
  );
}
