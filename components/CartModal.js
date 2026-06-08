import { useState } from 'react';
import toast from 'react-hot-toast';

const idr = v => `Rp ${Number(v||0).toLocaleString('id-ID')}`;

export default function CartModal({ product, player, onClose }) {
  const [step,           setStep]           = useState('confirm');
  const [loading,        setLoading]        = useState(false);
  const [redeemInput,    setRedeemInput]    = useState('');
  const [redeemInfo,     setRedeemInfo]     = useState(null);
  const [redeemLoading,  setRedeemLoading]  = useState(false);

  const basePrice  = product.price;
  const finalPrice = redeemInfo ? redeemInfo.finalPrice : basePrice;
  const discount   = redeemInfo ? redeemInfo.discountAmount : 0;

  const applyRedeem = async () => {
    const code = redeemInput.trim();
    if (!code) return;
    setRedeemLoading(true);
    try {
      const res  = await fetch('/api/orders/apply-code',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({code,productId:product.id,price:basePrice})});
      const data = await res.json();
      if (data.success) {
        setRedeemInfo(data);
        toast.success(`✅ Kode berhasil! Hemat ${idr(data.discountAmount)}`);
      } else {
        toast.error(data.message||'Kode tidak valid');
        // Jangan clear input agar user bisa koreksi
      }
    } catch { toast.error('Gagal memeriksa kode. Cek koneksi internet.'); }
    setRedeemLoading(false);
  };

  const handleCheckout = async () => {
    setLoading(true);
    try {
      // Ambil token dari localStorage sebagai fallback jika cookie tidak terkirim
      let token = null;
      try { const d = localStorage.getItem('mc_token'); if(d) token = d; } catch{}
      const headers = {'Content-Type':'application/json'};
      if (token) headers['Authorization'] = `Bearer ${token}`;
      const res  = await fetch('/api/orders/create',{method:'POST',headers,credentials:'include',body:JSON.stringify({productId:product.id,redeemCode:redeemInfo?.code||null})});
      const data = await res.json();
      if (!res.ok||!data.success) { toast.error(data.message||'Gagal membuat order'); setLoading(false); return; }

      if (data.snapToken) {
        setStep('paying');
        const env = process.env.NEXT_PUBLIC_MIDTRANS_ENV==='production'?'app':'app.sandbox';
        if (!window.snap) {
          await new Promise(resolve => {
            const sc = document.createElement('script');
            sc.src = `https://${env}.midtrans.com/snap/snap.js`;
            sc.setAttribute('data-client-key', data.clientKey||'');
            sc.onload = resolve;
            document.head.appendChild(sc);
          });
        }
        window.snap.pay(data.snapToken,{
          onSuccess: async () => { setStep('success'); await fetch(`/api/orders/verify/${data.orderId}`,{credentials:'include'}); },
          onPending: () => { toast('Selesaikan pembayaran sebelum 24 jam.',{icon:'⏳'}); onClose(); },
          onError:   () => { toast.error('Pembayaran gagal.'); setStep('confirm'); setLoading(false); },
          onClose:   () => { setStep('confirm'); setLoading(false); },
        });
      }
    } catch(e) { toast.error('Kesalahan: '+e.message); setLoading(false); }
  };

  return (
    <div className="fn-modal-overlay" onClick={e=>{ if(e.target===e.currentTarget&&step!=='paying') onClose(); }}>
      <div className="fn-modal animate-in">
        <div style={{height:3,background:'linear-gradient(90deg,var(--primary),var(--primary-light),var(--primary))'}}/>
        <div style={{padding:'24px 26px 28px'}}>

          {/* SUCCESS */}
          {step==='success' && (
            <div style={{textAlign:'center',padding:'16px 0'}}>
              <div style={{width:64,height:64,background:'rgba(46,204,113,0.1)',border:'1px solid rgba(46,204,113,0.3)',borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 20px'}}>
                <i className="fa-solid fa-check" style={{fontSize:28,color:'#2ecc71'}}/>
              </div>
              <h2 className="font-space" style={{fontSize:22,fontWeight:700,marginBottom:8}}>Pembayaran Berhasil!</h2>
              <p style={{color:'var(--text-muted)',fontSize:13,marginBottom:6}}>
                Item <strong style={{color:'var(--primary-light)'}}>{product.name}</strong> sedang dikirim ke Minecraft kamu.
              </p>
              <p style={{color:'var(--text-muted)',fontSize:12,marginBottom:24}}>Butuh bantuan? Buka halaman Support.</p>
              <button className="btn-primary-fn" onClick={onClose} style={{width:'100%',justifyContent:'center',padding:13,borderRadius:10}}>
                <i className="fa-solid fa-check-circle"/> Selesai
              </button>
            </div>
          )}

          {/* PAYING */}
          {step==='paying' && (
            <div style={{textAlign:'center',padding:'24px 0'}}>
              <div className="fn-spinner" style={{width:44,height:44,borderWidth:3,margin:'0 auto 20px'}}/>
              <h2 className="font-space" style={{fontSize:20,fontWeight:700,marginBottom:8}}>Memproses Pembayaran...</h2>
              <p style={{color:'var(--text-muted)',fontSize:13}}>Selesaikan di popup Midtrans. Jangan tutup halaman ini.</p>
            </div>
          )}

          {/* CONFIRM */}
          {step==='confirm' && (
            <>
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:20}}>
                <h2 className="font-space" style={{fontSize:18,fontWeight:700}}>Konfirmasi Pembelian</h2>
                <button onClick={onClose} style={{background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.08)',color:'var(--text-muted)',width:32,height:32,borderRadius:8,cursor:'pointer',fontSize:15,display:'flex',alignItems:'center',justifyContent:'center'}}>
                  <i className="fa-solid fa-xmark"/>
                </button>
              </div>

              {/* Product row */}
              <div style={{background:'rgba(255,255,255,0.02)',border:'1px solid var(--border)',borderRadius:12,padding:'14px 16px',marginBottom:14,display:'flex',alignItems:'center',gap:14}}>
                <div style={{width:52,height:52,background:'rgba(255,107,0,0.06)',borderRadius:10,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,overflow:'hidden'}}>
                  {product.image_url
                    ? <img src={product.image_url} alt={product.name} style={{width:44,height:44,objectFit:'contain'}} onError={e=>e.target.style.display='none'}/>
                    : <span style={{fontSize:24}}>{product.category_icon||'📦'}</span>
                  }
                </div>
                <div style={{flex:1,minWidth:0}}>
                  <p style={{fontSize:10,color:'var(--text-muted)',textTransform:'uppercase',fontWeight:700,marginBottom:2}}>{product.category_name||'Item'}</p>
                  <p style={{fontWeight:700,fontSize:14,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{product.name}</p>
                </div>
                <span className="font-space" style={{fontSize:16,fontWeight:700,color:'var(--primary-light)',flexShrink:0}}>{idr(basePrice)}</span>
              </div>

              {/* Player */}
              <div style={{background:'rgba(46,204,113,0.04)',border:'1px solid rgba(46,204,113,0.15)',borderRadius:10,padding:'10px 14px',marginBottom:14,display:'flex',alignItems:'center',gap:10}}>
                <i className="fa-solid fa-shield-halved" style={{color:'#2ecc71',fontSize:14}}/>
                <div>
                  <p style={{fontSize:10,color:'var(--text-muted)',fontWeight:700}}>DIKIRIM KE</p>
                  <p style={{fontWeight:700,fontSize:13,color:'#fff'}}>{player?.displayName||player?.username}</p>
                </div>
              </div>

              {/* Redeem */}
              <div style={{marginBottom:14}}>
                <div style={{display:'flex',gap:8}}>
                  <div style={{position:'relative',flex:1}}>
                    <i className="fa-solid fa-tag" style={{position:'absolute',left:12,top:'50%',transform:'translateY(-50%)',color:'var(--text-muted)',fontSize:12}}/>
                    <input value={redeemInput} onChange={e=>setRedeemInput(e.target.value.toUpperCase())}
                      onKeyDown={e=>{ if(e.key==='Enter' && redeemInput.trim() && !redeemInfo && !redeemLoading) applyRedeem(); }}
                      placeholder="Kode redeem (opsional)" className="fn-input"
                      style={{paddingLeft:32,fontFamily:'monospace',fontSize:13,letterSpacing:1}} disabled={!!redeemInfo}/>
                  </div>
                  {redeemInfo
                    ? <button onClick={()=>{setRedeemInfo(null);setRedeemInput('');}} className="btn-ghost-fn" style={{flexShrink:0}}>✕ Hapus</button>
                    : <button onClick={applyRedeem} disabled={!redeemInput.trim()||redeemLoading} className="btn-primary-fn" style={{flexShrink:0}}>
                        {redeemLoading?<span className="fn-spinner" style={{width:14,height:14,borderWidth:2}}/>:'Pakai'}
                      </button>
                  }
                </div>
                {redeemInfo && <p style={{fontSize:12,color:'#2ecc71',marginTop:6}}><i className="fa-solid fa-check-circle" style={{marginRight:4}}/>Diskon {idr(discount)} diterapkan</p>}
              </div>

              {/* Payment methods */}
              <div style={{marginBottom:16}}>
                <p className="section-label" style={{marginBottom:10}}>Metode Pembayaran</p>
                <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:8}}>
                  {[{icon:'fa-qrcode',name:'QRIS',desc:'Semua e-wallet'},{icon:'fa-building-columns',name:'Transfer',desc:'BCA/BNI/BRI'},{icon:'fa-wallet',name:'GoPay',desc:'GoPay/OVO'}].map((m,i)=>(
                    <div key={i} style={{background:'rgba(255,255,255,0.02)',border:'1px solid rgba(255,255,255,0.06)',borderRadius:10,padding:'10px 8px',textAlign:'center'}}>
                      <i className={`fa-solid ${m.icon}`} style={{color:'var(--primary)',fontSize:16,display:'block',marginBottom:6}}/>
                      <p style={{fontWeight:700,fontSize:12,color:'#fff'}}>{m.name}</p>
                      <p style={{fontSize:10,color:'var(--text-muted)'}}>{m.desc}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Total */}
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-end',marginBottom:16,padding:'14px 0',borderTop:'1px solid rgba(255,255,255,0.05)'}}>
                <div>
                  <p style={{fontSize:12,color:'var(--text-muted)'}}>Total Pembayaran</p>
                  {discount>0 && <p style={{fontSize:12,color:'var(--text-muted)',textDecoration:'line-through'}}>{idr(basePrice)}</p>}
                </div>
                <span className="font-space" style={{fontSize:22,fontWeight:700,color:'var(--primary-light)'}}>{idr(finalPrice)}</span>
              </div>

              <button onClick={handleCheckout} disabled={loading} className="btn-primary-fn"
                style={{width:'100%',justifyContent:'center',padding:'13px',fontSize:14,borderRadius:10}}>
                {loading
                  ? <><span className="fn-spinner" style={{width:16,height:16,borderWidth:2}}/> Memproses...</>
                  : <><i className="fa-solid fa-credit-card"/> Bayar Sekarang</>
                }
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
