/* ProductCard.js — redesigned: no icons, uniform portrait height, scrollable benefits */

const CATEGORY_COLOR = {
  rank:        '#ffd700',
  weapon:      '#e74c3c',
  sellwand:    '#2ecc71',
  auraskills:  '#9b59b6',
  'crate-key': '#3498db',
  kit:         '#1abc9c',
};
const DEFAULT_COLOR = '#ff6b00';

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

  const accentColor = CATEGORY_COLOR[product.category_slug] || DEFAULT_COLOR;
  const isPopular   = (product.badge || '').toLowerCase().includes('popul');

  // 3 pill utama + sisanya di scrollable list
  const pills        = features.slice(0, 3);
  const listFeatures = features.slice(3);
  // Jika tidak ada pills, semua masuk list
  const displayList  = listFeatures.length > 0 ? listFeatures : features;

  return (
    <div
      /* CLASS fn-card, rank-card, product-card-enter WAJIB ADA — animasi bergantung pada ini */
      className={`fn-card rank-card product-card-enter relative flex flex-col overflow-hidden rounded-[24px] border h-[440px] transition-all duration-300 hover:-translate-y-1 hover:shadow-xl ${
        isPopular
          ? 'rank-card-popular border-[var(--primary)] bg-[var(--primary)] text-white shadow-[0_8px_30px_rgba(255,107,0,0.25)]'
          : 'border-white/10 bg-[#141414] text-white hover:border-white/20'
      }`}
      data-anim="fade-up"
      data-delay={String(Math.min((index % 8) + 1, 8))}
    >
      {/* Accent bar paling atas — pengganti icon orb, memberi identitas warna kategori */}
      <div
        className="h-[3px] w-full flex-shrink-0"
        style={{ background: isPopular ? 'rgba(255,255,255,0.35)' : accentColor, opacity: isPopular ? 1 : 0.9 }}
      />

      {/* Banner Most Popular */}
      {isPopular && (
        <div className="absolute left-0 right-0 top-[3px] flex justify-center">
          <span className="rounded-b-lg bg-white px-4 py-1 text-[10px] font-extrabold uppercase tracking-[0.2em] text-[var(--primary)] shadow-sm">
            Most Popular
          </span>
        </div>
      )}

      {/* ── Header: nama kategori + nama produk ──────────────────── */}
      <div className={`flex-shrink-0 px-6 pb-3 ${isPopular ? 'pt-9' : 'pt-5'}`}>
        {/* Label kategori — tipografi kecil bold, warna aksen */}
        <div
          className="mb-1.5 text-[10px] font-extrabold uppercase tracking-[0.2em]"
          style={{ color: isPopular ? 'rgba(255,255,255,0.6)' : accentColor }}
        >
          {product.category_name || 'Rank'}
        </div>

        {/* Nama produk */}
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

      {/* ── Divider sebelum list ───────────────────────────────────── */}
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
                {/* Penanda tipografis murni — tanpa ikon */}
                <span
                  className="mt-[5px] flex-shrink-0 rounded-[2px]"
                  style={{
                    width: 5,
                    height: 5,
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
        <div className="flex-1" />
      )}

      {/* ── Footer: harga + tombol beli ───────────────────────────── */}
      <div
        className="flex-shrink-0 px-6 pt-4 pb-5 flex items-center justify-between gap-3"
        style={{ borderTop: isPopular ? '1px solid rgba(255,255,255,0.15)' : '1px solid rgba(255,255,255,0.08)' }}
      >
        {/* Harga */}
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
