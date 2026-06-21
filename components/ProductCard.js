/* ProductCard.js — v4: theming via 1 CSS custom property (--accent),
   bukan style object di tiap elemen anak. Lihat blok PRODUCT CARD di
   globals.css untuk penjelasan kenapa color-mix() dipilih dibanding
   modifier class per kombinasi warna. */

const CATEGORY_COLOR = {
  rank:        '#ffd700',
  weapon:      '#e74c3c',
  sellwand:    '#2ecc71',
  auraskills:  '#9b59b6',
  'crate-key': '#3498db',
  kit:         '#1abc9c',
};
const DEFAULT_COLOR = '#ff6b00';

const BADGE_BG = {
  orange: '#ff6b00',
  red:    '#e74c3c',
  purple: '#9b59b6',
  blue:   '#3498db',
  green:  '#2ecc71',
  yellow: '#d4a017',
};
// Teks badge kuning pakai warna gelap biar kontras
const BADGE_TEXT_DARK = new Set(['yellow']);

const idr = v => `Rp ${Number(v || 0).toLocaleString('id-ID')}`;
const cx = (...parts) => parts.filter(Boolean).join(' ');

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

  const categoryColor = CATEGORY_COLOR[product.category_slug] || DEFAULT_COLOR;
  const badgeText     = (product.badge || '').trim();
  const hasBadge      = !!badgeText;
  const isPopular     = badgeText.toLowerCase().includes('popul');
  // Untuk kartu berBadge non-popular, gunakan badge color sebagai warna aksen utama
  const badgeBg       = BADGE_BG[product.badge_color] || DEFAULT_COLOR;
  const badgeTxtDark  = BADGE_TEXT_DARK.has(product.badge_color);
  // Warna aksen kartu: badge color bila ada badge, kategori bila tidak
  const accentColor   = hasBadge ? badgeBg : categoryColor;

  const pills        = features.slice(0, 3);
  const listFeatures = features.slice(3);
  const displayList  = listFeatures.length > 0 ? listFeatures : features;

  const popularCls = isPopular ? 'popular' : '';

  return (
    <div
      /* CLASS fn-card, rank-card, product-card-enter WAJIB ADA — animasi bergantung pada ini */
      className={cx(
        'fn-card rank-card product-card-enter product-card-themed relative flex flex-col overflow-hidden rounded-[24px] border h-[420px] transition-transform duration-300 hover:-translate-y-1',
        hasBadge && !isPopular && 'has-badge',
        isPopular
          ? 'rank-card-popular border-[var(--primary)] bg-[var(--primary)] text-white shadow-[0_8px_30px_rgba(255,107,0,0.25)]'
          : 'text-white'
      )}
      style={{ '--accent': accentColor }}
      data-anim="fade-up"
      data-delay={String(Math.min((index % 8) + 1, 8))}
    >
      {/* Accent bar atas — ikut warna aksen kartu */}
      <div className={cx('product-accent-bar h-[3px] w-full flex-shrink-0', popularCls)}/>

      {/* ── Badge ribbon ─────────────────────────────────────────── */}
      {hasBadge && (
        <div className="absolute left-0 right-0 top-[3px] z-10 flex justify-center">
          <span className={cx(
            'product-badge-ribbon-inner rounded-b-lg px-4 py-1 text-[10px] font-extrabold uppercase tracking-[0.2em] shadow-lg',
            badgeTxtDark && 'text-dark', popularCls
          )}>
            {badgeText}
          </span>
        </div>
      )}

      {/* ── Header: kategori + nama produk ────────────────────────── */}
      <div className={cx('flex-shrink-0 px-6 pb-3', hasBadge ? 'pt-9' : 'pt-5')}>
        <div className={cx('product-category-label mb-1.5 text-[10px] font-extrabold uppercase tracking-[0.2em]', popularCls)}>
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

      {/* ── Pills (3 benefit utama) ─────────────────────────────────── */}
      {pills.length > 0 && (
        <div className="flex-shrink-0 px-6 pb-4 flex flex-wrap gap-1.5">
          {pills.map((f, i) => (
            <span key={i} className={cx(
              'product-pill inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-semibold',
              popularCls
            )}>
              {f}
            </span>
          ))}
        </div>
      )}

      {/* ── Divider ───────────────────────────────────────────────── */}
      {displayList.length > 0 && (
        <div className={cx('product-divider flex-shrink-0 mx-6 mb-3', popularCls)}/>
      )}

      {/* ── Scrollable benefit list ────────────────────────────────── */}
      {displayList.length > 0 ? (
        <div className="product-card-scroll flex-1 overflow-y-auto px-6 pb-1">
          {listFeatures.length > 0 && (
            <div className={cx('product-features-label mb-2.5 text-[9.5px] font-extrabold uppercase tracking-[0.18em]', popularCls)}>
              {product.name} Features
            </div>
          )}
          <ul className="flex flex-col gap-2.5">
            {displayList.map((f, fi) => (
              <li key={fi} className="flex items-start gap-2.5 text-[12.5px] leading-snug">
                <span className={cx('product-bullet mt-[5px] flex-shrink-0 rounded-[2px]', popularCls)}/>
                <span className="opacity-85">{f}</span>
              </li>
            ))}
          </ul>
        </div>

      ) : (
        /* ── Empty state ─────────────────────────────────────────── */
        <div className="flex-1 flex flex-col justify-center px-6 pb-3">
          <div className={cx('product-empty-box w-full rounded-2xl flex flex-col items-center justify-center gap-2 py-7', popularCls)}>
            <span className={cx('product-empty-title text-center text-[13px] font-black uppercase tracking-[0.12em] leading-tight px-4', popularCls)}>
              {product.name}
            </span>
            <span className={cx('product-empty-underline rounded-full', popularCls)}/>
            <span className="product-empty-category text-[10px] font-semibold uppercase tracking-[0.15em]">
              {product.category_name || 'Item'}
            </span>
          </div>
        </div>
      )}

      {/* ── Footer: harga + tombol beli ───────────────────────────── */}
      <div className={cx('product-footer-row flex-shrink-0 px-6 pt-4 pb-5 flex items-center justify-between gap-3', popularCls)}>
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

        <button
          onClick={() => onBuy(product)}
          className={cx(
            'product-buy-btn rounded-full px-6 py-2.5 text-[13px] font-bold tracking-wide transition-transform hover:scale-105 active:scale-95',
            badgeTxtDark && hasBadge && 'text-dark', popularCls
          )}
        >
          Beli
        </button>
      </div>
    </div>
  );
}
