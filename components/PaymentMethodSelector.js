import { useState } from 'react';

/**
 * components/PaymentMethodSelector.js — v4 (VERIFIED WIKIMEDIA LINKS)
 *
 * ✅ FIX TOTAL: Semua logo menggunakan struktur URL langsung (Direct Thumbnail)
 * yang jalurnya ditarik dari halaman web resmi Wikimedia Commons masing-masing.
 */

export const PAYMENT_CATEGORIES = [
  {
    id:    'qris',
    label: 'QRIS',
    icon:  'fa-qrcode',
    color: '#00a651',
    methods: [
      {
        key:   'qris',
        label: 'QRIS (Semua Scanner)',
        desc:  'Scan dengan apps apapun',
        logo:  'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a2/Logo_QRIS.svg/120px-Logo_QRIS.svg.png',
      },
      {
        key:   'gopay_qris',
        label: 'QRIS via GoPay',
        desc:  'Bayar dengan GoPay / Gopay+',
        logo:  'https://upload.wikimedia.org/wikipedia/commons/thumb/8/86/Gopay_logo.svg/120px-Gopay_logo.svg.png',
      },
    ],
  },
  {
    id:    'ewallet',
    label: 'E-Wallet',
    icon:  'fa-wallet',
    color: '#6c5ce7',
    methods: [
      {
        key:   'gopay',
        label: 'GoPay',
        desc:  'Deeplink / QR GoPay',
        logo:  'https://upload.wikimedia.org/wikipedia/commons/thumb/8/86/Gopay_logo.svg/120px-Gopay_logo.svg.png',
      },
      {
        key:   'shopeepay',
        label: 'ShopeePay',
        desc:  'Deeplink / QR ShopeePay',
        // Tautan terverifikasi dari File:Shopee.svg
        logo:  'https://upload.wikimedia.org/wikipedia/commons/thumb/f/fe/Shopee.svg/120px-Shopee.svg.png',
      },
    ],
  },
  {
    id:    'bank_transfer',
    label: 'Bank Transfer / VA',
    icon:  'fa-building-columns',
    color: '#0984e3',
    methods: [
      {
        key:   'bca_va',
        label: 'BCA Virtual Account',
        desc:  'ATM / m-BCA / KlikBCA',
        logo:  'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5c/Bank_Central_Asia.svg/120px-Bank_Central_Asia.svg.png',
      },
      {
        key:   'mandiri_va',
        label: 'Mandiri Bill Payment',
        desc:  'ATM / Livin by Mandiri',
        logo:  'https://upload.wikimedia.org/wikipedia/commons/thumb/a/ad/Bank_Mandiri_logo_2016.svg/120px-Bank_Mandiri_logo_2016.svg.png',
      },
      {
        key:   'bni_va',
        label: 'BNI Virtual Account',
        desc:  'ATM / BNI Mobile',
        // Tautan terverifikasi dari File:BNI_logo.svg
        logo:  'https://upload.wikimedia.org/wikipedia/commons/thumb/5/55/BNI_logo.svg/120px-BNI_logo.svg.png',
      },
      {
        key:   'bri_va',
        label: 'BRI Virtual Account',
        desc:  'ATM / BRImo',
        // Tautan terverifikasi dari File:BANK_BRI_logo.svg
        logo:  'https://upload.wikimedia.org/wikipedia/commons/thumb/6/68/BANK_BRI_logo.svg/120px-BANK_BRI_logo.svg.png',
      },
      {
        key:   'permata_va',
        label: 'Permata Virtual Account',
        desc:  'ATM / PermataMobile X',
        // Tautan terverifikasi dari File:Permata_Bank_logo.svg
        logo:  'https://upload.wikimedia.org/wikipedia/commons/thumb/6/69/Permata_Bank_logo.svg/120px-Permata_Bank_logo.svg.png',
      },
      {
        key:   'other_va',
        label: 'Bank Lainnya (VA BNI)',
        desc:  'Semua bank via Virtual Account BNI',
        logo:  null,
        icon:  'fa-university',
      },
    ],
  },
];

// ── Helper: logo dengan fallback ke FA icon ───────────────────────────────────
function PaymentLogo({ logo, icon, label, catColor, isActive }) {
  const [imgFailed, setImgFailed] = useState(false);

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

  return (
    <span style={boxStyle}>
      <i
        className={`fa-solid ${icon || 'fa-building-columns'}`}
        style={{
          fontSize:   22,
          color:      isActive ? catColor : 'rgba(255,255,255,0.35)',
          transition: 'color 0.18s',
        }}
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
            <i
              className={`fa-solid ${cat.icon}`}
              style={{ color: cat.color, fontSize: 11, width: 14, textAlign: 'center' }}
            />
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
                    display:        'flex',
                    flexDirection:  'column',
                    alignItems:     'center',
                    justifyContent: 'flex-start',
                    gap:            6,
                    padding:        '12px 8px 10px',

                    background: isActive
                      ? `${cat.color}20`
                      : 'rgba(255,255,255,0.025)',
                    border: isActive
                      ? `2px solid ${cat.color}`
                      : '1px solid rgba(255,255,255,0.08)',
                    borderRadius: 12,

                    cursor:     disabled ? 'not-allowed' : 'pointer',
                    opacity:    disabled ? 0.45 : 1,
                    transition: 'all 0.18s ease',
                    position:   'relative',
                    textAlign:  'center',

                    boxShadow: isActive
                      ? `0 0 0 1px ${cat.color}40, 0 4px 16px ${cat.color}18`
                      : 'none',
                  }}
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

                  {/* ── Logo / Icon ──────────────────────────────────── */}
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
