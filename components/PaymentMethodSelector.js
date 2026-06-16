/**
 * components/PaymentMethodSelector.js
 *
 * Komponen selector metode pembayaran embedded (non-popup).
 * Menampilkan metode dalam tiga kategori: QRIS, E-Wallet, Bank Transfer/VA.
 * Dapat dipakai di CartModal maupun halaman checkout langsung.
 *
 * Props:
 *   selected   {string}   — key metode yang terpilih
 *   onChange   {fn}       — callback(methodKey)
 *   disabled   {bool}     — disable semua pilihan
 */

// ── Data definisi metode ──────────────────────────────────────────────────────

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
        logo:  'https://upload.wikimedia.org/wikipedia/commons/thumb/f/fb/ShopeePay_logo.svg/120px-ShopeePay_logo.svg.png',
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
        logo:  'https://upload.wikimedia.org/wikipedia/id/thumb/5/55/BNI_logo.svg/120px-BNI_logo.svg.png',
      },
      {
        key:   'bri_va',
        label: 'BRI Virtual Account',
        desc:  'ATM / BRImo',
        logo:  'https://upload.wikimedia.org/wikipedia/commons/thumb/6/68/LOGO_BRI.png/120px-LOGO_BRI.png',
      },
      {
        key:   'permata_va',
        label: 'Permata Virtual Account',
        desc:  'ATM / PermataMobile X',
        logo:  'https://upload.wikimedia.org/wikipedia/commons/thumb/7/76/Bank_Permata.svg/120px-Bank_Permata.svg.png',
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

// ── Komponen utama ────────────────────────────────────────────────────────────

export default function PaymentMethodSelector({ selected, onChange, disabled = false }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {PAYMENT_CATEGORIES.map(cat => (
        <div key={cat.id}>
          {/* Category header */}
          <div style={{
            display:        'flex',
            alignItems:     'center',
            gap:            8,
            marginBottom:   8,
            paddingBottom:  6,
            borderBottom:   `1px solid ${cat.color}30`,
          }}>
            <i className={`fa-solid ${cat.icon}`}
               style={{ color: cat.color, fontSize: 12, width: 14, textAlign: 'center' }}/>
            <span style={{
              fontSize:      11,
              fontWeight:    700,
              textTransform: 'uppercase',
              letterSpacing: 1,
              color:         cat.color,
            }}>
              {cat.label}
            </span>
          </div>

          {/* Methods grid */}
          <div style={{
            display:             'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
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
                    gap:            7,
                    padding:        '10px 8px',
                    background:     isActive
                      ? `${cat.color}18`
                      : 'rgba(255,255,255,0.02)',
                    border:         isActive
                      ? `1.5px solid ${cat.color}`
                      : '1px solid rgba(255,255,255,0.07)',
                    borderRadius:   10,
                    cursor:         disabled ? 'not-allowed' : 'pointer',
                    transition:     'all 0.18s',
                    opacity:        disabled ? 0.5 : 1,
                    position:       'relative',
                    textAlign:      'center',
                  }}
                >
                  {/* Active indicator dot */}
                  {isActive && (
                    <span style={{
                      position:     'absolute',
                      top:          6,
                      right:        6,
                      width:        7,
                      height:       7,
                      borderRadius: '50%',
                      background:   cat.color,
                      boxShadow:    `0 0 6px ${cat.color}`,
                    }}/>
                  )}

                  {/* Logo / Icon */}
                  {m.logo ? (
                    <img
                      src={m.logo}
                      alt={m.label}
                      style={{
                        height:          28,
                        width:           'auto',
                        maxWidth:        64,
                        objectFit:       'contain',
                        filter:          isActive ? 'none' : 'grayscale(30%)',
                        imageRendering:  'auto',
                      }}
                      onError={e => {
                        e.target.style.display = 'none';
                        e.target.nextSibling.style.display = 'block';
                      }}
                    />
                  ) : null}
                  <i
                    className={`fa-solid ${m.icon || 'fa-building-columns'}`}
                    style={{
                      fontSize: 22,
                      color:    isActive ? cat.color : 'var(--text-muted)',
                      display:  m.logo ? 'none' : 'block',
                    }}
                  />

                  {/* Label */}
                  <span style={{
                    fontWeight:    700,
                    fontSize:      11,
                    color:         isActive ? '#fff' : 'var(--text-muted)',
                    lineHeight:    1.3,
                    textAlign:     'center',
                    wordBreak:     'break-word',
                  }}>
                    {m.label}
                  </span>

                  {/* Desc */}
                  <span style={{
                    fontSize:   9,
                    color:      isActive ? cat.color : 'rgba(255,255,255,0.3)',
                    fontWeight: 600,
                    lineHeight: 1.3,
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
