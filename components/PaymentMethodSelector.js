import Icon from './Icon';
/**
 * components/PaymentMethodSelector.js — v3 (FIXED: no more empty/broken cards)
 *
 * ✅ Root cause dari screenshot ("bolong-bolong" / kosong):
 *   Versi sebelumnya memuat logo bank/e-wallet dari hotlink Wikimedia Commons.
 *   Beberapa URL itu lambat, di-throttle, atau berubah path-nya, sehingga
 *   <img> gagal load secara tidak konsisten — beberapa kartu tampil dengan
 *   logo penuh warna, kartu lain jatuh ke fallback ikon generik polos. Hasilnya
 *   grid yang tidak rapi, sebagian "kosong".
 *
 * ✅ Fix: setiap metode sekarang punya "badge" lokal (teks + warna brand)
 *   yang di-render murni dengan CSS/SVG inline — TIDAK ADA request gambar
 *   eksternal sama sekali. Konsekuensinya:
 *     1. Tidak akan pernah ada kartu kosong/patah, di kondisi network apa pun.
 *     2. Tampilan 100% konsisten antar kartu (ukuran, kontras, keterbacaan).
 *     3. Menghapus beberapa request gambar eksternal dari halaman checkout →
 *        mengurangi network payload & mempercepat render modal (selaras
 *        dengan optimasi Core Web Vitals).
 */

/**
 * PAYMENT_CATEGORIES — Disesuaikan dengan metode AKTIF di Midtrans Production.
 *
 * Aktif   : gopay_qris, gopay, bni_va, bri_va, cimb_va, permata_va, mandiri_va
 * Dihapus : qris (statis — sedang proses), shopeepay, bca_va, other_va, dana
 */
export const PAYMENT_CATEGORIES = [
  {
    id:    'qris',
    label: 'QRIS',
    icon:  'receipt',
    color: '#00a651',
    methods: [
      {
        key:   'gopay_qris',
        label: 'QRIS Dinamis',
        desc:  'Scan via GoPay / semua scanner',
        badge: { text: 'QRIS', bg: '#000000', fg: '#ffffff' },
      },
    ],
  },
  {
    id:    'ewallet',
    label: 'E-Wallet',
    icon:  'bolt',
    color: '#6c5ce7',
    methods: [
      {
        key:   'gopay',
        label: 'GoPay',
        desc:  'Deeplink / QR GoPay',
        badge: { text: 'GoPay', bg: '#00aa5b', fg: '#ffffff' },
      },
    ],
  },
  {
    id:    'bank_transfer',
    label: 'Bank Transfer / VA',
    icon:  'server',
    color: '#0984e3',
    methods: [
      {
        key:   'bni_va',
        label: 'BNI Virtual Account',
        desc:  'ATM / BNI Mobile',
        badge: { text: 'BNI', bg: '#f37021', fg: '#ffffff' },
      },
      {
        key:   'bri_va',
        label: 'BRI Virtual Account',
        desc:  'ATM / BRImo',
        badge: { text: 'BRI', bg: '#00529c', fg: '#ffffff' },
      },
      {
        key:   'cimb_va',
        label: 'CIMB Niaga VA',
        desc:  'ATM / octo mobile',
        badge: { text: 'CIMB', bg: '#9e1b32', fg: '#ffffff' },
      },
      {
        key:   'permata_va',
        label: 'Permata Virtual Account',
        desc:  'ATM / PermataMobile X',
        badge: { text: 'Permata', bg: '#00563f', fg: '#ffffff' },
      },
      {
        key:   'mandiri_va',
        label: 'Mandiri Bill Payment',
        desc:  'ATM / Livin by Mandiri',
        badge: { text: 'Mandiri', bg: '#003d79', fg: '#ffd200' },
      },
    ],
  },
];

// ── Helper: badge lokal (teks + warna brand), tanpa request gambar ───────────
function PaymentLogo({ badge, isActive }) {
  const boxStyle = {
    display:        'flex',
    alignItems:     'center',
    justifyContent: 'center',
    width:          '100%',
    height:         32,
    flexShrink:     0,
  };

  return (
    <span style={boxStyle}>
      <span style={{
        display:        'inline-flex',
        alignItems:     'center',
        justifyContent: 'center',
        padding:        '4px 10px',
        borderRadius:   6,
        background:     badge.bg,
        color:          badge.fg,
        fontSize:       badge.text.length > 5 ? 10 : 11,
        fontWeight:     800,
        letterSpacing:  0.3,
        whiteSpace:     'nowrap',
        maxWidth:       '100%',
        overflow:       'hidden',
        textOverflow:   'ellipsis',
        opacity:        isActive ? 1 : 0.88,
        transition:     'opacity 0.18s',
      }}>
        {badge.text}
      </span>
    </span>
  );
}

// ── Komponen utama ────────────────────────────────────────────────────────────
export default function PaymentMethodSelector({ selected, onChange, disabled = false }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {PAYMENT_CATEGORIES.map(cat => (
        <div key={cat.id}>

          {/* ── Category header ─────────────────────────────────────────── */}
          <div style={{
            display:       'flex',
            alignItems:    'center',
            gap:           7,
            marginBottom:  10,
            paddingBottom: 7,
            borderBottom:  `1px solid ${cat.color}35`,
          }}>
            <Icon name={cat.icon} size={11} color={cat.color} style={{width:14,textAlign:'center'}}/>
            <span style={{
              fontSize:      10,
              fontWeight:    700,
              textTransform: 'uppercase',
              letterSpacing: 1.2,
              color:         cat.color,
            }}>
              {cat.label}
            </span>
          </div>

          {/* ── Methods grid ─────────────────────────────────────────────── */}
          <div style={{
            display:             'grid',
            /* ✅ 130px min → selalu 2 kolom di layar ≥ 280px */
            gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))',
            gap:                 8,
          }}>
            {cat.methods.map(m => {
              const isActive = selected === m.key;
              return (
                <button
                  key={m.key}
                  type="button"
                  disabled={disabled}
                  onClick={() => !disabled && onChange(m.key)}
                  style={{
                    /* Layout: kolom, item center */
                    display:        'flex',
                    flexDirection:  'column',
                    alignItems:     'center',
                    justifyContent: 'flex-start',
                    gap:            6,
                    padding:        '12px 8px 10px',

                    /* Visual aktif / nonaktif */
                    background: isActive
                      ? `${cat.color}20`           /* sedikit lebih terang */
                      : 'rgba(255,255,255,0.025)',
                    border: isActive
                      ? `2px solid ${cat.color}`   /* lebih tebal saat aktif */
                      : '1px solid rgba(255,255,255,0.08)',
                    borderRadius: 12,

                    cursor:     disabled ? 'not-allowed' : 'pointer',
                    opacity:    disabled ? 0.45 : 1,
                    transition: 'all 0.18s ease',
                    position:   'relative',
                    textAlign:  'center',

                    /* Hover shadow (hanya di luar disabled) */
                    boxShadow: isActive
                      ? `0 0 0 1px ${cat.color}40, 0 4px 16px ${cat.color}18`
                      : 'none',
                  }}
                  /* Hover via CSS tidak bisa inline, gunakan onMouseEnter/Leave */
                  onMouseEnter={e => {
                    if (!disabled && !isActive) {
                      e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                      e.currentTarget.style.borderColor = `${cat.color}60`;
                    }
                  }}
                  onMouseLeave={e => {
                    if (!disabled && !isActive) {
                      e.currentTarget.style.background = 'rgba(255,255,255,0.025)';
                      e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)';
                    }
                  }}
                >
                  {/* ── Active indicator dot ─────────────────────────── */}
                  {isActive && (
                    <span style={{
                      position:     'absolute',
                      top:          7,
                      right:        7,
                      width:        8,
                      height:       8,
                      borderRadius: '50%',
                      background:   cat.color,
                      boxShadow:    `0 0 0 2px ${cat.color}30, 0 0 8px ${cat.color}`,
                    }} />
                  )}

                  {/* ── Badge (fixed-height container, no network) ────── */}
                  <PaymentLogo badge={m.badge} isActive={isActive} />

                  {/* ── Label ────────────────────────────────────────── */}
                  <span style={{
                    fontWeight:  700,
                    fontSize:    11,
                    color:       isActive ? '#fff' : 'rgba(255,255,255,0.6)',
                    lineHeight:  1.3,
                    textAlign:   'center',
                    wordBreak:   'break-word',
                    transition:  'color 0.18s',
                  }}>
                    {m.label}
                  </span>

                  {/* ── Desc ─────────────────────────────────────────── */}
                  <span style={{
                    fontSize:   9,
                    color:      isActive ? `${cat.color}dd` : 'rgba(255,255,255,0.28)',
                    fontWeight: 600,
                    lineHeight: 1.3,
                    transition: 'color 0.18s',
                  }}>
                    {m.desc}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
