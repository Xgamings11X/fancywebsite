import Icon from './Icon';

const CATEGORY_COLOR = {
  rank: '#1447ff',
  weapon: '#e03131',
  sellwand: '#168a52',
  auraskills: '#7c3aed',
  'crate-key': '#d97706',
  kit: '#0f766e',
};

const CATEGORY_ICON = {
  rank: 'trophy',
  weapon: 'bolt',
  sellwand: 'chart-line',
  auraskills: 'star',
  'crate-key': 'ticket',
  kit: 'box-open',
};

const idr = value => `Rp ${Number(value || 0).toLocaleString('id-ID')}`;

function parseFeatures(value) {
  if (Array.isArray(value)) return value.filter(Boolean).map(String);
  if (typeof value !== 'string' || !value.trim()) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter(Boolean).map(String) : [];
  } catch {
    return value.split(/\r?\n/).map(item => item.trim()).filter(Boolean);
  }
}

export default function ProductCard({ product = {}, index = 0, isOpen = false, onToggleExpand, onBuy }) {
  const price = Math.max(0, Number(product.price) || 0);
  const originalPrice = Math.max(0, Number(product.original_price) || 0);
  const discount = originalPrice > price ? Math.min(99, Math.round((1 - price / originalPrice) * 100)) : 0;
  const features = parseFeatures(product.features);
  const previewLimit = 4;
  const visibleFeatures = isOpen ? features : features.slice(0, previewLimit);
  const hiddenCount = Math.max(0, features.length - previewLimit);
  const categorySlug = String(product.category_slug || '').toLowerCase();
  const accent = CATEGORY_COLOR[categorySlug] || '#1447ff';
  const rawIcon = String(product.category_icon || '').trim();
  const categoryEmoji = /\p{Extended_Pictographic}/u.test(rawIcon) ? rawIcon : '';
  const categoryIcon = CATEGORY_ICON[categorySlug] || (!categoryEmoji && rawIcon) || 'cube';
  const imageUrl = typeof product.image_url === 'string' && /^https?:\/\//i.test(product.image_url.trim()) ? product.image_url.trim() : '';
  const badge = String(product.badge || '').trim();
  const platform = String(product.platform || product.edition || 'Java & Bedrock');

  return (
    <article className="store-product-card" style={{ '--product-accent': accent }} data-anim="fade-up" data-delay={String(Math.min(index + 1, 8))}>
      <div className="store-product-media">
        <div className="store-product-media-top">
          <span className="store-product-category">
            {categoryEmoji ? <span>{categoryEmoji}</span> : <Icon name={categoryIcon} size={15} />}
            {product.category_name || 'Minecraft Item'}
          </span>
          <span className="store-product-platform"><Icon name="gamepad" size={13} /> {platform}</span>
        </div>

        {badge && <span className="store-product-badge"><Icon name="star" size={12} /> {badge}</span>}
        {discount > 0 && <span className="store-product-discount">Hemat {discount}%</span>}

        <div className="store-product-visual">
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={product.name || 'Produk Minecraft'}
              loading="lazy"
              decoding="async"
              onError={event => {
                event.currentTarget.hidden = true;
                event.currentTarget.nextElementSibling?.removeAttribute('hidden');
              }}
            />
          ) : null}
          <div className="store-product-fallback" hidden={Boolean(imageUrl)}>
            {categoryEmoji ? <span>{categoryEmoji}</span> : <Icon name={categoryIcon} size={42} />}
          </div>
        </div>
      </div>

      <div className="store-product-content">
        <div className="store-product-heading">
          <div>
            <span className="store-product-kicker">{product.category_name || 'Produk'}</span>
            <h3>{product.name || 'Produk Tanpa Nama'}</h3>
          </div>
          {Number(product.purchase_limit) > 0 && (
            <span className="store-product-limit"><Icon name="lock" size={12} /> Maks. {Number(product.purchase_limit)}</span>
          )}
        </div>

        <p className="store-product-description">
          {product.description || 'Produk premium yang dikirim otomatis ke akun Minecraft setelah pembayaran berhasil.'}
        </p>

        <div className="store-product-benefits">
          <div className="store-product-benefits-head">
            <strong>Benefit produk</strong>
            <span>{features.length} item</span>
          </div>
          {visibleFeatures.length > 0 ? (
            <ul>
              {visibleFeatures.map((feature, featureIndex) => (
                <li key={`${product.id || 'product'}-${featureIndex}`}>
                  <span><Icon name="check" size={11} /></span>
                  {feature}
                </li>
              ))}
            </ul>
          ) : (
            <p className="store-product-empty-benefit"><Icon name="circle-info" size={14} /> Detail lengkap tersedia saat checkout.</p>
          )}

          {features.length > previewLimit && (
            <button type="button" className="store-product-expand" onClick={() => onToggleExpand?.(product.id)} aria-expanded={isOpen}>
              {isOpen ? 'Tutup daftar benefit' : `Lihat ${hiddenCount} benefit lainnya`}
              <Icon name={isOpen ? 'chevron-up' : 'chevron-down'} size={12} />
            </button>
          )}
        </div>
      </div>

      <div className="store-product-footer">
        <div className="store-product-price">
          <span>Harga</span>
          {discount > 0 && <del>{idr(originalPrice)}</del>}
          <strong>{idr(price)}</strong>
        </div>
        <button type="button" onClick={() => onBuy?.(product)} className="store-product-buy">
          Beli sekarang <Icon name="arrow-right" size={15} />
        </button>
      </div>
    </article>
  );
}
