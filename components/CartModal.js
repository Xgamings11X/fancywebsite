/**
 * components/CartModal.js
 *
 * Modal checkout. Alurnya:
 *  1. Pemain isi Username Discord (wajib, untuk klaim role) + kode redeem (opsional)
 *  2. Klik "Bayar Sekarang" → POST /api/orders/create → dapat snapToken
 *  3. Buka popup RESMI Midtrans (Snap.js) lewat lib/snapClient.js
 *     → semua metode pembayaran (QRIS, GoPay, ShopeePay, VA Bank, dll)
 *       sudah tersedia di dalam popup itu sendiri.
 *     TIDAK ADA custom payment-method selector di sini.
 *  4. onSuccess / onPending / ditutup user → diarahkan ke /invoice/[orderId]
 *     untuk melihat status & (jika perlu) membuka ulang popup pembayaran.
 */

import { useState } from 'react';
import { useRouter } from 'next/router';
import toast from 'react-hot-toast';
import Icon from './Icon';
import { openSnapPopup } from '../lib/snapClient';

const idr = v => `Rp ${Number(v || 0).toLocaleString('id-ID')}`;

export default function CartModal({ product, player, onClose }) {
  const router = useRouter();

  const [discordUsername, setDiscordUsername] = useState('');
  const [redeemCode,      setRedeemCode]       = useState('');
  const [applying,        setApplying]         = useState(false);
  const [applied,         setApplied]          = useState(null); // { code, discountAmount, finalPrice }
  const [codeError,       setCodeError]        = useState('');
  const [loading,         setLoading]          = useState(false);
  const [error,           setError]            = useState('');

  const finalPrice = applied?.finalPrice ?? product.price;
  const discount    = applied?.discountAmount ?? 0;

  const handleApplyCode = async () => {
    if (!redeemCode.trim()) return;
    setApplying(true); setCodeError(''); setApplied(null);
    try {
      const res  = await fetch('/api/orders/apply-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: redeemCode.trim(), productId: product.id, price: product.price }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setApplied({ code: data.code, discountAmount: data.discountAmount, finalPrice: data.finalPrice });
        toast.success('Kode redeem berhasil dipakai!');
      } else {
        setCodeError(data.message || 'Kode tidak valid');
      }
    } catch {
      setCodeError('Gagal memeriksa kode. Coba lagi.');
    }
    setApplying(false);
  };

  const handleCheckout = async (e) => {
    e.preventDefault();
    if (!discordUsername.trim()) { setError('Username Discord wajib diisi'); return; }
    setLoading(true); setError('');

    try {
      const res  = await fetch('/api/orders/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          productId:        product.id,
          discord_username: discordUsername.trim(),
          redeemCode:       applied?.code || undefined,
        }),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(data.message || 'Gagal membuat order. Coba lagi.');
        setLoading(false);
        return;
      }

      const { orderId, snapToken } = data;

      // Buka popup pembayaran resmi Midtrans
      await openSnapPopup(snapToken, {
        onSuccess: () => {
          toast.success('Pembayaran berhasil!');
          router.push(`/invoice/${orderId}`);
        },
        onPending: () => {
          toast('Selesaikan pembayaran kamu di popup.', { icon: '⏳' });
          router.push(`/invoice/${orderId}`);
        },
        onError: () => {
          toast.error('Pembayaran gagal. Silakan coba lagi dari halaman invoice.');
          router.push(`/invoice/${orderId}`);
        },
        onClose: () => {
          toast('Pembayaran belum selesai. Kamu bisa lanjutkan dari halaman invoice.', { icon: 'ℹ️' });
          router.push(`/invoice/${orderId}`);
        },
      });

    } catch (e2) {
      setError(e2.message || 'Terjadi kesalahan. Coba lagi.');
      setLoading(false);
      return;
    }
    setLoading(false);
  };

  return (
    <div className="fn-modal-overlay" onClick={e => { if (e.target === e.currentTarget && !loading) onClose(); }}>
      <div className="fn-modal animate-in">

        {/* Top accent bar */}
        <div style={{height:3,background:'linear-gradient(90deg,var(--primary),var(--primary-light),var(--primary))'}}/>

        <div style={{padding:'28px 28px 32px'}}>

          {/* Header */}
          <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:20}}>
            <div>
              <h2 className="font-space" style={{fontSize:20,fontWeight:700,marginBottom:4}}>Checkout</h2>
              <p style={{color:'var(--text-muted)',fontSize:13}}>Selesaikan pembelian kamu</p>
            </div>
            <button onClick={onClose} disabled={loading} style={{background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.08)',color:'var(--text-muted)',width:32,height:32,borderRadius:8,cursor:loading?'not-allowed':'pointer',fontSize:16,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,opacity:loading?0.5:1}}>
              <Icon name="xmark" size={14}/>
            </button>
          </div>

          {/* Product summary */}
          <div style={{background:'rgba(255,107,0,0.06)',border:'1px solid rgba(255,107,0,0.15)',borderRadius:10,padding:'12px 14px',marginBottom:20,display:'flex',alignItems:'center',gap:12}}>
            <Icon name="cart-shopping" size={18} color="var(--primary)"/>
            <div style={{flex:1,minWidth:0}}>
              <p style={{fontWeight:700,fontSize:14,color:'#fff',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{product.name}</p>
              {player && <p style={{fontSize:11,color:'var(--text-muted)',marginTop:2}}>untuk {player.displayName || player.username}</p>}
            </div>
            <div style={{textAlign:'right',flexShrink:0}}>
              {discount > 0 && (
                <p style={{fontSize:11,color:'var(--text-muted)',textDecoration:'line-through'}}>{idr(product.price)}</p>
              )}
              <p style={{fontWeight:800,fontSize:15,color:'var(--primary-light)'}}>{idr(finalPrice)}</p>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div style={{background:'rgba(231,76,60,0.08)',border:'1px solid rgba(231,76,60,0.2)',borderRadius:8,padding:'10px 14px',marginBottom:16,display:'flex',alignItems:'flex-start',gap:10}}>
              <Icon name="circle-exclamation" size={13} color="#e74c3c" style={{marginTop:1,flexShrink:0}}/>
              <p style={{fontSize:13,color:'#e74c3c',lineHeight:1.5}}>{error}</p>
            </div>
          )}

          <form onSubmit={handleCheckout}>
            {/* Discord username */}
            <div style={{marginBottom:16}}>
              <label style={{display:'block',fontSize:11,fontWeight:700,textTransform:'uppercase',letterSpacing:0.5,color:'var(--text-muted)',marginBottom:8}}>
                <Icon name="discord" size={12} style={{marginRight:5,verticalAlign:-2}}/>
                Username Discord
              </label>
              <input type="text" value={discordUsername} onChange={e => setDiscordUsername(e.target.value)}
                placeholder="contoh: nama.discord"
                className="fn-input" maxLength={40} autoComplete="off" required disabled={loading}/>
              <p style={{fontSize:11,color:'var(--text-muted)',marginTop:6}}>Dipakai untuk klaim role di Discord server</p>
            </div>

            {/* Redeem code */}
            <div style={{marginBottom:20}}>
              <label style={{display:'block',fontSize:11,fontWeight:700,textTransform:'uppercase',letterSpacing:0.5,color:'var(--text-muted)',marginBottom:8}}>
                <Icon name="ticket" size={12} style={{marginRight:5,verticalAlign:-2}}/>
                Kode Redeem (opsional)
              </label>
              <div style={{display:'flex',gap:8}}>
                <input type="text" value={redeemCode}
                  onChange={e => { setRedeemCode(e.target.value); setApplied(null); setCodeError(''); }}
                  placeholder="Masukkan kode" className="fn-input" disabled={loading || applying}
                  style={{flex:1}}/>
                <button type="button" onClick={handleApplyCode} disabled={loading || applying || !redeemCode.trim() || !!applied}
                  className="btn-primary-fn" style={{padding:'0 16px',fontSize:13,whiteSpace:'nowrap'}}>
                  {applying ? <span className="fn-spinner" style={{width:14,height:14,borderWidth:2}}/> : (applied ? 'Terpakai' : 'Terapkan')}
                </button>
              </div>
              {codeError && <p style={{fontSize:12,color:'#e74c3c',marginTop:6}}>{codeError}</p>}
              {applied && <p style={{fontSize:12,color:'#2ecc71',marginTop:6}}>Diskon {idr(applied.discountAmount)} berhasil diterapkan</p>}
            </div>

            {/* Info strip */}
            <div style={{background:'rgba(255,255,255,0.02)',border:'1px solid rgba(255,255,255,0.05)',borderRadius:8,padding:'10px 14px',marginBottom:20,fontSize:12,color:'var(--text-muted)',lineHeight:1.5,display:'flex',gap:8}}>
              <Icon name="lock" size={13} color="var(--primary)" style={{flexShrink:0,marginTop:1}}/>
              <span>Pembayaran diproses lewat popup resmi Midtrans — QRIS, GoPay, ShopeePay, dan VA Bank tersedia langsung di dalamnya.</span>
            </div>

            <button type="submit" className="btn-primary-fn" disabled={loading || !discordUsername.trim()}
              style={{width:'100%',justifyContent:'center',padding:'13px',fontSize:14,borderRadius:10}}>
              {loading
                ? <><span className="fn-spinner" style={{width:16,height:16,borderWidth:2}}/> Memproses...</>
                : <><Icon name="lock" size={13} style={{marginRight:6}}/> Bayar {idr(finalPrice)}</>
              }
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
