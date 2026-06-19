import { useState } from 'react';
import Icon from './Icon';
/**
 * components/PaymentMethodSelector.js  — v3
 *
 * Perbaikan tata letak v3:
 *   - Kategori "QRIS" + "E-Wallet" digabung jadi "Pembayaran Instan" karena
 *     masing-masing cuma 1 metode aktif — section terpisah dgn 1 kartu saja
 *     terlihat janggal & boros ruang. Sekarang 1 section rapi berisi 2 kartu.
 *   - Daftar metode disinkronkan dengan status AKTIF di Midtrans dashboard
 *     (QRIS statis, ShopeePay, BCA VA dihapus karena belum/tidak aktif).
 *
 * Perbaikan v2 (tetap berlaku):
 *   1. Logo payment (QRIS, GoPay, dll) sekarang memiliki container
 *      berukuran tetap (logoBox) sehingga tinggi kartu seragam.
 *   2. Fallback icon SVG ditampilkan di dalam logoBox yang sama,
 *      tidak menyebabkan layout shift.
 *   3. Warna icon fallback mengikuti warna kategori (cat.color),
 *      bukan warna muted yang sulit dibedakan.
 *   4. Border-radius kartu lebih besar (12px) & hover shadow halus.
 *   5. Grid minmax dikecilkan ke 130px agar 2 kolom selalu muat
 *      bahkan di layar sempit (mobile ~360px).
 *   6. Active state: border lebih tebal (2px) + background sedikit
 *      lebih terang untuk kontras yang jelas.
 *   7. Dot indikator aktif diperbesar (8px) dan diberi ring transparan.
 */

/**
 * PAYMENT_CATEGORIES — Disesuaikan dengan metode AKTIF di Midtrans Production.
 *
 * Aktif   : gopay_qris, gopay, bni_va, bri_va, cimb_va, permata_va, mandiri_va
 * Dihapus : qris (statis — sedang proses), shopeepay, bca_va, other_va, dana
 */
export const PAYMENT_CATEGORIES = [
  {
    id:    'instant',
    label: 'Pembayaran Instan',
    icon:  'bolt',
    color: '#00a651',
    methods: [
      {
        key:   'gopay_qris',
        label: 'QRIS Dinamis',
        desc:  'Scan semua e-wallet & m-banking',
        logo:  'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a2/Logo_QRIS.svg/120px-Logo_QRIS.svg.png',
      },
      {
        key:   'gopay',
        label: 'GoPay',
        desc:  'Buka aplikasi langsung',
        logo:  'https://upload.wikimedia.org/wikipedia/commons/thumb/8/86/Gopay_logo.svg/120px-Gopay_logo.svg.png',
      },
    ],
  },
  {
    id:    'bank_transfer',
    label: 'Transfer Bank (Virtual Account)',
    icon:  'server',
    color: '#0984e3',
    methods: [
      {
        key:   'bni_va',
        label: 'BNI Virtual Account',
        desc:  'ATM / BNI Mobile',
        logo:  'https://upload.wikimedia.org/wikipedia/commons/f/f0/Bank_Negara_Indonesia_logo_%282004%29.svg',
      },
      {
        key:   'bri_va',
        label: 'BRI Virtual Account',
        desc:  'ATM / BRImo',
        logo:  'https://upload.wikimedia.org/wikipedia/commons/f/f5/BANK_BRI_logo_%28vertical%29.svg',
      },
      {
        key:   'cimb_va',
        label: 'CIMB Niaga VA',
        desc:  'ATM / octo mobile',
        logo:  'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9e/CIMB_Niaga.svg/120px-CIMB_Niaga.svg.png',
      },
      {
        key:   'permata_va',
        label: 'Permata Virtual Account',
        desc:  'ATM / PermataMobile X',
        logo:  'https://upload.wikimedia.org/wikipedia/commons/f/ff/Permata_Bank_%282024%29.svg',
      },
      {
        key:   'mandiri_va',
        label: 'Mandiri Bill Payment',
        desc:  'ATM / Livin by Mandiri',
        logo:  'https://upload.wikimedia.org/wikipedia/commons/thumb/a/ad/Bank_Mandiri_logo_2016.svg/120px-Bank_Mandiri_logo_2016.svg.png',
      },
    ],
  },
];

// ── Helper: logo dengan fallback ke FA icon ───────────────────────────────────
function PaymentLogo({ logo, icon, label, catColor, isActive }) {
  const [imgFailed, setImgFailed] = useState(false);

  // Ukuran container logo selalu tetap → kartu sejajar
  const boxStyle = {
    display:        'flex',
    alignItems:     'center',
    justifyContent: 'center',
    width:          56,
    height:         32,
    flexShrink:     0,
  };

  if (logo && !imgFailed) {
    return (
      <span style={boxStyle}>
        <img
          src={logo}
          alt={label}
          loading="lazy"
          decoding="async"
          style={{
            maxWidth:       56,
            maxHeight:      28,
            width:          'auto',
            height:         'auto',
            objectFit:      'contain',
            filter:         isActive ? 'none' : 'grayscale(20%) brightness(0.9)',
            transition:     'filter 0.18s',
          }}
          onError={() => setImgFailed(true)}
        />
      </span>
    );
  }

  // Fallback: Icon SVG dengan warna kategori
  return (
    <span style={boxStyle}>
      <Icon
        name={icon || 'receipt'}
        size={22}
        color={isActive ? catColor : 'rgba(255,255,255,0.35)'}
        style={{transition:'color 0.18s'}}
      />
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

                  {/* ── Logo / Icon (fixed-height container) ─────────── */}
                  <PaymentLogo
                    logo={m.logo}
                    icon={m.icon}
                    label={m.label}
                    catColor={cat.color}
                    isActive={isActive}
                  />

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
