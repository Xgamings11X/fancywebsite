import Icon from './Icon';

const idr = value => `Rp ${Number(value || 0).toLocaleString('id-ID')}`;

const AUTO_PRESENTATION = [
  { match: ['rank', 'vip', 'mvp', 'lord', 'king', 'queen', 'hero', 'famous'], icon: 'trophy', label: 'Rank', accent: '#f97316' },
  { match: ['weapon', 'sword', 'pedang', 'axe', 'kapak', 'bow', 'senjata'], icon: 'gavel', label: 'Weapon', accent: '#ea580c' },
  { match: ['crate', 'key', 'kunci', 'gacha'], icon: 'ticket', label: 'Crate Key', accent: '#fb923c' },
  { match: ['kit', 'bundle', 'paket'], icon: 'box-open', label: 'Kit', accent: '#c2410c' },
  { match: ['skill', 'aura', 'boost', 'booster', 'xp'], icon: 'bolt', label: 'Booster', accent: '#f59e0b' },
  { match: ['wand', 'sell', 'shop', 'money', 'coin'], icon: 'chart-line', label: 'Utility', accent: '#d97706' },
  { match: ['claim', 'protection', 'shield'], icon: 'shield-halved', label: 'Protection', accent: '#e85d04' },
];

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

function resolvePresentation(product) {
  const haystack = [
    product.category_slug,
    product.category_name,
    product.name,
    product.description,
  ].filter(Boolean).join(' ').toLowerCase();

  const found = AUTO_PRESENTATION.find(item => item.match.some(keyword => haystack.includes(keyword)));
  return found || { icon: 'cube', label: product.category_name || 'Item', accent: '#f97316' };
}

export default function ProductCard({ product = {}, index = 0, isOpen = false, onToggleExpand, onBuy }) {
  const price = Math.max(0, Number(product.price) || 0);
  const originalPrice = Math.max(0, Number(product.original_price) || 0);
  const discount = originalPrice > price ? Math.min(99, Math.round((1 - price / originalPrice) * 100)) : 0;
  const features = parseFeatures(product.features);
  const previewLimit = 4;
  const visibleFeatures = isOpen ? features : features.slice(0, previewLimit);
  const hiddenCount = Math.max(0, features.length - previewLimit);
  const presentation = resolvePresentation(product);
  const imageUrl = typeof product.image_url === 'string' && /^https?:\/\//i.test(product.image_url.trim())
    ? product.image_url.trim()
    : '';
  const badge = String(product.badge || '').trim();
  const platform = String(product.platform || product.edition || 'Java & Bedrock');
  const productId = product.id ?? `${product.name || 'product'}-${index}`;

  return (
    <article
      className="store-product-card"
      style={{ '--product-accent': presentation.accent }}
      data-anim="fade-up"
      data-delay={String(Math.min(index + 1, 8))}
    >
      <div className="store-product-media">
        <div className="store-product-media-top">
          <span className="store-product-category">
            <Icon name={presentation.icon} size={15} />
            {product.category_name || presentation.label}
          </span>
          <span className="store-product-platform"><Icon name="gamepad" size={13} /> {platform}</span>
        </div>

        <div className="store-product-visual">
          {imageUrl && (
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
          )}
          <div className="store-product-fallback" hidden={Boolean(imageUrl)}>
            <Icon name={presentation.icon} size={46} />
          </div>
        </div>

        <div className="store-product-media-badges">
          {badge && <span><Icon name="star" size={12} /> {badge}</span>}
          {discount > 0 && <span className="discount">Hemat {discount}%</span>}
        </div>
      </div>

      <div className="store-product-content">
        <div className="store-product-heading">
          <div>
            <span className="store-product-kicker">{presentation.label}</span>
            <h3>{product.name || 'Produk Tanpa Nama'}</h3>
          </div>
          {Number(product.purchase_limit) > 0 && (
            <span className="store-product-limit"><Icon name="lock" size={12} /> Maks. {Number(product.purchase_limit)}</span>
          )}
        </div>

        <p className="store-product-description">
          {product.description || 'Produk premium dikirim otomatis ke akun Minecraft setelah pembayaran berhasil.'}
        </p>

        <div className="store-product-benefits">
          <div className="store-product-benefits-head">
            <strong>Benefit</strong>
            <span>{features.length || 'Detail checkout'}</span>
          </div>

          {visibleFeatures.length > 0 ? (
            <ul>
              {visibleFeatures.map((feature, featureIndex) => (
                <li key={`${productId}-${featureIndex}`}>
                  <span><Icon name="check" size={11} /></span>
                  {feature}
                </li>
              ))}
            </ul>
          ) : (
            <p className="store-product-empty-benefit"><Icon name="circle-info" size={14} /> Detail lengkap tersedia saat checkout.</p>
          )}

          {features.length > previewLimit && (
            <button
              type="button"
              className="store-product-expand"
              onClick={() => onToggleExpand?.(productId)}
              aria-expanded={isOpen}
            >
              {isOpen ? 'Tutup benefit' : `Lihat ${hiddenCount} benefit lainnya`}
              <Icon name={isOpen ? 'chevron-up' : 'chevron-down'} size={12} />
            </button>
          )}
        </div>
      </div>

      <div className="store-product-footer">
        <div className="store-product-price">
          <span>Mulai dari</span>
          {discount > 0 && <del>{idr(originalPrice)}</del>}
          <strong>{idr(price)}</strong>
        </div>
        <button type="button" onClick={() => onBuy?.(product)} className="store-product-buy">
          Beli <Icon name="arrow-right" size={15} />
        </button>
      </div>
    </article>
  );
}
