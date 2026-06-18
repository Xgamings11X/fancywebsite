/**
 * components/CartModal.js  (REVISI — Direct Checkout via Core API)
 *
 * Perubahan dari versi lama:
 * 1. Menghapus semua logika Snap popup / snapToken.
 * 2. Menambahkan step "payment_select" — user memilih metode pembayaran langsung di modal
 *    menggunakan komponen <PaymentMethodSelector>.
 * 3. Setelah konfirmasi, POST ke /api/orders/create-core (bukan /api/orders/create).
 * 4. Setelah transaksi dibuat, redirect ke /invoice/[orderId] yang sudah menerima
 *    paymentInfo (VA number, QR URL, dll) tanpa membuka Snap popup apapun.
 */

import { useState } from 'react';
import Icon from './Icon';
import { useRouter } from 'next/router';
import toast from 'react-hot-toast';
import PaymentMethodSelector, { PAYMENT_CATEGORIES } from './PaymentMethodSelector';

const idr = v => `Rp ${Number(v || 0).toLocaleString('id-ID')}`;

// Helper: cari label metode dari key
const getMethodLabel = (key) => {
  for (const cat of PAYMENT_CATEGORIES) {
    const found = cat.methods.find(m => m.key === key);
    if (found) return { label: found.label, catLabel: cat.label, color: cat.color };
  }
  return { label: key, catLabel: '', color: 'var(--primary)' };
};

export default function CartModal({ product, player, onClose }) {
  const router = useRouter();

  // ── State ──────────────────────────────────────────────────────────────────
  // step: 'confirm' → 'payment_select' → (submit) → redirect to /invoice/[id]
  const [step,          setStep]          = useState('confirm');
  const [loading,       setLoading]       = useState(false);
  const [redeemInput,   setRedeemInput]   = useState('');
  const [redeemInfo,    setRedeemInfo]    = useState(null);
  const [redeemLoading, setRedeemLoading] = useState(false);
  const [discordUser,   setDiscordUser]   = useState('');
  const [paymentMethod, setPaymentMethod] = useState('gopay_qris'); // default QRIS Dinamis (aktif)

  const basePrice  = product.price;
  const finalPrice = redeemInfo ? redeemInfo.finalPrice  : basePrice;
  const discount   = redeemInfo ? redeemInfo.discountAmount : 0;

  // ── Redeem Code ────────────────────────────────────────────────────────────
  const applyRedeem = async () => {
    const code = redeemInput.trim();
    if (!code) return;
    setRedeemLoading(true);
    try {
      const res  = await fetch('/api/orders/apply-code', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ code, productId: product.id, price: basePrice }),
      });
      const data = await res.json();
      if (data.success) {
        setRedeemInfo(data);
        toast.success(`✅ Kode berhasil! Hemat ${idr(data.discountAmount)}`);
      } else {
        toast.error(data.message || 'Kode tidak valid');
      }
    } catch {
      toast.error('Gagal memeriksa kode.');
    }
    setRedeemLoading(false);
  };

  // ── Proses Pembayaran (Core API) ───────────────────────────────────────────
  const handleCheckout = async () => {
    if (!discordUser.trim()) {
      toast.error('Username Discord wajib diisi untuk klaim role!');
      return;
    }
    setLoading(true);
    try {
      let token = null;
      try { const d = localStorage.getItem('mc_token'); if (d) token = d; } catch {}
      const headers = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res  = await fetch('/api/orders/create-core', {
        method:      'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify({
          productId:        product.id,
          paymentMethod,
          redeemCode:       redeemInfo?.code || null,
          discord_username: discordUser.trim(),
        }),
      });
      const data = await res.json();

      if (res.status === 401) {
        try {
          localStorage.removeItem('mc_player');
          localStorage.removeItem('mc_token');
        } catch {}
        toast.error('Sesi kamu sudah berakhir. Silakan login ulang.', { duration: 4000 });
        setLoading(false);
        onClose();
        return;
      }
      if (!res.ok || !data.success) {
        toast.error(data.message || 'Gagal membuat order');
        setLoading(false);
        return;
      }

      // Redirect ke invoice — tidak ada snap popup
      router.push('/invoice/' + data.orderId);
      onClose();

    } catch (e) {
      toast.error('Kesalahan: ' + e.message);
      setLoading(false);
    }
  };

  const methodMeta = getMethodLabel(paymentMethod);

  return (
    <div className="fn-modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="fn-modal animate-in" style={{ maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ height: 3, background: 'linear-gradient(90deg,var(--primary),var(--primary-light),var(--primary))' }}/>

        <div style={{ padding: '24px 26px 28px' }}>

          {/* ── STEP 1: Konfirmasi + Discord + Redeem ── */}
          {step === 'confirm' && (
            <>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                <h2 className="font-space" style={{ fontSize: 18, fontWeight: 700 }}>Konfirmasi Pembelian</h2>
                <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'var(--text-muted)', width: 32, height: 32, borderRadius: 8, cursor: 'pointer', fontSize: 15, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Icon name="xmark" size={14}/>
                </button>
              </div>

              {/* Product row */}
              <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)', borderRadius: 12, padding: '14px 16px', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{ width: 52, height: 52, background: 'rgba(255,107,0,0.06)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, overflow: 'hidden' }}>
                  {product.image_url
                    ? <img src={product.image_url} alt={product.name} loading="lazy" style={{ width: 44, height: 44, objectFit: 'contain' }} onError={e => e.target.style.display = 'none'}/>
                    : <span style={{ fontSize: 24 }}>{product.category_icon || '📦'}</span>
                  }
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, marginBottom: 2 }}>{product.category_name || 'Item'}</p>
                  <p style={{ fontWeight: 700, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{product.name}</p>
                </div>
                <span className="font-space" style={{ fontSize: 16, fontWeight: 700, color: 'var(--primary-light)', flexShrink: 0 }}>{idr(basePrice)}</span>
              </div>

              {/* Player */}
              <div style={{ background: 'rgba(46,204,113,0.04)', border: '1px solid rgba(46,204,113,0.15)', borderRadius: 10, padding: '10px 14px', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 10 }}>
                <Icon name="shield-halved" size={14} color="#2ecc71"/>
                <div>
                  <p style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 700 }}>DIKIRIM KE</p>
                  <p style={{ fontWeight: 700, fontSize: 13, color: '#fff' }}>{player?.displayName || player?.username}</p>
                </div>
              </div>

              {/* Discord */}
              <div style={{ marginBottom: 14 }}>
                <div style={{ background: 'rgba(88,101,242,0.06)', border: '1px solid rgba(88,101,242,0.25)', borderRadius: 10, padding: '10px 14px', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Icon name="discord" size={15} color="#5865F2" style={{flexShrink:0}}/>
                  <p style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.4 }}>
                    <strong style={{ color: '#fff' }}>Wajib:</strong> Username Discord diperlukan untuk klaim role otomatis setelah pembayaran.
                  </p>
                </div>
                <div style={{ position: 'relative' }}>
                  <Icon name="discord" size={13} color="#5865F2" style={{position:'absolute',left:12,top:'50%',transform:'translateY(-50%)',pointerEvents:'none'}}/>
                  <input
                    value={discordUser}
                    onChange={e => setDiscordUser(e.target.value)}
                    placeholder="Username Discord (tanpa #, contoh: Steve)"
                    className="fn-input"
                    style={{ paddingLeft: 34, fontSize: 13 }}
                  />
                </div>
                {discordUser.trim() && (
                  <p style={{ fontSize: 11, color: '#5865F2', marginTop: 5 }}>
                    <Icon name="circle-check" size={12} style={{marginRight:4}}/>
                    Discord: <strong>{discordUser.trim()}</strong>
                  </p>
                )}
              </div>

              {/* Redeem */}
              <div style={{ marginBottom: 14 }}>
                <div style={{ display: 'flex', gap: 8 }}>
                  <div style={{ position: 'relative', flex: 1 }}>
                    <Icon name="ticket" size={12} color="var(--text-muted)" style={{position:'absolute',left:12,top:'50%',transform:'translateY(-50%)',pointerEvents:'none'}}/>
                    <input
                      value={redeemInput}
                      onChange={e => setRedeemInput(e.target.value.toUpperCase())}
                      onKeyDown={e => { if (e.key === 'Enter' && redeemInput.trim() && !redeemInfo && !redeemLoading) applyRedeem(); }}
                      placeholder="Kode redeem (opsional)"
                      className="fn-input"
                      style={{ paddingLeft: 32, fontFamily: 'monospace', fontSize: 13, letterSpacing: 1 }}
                      disabled={!!redeemInfo}
                    />
                  </div>
                  {redeemInfo
                    ? <button onClick={() => { setRedeemInfo(null); setRedeemInput(''); }} className="btn-ghost-fn" style={{ flexShrink: 0 }}>✕ Hapus</button>
                    : <button onClick={applyRedeem} disabled={!redeemInput.trim() || redeemLoading} className="btn-primary-fn" style={{ flexShrink: 0 }}>
                        {redeemLoading ? <span className="fn-spinner" style={{ width: 14, height: 14, borderWidth: 2 }}/> : 'Pakai'}
                      </button>
                  }
                </div>
                {redeemInfo && <p style={{ fontSize: 12, color: '#2ecc71', marginTop: 6 }}><Icon name="circle-check" size={12} style={{marginRight:4}}/>Diskon {idr(discount)} diterapkan</p>}
              </div>

              {/* Total */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 16, padding: '14px 0', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                <div>
                  <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>Total Pembayaran</p>
                  {discount > 0 && <p style={{ fontSize: 12, color: 'var(--text-muted)', textDecoration: 'line-through' }}>{idr(basePrice)}</p>}
                </div>
                <span className="font-space" style={{ fontSize: 22, fontWeight: 700, color: 'var(--primary-light)' }}>{idr(finalPrice)}</span>
              </div>

              <button
                onClick={() => {
                  if (!discordUser.trim()) { toast.error('Isi username Discord terlebih dahulu!'); return; }
                  setStep('payment_select');
                }}
                disabled={!discordUser.trim()}
                className="btn-primary-fn"
                style={{ width: '100%', justifyContent: 'center', padding: '13px', fontSize: 14, borderRadius: 10, opacity: !discordUser.trim() ? 0.6 : 1 }}
              >
                <Icon name="arrow-right" size={14} style={{marginRight:6}}/> Pilih Metode Pembayaran
              </button>

              {!discordUser.trim() && (
                <p style={{ textAlign: 'center', fontSize: 11, color: 'rgba(88,101,242,0.8)', marginTop: 8 }}>
                  <Icon name="discord" size={12} style={{marginRight:4}}/>Isi username Discord untuk melanjutkan
                </p>
              )}
            </>
          )}

          {/* ── STEP 2: Pilih Metode Pembayaran ── */}
          {step === 'payment_select' && (
            <>
              {/* Header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
                <button onClick={() => setStep('confirm')} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'var(--text-muted)', width: 32, height: 32, borderRadius: 8, cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Icon name="arrow-left" size={14}/>
                </button>
                <div style={{ flex: 1 }}>
                  <h2 className="font-space" style={{ fontSize: 17, fontWeight: 700 }}>Pilih Metode Pembayaran</h2>
                  <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>Total: <strong style={{ color: 'var(--primary-light)' }}>{idr(finalPrice)}</strong></p>
                </div>
                <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'var(--text-muted)', width: 32, height: 32, borderRadius: 8, cursor: 'pointer', fontSize: 15, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Icon name="xmark" size={14}/>
                </button>
              </div>

              {/* Selector */}
              <div style={{ marginBottom: 18 }}>
                <PaymentMethodSelector
                  selected={paymentMethod}
                  onChange={setPaymentMethod}
                  disabled={loading}
                />
              </div>

              {/* Selected method preview */}
              <div style={{ background: `${methodMeta.color}12`, border: `1px solid ${methodMeta.color}40`, borderRadius: 10, padding: '10px 14px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
                <Icon name="circle-check" size={14} color={methodMeta.color} style={{flexShrink:0}}/>
                <div>
                  <p style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 700 }}>METODE DIPILIH</p>
                  <p style={{ fontWeight: 700, fontSize: 13, color: '#fff' }}>{methodMeta.label}</p>
                </div>
              </div>

              {/* Bayar button */}
              <button
                onClick={handleCheckout}
                disabled={loading || !paymentMethod}
                className="btn-primary-fn"
                style={{ width: '100%', justifyContent: 'center', padding: '13px', fontSize: 14, borderRadius: 10 }}
              >
                {loading
                  ? <><span className="fn-spinner" style={{ width: 16, height: 16, borderWidth: 2 }}/> Memproses...</>
                  : <><Icon name="lock" size={14} style={{marginRight:6}}/> Bayar {idr(finalPrice)}</>
                }
              </button>

              <p style={{ textAlign: 'center', fontSize: 10, color: 'var(--text-muted)', marginTop: 10 }}>
                <Icon name="shield-halved" size={12} color="#2ecc71" style={{marginRight:4}}/>
                Pembayaran aman via Midtrans
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
