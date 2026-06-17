import CategoryIcon from './CategoryIcon';

const CATEGORY_ORB = {
  rank:        '#ffd700',
  weapon:      '#e74c3c',
  sellwand:    '#2ecc71',
  auraskills:  '#9b59b6',
  'crate-key': '#3498db',
  kit:         '#1abc9c',
};
const DEFAULT_ORB = '#ff6b00';

const idr = v => `Rp ${Number(v || 0).toLocaleString('id-ID')}`;

export default function ProductCard({ product, index = 0, onBuy }) {
  const discount = product.original_price && product.original_price > product.price
    ? Math.round((1 - product.price / product.original_price) * 100)
    : 0;

  const features = (() => {
    try { return typeof product.features === 'string' ? JSON.parse(product.features) : (product.features || []); }
    catch { return []; }
  })();

  const orbColor  = CATEGORY_ORB[product.category_slug] || DEFAULT_ORB;
  const isPopular = (product.badge || '').toLowerCase().includes('popul');

  // Mengikuti referensi: 3 fitur pertama jadi "Pill Tags", sisanya jadi "List Checkmark"
  const pills = features.slice(0, 3);
  const listFeatures = features.slice(3);

  return (
    <div
      className={`relative flex flex-col overflow-hidden rounded-[24px] border p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl ${
        isPopular
          ? 'border-[var(--primary)] bg-[var(--primary)] text-white shadow-[0_8px_30px_rgba(255,107,0,0.25)]'
          : 'border-white/10 bg-[#141414] text-white hover:border-white/20'
      }`}
      data-anim="fade-up"
      data-delay={String(Math.min((index % 8) + 1, 8))}
    >
      {/* Banner Most Popular di atas tengah */}
      {isPopular && (
        <div className="absolute left-0 right-0 top-0 flex justify-center">
          <span className="rounded-b-lg bg-white px-4 py-1 text-[11px] font-extrabold uppercase tracking-widest text-[var(--primary)] shadow-sm">
            + Most Popular
          </span>
        </div>
      )}

      {/* Header Card (Icon/Category + Title) */}
      <div className={`flex items-center gap-3.5 ${isPopular ? 'mt-6 mb-4' : 'mb-4'}`}>
        {/* Icon Area */}
        <div
          className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-[14px] border"
          style={isPopular
            ? { background: 'rgba(255,255,255,0.15)', borderColor: 'rgba(255,255,255,0.3)', color: '#fff' }
            : { background: `${orbColor}1a`, borderColor: `${orbColor}40`, color: orbColor }
          }
        >
          <CategoryIcon slug={product.category_slug} size={24} strokeWidth={1.8} />
        </div>

        {/* Title & Category */}
        <div>
          <div className="text-[11px] font-bold uppercase tracking-wider opacity-75">
            {product.category_name || 'Rank'}
          </div>
          <h3 className="text-[20px] font-black tracking-tight">{product.name}</h3>
        </div>
      </div>

      {/* Deskripsi */}
      {product.description && (
        <p className="mb-5 text-[13px] leading-relaxed opacity-80">
          {product.description}
        </p>
      )}

      {/* Horizontal Pills (Benefit Utama) */}
      {pills.length > 0 && (
        <div className="mb-5 flex flex-wrap gap-2">
          {pills.map((f, i) => (
            <span
              key={i}
              className={`inline-flex items-center rounded-full border px-3 py-1.5 text-[11px] font-semibold ${
                isPopular
                  ? 'border-white/30 bg-white/10 text-white'
                  : 'border-[var(--primary)]/20 bg-[var(--primary)]/10 text-[var(--primary-light)]'
              }`}
            >
              {f}
            </span>
          ))}
        </div>
      )}

      {/* Title untuk Checkmark List (Sesuai referensi ada text "[Nama Produk] Feature") */}
      {listFeatures.length > 0 && (
        <div className={`mb-3 text-[12px] font-extrabold tracking-wide uppercase ${isPopular ? 'text-white/90' : 'text-[var(--primary-light)]'}`}>
          {product.name} Feature
        </div>
      )}

      {/* Checkmark List (Selalu Terbuka) */}
      <ul className="mb-6 flex flex-col gap-3">
        {(listFeatures.length > 0 ? listFeatures : features).map((f, fi) => (
          <li key={fi} className="flex items-start gap-3 text-[13px] leading-relaxed opacity-95">
            <i className={`fa-solid fa-check mt-1 text-[12px] ${isPopular ? 'text-white' : 'text-[var(--primary)]'}`} />
            <span>{f}</span>
          </li>
        ))}
      </ul>

      {/* Footer Card (Harga & Tombol Beli di Baris yang Sama) */}
      <div className="mt-auto flex items-center justify-between gap-3 border-t border-white/10 pt-5">
        <div className="flex flex-col">
          {discount > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-[11px] line-through opacity-50">
                {idr(product.original_price)}
              </span>
              <span className="rounded bg-red-500/20 px-1.5 py-0.5 text-[10px] font-bold text-red-400">
                -{discount}%
              </span>
            </div>
          )}
          <div className="font-space text-[20px] font-extrabold">
            {idr(product.price)}
          </div>
        </div>

        <button
          onClick={() => onBuy(product)}
          className={`flex items-center gap-2 rounded-full px-6 py-2.5 text-[13.5px] font-bold transition-transform hover:scale-105 active:scale-95 ${
            isPopular
              ? 'bg-white text-[var(--primary)] hover:bg-gray-100'
              : 'bg-[var(--primary)] text-white hover:bg-[var(--primary-light)]'
          }`}
        >
          <i className="fa-solid fa-cart-shopping text-[12px]" />
          Beli
        </button>
      </div>
    </div>
  );
}
