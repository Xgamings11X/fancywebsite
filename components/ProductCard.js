import CategoryIcon from './CategoryIcon';

// Warna orb otomatis berdasarkan kategori — dideklarasikan sekali di luar
// komponen (sebelumnya object ini dibuat ulang setiap render, untuk SETIAP
// card, di dalam .map() — dipindah ke sini supaya tidak ada alokasi ulang
// yang sia-sia tiap render).
const CATEGORY_ORB = {
  rank:        '#ffd700',
  weapon:      '#e74c3c',
  sellwand:    '#2ecc71',
  auraskills:  '#9b59b6',
  'crate-key': '#3498db',
  kit:         '#1abc9c',
};
const DEFAULT_ORB = '#ff6b00';

const BADGE_COLOR = {
  orange: 'var(--primary)', red: '#e74c3c', purple: '#9b59b6',
  blue: '#3498db', green: '#2ecc71', yellow: '#f1c40f',
};

const idr = v => `Rp ${Number(v || 0).toLocaleString('id-ID')}`;

export default function ProductCard({ product, index = 0, isOpen, onToggleExpand, onBuy }) {
  const discount = product.original_price && product.original_price > product.price
    ? Math.round((1 - product.price / product.original_price) * 100)
    : 0;

  const features = (() => {
    try { return typeof product.features === 'string' ? JSON.parse(product.features) : (product.features || []); }
    catch { return []; }
  })();

  const orbColor  = CATEGORY_ORB[product.category_slug] || DEFAULT_ORB;
  // Deteksi varian "Terpopuler" dari teks badge yang sudah ada di data produk
  // (cocok untuk "TERPOPULER" maupun "MOST POPULAR") — tanpa field baru.
  const isPopular = (product.badge || '').toLowerCase().includes('popul');
  const pills     = features.slice(0, 3);
  const moreCount = Math.max(features.length - pills.length, 0);

  return (
    <div
      className={`fn-card rank-card product-card-enter relative flex flex-col overflow-hidden p-0${isPopular ? ' rank-card-popular' : ''}`}
      data-anim="fade-up"
      data-delay={String(Math.min((index % 8) + 1, 8))}
    >
      {/* Badge atas: kartu terpopuler pakai banner besar, lainnya ribbon kecil seperti biasa */}
      {isPopular ? (
        <span
          className="absolute left-1/2 top-3 z-20 -translate-x-1/2 inline-flex items-center gap-1 whitespace-nowrap rounded-full px-3 py-1 text-[10px] font-extrabold uppercase tracking-wide shadow-md"
          style={{ background: '#fff', color: 'var(--primary)' }}
        >
          + Most Popular
        </span>
      ) : product.badge && (
        <div className="rank-ribbon" style={{ background: BADGE_COLOR[product.badge_color || 'orange'] || 'var(--primary)' }}>
          <svg viewBox="0 0 24 24" width="10" height="10" fill="currentColor"><path d="M12 2.5l2.1 6 6 2.1-6 2.1-2.1 6-2.1-6-6-2.1 6-2.1z"/></svg>
          {product.badge}
        </div>
      )}

      {/* Area gambar produk — tetap memakai gaya lama, tidak diubah */}
      <div className="product-img-bg">
        {product.image_url ? (
          <img
            src={product.image_url}
            alt={product.name}
            className="product-img"
            referrerPolicy="no-referrer"
            onError={e => { e.target.onerror = null; e.target.style.opacity = '0'; }}
          />
        ) : (
          <span
            className="relative z-[4] flex h-[52px] w-[52px] items-center justify-center rounded-[14px] border"
            style={{ background: orbColor + '1a', borderColor: orbColor + '40', color: orbColor }}
          >
            <CategoryIcon slug={product.category_slug} size={24} strokeWidth={1.6} />
          </span>
        )}
        {discount > 0 && (
          <span className="absolute left-2.5 top-2.5 z-[4] rounded-md bg-[#e74c3c] px-2 py-0.5 text-[10px] font-bold text-white">
            -{discount}%
          </span>
        )}
      </div>

      {/* Konten kartu */}
      <div className={`flex flex-1 flex-col px-5 pb-5 pt-[18px]${isPopular ? ' text-white' : ''}`}>
        <div className="mb-1 text-[10px] font-bold uppercase tracking-wide" style={{ color: isPopular ? 'rgba(255,255,255,0.75)' : 'var(--text-muted)' }}>
          {product.category_name || 'Item'}
        </div>
        <h3 className="mb-1.5 text-[16px] font-bold">{product.name}</h3>
        {product.description && (
          <p className="mb-3 text-[12.5px] leading-relaxed" style={{ color: isPopular ? 'rgba(255,255,255,0.85)' : 'var(--text-muted)' }}>
            {product.description}
          </p>
        )}

        {/* Highlight benefit sebagai pill tag kecil berjejer */}
        {pills.length > 0 && (
          <div className="mb-3 flex flex-wrap gap-1.5">
            {pills.map((f, i) => (
              <span
                key={i}
                className="inline-flex items-center rounded-full border px-2.5 py-1 text-[10.5px] font-semibold"
                style={isPopular
                  ? { background: 'rgba(255,255,255,0.16)', borderColor: 'rgba(255,255,255,0.25)', color: '#fff' }
                  : { background: 'rgba(255,107,0,0.08)', borderColor: 'rgba(255,107,0,0.2)', color: 'var(--primary-light)' }}
              >
                {f}
              </span>
            ))}
            {moreCount > 0 && (
              <span
                className="inline-flex items-center rounded-full border px-2.5 py-1 text-[10.5px] font-semibold"
                style={isPopular
                  ? { background: 'rgba(255,255,255,0.08)', borderColor: 'rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.8)' }
                  : { background: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.08)', color: 'var(--text-muted)' }}
              >
                +{moreCount} lainnya
              </span>
            )}
          </div>
        )}

        {/* Toggle daftar fitur lengkap dengan ikon checkmark */}
        {features.length > 0 && (
          <>
            <button
              onClick={() => onToggleExpand(product.id)}
              className="flex items-center gap-1.5 py-2 text-[12px] font-semibold transition-colors"
              style={{ color: isPopular ? 'rgba(255,255,255,0.85)' : 'var(--text-muted)' }}
              onMouseEnter={e => { e.currentTarget.style.color = isPopular ? '#fff' : 'var(--primary)'; }}
              onMouseLeave={e => { e.currentTarget.style.color = isPopular ? 'rgba(255,255,255,0.85)' : 'var(--text-muted)'; }}
            >
              <i className={`fa-solid ${isOpen ? 'fa-chevron-up' : 'fa-chevron-down'} text-[10px]`} />
              {isOpen ? 'Sembunyikan benefit' : 'Lihat semua benefit'}
            </button>
            <div className={`benefit-panel${isOpen ? ' open' : ''}`}>
              <p className="mb-3 text-[11px] font-bold uppercase tracking-wider" style={{ color: isPopular ? 'rgba(255,255,255,0.85)' : 'var(--primary-light)' }}>
                Benefit yang kamu dapat:
              </p>
              <ul className="flex flex-col gap-2">
                {features.map((f, fi) => (
                  <li key={fi} className="flex items-start gap-2.5 text-[13px] leading-relaxed" style={{ color: isPopular ? 'rgba(255,255,255,0.92)' : '#d1d1d6' }}>
                    <i className="fa-solid fa-check-circle mt-[3px] flex-shrink-0 text-[11px]" style={{ color: isPopular ? '#fff' : '#2ecc71' }} />
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          </>
        )}

        {/* Footer: harga di kiri (tebal), tombol beli di kanan (rounded) */}
        <div
          className="mt-auto flex items-center justify-between gap-2.5 pt-4"
          style={{ borderTop: `1px solid ${isPopular ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.05)'}` }}
        >
          <div>
            {!!product.original_price && product.original_price > product.price && (
              <div className="text-[11px] line-through" style={{ color: isPopular ? 'rgba(255,255,255,0.65)' : 'var(--text-muted)' }}>
                {idr(product.original_price)}
              </div>
            )}
            <div className="font-space text-[18px] font-bold" style={{ color: isPopular ? '#fff' : 'var(--primary-light)' }}>
              {idr(product.price)}
            </div>
          </div>
          <button
            onClick={() => onBuy(product)}
            className={isPopular ? 'btn-popular-buy' : 'btn-primary-fn'}
            style={{ borderRadius: 999 }}
          >
            <i className="fa-solid fa-cart-shopping" />
            Beli
          </button>
        </div>
      </div>
    </div>
  );
}
